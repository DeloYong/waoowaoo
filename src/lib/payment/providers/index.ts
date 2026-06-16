/**
 * 支付渠道 Provider 索引
 *
 * 按渠道拆分实现,避免单文件膨胀
 * 未来接入微信/Stripe 只需新增文件 + 在此注册
 */

import { alipayProvider } from './alipay'
import { mockProvider } from './mock'
import type { PaymentProvider } from '../types'

const providers: Record<string, PaymentProvider> = {
  alipay: alipayProvider,
  mock: mockProvider,
}

export function getPaymentProvider(method: string): PaymentProvider {
  return providers[method] || mockProvider
}
