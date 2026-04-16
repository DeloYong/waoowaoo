import { NextRequest, NextResponse } from 'next/server'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { requireUserAuth } from '@/lib/api-auth'
import { getUserSubscriptionState } from '@/lib/credit-billing/guard'
import { getCreditBalance } from '@/lib/credit-billing/service'
import { getActivePlans, assignPlan } from '@/lib/subscription/service'

export const GET = apiHandler(async (request: NextRequest) => {
  const authResult = await requireUserAuth()

  // 未登录用户仍返回 plans 列表
  if (authResult instanceof NextResponse) {
    const plans = await getActivePlans()
    return NextResponse.json({
      subscription: null,
      balance: null,
      plans,
    })
  }

  const { session } = authResult
  const userId = session.user.id

  const [subscription, balance, plans] = await Promise.all([
    getUserSubscriptionState(userId),
    getCreditBalance(userId),
    getActivePlans(),
  ])

  return NextResponse.json({
    subscription,
    balance,
    plans,
  })
})

export const POST = apiHandler(async (request: NextRequest) => {
  const authResult = await requireUserAuth()
  if (authResult instanceof NextResponse) {
    throw new ApiError('UNAUTHORIZED', '请先登录')
  }

  const { session } = authResult
  const userId = session.user.id
  const body = await request.json()
  const { planId, billingCycle = 'monthly' } = body as {
    planId: string
    billingCycle?: 'monthly' | 'yearly'
  }

  if (!planId) {
    throw new ApiError('VALIDATION_ERROR', '请选择套餐')
  }

  try {
    await assignPlan(userId, planId, { billingCycle })
    return NextResponse.json({ success: true, message: '订阅成功' })
  } catch (error) {
    if (error instanceof Error && error.message.includes('NotFound')) {
      throw new ApiError('VALIDATION_ERROR', '套餐不存在')
    }
    throw new ApiError('INTERNAL_ERROR', '订阅失败，请稍后重试')
  }
})
