import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock prisma
const prismaMock = vi.hoisted(() => ({
  paymentOrder: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

// Mock credit-billing
const revokeMock = vi.hoisted(() => vi.fn(async () => true))
vi.mock('@/lib/credit-billing/service', () => ({
  revokeCredits: revokeMock,
}))

// Mock provider registry
const providerMock = vi.hoisted(() => ({
  refund: vi.fn(async () => true),
}))
vi.mock('@/lib/payment/providers', () => ({
  getPaymentProvider: () => providerMock,
}))

const { refundOrder } = await import('@/lib/payment/refund')

describe('payment/refund - refundOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock))
  })

  it('returns ORDER_NOT_FOUND when order does not exist', async () => {
    prismaMock.paymentOrder.findUnique.mockResolvedValueOnce(null)

    const result = await refundOrder({ orderId: 'order-1' })

    expect(result.ok).toBe(false)
    expect(result.error).toBe('ORDER_NOT_FOUND')
    expect(providerMock.refund).not.toHaveBeenCalled()
  })

  it('returns ORDER_NOT_PAID when order is still pending', async () => {
    prismaMock.paymentOrder.findUnique.mockResolvedValueOnce({
      id: 'order-1',
      status: 'pending',
      amount: { toNumber: () => 9.99 },
      credits: 100,
      userId: 'user-1',
      orderNo: 'PAY1',
      paymentMethod: 'alipay',
    })

    const result = await refundOrder({ orderId: 'order-1' })

    expect(result.ok).toBe(false)
    expect(result.error).toBe('ORDER_NOT_PAID')
    expect(providerMock.refund).not.toHaveBeenCalled()
  })

  it('returns CHANNEL_REFUND_FAILED and does not change DB when channel refund fails', async () => {
    prismaMock.paymentOrder.findUnique.mockResolvedValueOnce({
      id: 'order-1',
      status: 'paid',
      amount: { toNumber: () => 9.99 },
      credits: 100,
      userId: 'user-1',
      orderNo: 'PAY1',
      paymentMethod: 'alipay',
    })
    providerMock.refund.mockResolvedValueOnce(false)

    const result = await refundOrder({ orderId: 'order-1' })

    expect(result.ok).toBe(false)
    expect(result.error).toBe('CHANNEL_REFUND_FAILED')
    expect(prismaMock.paymentOrder.update).not.toHaveBeenCalled()
    expect(revokeMock).not.toHaveBeenCalled()
  })

  it('on success: updates order to refunded and revokes credits proportionally', async () => {
    prismaMock.paymentOrder.findUnique.mockResolvedValueOnce({
      id: 'order-1',
      status: 'paid',
      amount: { toNumber: () => 100 },
      credits: 1000,
      userId: 'user-1',
      orderNo: 'PAY1',
      paymentMethod: 'alipay',
    })
    providerMock.refund.mockResolvedValueOnce(true)
    prismaMock.paymentOrder.update.mockResolvedValueOnce({})
    revokeMock.mockResolvedValueOnce(true)

    const result = await refundOrder({ orderId: 'order-1', reason: 'user_request' })

    expect(result.ok).toBe(true)
    expect(result.refundId).toMatch(/^local-/)
    expect(providerMock.refund).toHaveBeenCalledWith(
      expect.objectContaining({ orderNo: 'PAY1', reason: 'user_request' })
    )
    expect(prismaMock.paymentOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order-1' },
        data: expect.objectContaining({
          status: 'refunded',
          refundAmount: 100,
        }),
      })
    )
    // 100/100 * 1000 = 1000 credits to revoke
    expect(revokeMock).toHaveBeenCalledWith('user-1', 1000, expect.any(Object))
  })

  it('partial refund: revokes proportional credits only', async () => {
    prismaMock.paymentOrder.findUnique.mockResolvedValueOnce({
      id: 'order-1',
      status: 'paid',
      amount: { toNumber: () => 100 },
      credits: 1000,
      userId: 'user-1',
      orderNo: 'PAY1',
      paymentMethod: 'alipay',
    })
    providerMock.refund.mockResolvedValueOnce(true)
    prismaMock.paymentOrder.update.mockResolvedValueOnce({})
    revokeMock.mockResolvedValueOnce(true)

    const result = await refundOrder({ orderId: 'order-1', amount: 30 })

    expect(result.ok).toBe(true)
    // 30/100 * 1000 = 300 credits
    expect(revokeMock).toHaveBeenCalledWith('user-1', 300, expect.any(Object))
  })
})
