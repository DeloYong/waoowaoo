/**
 * 积分定价查询
 */
import {
  getCreditPricing,
  getModelTierMap,
  type CreditPricing as CreditPricingType,
} from '@/lib/platform-config'
import type { MediaType, ModelTier, CreditQuote } from './types'

/**
 * 模型档次映射
 */
export const modelTierMap: Record<string, string> = {
  // 火山语音
  'doubao-tts-v1': 'audio-basic',
  'doubao-tts-premium-v1': 'audio-premium',
  'doubao-tts-long-v1': 'audio-basic',
  'doubao-voice-clone-v1': 'voice-design',
  'doubao-lipsync-v1': 'lipsync',
}

/**
 * 积分定价配置
 */
type PricingTier =
  | { perThousandChars: number; unit: 'chars' }
  | { perCall: number; unit: 'call' }
  | { perMinute: number; unit: 'minute' }

export const creditPricing: Record<string, PricingTier> = {
  'audio-basic': {
    perThousandChars: 1, // 每千字1积分
    unit: 'chars'
  },
  'audio-premium': {
    perThousandChars: 3, // 每千字3积分
    unit: 'chars'
  },
  'voice-design': {
    perCall: 100, // 每次100积分
    unit: 'call'
  },
  'lipsync': {
    perMinute: 50, // 每分钟50积分
    unit: 'minute'
  },
}

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
