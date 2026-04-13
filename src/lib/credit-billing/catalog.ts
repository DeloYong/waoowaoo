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
let cachedTierMap: Record<string, string> | null = null
let tierMapCacheTime = 0
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

async function getCachedTierMap(): Promise<Record<string, string>> {
  const now = Date.now()
  if (cachedTierMap && now - tierMapCacheTime < PRICING_CACHE_TTL) {
    return cachedTierMap
  }
  const dbTierMap = await getModelTierMap()
  // 合并硬编码映射和数据库映射（数据库优先）
  cachedTierMap = { ...modelTierMap, ...dbTierMap }
  tierMapCacheTime = now
  return cachedTierMap
}

/**
 * 根据 modelKey 解析模型对应的计费档次
 * 优先使用数据库配置的 model_tier_map，然后回退到硬编码映射
 */
async function resolveModelTier(
  mediaType: MediaType,
  modelKey: string,
  fallbackTier?: ModelTier,
): Promise<ModelTier> {
  const tierMap = await getCachedTierMap()

  // 提取 modelId（去除 provider 前缀）
  const modelId = modelKey.includes('::') ? modelKey.split('::').pop()! : modelKey

  // 先用完整 modelKey 查找，再用 modelId 查找
  const mappedTier = tierMap[modelKey] || tierMap[modelId]
  if (mappedTier) {
    // 映射值可能是 'basic'/'advanced'，也可能是自定义 tier 名
    if (mappedTier === 'basic' || mappedTier === 'advanced') {
      return mappedTier
    }
    // 对于 audio/voiceDesign/lipSync 类型的自定义 tier，不映射为 ModelTier
    // 这些类型有独立的定价，不受 tier 影响
  }

  // 对于 image 和 video 类型，根据模型名称推断档次
  if (mediaType === 'image' || mediaType === 'video') {
    // 高级模型关键词
    const advancedKeywords = ['pro', 'ultra', 'premium', 'advanced', 'max', 'hd', 'high']
    const lowerModelId = modelId.toLowerCase()
    if (advancedKeywords.some(kw => lowerModelId.includes(kw))) {
      return 'advanced'
    }
  }

  return fallbackTier || 'basic'
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

  // 如果调用方显式指定了 tier，优先使用
  let tier = options?.tier
  if (!tier) {
    // 根据 modelKey 自动解析 tier
    tier = await resolveModelTier(mediaType, modelKey)
  }

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
  cachedTierMap = null
  tierMapCacheTime = 0
}
