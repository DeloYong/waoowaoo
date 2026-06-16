/**
 * 支付宝 Provider
 *
 * 真实实现:
 * - 沙箱/生产网关地址(从 env)
 * - 应用私钥(创建订单时用,从 env)
 * - 应用公钥(验签时用,从 env)
 *
 * 验签逻辑在 signature.ts,不在此处
 */

import { buildAlipayCreateOrderUrl } from './alipay-sdk'
import type { PaymentProvider } from '../types'

export const alipayProvider: PaymentProvider = {
  createOrder: async ({ amount, orderNo, description }) => {
    const appId = process.env.ALIPAY_APP_ID
    const privateKey = process.env.ALIPAY_PRIVATE_KEY
    const gateway = process.env.ALIPAY_GATEWAY ?? 'https://openapi.alipaydev.com/gateway.do'
    const notifyUrl = process.env.ALIPAY_NOTIFY_URL
    if (!appId || !privateKey || !notifyUrl || !orderNo) {
      throw new Error('Alipay env config or orderNo missing: ALIPAY_APP_ID/PRIVATE_KEY/NOTIFY_URL')
    }

    const paymentUrl = buildAlipayCreateOrderUrl({
      appId,
      privateKey,
      gateway,
      notifyUrl,
      outTradeNo: orderNo,
      totalAmount: String(amount),
      subject: description || `订单 ${orderNo}`,
    })

    return {
      orderNo,
      paymentUrl,
      rawData: { paymentUrl, gateway, appId },
    }
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
