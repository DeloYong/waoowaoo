import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-errors'
import { prisma } from '@/lib/prisma'
import { getUserInvites, getUserInviteStats } from '@/lib/invite'
import { requireUserAuth } from '@/lib/api-auth'

export const GET = apiHandler(async (request: NextRequest) => {
  const authResult = await requireUserAuth()
  if (authResult instanceof NextResponse) return authResult

  const { session } = authResult
  const userId = session.user.id

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { inviteCode: true },
  })

  const [invites, stats] = await Promise.all([
    getUserInvites(userId),
    getUserInviteStats(userId),
  ])

  return NextResponse.json({
    inviteCode: user?.inviteCode,
    invites,
    stats,
  })
})
