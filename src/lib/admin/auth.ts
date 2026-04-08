/**
 * 管理员鉴权
 */
import { getAuthSession } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export async function requireAdmin(): Promise<string> {
  const session = await getAuthSession()

  if (!session?.user?.id) {
    throw new Error('UNAUTHORIZED: Missing user ID')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  })

  if (!user?.isAdmin) {
    throw new Error('FORBIDDEN: Admin access required')
  }

  return session.user.id
}
