import { describe, it, expect } from 'vitest'
import { generateKeyPairSync, createSign } from 'node:crypto'
import { verifyAlipaySignature } from '@/lib/payment/signature'

describe('payment/signature - verifyAlipaySignature', () => {
  it('returns false when sign field is missing', () => {
    const rawData = {
      out_trade_no: 'PAY123',
      total_amount: '9.99',
      trade_status: 'TRADE_SUCCESS',
      app_id: '2021000000000000',
      notify_time: formatNotifyTime(new Date()),
    }

    const result = verifyAlipaySignature(rawData, {
      publicKey: 'fake-public-key',
      appId: '2021000000000000',
    })

    expect(result).toBe(false)
  })

  it('returns false when app_id does not match', () => {
    const rawData = {
      out_trade_no: 'PAY123',
      total_amount: '9.99',
      trade_status: 'TRADE_SUCCESS',
      app_id: '9999999999999999', // wrong
      notify_time: formatNotifyTime(new Date()),
      sign: 'fake-sign',
    }

    const result = verifyAlipaySignature(rawData, {
      publicKey: 'fake-public-key',
      appId: '2021000000000000',
    })

    expect(result).toBe(false)
  })

  it('returns false when notify_time is older than tolerance', () => {
    const oldTime = new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
    const rawData = {
      out_trade_no: 'PAY123',
      total_amount: '9.99',
      trade_status: 'TRADE_SUCCESS',
      app_id: '2021000000000000',
      notify_time: formatNotifyTime(oldTime),
      sign: 'fake-sign',
    }

    const result = verifyAlipaySignature(rawData, {
      publicKey: 'fake-public-key',
      appId: '2021000000000000',
      timestampToleranceSec: 300,
    })

    expect(result).toBe(false)
  })

  it('returns true for a valid signature', () => {
    // 生成测试用 RSA 密钥对
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    })

    const params: Record<string, string> = {
      out_trade_no: 'PAY123',
      total_amount: '9.99',
      trade_status: 'TRADE_SUCCESS',
      app_id: '2021000000000000',
      notify_time: formatNotifyTime(new Date()),
    }
    const sign = signAlipayParams(params, privateKey)
    const rawData = { ...params, sign }

    const result = verifyAlipaySignature(rawData, {
      publicKey,
      appId: '2021000000000000',
    })

    expect(result).toBe(true)
  })
})

/** 测试用:按支付宝规则生成签名 */
function signAlipayParams(params: Record<string, string>, privateKey: string): string {
  const sortedKeys = Object.keys(params).sort()
  const signSource = sortedKeys.map((k) => `${k}=${params[k]}`).join('&')
  const signer = createSign('RSA-SHA256')
  signer.update(signSource, 'utf8')
  return signer.sign(privateKey, 'base64')
}

/** 支付宝 notify_time 格式: yyyy-MM-dd HH:mm:ss */
function formatNotifyTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
