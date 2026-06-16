/**
 * 微信支付 SDK (轻量自实现,无外部依赖)
 *
 * 流程:
 * 1. 构建请求参数对象
 * 2. 按 key 字母序拼接 a=k&b=v...&key=API_KEY
 * 3. MD5 或 HMAC-SHA256 签名(大写)
 * 4. 包装为 XML 发送
 * 5. 解析 XML 响应
 *
 * 沙箱文档: https://pay.weixin.qq.com/wiki/doc/api/native.php
 */

import { createHash, createHmac } from 'node:crypto'

export type WechatSignType = 'MD5' | 'HMAC-SHA256'

export function signWechatRequest(
  params: Record<string, string>,
  apiKey: string,
  signType: WechatSignType = 'MD5'
): string {
  const sortedKeys = Object.keys(params).sort()
  const signSource =
    sortedKeys
      .filter((k) => params[k] !== undefined && params[k] !== '')
      .map((k) => `${k}=${params[k]}`)
      .join('&') + `&key=${apiKey}`

  if (signType === 'MD5') {
    return createHash('md5').update(signSource, 'utf8').digest('hex').toUpperCase()
  }
  return createHmac('sha256', apiKey).update(signSource, 'utf8').digest('hex').toUpperCase()
}

export interface WechatUnifiedOrderInput {
  appId: string
  mchId: string
  apiKey: string
  nonceStr: string
  body: string
  outTradeNo: string
  totalFee: number // 单位:分
  spbillCreateIp: string
  notifyUrl: string
  tradeType: 'NATIVE' | 'JSAPI' | 'APP' | 'H5' | 'MWEB'
  signType?: WechatSignType
}

/**
 * 构建统一下单 XML 请求
 */
export function buildWechatUnifiedOrderXml(input: WechatUnifiedOrderInput): string {
  const params: Record<string, string> = {
    appid: input.appId,
    mch_id: input.mchId,
    nonce_str: input.nonceStr,
    body: input.body,
    out_trade_no: input.outTradeNo,
    total_fee: String(input.totalFee),
    spbill_create_ip: input.spbillCreateIp,
    notify_url: input.notifyUrl,
    trade_type: input.tradeType,
  }
  const signType = input.signType ?? 'MD5'
  params.sign_type = signType

  const sign = signWechatRequest(params, input.apiKey, signType)
  params.sign = sign

  const body = Object.entries(params)
    .map(([k, v]) => `<${k}>${escapeXml(v)}</${k}>`)
    .join('\n  ')

  return `<?xml version="1.0" encoding="UTF-8"?>
<xml>
  ${body}
</xml>`
}

/**
 * 解析微信支付 XML 响应为对象
 */
export async function parseWechatXmlResponse(xml: string): Promise<Record<string, string>> {
  // 简单实现: 先去掉 XML 声明和外层 <xml> 包装
  let body = xml.replace(/<\?xml[^?]*\?>/g, '').replace(/<xml>|<\/xml>/g, '')
  const result: Record<string, string> = {}
  const re = /<([A-Za-z_]+)>([\s\S]*?)<\/\1>/g
  let match
  while ((match = re.exec(body)) !== null) {
    result[match[1]] = match[2].trim()
  }
  return result
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
