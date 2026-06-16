/**
 * Mock Provider
 *
 * 用于开发环境和单元测试
 * 行为可预测,默认成功
 */

import type { PaymentProvider } from '../types'

export const mockProvider: PaymentProvider = {
  createOrder: async () => ({
    orderNo: `MOCK-${Date.now()}`,
    paymentUrl: '/api/payment/mock',
    rawData: {},
  }),

  queryOrder: async () => ({
    status: 'paid' as const,
  }),

  handleCallback: async (rawData) => ({
    orderNo: (rawData.orderNo as string) || '',
    thirdPartyOrderId: `MOCK-TX-${Date.now()}`,
    amount: parseFloat((rawData.amount as string) || '0'),
    status: 'success' as const,
    paidAt: new Date(),
    rawData,
  }),

  refund: async () => {
    // 测试可配置:通过 MOCK_REFUND_FAIL=1 环境变量强制失败
    if (process.env.MOCK_REFUND_FAIL === '1') {
      return false
    }
    return true
  },

  verifySignature: () => true,
}
