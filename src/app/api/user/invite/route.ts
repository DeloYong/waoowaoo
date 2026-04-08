import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-errors'
import { prisma } from '@/lib/prisma'
import { getUserInvites, getUserInviteStats } from '@/lib/invite'

export const GET = apiHandler(async (request: NextRequest) => {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
