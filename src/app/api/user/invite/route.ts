import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserInvites, getUserInviteStats } from '@/lib/invite'

export const GET = async () => {
  // const session = await getServerSession(authOptions)
  // if (!session?.user?.id) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // }
  const userId = 'test-user-id' // 临时测试 ID

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
}
