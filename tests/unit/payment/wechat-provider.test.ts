import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'

const fetchMock = vi.hoisted(() => vi.fn())
vi.mock('node:crypto', async () => {
  const actual = await vi.importActual<typeof import('node:crypto')>('node:crypto')
  return {
    ...actual,
    randomUUID: vi.fn(() => 'abcdef1234567890abcdef1234567890'),
  }
})

// We need to set fetch before importing the module
const originalFetch = globalThis.fetch
beforeEach(() => {
  ;(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch
})
afterEach(() => {
  ;(globalThis as { fetch: typeof fetch }).fetch = originalFetch
  fetchMock.mockReset()
})

// Set required env BEFORE importing the module
process.env.WECHAT_APP_ID = 'wx1234567890'
process.env.WECHAT_MCH_ID = '1900000109'
process.env.WECHAT_API_KEY = '192006250b4c09247ec02edce69f6a2d'
process.env.WECHAT_NOTIFY_URL = 'https://example.com/callback'

const { wechatProvider } = await import('@/lib/payment/providers/wechat')

describe('payment/providers/wechat - createOrder HTTP POST', () => {
  it('returns paymentUrl with code_url on SUCCESS response', async () => {
    fetchMock.mockResolvedValueOnce({
      text: async () => `<?xml version="1.0" encoding="UTF-8"?>
<xml>
  <return_code>SUCCESS</return_code>
  <result_code>SUCCESS</result_code>
  <prepay_id>wx201410272009395522657a690389285100</prepay_id>
  <code_url>weixin://wxpay/bizpayurl?pr=abc123</code_url>
  <trade_type>NATIVE</trade_type>
</xml>`,
    } as Response)

    const result = await wechatProvider.createOrder({
      userId: 'u1',
      credits: 1000,
      amount: 9.99,
      paymentMethod: 'wechat',
      orderNo: 'PAY123',
      description: '充值 1000 积分',
      clientIp: '127.0.0.1',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.mch.weixin.qq.com/pay/unifiedorder')
    expect(init.method).toBe('POST')
    expect(init.headers['Content-Type']).toBe('application/xml')

    expect(result.orderNo).toBe('PAY123')
    expect(result.qrCode).toBe('weixin://wxpay/bizpayurl?pr=abc123')
  })

  it('throws on FAILED return_code', async () => {
    fetchMock.mockResolvedValueOnce({
      text: async () => `<?xml version="1.0" encoding="UTF-8"?>
<xml>
  <return_code>FAIL</return_code>
  <return_msg>商户号不存在</return_msg>
</xml>`,
    } as Response)

    await expect(
      wechatProvider.createOrder({
        userId: 'u1',
        credits: 100,
        amount: 1,
        paymentMethod: 'wechat',
        orderNo: 'PAY999',
        description: 'test',
      })
    ).rejects.toThrow(/商户号不存在/)
  })

  it('throws on network error', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network down'))

    await expect(
      wechatProvider.createOrder({
        userId: 'u1',
        credits: 100,
        amount: 1,
        paymentMethod: 'wechat',
        orderNo: 'PAY500',
        description: 'test',
      })
    ).rejects.toThrow('Network down')
  })
})
