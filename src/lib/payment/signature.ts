/**
 * 支付回调签名验证
 *
 * 设计目标：
 * - 按渠道分函数,各自独立可测
 * - 同步纯函数,不含 IO (Redis 重放检查在调度层做)
 * - 配置从参数传入,便于测试和未来多租户
 */

import { createVerify, constants } from 'node:crypto'
import type { PaymentMethod } from './types'

export interface AlipayVerifyConfig {
  /** RSA2 公钥 (PEM 格式,可能含 \n 转义) */
  publicKey: string
  /** 应用 ID,防止跨应用伪造 */
  appId: string
  /** 时间戳容差(秒),默认 300 (5 分钟) */
  timestampToleranceSec?: number
}

export type VerifySignatureResult = boolean

/**
 * 验证支付宝回调签名
 *
 * 支付宝签名规则:
 * 1. 取出 sign 字段
 * 2. 剩余字段按 key 字母序排序
 * 3. 用 &key=value 拼成待签字符串
 * 4. 用配置的 RSA2 公钥 + SHA256 验签
 * 5. 校验 app_id 一致
 * 6. 校验 notify_time 与当前时间差 <= 5 分钟
 */
export function verifyAlipaySignature(
  rawData: Record<string, string>,
  config: AlipayVerifyConfig
): VerifySignatureResult {
  const { publicKey, appId, timestampToleranceSec = 300 } = config

  // 1. sign 必须存在
  const sign = rawData.sign
  if (!sign) return false

  // 2. app_id 校验
  if (rawData.app_id !== appId) return false

  // 3. notify_time 时间戳校验
  const notifyTime = rawData.notify_time
  if (!notifyTime) return false
  const notifyMs = Date.parse(notifyTime.replace(/-/g, '/').replace(' ', '/') + ' GMT+8')
  if (Number.isNaN(notifyMs)) return false
  const ageSec = Math.abs(Date.now() - notifyMs) / 1000
  if (ageSec > timestampToleranceSec) return false

  // 4. 构造待签字符串(去除 sign 和 sign_type)
  const paramsToSign: Record<string, string> = {}
  for (const [k, v] of Object.entries(rawData)) {
    if (k === 'sign' || k === 'sign_type') continue
    if (v === '' || v === undefined || v === null) continue
    paramsToSign[k] = v
  }
  const sortedKeys = Object.keys(paramsToSign).sort()
  const signSource = sortedKeys
    .map((k) => `${k}=${paramsToSign[k]}`)
    .join('&')

  // 5. RSA2 (SHA256) 验签
  try {
    const normalizedKey = publicKey.replace(/\\n/g, '\n')
    const verifier = createVerify('RSA-SHA256')
    verifier.update(signSource, 'utf8')
    return verifier.verify(normalizedKey, sign, 'base64')
  } catch {
    return false
  }
}

/**
 * 渠道签名验证分发器
 *
 * 异步,因为未来可能包含 Redis 重放检查
 * 当前仅 Alipay 实现
 */
export async function verifyCallbackSignature(
  method: PaymentMethod,
  rawData: Record<string, string>,
  config: AlipayVerifyConfig
): Promise<VerifySignatureResult> {
  switch (method) {
    case 'alipay':
      return verifyAlipaySignature(rawData, config)
    case 'wechat':
    case 'stripe':
    case 'offline':
      // TODO: 后续 sprint 接入
      return false
    default:
      return false
  }
}
