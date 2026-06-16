import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the signature module - we test route behavior, not crypto
const verifyMock = vi.hoisted(() => vi.fn(async () => false))
vi.mock('@/lib/payment/signature', () => ({
  verifyCallbackSignature: verifyMock,
}))

// Mock the payment service - we don't want to hit the DB
const handleSuccessMock = vi.hoisted(() => vi.fn(async () => true))
const handleFailureMock = vi.hoisted(() => vi.fn(async () => true))
vi.mock('@/lib/payment/service', () => ({
  handlePaymentSuccess: handleSuccessMock,
  handlePaymentFailure: handleFailureMock,
}))

const { POST } = await import('@/app/api/payment/callback/route')

function buildFormDataRequest(
  url: string,
  entries: Record<string, string>
): NextRequest {
  const fd = new FormData()
  for (const [k, v] of Object.entries(entries)) fd.append(k, v)
  return new NextRequest(url, { method: 'POST', body: fd })
}

describe('Payment Callback Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ALIPAY_APP_ID = '2021000000000000'
    process.env.ALIPAY_PUBLIC_KEY = 'test-public-key'
  })

  afterEach(() => {
    delete process.env.ALIPAY_APP_ID
    delete process.env.ALIPAY_PUBLIC_KEY
  })

  it('returns 401 when signature verification fails', async () => {
    verifyMock.mockResolvedValueOnce(false)
    handleSuccessMock.mockClear()

    const req = buildFormDataRequest(
      'http://localhost:3000/api/payment/callback?method=alipay',
      {
        out_trade_no: 'PAY123',
        trade_status: 'TRADE_SUCCESS',
        total_amount: '9.99',
        sign: 'fake',
      }
    )

    const res = await POST(req, {} as never)
    expect(res.status).toBe(401)
    expect(handleSuccessMock).not.toHaveBeenCalled()
  })

  it('processes valid signature and calls handlePaymentSuccess', async () => {
    verifyMock.mockResolvedValueOnce(true)
    handleSuccessMock.mockResolvedValueOnce(true)

    const req = buildFormDataRequest(
      'http://localhost:3000/api/payment/callback?method=alipay',
      {
        out_trade_no: 'PAY456',
        trade_status: 'TRADE_SUCCESS',
        total_amount: '49.00',
        trade_no: 'alipay-789',
        sign: 'valid',
      }
    )

    const res = await POST(req, {} as never)
    expect(res.status).toBe(200)
    expect(handleSuccessMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orderNo: 'PAY456',
        thirdPartyOrderId: 'alipay-789',
        amount: 49,
        status: 'success',
      })
    )
  })
})
