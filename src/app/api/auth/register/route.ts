import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { logAuthAction } from '@/lib/logging/semantic'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, getClientIp, AUTH_REGISTER_LIMIT } from '@/lib/rate-limit'
import { generateUniqueInviteCode, processInviteOnRegistration } from '@/lib/invite'

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

  // 创建用户（事务）
  const user = await prisma.$transaction(async (tx) => {
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

    // 处理邀请奖励
    if (inviter) {
      await processInviteOnRegistration(tx, newUser, inviter.id, inviteCodeFromQuery!)
    }

    return newUser
  })

  logAuthAction('REGISTER', name, { userId: user.id, success: true })

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
