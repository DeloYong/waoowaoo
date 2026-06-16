/**
 * 退款编排
 *
 * 关键设计决策:
 * 1. 先调渠道,后改本地 → 渠道失败时本地状态保持 paid,可重试
 * 2. 事务内更新订单 + 回收积分 → 原子性
 * 3. 按金额比例回收积分 → 简单可解释
 * 4. 渠道方支付单号作为 refundId 记录 → 便于对账
 */

import { prisma } from '@/lib/prisma'
import { revokeCredits } from '@/lib/credit-billing/service'
import { getPaymentProvider } from './providers'

export interface RefundRequest {
  orderId: string
  reason?: string
  amount?: number // 不传 = 全额
  operatorId?: string // 管理员操作时记录
}

export type RefundError =
  | 'ORDER_NOT_FOUND'
  | 'ORDER_NOT_PAID'
  | 'AMOUNT_EXCEEDS'
  | 'CHANNEL_REFUND_FAILED'
  | 'CHANNEL_NOT_SUPPORTED'

export interface RefundResult {
  ok: boolean
  refundId?: string
  creditsDeducted?: number
  error?: RefundError
  errorDetail?: string
}

export async function refundOrder(req: RefundRequest): Promise<RefundResult> {
  // 1. 加载订单
  const order = await prisma.paymentOrder.findUnique({
    where: { id: req.orderId },
  })
  if (!order) return { ok: false, error: 'ORDER_NOT_FOUND' }

  // 2. 仅 paid 订单可退
  if (order.status !== 'paid') return { ok: false, error: 'ORDER_NOT_PAID' }

  // 3. 计算退款金额
  const orderAmount = order.amount.toNumber()
  const refundAmount = req.amount ?? orderAmount
  if (refundAmount > orderAmount) {
    return { ok: false, error: 'AMOUNT_EXCEEDS' }
  }

  // 4. 先调渠道(失败则本地状态不变,可重试)
  const provider = getPaymentProvider(order.paymentMethod ?? 'mock')
  const channelOk = await provider.refund({
    orderId: order.id,
    orderNo: order.orderNo,
    amount: refundAmount,
    reason: req.reason,
  })
  if (!channelOk) {
    return {
      ok: false,
      error: 'CHANNEL_REFUND_FAILED',
    }
  }

  // 5. 事务内:更新订单
  const thirdPartyRefundId = `local-${Date.now()}-${order.id}`
  await prisma.$transaction(async (tx) => {
    await tx.paymentOrder.update({
      where: { id: order.id },
      data: {
        status: 'refunded',
        refundAmount,
        refundedAt: new Date(),
        thirdPartyOrderId: thirdPartyRefundId,
        metadata: {
          ...((order.metadata as Record<string, unknown>) || {}),
          refundReason: req.reason,
          refundOperatorId: req.operatorId,
        },
      },
    })
  })

  // 6. 积分回收(在事务外调用,失败不影响订单已退状态)
  const proportion = refundAmount / orderAmount
  const creditsToRevoke = Math.floor(order.credits * proportion)
  let creditsDeducted = 0
  if (creditsToRevoke > 0) {
    const revoked = await revokeCredits(order.userId, creditsToRevoke, {
      reason: `refund:${order.orderNo}`,
      idempotencyKey: `refund:${order.id}`,
    })
    if (revoked) creditsDeducted = creditsToRevoke
  }

  return {
    ok: true,
    refundId: thirdPartyRefundId,
    creditsDeducted,
  }
}
