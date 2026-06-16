import { generateKeyPairSync, createSign } from 'node:crypto'
import { describe, it, expect, vi } from 'vitest'
import { signAlipayRequest, buildAlipayCreateOrderUrl } from '@/lib/payment/providers/alipay-sdk'

describe('payment/providers/alipay-sdk', () => {
  it('signs request with RSA2 (SHA256) and returns base64 sign', () => {
    const { privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    })

    const params = {
      app_id: '2021000000000000',
      method: 'alipay.trade.page.pay',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: '2026-06-16 12:00:00',
      version: '1.0',
      biz_content: JSON.stringify({ out_trade_no: 'PAY1', total_amount: '9.99', subject: 'test' }),
    }

    const sign = signAlipayRequest(params, privateKey)

    expect(sign).toMatch(/^[A-Za-z0-9+/=]+$/) // base64
    expect(sign.length).toBeGreaterThan(50)
  })

  it('builds Alipay gateway URL with sorted params and sign', () => {
    const { privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    })

    const url = buildAlipayCreateOrderUrl({
      appId: '2021000000000000',
      privateKey,
      gateway: 'https://openapi.alipaydev.com/gateway.do',
      notifyUrl: 'https://example.com/callback',
      returnUrl: 'https://example.com/return',
      outTradeNo: 'PAY123',
      totalAmount: '9.99',
      subject: '充值 100 积分',
    })

    expect(url).toContain('https://openapi.alipaydev.com/gateway.do?')
    expect(url).toContain('app_id=2021000000000000')
    // out_trade_no 在 biz_content (JSON) 内
    expect(url).toContain(encodeURIComponent('"out_trade_no":"PAY123"'))
    expect(url).toContain(encodeURIComponent('"total_amount":"9.99"'))
    expect(url).toContain('sign=')
    expect(url).toContain('sign_type=RSA2')
    const params = new URL(url).searchParams
    expect(params.get('sign_type')).toBe('RSA2')
  })

  it('URL-encodes special characters in subject', () => {
    const { privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    })

    const url = buildAlipayCreateOrderUrl({
      appId: '2021000000000000',
      privateKey,
      gateway: 'https://openapi.alipaydev.com/gateway.do',
      notifyUrl: 'https://example.com/callback',
      outTradeNo: 'PAY1',
      totalAmount: '1.00',
      subject: '测试商品&特殊字符',
    })

    expect(url).toContain(encodeURIComponent('测试商品&特殊字符'))
  })
})
