import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-errors'
import { getUserSubscriptionState } from '@/lib/credit-billing/guard'
import { getCreditBalance } from '@/lib/credit-billing/service'
import { getActivePlans } from '@/lib/subscription'

// 临时实现 - 实际项目需集成 next-auth 从 session 获取用户ID
export const GET = apiHandler(async (request: NextRequest) => {
  // 从请求头或其他地方获取用户ID，这里临时使用测试ID
  const userId = request.headers.get('x-user-id') || 'test-user-id'

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
