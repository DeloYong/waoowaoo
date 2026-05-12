/**
 * 支付订单API
 * - GET: 获取用户订单列表
 * - POST: 创建支付订单
 */

import { NextRequest, NextResponse } from 'next/server'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { requireUserAuth } from '@/lib/api-auth'
import {
  createPaymentOrder,
  getUserOrders,
  getOrderStatus,
  cancelOrder,
} from '@/lib/payment/service'
import { PaymentMethod, PaymentStatus } from '@/lib/payment/types'

export const GET = apiHandler(async (request: NextRequest) => {
  const authResult = await requireUserAuth()
  if (authResult instanceof NextResponse) {
    throw new ApiError('UNAUTHORIZED', { message: '请先登录' })
  }

  const { session } = authResult
  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get('status') as PaymentStatus | undefined
  const limit = parseInt(searchParams.get('limit') || '20', 10)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  const result = await getUserOrders(session.user.id, {
    status,
    limit,
    offset,
  })

  return NextResponse.json(result)
})

export const POST = apiHandler(async (request: NextRequest) => {
  const authResult = await requireUserAuth()
  if (authResult instanceof NextResponse) {
    throw new ApiError('UNAUTHORIZED', { message: '请先登录' })
  }

  const { session } = authResult
  const body = await request.json()

  const {
    packageId,
    credits,
    amount,
    paymentMethod = 'alipay',
    paymentChannel,
    returnUrl,
    description,
  } = body as {
    packageId?: string
    credits: number
    amount: number
    paymentMethod?: PaymentMethod
    paymentChannel?: string
    returnUrl?: string
    description?: string
  }

  if (!credits || credits <= 0) {
    throw new ApiError('INVALID_PARAMS', { message: '请输入有效的积分数量' })
  }

  if (!amount || amount <= 0) {
    throw new ApiError('INVALID_PARAMS', { message: '请输入有效的金额' })
  }

  const order = await createPaymentOrder({
    userId: session.user.id,
    credits,
    amount,
    paymentMethod,
    paymentChannel: paymentChannel as 'pc' | 'h5' | 'app' | undefined,
    packageId,
    returnUrl,
    description,
  })

  return NextResponse.json({
    success: true,
    order,
  })
})
