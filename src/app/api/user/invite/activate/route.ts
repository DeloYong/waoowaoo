import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-errors'
import { prisma } from '@/lib/prisma'
import { grantCredits } from '@/lib/credit-billing/service'
import { getInviteConfig } from '@/lib/platform-config'
import { requireUserAuth } from '@/lib/api-auth'

export const POST = apiHandler(async (request: NextRequest) => {
  const authResult = await requireUserAuth()
  if (authResult instanceof NextResponse) return authResult

  const { session } = authResult
  const userId = session.user.id

  const body = await request.json()
  const { inviteCode } = body

  if (!inviteCode) {
    return NextResponse.json({ error: '缺少邀请码' }, { status: 400 })
  }

  const inviter = await prisma.user.findUnique({
    where: { inviteCode },
    select: { id: true },
  })

  if (!inviter) {
    return NextResponse.json({ error: '无效的邀请码' }, { status: 404 })
  }

  const existingRecord = await prisma.inviteRecord.findUnique({
    where: { inviteeId: userId },
  })

  if (existingRecord) {
    return NextResponse.json({ error: '已经激活过邀请码' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { balance: true },
  })

  if (!user) {
    return NextResponse.json({ error: '用户不存在' }, { status: 404 })
  }

  // 先创建邀请记录（在事务外准备数据）
  const config = await getInviteConfig()
  const now = new Date()
  const rebateEndsAt = new Date(now)
  rebateEndsAt.setFullYear(rebateEndsAt.getFullYear() + 1)

  // 检查当天邀请上限
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const todayCount = await prisma.inviteRebateLog.count({
    where: {
      inviterId: inviter.id,
      triggerType: 'activation',
      createdAt: { gte: todayStart },
    },
  })

  const shouldAwardInviter = todayCount < config.dailyReferralCap

  // 使用事务仅创建邀请记录
  const inviteRecord = await prisma.$transaction(async (tx) => {
    const existingRecord = await tx.inviteRecord.findUnique({
      where: { inviteeId: userId },
    })

    if (existingRecord) {
      throw new Error('已经激活过邀请码')
    }

    return tx.inviteRecord.create({
      data: {
        inviterId: inviter.id,
        inviteeId: userId,
        inviteCode,
        rebateEndsAt,
        welcomeCredits: config.welcomeCredits,
        referralCredits: shouldAwardInviter ? config.referralCredits : 0,
      },
    })
  })

  // 在事务外发放积分，避免事务超时
  if (config.welcomeCredits > 0) {
    await grantCredits(userId, config.welcomeCredits, 'invite_welcome_gift', {
      reason: '新用户注册欢迎礼',
      isPermanent: false,
      idempotencyKey: `invite_${userId}_welcome`,
    })
  }

  if (shouldAwardInviter && config.referralCredits > 0) {
    await grantCredits(inviter.id, config.referralCredits, 'invite_referral_reward', {
      reason: '邀请新人奖励',
      isPermanent: true,
      idempotencyKey: `invite_${userId}_referral`,
    })
  }

  // 更新邀请记录的交易 ID
  await prisma.inviteRecord.update({
    where: { id: inviteRecord.id },
    data: {
      welcomeTxId: config.welcomeCredits > 0 ? `invite_${userId}_welcome` : null,
      referralTxId: shouldAwardInviter && config.referralCredits > 0 ? `invite_${userId}_referral` : null,
    },
  })

  return NextResponse.json({
    success: true,
    message: '邀请激活成功',
  })
})
