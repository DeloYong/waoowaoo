import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-errors'
import { prisma } from '@/lib/prisma'
import { processInviteOnRegistration } from '@/lib/invite/service'
import { getAuthSession } from '@/lib/api-auth'

export const POST = apiHandler(async (request: NextRequest) => {
  const session = await getAuthSession()
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

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

  await prisma.$transaction(async (tx) => {
    await processInviteOnRegistration(tx, user!, inviter.id, inviteCode)
  })

  return NextResponse.json({
    success: true,
    message: '邀请激活成功',
  })
})
