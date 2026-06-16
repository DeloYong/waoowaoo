/**
 * 支付宝 Provider
 *
 * 真实实现需要:
 * - 沙箱/生产网关地址(从 env)
 * - 应用私钥(创建订单时用,从 env)
 * - 应用公钥(验签时用,从 env)
 *
 * 当前实现为可测试骨架,createOrder/refund 标注为 NotImplemented
 * 验签逻辑在 signature.ts,不在此处
 */

import type { PaymentProvider } from '../types'

export const alipayProvider: PaymentProvider = {
  createOrder: async () => {
    throw new Error('Alipay createOrder not implemented (use mock for now)')
  },

  queryOrder: async () => {
    throw new Error('Alipay queryOrder not implemented')
  },

  handleCallback: async (rawData) => {
    // 解析 + 转换原始数据为统一格式
    return {
      orderNo: (rawData.out_trade_no as string) || '',
      thirdPartyOrderId: (rawData.trade_no as string) || '',
      amount: parseFloat((rawData.total_amount as string) || '0'),
      status: 'success',
      paidAt: new Date(),
      rawData,
    }
  },

  refund: async ({ orderNo, amount, reason }) => {
    // 真实实现:调用 alipay trade.refund API
    // 当前为骨架,返回 false
    console.warn('[Alipay] refund not implemented', { orderNo, amount, reason })
    return false
  },

  verifySignature: () => {
    // 实际验签在 signature.ts 通过 createVerify 处理
    // 此处保持接口一致
    throw new Error('Use verifyAlipaySignature from signature.ts')
  },
}
