import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-errors'
import { requireAdmin } from '@/lib/admin/auth'
import { prisma } from '@/lib/prisma'

export const GET = apiHandler(async (request: NextRequest) => {
  await requireAdmin()

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || 'month'

  let startDate: Date | undefined
  if (period === 'month') {
    startDate = new Date()
    startDate.setMonth(startDate.getMonth() - 1)
  }

  const inviteStats = await prisma.inviteRecord.groupBy({
    by: ['inviterId'],
    _count: { id: true },
    where: startDate ? { registeredAt: { gte: startDate } } : {},
    orderBy: { _count: { id: 'desc' } },
    take: 50,
  })

  const userIds = inviteStats.map((stat) => stat.inviterId)
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true, inviteCode: true },
  })

  const userMap = new Map(users.map((u) => [u.id, u]))

  const leaderboard = inviteStats.map((stat, index) => ({
    rank: index + 1,
    userId: stat.inviterId,
    user: userMap.get(stat.inviterId),
    inviteCount: stat._count.id,
  }))

  return NextResponse.json({ leaderboard, period })
})
