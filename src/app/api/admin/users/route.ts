import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const GET = async (request: NextRequest) => {
  // await requireAdmin()
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const skip = parseInt(searchParams.get('skip') || '0', 10)
  const take = Math.min(parseInt(searchParams.get('take') || '50', 10), 100)

  const where = search
    ? {
        OR: [{ name: { contains: search } }, { email: { contains: search } }],
      }
    : {}

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        balance: true,
        subscription: { include: { plan: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.user.count({ where }),
  ])

  return NextResponse.json({ users, total, skip, take })
}
