/**
 * 退款 API
 *
 * - 用户自助:仅可退自己的订单
 * - 管理员:任意订单
 *
 * HTTP 状态码:
 *  200 - 退款成功
 *  400 - 参数错误 / 订单状态不允许
 *  401 - 未登录
 *  403 - 订单不属于当前用户(且非管理员)
 *  404 - 订单不存在
 *  409 - 渠道退款失败,可重试
 */

import { NextRequest, NextResponse } from 'next/server'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { requireUserAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { refundOrder, type RefundError } from '@/lib/payment/refund'

export const POST = apiHandler(async (request: NextRequest) => {
  // 1. 鉴权
  const authResult = await requireUserAuth()
  if (authResult instanceof NextResponse) {
    throw new ApiError('UNAUTHORIZED', { message: '请先登录' })
  }
  const { session } = authResult
  const isAdmin = (session.user as { isAdmin?: boolean }).isAdmin === true

  // 2. 解析 body
  const body = (await request.json()) as {
    orderId?: string
    reason?: string
    amount?: number
  }
  const { orderId, reason, amount } = body
  if (!orderId) {
    throw new ApiError('INVALID_PARAMS', { message: 'orderId is required' })
  }

  // 3. 加载订单做归属校验
  const order = await prisma.paymentOrder.findUnique({
    where: { id: orderId },
    select: { id: true, userId: true },
  })
  if (!order) {
    throw new ApiError('NOT_FOUND', { message: '订单不存在' })
  }
  if (!isAdmin && order.userId !== session.user.id) {
    throw new ApiError('FORBIDDEN', { message: '无权操作该订单' })
  }

  // 4. 调用退款编排
  const result = await refundOrder({
    orderId,
    reason,
    amount,
    operatorId: isAdmin ? session.user.id : undefined,
  })

  // 5. 错误码映射
  if (!result.ok) {
    throw mapRefundErrorToApiError(result.error)
  }

  return NextResponse.json({
    ok: true,
    refundId: result.refundId,
    creditsDeducted: result.creditsDeducted,
  })
})

function mapRefundErrorToApiError(error: RefundError | undefined): ApiError {
  switch (error) {
    case 'ORDER_NOT_FOUND':
      return new ApiError('NOT_FOUND', { message: '订单不存在' })
    case 'ORDER_NOT_PAID':
      return new ApiError('INVALID_PARAMS', { message: '仅已支付订单可退款' })
    case 'AMOUNT_EXCEEDS':
      return new ApiError('INVALID_PARAMS', { message: '退款金额超过订单金额' })
    case 'CHANNEL_REFUND_FAILED':
      return new ApiError('CONFLICT', { message: '渠道退款失败,请稍后重试' })
    case 'CHANNEL_NOT_SUPPORTED':
      return new ApiError('EXTERNAL_ERROR', { message: '渠道暂不支持退款' })
    default:
      return new ApiError('INTERNAL_ERROR', { message: '退款失败' })
  }
}
