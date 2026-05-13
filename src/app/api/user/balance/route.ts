import { NextResponse } from 'next/server'
import { getCreditBalance } from '@/lib/credit-billing/service'
import { BILLING_CURRENCY } from '@/lib/billing/currency'
import { requireUserAuth, isErrorResponse } from '@/lib/api-auth'
import { apiHandler } from '@/lib/api-errors'

/**
 * GET /api/user/balance
 * 获取当前用户余额
 */
export const GET = apiHandler(async () => {
    // 🔐 统一权限验证
    const authResult = await requireUserAuth()
    if (isErrorResponse(authResult)) return authResult
    const { session } = authResult

    const balance = await getCreditBalance(session.user.id)

    return NextResponse.json({
        success: true,
        currency: BILLING_CURRENCY,
        ...balance,
    })
})
