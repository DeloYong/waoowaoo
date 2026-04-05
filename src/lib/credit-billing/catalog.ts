/**
 * 积分定价查询
 */
import {
  getCreditPricing,
  getModelTierMap,
  type CreditPricing as CreditPricingType,
} from '@/lib/platform-config'
import type { MediaType, ModelTier, CreditQuote } from './types'

let cachedPricing: CreditPricingType | null = null
let pricingCacheTime = 0
const PRICING_CACHE_TTL = 60 * 1000 // 60 秒

async function getCachedPricing(): Promise<CreditPricingType> {
  const now = Date.now()
  if (cachedPricing && now - pricingCacheTime < PRICING_CACHE_TTL) {
    return cachedPricing
  }
  cachedPricing = await getCreditPricing()
  pricingCacheTime = now
  return cachedPricing
}

/**
 * 计算积分消耗报价
 */
export async function quoteCredits(
  mediaType: MediaType,
  modelKey: string,
  quantity: number,
  options?: { tier?: ModelTier; resolution?: string; duration?: number }
): Promise<CreditQuote> {
  const pricing = await getCachedPricing()
  const tier = options?.tier || 'basic'

  let unitPrice = 0
  switch (mediaType) {
    case 'image':
      unitPrice = tier === 'basic' ? pricing.image.basic : pricing.image.advanced
      break
    case 'video':
      unitPrice = tier === 'basic' ? pricing.video.basic_per_sec : pricing.video.advanced_per_sec
      break
    case 'text':
      unitPrice = pricing.text.per_1000_chars
      break
    case 'audio':
      unitPrice = pricing.audio.per_10_sec
      break
    case 'voiceDesign':
      unitPrice = pricing.voiceDesign.per_call
      break
    case 'lipSync':
      unitPrice = pricing.lipSync.per_call
      break
  }

  const totalCredits = Math.ceil(unitPrice * quantity)

  return {
    totalCredits,
    breakdown: {
      tier,
      quantity,
      unitPrice,
    },
    mediaType,
    modelKey,
  }
}

/**
 * 清空缓存（测试用）
 */
export function clearPricingCache(): void {
  cachedPricing = null
  pricingCacheTime = 0
}
