import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-errors'
import { getAuthSession } from '@/lib/api-auth'
import { getUserSubscriptionState } from '@/lib/credit-billing/guard'
import { getCreditBalance } from '@/lib/credit-billing/service'
import { getActivePlans } from '@/lib/subscription'

export const GET = apiHandler(async (request: NextRequest) => {
  const session = await getAuthSession()
  
  // 如果未登录,返回空数据而不是报错
  if (!session?.user?.id) {
    const plans = await getActivePlans()
    return NextResponse.json({
      subscription: null,
      balance: null,
      plans,
    })
  }

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
