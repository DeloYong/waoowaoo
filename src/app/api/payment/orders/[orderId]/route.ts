/**
 * 单个订单API
 * - GET: 查询订单状态
 * - DELETE: 取消订单
 */

import { NextRequest, NextResponse } from 'next/server'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { requireUserAuth } from '@/lib/api-auth'
import { getOrderStatus, cancelOrder } from '@/lib/payment/service'

export const GET = apiHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) => {
  const authResult = await requireUserAuth()
  if (authResult instanceof NextResponse) {
    throw new ApiError('UNAUTHORIZED', { message: '请先登录' })
  }

  const { session } = authResult
  const { orderId } = await params

  const order = await getOrderStatus(orderId, session.user.id)
  return NextResponse.json(order)
})

export const DELETE = apiHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) => {
  const authResult = await requireUserAuth()
  if (authResult instanceof NextResponse) {
    throw new ApiError('UNAUTHORIZED', { message: '请先登录' })
  }

  const { session } = authResult
  const { orderId } = await params

  await cancelOrder(orderId, session.user.id)
  return NextResponse.json({ success: true })
})
