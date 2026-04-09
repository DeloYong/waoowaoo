import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-errors'
import { requireUserAuth } from '@/lib/api-auth'
import { getUserSubscriptionState } from '@/lib/credit-billing/guard'
import { getCreditBalance } from '@/lib/credit-billing/service'
import { getActivePlans } from '@/lib/subscription'

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
