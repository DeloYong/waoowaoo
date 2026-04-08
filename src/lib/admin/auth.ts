/**
 * 管理员鉴权
 */
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'

export async function requireAdmin(): Promise<string> {
  const headersList = await headers()
  const userId = headersList.get('x-user-id')

  if (!userId) {
    throw new Error('UNAUTHORIZED: Missing user ID')
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  })

  if (!user?.isAdmin) {
    throw new Error('FORBIDDEN: Admin access required')
  }

  return userId
}
