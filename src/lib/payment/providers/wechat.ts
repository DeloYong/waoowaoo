/**
 * 微信支付 Provider
 *
 * 当前实现:
 * - createOrder: 构造统一下单 XML + 解析响应(POST 调用留作下一 sprint)
 * - 签名/验签基于 MD5
 * - 商户号/API Key 从 env 读取
 *
 * 真实接入需要:
 * - POST https://api.mch.weixin.qq.com/pay/unifiedorder
 * - 异步回调(支付通知)验签
 * - 退款申请 API
 */

import { randomUUID } from 'node:crypto'
import {
  buildWechatUnifiedOrderXml,
  parseWechatXmlResponse,
} from './wechat-sdk'
import type { PaymentProvider } from '../types'

export const wechatProvider: PaymentProvider = {
  createOrder: async ({ amount, orderNo, description, clientIp }) => {
    const appId = process.env.WECHAT_APP_ID
    const mchId = process.env.WECHAT_MCH_ID
    const apiKey = process.env.WECHAT_API_KEY
    const notifyUrl = process.env.WECHAT_NOTIFY_URL
    if (!appId || !mchId || !apiKey || !notifyUrl || !orderNo) {
      throw new Error('WeChat env config or orderNo missing')
    }

    // 金额单位转换: 元 -> 分
    const totalFee = Math.round(amount * 100)

    const xml = buildWechatUnifiedOrderXml({
      appId,
      mchId,
      apiKey,
      nonceStr: randomUUID().replace(/-/g, ''),
      body: description || `订单 ${orderNo}`,
      outTradeNo: orderNo,
      totalFee,
      spbillCreateIp: clientIp || '127.0.0.1',
      notifyUrl,
      tradeType: 'NATIVE',
    })

    // TODO: 实际 POST 到 https://api.mch.weixin.qq.com/pay/unifiedorder
    // 当前返回构造的 XML 供测试/调试
    return {
      orderNo,
      qrCode: `data:text/xml;base64,${Buffer.from(xml).toString('base64')}`,
      rawData: {
        xml,
        totalFee,
        appId,
        mchId,
        note: 'WeChat API POST not implemented - use mock for now',
      },
    }
  },

  queryOrder: async () => {
    throw new Error('WeChat queryOrder not implemented')
  },

  handleCallback: async (rawData) => {
    // rawData 在微信支付中是 XML 字符串
    const xml = typeof rawData === 'string' ? rawData : (rawData.xml as string) || ''
    const parsed = await parseWechatXmlResponse(xml)
    return {
      orderNo: parsed.out_trade_no || '',
      thirdPartyOrderId: parsed.transaction_id || '',
      amount: parseFloat(parsed.total_fee || '0') / 100, // 分 -> 元
      status: parsed.result_code === 'SUCCESS' ? 'success' : 'failed',
      paidAt: new Date(),
      rawData: parsed,
    }
  },

  refund: async ({ orderNo, amount, reason }) => {
    console.warn('[WeChat] refund not implemented', { orderNo, amount, reason })
    return false
  },

  verifySignature: () => {
    // 真实实现:用商户 API Key + 字段排序 + MD5
    // 当前未使用(verifyCallbackSignature 走通用路径)
    return false
  },
}
