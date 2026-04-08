import { NextRequest, NextResponse } from 'next/server'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { requireAdmin } from '@/lib/admin/auth'
import { prisma } from '@/lib/prisma'

// 更新套餐
export const PUT = apiHandler(async (request: NextRequest, { params }) => {
  const adminId = await requireAdmin()
  const { id } = await params
  
  const body = await request.json()
  
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id },
  })
  
  if (!plan) {
    throw new ApiError('NOT_FOUND', '套餐不存在')
  }
  
  const updated = await prisma.subscriptionPlan.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.monthlyPrice !== undefined && { monthlyPrice: body.monthlyPrice }),
      ...(body.yearlyPrice !== undefined && { yearlyPrice: body.yearlyPrice }),
      ...(body.trialDays !== undefined && { trialDays: body.trialDays }),
      ...(body.monthlyCredits !== undefined && { monthlyCredits: body.monthlyCredits }),
      ...(body.maxVideoSeconds !== undefined && { maxVideoSeconds: body.maxVideoSeconds }),
      ...(body.maxConcurrency !== undefined && { maxConcurrency: body.maxConcurrency }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.features !== undefined && { features: body.features }),
    },
  })
  
  return NextResponse.json({ success: true, plan: updated })
})

// 部分更新套餐 (例如只更新状态)
export const PATCH = apiHandler(async (request: NextRequest, { params }) => {
  const adminId = await requireAdmin()
  const { id } = await params
  
  const body = await request.json()
  
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id },
  })
  
  if (!plan) {
    throw new ApiError('NOT_FOUND', '套餐不存在')
  }
  
  const updated = await prisma.subscriptionPlan.update({
    where: { id },
    data: {
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
  })
  
  return NextResponse.json({ success: true, plan: updated })
})
