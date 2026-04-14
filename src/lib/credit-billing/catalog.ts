/**
 * 积分定价查询
 */
import {
  getCreditPricing,
  getModelTierMap,
  type CreditPricing as CreditPricingType,
} from '@/lib/platform-config'
import type { MediaType, ModelTier, CreditQuote } from './types'
import { trackEvent } from '@/lib/observability'

/**
 * 模型档次映射（硬编码默认值，可被数据库配置覆盖）
 */
export const modelTierMap: Record<string, string> = {
  // 火山语音
  'doubao-tts-v1': 'audio-basic',
  'doubao-tts-premium-v1': 'audio-premium',
  'doubao-tts-long-v1': 'audio-basic',
  'doubao-voice-clone-v1': 'voice-design',
  'doubao-lipsync-v1': 'lipsync',
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
 * 返回 tier 或自定义 tier 名（如 'audio-basic'）
 */
async function resolveModelTier(
  mediaType: MediaType,
  modelKey: string,
  fallbackTier?: ModelTier,
): Promise<string> {
  const tierMap = await getCachedTierMap()

  // 提取 modelId（去除 provider 前缀）
  const modelId = modelKey.includes('::') ? modelKey.split('::').pop()! : modelKey

  // 先用完整 modelKey 查找，再用 modelId 查找
  const mappedTier = tierMap[modelKey] || tierMap[modelId]
  if (mappedTier) {
    return mappedTier
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
 *
 * 各媒体类型的计费公式：
 * - image:   unitPrice(积分/张) × quantity(张数)
 * - video:   unitPrice(积分/秒) × duration(秒) × quantity(视频数)
 * - text:    unitPrice(积分/千字符) × quantity(tokens) / 1000
 * - audio:   unitPrice(积分/10秒) × quantity(秒) / 10
 * - voiceDesign: unitPrice(积分/次) × quantity(次数)
 * - lipSync: unitPrice(积分/次) × quantity(次数)
 */
export async function quoteCredits(
  mediaType: MediaType,
  modelKey: string,
  quantity: number,
  options?: { tier?: ModelTier; resolution?: string; duration?: number }
): Promise<CreditQuote> {
  const pricing = await getCachedPricing()

  // 如果调用方显式指定了 tier，优先使用
  let tier: string = options?.tier || ''
  if (!tier) {
    // 根据 modelKey 自动解析 tier
    tier = await resolveModelTier(mediaType, modelKey)
  }

  let totalCredits = 0
  let unitPrice = 0

  switch (mediaType) {
    case 'image': {
      // tier: 'basic' | 'advanced'
      const effectiveTier = tier === 'advanced' ? 'advanced' : 'basic'
      unitPrice = effectiveTier === 'basic' ? pricing.image.basic : pricing.image.advanced
      // quantity = 张数，unitPrice = 积分/张
      totalCredits = Math.ceil(unitPrice * quantity)
      tier = effectiveTier
      break
    }
    case 'video': {
      // tier: 'basic' | 'advanced'
      const effectiveTier = tier === 'advanced' ? 'advanced' : 'basic'
      const perSecPrice = effectiveTier === 'basic' ? pricing.video.basic_per_sec : pricing.video.advanced_per_sec
      // quantity = 视频个数, duration = 秒数（来自 options 或 metadata）
      const duration = options?.duration || 5 // 默认5秒
      unitPrice = perSecPrice
      totalCredits = Math.ceil(perSecPrice * duration * quantity)
      tier = effectiveTier
      break
    }
    case 'text': {
      // text 不区分 tier，统一按 per_1000_chars
      unitPrice = pricing.text.per_1000_chars
      // quantity = token数，unitPrice = 积分/千字符
      totalCredits = Math.ceil(unitPrice * quantity / 1000)
      break
    }
    case 'audio': {
      // audio 使用 tier 映射，可能是 'basic'/'advanced' 或自定义 tier 名如 'audio-basic'
      // pricing.audio.per_10_sec = 每10秒积分
      unitPrice = pricing.audio.per_10_sec
      // quantity = 秒数，unitPrice = 积分/10秒
      totalCredits = Math.ceil(unitPrice * quantity / 10)
      break
    }
    case 'voiceDesign': {
      unitPrice = pricing.voiceDesign.per_call
      // quantity = 次数
      totalCredits = Math.ceil(unitPrice * quantity)
      break
    }
    case 'lipSync': {
      unitPrice = pricing.lipSync.per_call
      // quantity = 次数
      totalCredits = Math.ceil(unitPrice * quantity)
      break
    }
  }

  console.log('[Billing] quoteCredits', {
    mediaType,
    modelKey,
    quantity,
    tier,
    unitPrice,
    duration: options?.duration,
    totalCredits,
  })

  trackEvent({
    event: 'billing.quote',
    mediaType,
    model: modelKey,
    tier: (tier === 'basic' || tier === 'advanced') ? tier : 'basic',
    quantity,
    unitPrice,
    totalCredits,
  })

  return {
    totalCredits,
    breakdown: {
      tier: (tier === 'basic' || tier === 'advanced') ? tier : 'basic',
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
