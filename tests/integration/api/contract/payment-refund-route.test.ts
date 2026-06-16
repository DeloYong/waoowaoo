import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Mock auth
const authState = vi.hoisted(() => ({ userId: 'user-1', isAdmin: false }))
const requireUserAuthMock = vi.hoisted(() => vi.fn(async () => ({ session: { user: { id: 'user-1', isAdmin: false } } })))
vi.mock('@/lib/api-auth', () => ({
  requireUserAuth: requireUserAuthMock,
}))

// Mock prisma for order ownership check
const orderMock = vi.hoisted(() => ({
  paymentOrder: { findUnique: vi.fn() },
}))
vi.mock('@/lib/prisma', () => ({ prisma: orderMock }))

// Mock refund
const refundMock = vi.hoisted(() => vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({ ok: true, refundId: 'rf-1', creditsDeducted: 50 })))
vi.mock('@/lib/payment/refund', () => ({
  refundOrder: refundMock,
}))

const { POST } = await import('@/app/api/payment/refund/route')

function buildJsonRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('Payment Refund API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 重新设置 requireUserAuth 实现(clearAllMocks 不清实现,resetAllMocks 会清)
    requireUserAuthMock.mockImplementation(async () => {
      if (!authState.userId) {
        const { NextResponse } = await import('next/server')
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 }) as never
      }
      return {
        session: {
          user: { id: authState.userId, isAdmin: authState.isAdmin },
        },
      } as never
    })
    authState.userId = 'user-1'
    authState.isAdmin = false
  })

  afterEach(() => {
    authState.userId = 'user-1'
    authState.isAdmin = false
  })

  it('returns 401 when not authenticated', async () => {
    authState.userId = ''
    const req = buildJsonRequest('http://localhost:3000/api/payment/refund', {
      orderId: 'order-1',
    })
    const res = await POST(req, {} as never)
    expect(res.status).toBe(401)
  })

  it('returns 403 when user does not own the order', async () => {
    orderMock.paymentOrder.findUnique.mockResolvedValueOnce({
      id: 'order-1',
      userId: 'other-user', // not user-1
    })
    const req = buildJsonRequest('http://localhost:3000/api/payment/refund', {
      orderId: 'order-1',
    })
    const res = await POST(req, {} as never)
    expect(res.status).toBe(403)
  })

  it('allows admin to refund any order', async () => {
    authState.isAdmin = true
    orderMock.paymentOrder.findUnique.mockResolvedValueOnce({
      id: 'order-1',
      userId: 'other-user',
    })
    refundMock.mockResolvedValueOnce({ ok: true, refundId: 'rf-admin', creditsDeducted: 100 })

    const req = buildJsonRequest('http://localhost:3000/api/payment/refund', {
      orderId: 'order-1',
      reason: 'customer complaint',
    })
    const res = await POST(req, {} as never)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.refundId).toBe('rf-admin')
    expect(refundMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order-1',
        reason: 'customer complaint',
        operatorId: expect.any(String), // admin user id
      })
    )
  })

  it('refunds owned order successfully', async () => {
    orderMock.paymentOrder.findUnique.mockResolvedValueOnce({
      id: 'order-1',
      userId: 'user-1', // owns it
    })
    refundMock.mockResolvedValueOnce({ ok: true, refundId: 'rf-self', creditsDeducted: 50 })

    const req = buildJsonRequest('http://localhost:3000/api/payment/refund', {
      orderId: 'order-1',
    })
    const res = await POST(req, {} as never)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(refundMock).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'order-1' })
    )
  })

  it('returns 400 when refundOrder returns ORDER_NOT_PAID', async () => {
    orderMock.paymentOrder.findUnique.mockResolvedValueOnce({
      id: 'order-1',
      userId: 'user-1',
    })
    refundMock.mockResolvedValueOnce({ ok: false, error: 'ORDER_NOT_PAID' })

    const req = buildJsonRequest('http://localhost:3000/api/payment/refund', {
      orderId: 'order-1',
    })
    const res = await POST(req, {} as never)
    expect(res.status).toBe(400)
  })

  it('returns 409 when channel refund fails', async () => {
    orderMock.paymentOrder.findUnique.mockResolvedValueOnce({
      id: 'order-1',
      userId: 'user-1',
    })
    refundMock.mockResolvedValueOnce({ ok: false, error: 'CHANNEL_REFUND_FAILED' })

    const req = buildJsonRequest('http://localhost:3000/api/payment/refund', {
      orderId: 'order-1',
    })
    const res = await POST(req, {} as never)
    expect(res.status).toBe(409)
  })
})
