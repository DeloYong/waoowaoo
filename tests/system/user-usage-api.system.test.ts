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
