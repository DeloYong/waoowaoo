/**
 * System test: User usage API dual billing support
 *
 * Tests that /api/user/usage route properly supports both
 * cash billing (consume type) and credit billing (credit_deduct type).
 */
import { describe, expect, it } from 'vitest'

describe('User Usage API - Dual Billing Support', () => {
  it('exports GET handler function', async () => {
    // Verify the route file exports GET function
    const routeModule = await import('@/app/api/user/usage/route')
    expect(routeModule.GET).toBeDefined()
    expect(typeof routeModule.GET).toBe('function')
  })

  it('payment service exports getRechargePackages function', async () => {
    // Verify the payment service exports the function used by recharge API
    const paymentModule = await import('@/lib/payment/service')
    expect(paymentModule.getRechargePackages).toBeDefined()
    expect(typeof paymentModule.getRechargePackages).toBe('function')
  })

  it('credit billing service exists with core functions', async () => {
    // Verify credit billing service is available
    const creditBillingModule = await import('@/lib/credit-billing/service')
    expect(creditBillingModule.grantCredits).toBeDefined()
    expect(creditBillingModule.freezeCredits).toBeDefined()
    expect(creditBillingModule.confirmCreditDeduct).toBeDefined()
  })
})

describe('normalizeConsumeAmount - cash billing amount fix', () => {
  it('handles normal amounts within reasonable range (yuan to credits)', async () => {
    const { normalizeConsumeAmount } = await import('@/lib/billing/consume-amount-fix')

    // 7.938 yuan -> 794 credits
    expect(normalizeConsumeAmount(7.938)).toBe(794)
    // 0.25 yuan -> 25 credits
    expect(normalizeConsumeAmount(0.25)).toBe(25)
    // 100 yuan -> 10000 credits
    expect(normalizeConsumeAmount(100)).toBe(10000)
  })

  it('fixes Decimal precision amplified by 1,000,000x', async () => {
    const { normalizeConsumeAmount } = await import('@/lib/billing/consume-amount-fix')

    // 7.938000 -> read as 7938000 (decimal point swallowed)
    expect(normalizeConsumeAmount(7938000)).toBe(794)
  })

  it('fixes Decimal precision amplified by 1,000x', async () => {
    const { normalizeConsumeAmount } = await import('@/lib/billing/consume-amount-fix')

    // 7.938 -> read as 7938 (3 decimal places swallowed)
    expect(normalizeConsumeAmount(7938)).toBe(794)
  })

  it('correctly handles various edge case magnitudes', async () => {
    const { normalizeConsumeAmount } = await import('@/lib/billing/consume-amount-fix')

    // 0.1 yuan read as 100000 (decimal swallowed) -> 10 credits
    expect(normalizeConsumeAmount(100000)).toBe(10)
    // 1.72 yuan read as 1720 (thousandx) -> 172 credits
    expect(normalizeConsumeAmount(1720)).toBe(172)
  })

  it('handles negative amounts correctly', async () => {
    const { normalizeConsumeAmount } = await import('@/lib/billing/consume-amount-fix')

    // Negative amounts should return positive credits
    expect(normalizeConsumeAmount(-7.938)).toBe(794)
    expect(normalizeConsumeAmount(-7938000)).toBe(794)
  })
})
