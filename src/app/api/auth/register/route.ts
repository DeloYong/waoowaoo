import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { logAuthAction } from '@/lib/logging/semantic'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, getClientIp, AUTH_REGISTER_LIMIT } from '@/lib/rate-limit'
import { generateUniqueInviteCode } from '@/lib/invite'
import { getInviteConfig } from '@/lib/platform-config'
import { grantCredits } from '@/lib/credit-billing/service'
import { trackEvent } from '@/lib/observability'

export const POST = apiHandler(async (request: NextRequest) => {
  // 🛡️ IP 限流
  const ip = getClientIp(request)
  const rateResult = await checkRateLimit('auth:register', ip, AUTH_REGISTER_LIMIT)
  if (rateResult.limited) {
    logAuthAction('REGISTER', 'unknown', { error: 'Rate limited', ip })
    return NextResponse.json(
      { success: false, message: `请求过于频繁，请 ${rateResult.retryAfterSeconds} 秒后再试` },
      {
        status: 429,
        headers: { 'Retry-After': String(rateResult.retryAfterSeconds) },
      },
    )
  }

  let name = 'unknown'
  const body = await request.json()
  name = body.name || 'unknown'
  const { password } = body
  const inviteCodeFromQuery = body.inviteCode as string | undefined

  // 验证输入
  if (!name || !password) {
    logAuthAction('REGISTER', name, { error: 'Missing credentials' })
    throw new ApiError('INVALID_PARAMS')
  }

  if (password.length < 6) {
    logAuthAction('REGISTER', name, { error: 'Password too short' })
    throw new ApiError('INVALID_PARAMS')
  }

  // 检查用户是否已存在
  const existingUser = await prisma.user.findUnique({
    where: { name }
  })

  if (existingUser) {
    logAuthAction('REGISTER', name, { error: 'Phone number already exists' })
    throw new ApiError('INVALID_PARAMS')
  }

  // 哈希密码
  const hashedPassword = await bcrypt.hash(password, 12)

  // 创建用户（事务）- 只包含原子操作
  const result = await prisma.$transaction(async (tx) => {
    // 生成邀请码
    const inviteCode = await generateUniqueInviteCode()

    // 查找邀请人
    const inviter = inviteCodeFromQuery
      ? await tx.user.findUnique({
          where: { inviteCode: inviteCodeFromQuery },
          select: { id: true },
        })
      : null

    // 创建用户
    const newUser = await tx.user.create({
      data: {
        name,
        password: hashedPassword,
        inviteCode,
        invitedBy: inviter?.id ?? null,
      }
    })

    // 💰 创建用户余额记录（初始余额为0）
    await tx.userBalance.create({
      data: {
        userId: newUser.id,
        balance: 0,
        frozenAmount: 0,
        totalSpent: 0,
        subscriptionCredits: 0,
        permanentCredits: 0,
        frozenCredits: 0,
      }
    })

    // 处理邀请记录（仅创建记录，积分发放在事务外）
    let inviteData: { inviterId: string | null; welcomeCredits: number; referralCredits: number } | null = null
    if (inviter) {
      const config = await getInviteConfig()
      const now = new Date()
      const rebateEndsAt = new Date(now)
      rebateEndsAt.setFullYear(rebateEndsAt.getFullYear() + 1)

      // 检查当天邀请上限
      const todayStart = new Date(now)
      todayStart.setHours(0, 0, 0, 0)
      const todayCount = await tx.inviteRebateLog.count({
        where: {
          inviterId: inviter.id,
          triggerType: 'activation',
          createdAt: { gte: todayStart },
        },
      })

      const shouldAwardInviter = todayCount < config.dailyReferralCap

      await tx.inviteRecord.create({
        data: {
          inviterId: inviter.id,
          inviteeId: newUser.id,
          inviteCode: inviteCodeFromQuery!,
          rebateEndsAt,
          welcomeCredits: config.welcomeCredits,
          referralCredits: shouldAwardInviter ? config.referralCredits : 0,
        },
      })

      inviteData = {
        inviterId: inviter.id,
        welcomeCredits: config.welcomeCredits,
        referralCredits: shouldAwardInviter ? config.referralCredits : 0,
      }
    }

    return { user: newUser, inviteData }
  })

  // 在事务外发放积分，避免事务超时
  if (result.inviteData) {
    const { inviterId, welcomeCredits, referralCredits } = result.inviteData
    const welcomeTxId = `invite_${result.user.id}_welcome`
    const referralTxId = `invite_${result.user.id}_referral`

    if (welcomeCredits > 0) {
      await grantCredits(result.user.id, welcomeCredits, 'invite_welcome_gift', {
        reason: '新用户注册欢迎礼',
        isPermanent: false,
        idempotencyKey: welcomeTxId,
      })
    }

    if (referralCredits > 0 && inviterId) {
      await grantCredits(inviterId, referralCredits, 'invite_referral_reward', {
        reason: '邀请新人奖励',
        isPermanent: true,
        idempotencyKey: referralTxId,
      })
    }

    // 更新邀请记录的交易 ID
    await prisma.inviteRecord.updateMany({
      where: { inviteeId: result.user.id },
      data: {
        welcomeTxId: welcomeCredits > 0 ? welcomeTxId : null,
        referralTxId: referralCredits > 0 ? referralTxId : null,
      },
    })
  }

  const user = result.user

  logAuthAction('REGISTER', name, { userId: user.id, success: true })

  trackEvent({
    event: 'user.register',
    userId: user.id,
    name,
    inviteCode: inviteCodeFromQuery,
    success: true,
  })

  return NextResponse.json(
    {
      message: "注册成功",
      user: {
        id: user.id,
        name: user.name
      }
    },
    { status: 201 }
  )
})
