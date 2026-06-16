/**
 * 支付宝 SDK (轻量自实现,无外部依赖)
 *
 * 功能:
 * - signAlipayRequest: 用 RSA2 (SHA256) 私钥签名参数
 * - buildAlipayCreateOrderUrl: 构造 alipay.trade.page.pay 支付 URL
 *
 * 设计:
 * - 同步签名(本地),异步构造 URL
 * - 字段排序: 按 key 字母序
 * - 排除 sign / sign_type 字段
 * - 空值字段排除
 * - 字段值需要 URL-encode
 */

import { createSign } from 'node:crypto'

export type AlipayParamValue = string | number | undefined

export function signAlipayRequest(
  params: Record<string, AlipayParamValue>,
  privateKey: string
): string {
  const sortedKeys = Object.keys(params)
    .filter((k) => k !== 'sign' && k !== 'sign_type')
    .filter((k) => params[k] !== undefined && params[k] !== '')
    .sort()

  const signSource = sortedKeys
    .map((k) => `${k}=${params[k]}`)
    .join('&')

  const normalizedKey = privateKey.replace(/\\n/g, '\n')
  const signer = createSign('RSA-SHA256')
  signer.update(signSource, 'utf8')
  return signer.sign(normalizedKey, 'base64')
}

export interface BuildCreateOrderUrlInput {
  appId: string
  privateKey: string
  gateway: string
  notifyUrl: string
  returnUrl?: string
  outTradeNo: string
  totalAmount: string | number
  subject: string
  body?: string
  timeoutExpress?: string // 默认 '15m'
}

export function buildAlipayCreateOrderUrl(input: BuildCreateOrderUrlInput): string {
  const bizContent: Record<string, string | number> = {
    out_trade_no: input.outTradeNo,
    total_amount: String(input.totalAmount),
    subject: input.subject,
  }
  if (input.body) bizContent.body = input.body
  if (input.timeoutExpress) bizContent.timeout_express = input.timeoutExpress

  const params: Record<string, AlipayParamValue> = {
    app_id: input.appId,
    method: 'alipay.trade.page.pay',
    charset: 'utf-8',
    sign_type: 'RSA2',
    timestamp: formatAlipayTimestamp(new Date()),
    version: '1.0',
    notify_url: input.notifyUrl,
    return_url: input.returnUrl,
    biz_content: JSON.stringify(bizContent),
  }

  // 移除 undefined/空字段(签名要求)
  const cleanParams: Record<string, string> = {}
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') {
      cleanParams[k] = String(v)
    }
  }

  const sign = signAlipayRequest(cleanParams, input.privateKey)
  cleanParams.sign = sign

  // 构造 URL (字段值 URL-encode)
  const queryString = Object.entries(cleanParams)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')

  return `${input.gateway}?${queryString}`
}

function formatAlipayTimestamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
