import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  userBalance: {
    findUnique: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
  balanceTransaction: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  $transaction: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/lib/observability', () => ({
  trackEvent: vi.fn(),
}))

const { revokeCredits } = await import('@/lib/credit-billing/service')

describe('credit-billing/service - revokeCredits', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    prismaMock.$transaction.mockImplementation(
      async (fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock)
    )
  })

  it('returns false when credits <= 0', async () => {
    const result = await revokeCredits('user-1', 0)
    expect(result).toBe(false)
    expect(prismaMock.userBalance.update).not.toHaveBeenCalled()
  })

  it('decrements permanentCredits from user balance', async () => {
    prismaMock.balanceTransaction.findFirst.mockResolvedValueOnce(null) // no idempotency hit
    prismaMock.userBalance.findUnique.mockResolvedValueOnce({
      userId: 'user-1',
      permanentCredits: 500,
      subscriptionCredits: 0,
    })
    prismaMock.userBalance.update.mockResolvedValueOnce({})
    prismaMock.balanceTransaction.create.mockResolvedValueOnce({})

    const result = await revokeCredits('user-1', 100, {
      reason: 'refund:test',
      idempotencyKey: 'refund:order-1',
    })

    expect(result).toBe(true)
    expect(prismaMock.userBalance.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        data: expect.objectContaining({
          permanentCredits: { decrement: 100 },
        }),
      })
    )
  })

  it('deducts from subscription first, then permanent (mirrors grantCredits logic)', async () => {
    prismaMock.balanceTransaction.findFirst.mockResolvedValueOnce(null)
    prismaMock.userBalance.findUnique.mockResolvedValueOnce({
      userId: 'user-1',
      permanentCredits: 500,
      subscriptionCredits: 200,
    })
    prismaMock.userBalance.update.mockResolvedValueOnce({})
    prismaMock.balanceTransaction.create.mockResolvedValueOnce({})

    // 撤销 250:先扣 subscription 200,再扣 permanent 50
    const result = await revokeCredits('user-1', 250, { reason: 'refund:test' })

    expect(result).toBe(true)
    expect(prismaMock.userBalance.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subscriptionCredits: { decrement: 200 },
          permanentCredits: { decrement: 50 },
        }),
      })
    )
  })

  it('is idempotent on the same idempotencyKey', async () => {
    prismaMock.balanceTransaction.findFirst.mockResolvedValueOnce({
      id: 'tx-1',
      userId: 'user-1',
      type: 'credit_revoke',
    })

    const result = await revokeCredits('user-1', 100, {
      idempotencyKey: 'refund:order-1',
    })

    expect(result).toBe(true)
    expect(prismaMock.userBalance.update).not.toHaveBeenCalled()
  })
})
