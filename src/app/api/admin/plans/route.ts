import { NextRequest, NextResponse } from 'next/server'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { requireAdmin } from '@/lib/admin/auth'
import { prisma } from '@/lib/prisma'

// 获取所有套餐
export const GET = apiHandler(async () => {
  await requireAdmin()
  
  const plans = await prisma.subscriptionPlan.findMany({
    orderBy: { sortOrder: 'asc' },
  })

  return NextResponse.json({ plans })
})
