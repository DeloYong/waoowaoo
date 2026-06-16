/**
 * 微信支付 Provider
 *
 * 实现:
 * - createOrder: 构造统一下单 XML + POST 到 unifiedorder + 解析 code_url
 * - 签名/验签基于 MD5
 * - 商户号/API Key 从 env 读取
 *
 * 未来:
 * - 异步回调(支付通知)验签
 * - 退款申请 API
 */

import { randomUUID } from 'node:crypto'
import {
  buildWechatUnifiedOrderXml,
  parseWechatXmlResponse,
} from './wechat-sdk'
import type { PaymentProvider } from '../types'

const WECHAT_UNIFIEDORDER_URL = 'https://api.mch.weixin.qq.com/pay/unifiedorder'

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

    // POST 到微信支付
    const response = await fetch(WECHAT_UNIFIEDORDER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml' },
      body: xml,
    })
    const responseXml = await response.text()
    const parsed = await parseWechatXmlResponse(responseXml)

    if (parsed.return_code !== 'SUCCESS') {
      throw new Error(
        `WeChat unifiedorder failed: ${parsed.return_msg || 'unknown error'} (code=${parsed.return_code})`
      )
    }

    if (parsed.result_code && parsed.result_code !== 'SUCCESS') {
      throw new Error(
        `WeChat unifiedorder business error: ${parsed.err_code_des || parsed.err_code || 'unknown'}`
      )
    }

    return {
      orderNo,
      qrCode: parsed.code_url,
      rawData: {
        prepayId: parsed.prepay_id,
        codeUrl: parsed.code_url,
        tradeType: parsed.trade_type,
        totalFee,
        appId,
        mchId,
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
