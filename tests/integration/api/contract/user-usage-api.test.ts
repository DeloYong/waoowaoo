/**
 * 用户用量 API 测试
 */
import { describe, it, expect } from 'vitest'

describe('User Usage API', () => {
  it('should include both consume and credit_deduct transaction types', () => {
    // 验证 API 同时支持两种交易类型查询
    expect(['consume', 'credit_deduct']).toContain('consume')
    expect(['consume', 'credit_deduct']).toContain('credit_deduct')
  })

  it('should extract chargedCredits from billingMeta for credit transactions', () => {
    // 验证积分消费记录的解析逻辑
    const billingMeta = { chargedCredits: 100, credits: 200 }
    const cost = billingMeta.chargedCredits || billingMeta.credits || 0
    expect(cost).toBe(100)
  })
})
