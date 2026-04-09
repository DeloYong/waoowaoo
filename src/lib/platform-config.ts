/**
 * 平台配置中心
 * 管理 SystemConfig 表的读写，带缓存和加密
 */
import { prisma } from '@/lib/prisma'
import { decryptApiKey, encryptApiKey } from '@/lib/crypto-utils'
import { LRUCache } from 'lru-cache'

// 内存缓存 60 秒
const configCache = new LRUCache<string, { value: string; updatedAt: Date }>({
  max: 100,
  ttl: 60 * 1000,
})

// 配置键类型定义
export type ConfigKey =
  | 'platform.llm_api_key'
  | 'platform.llm_base_url'
  | 'platform.fal_api_key'
  | 'platform.ark_api_key'
  | 'platform.google_ai_key'
  | 'platform.qwen_api_key'
  | 'billing.credit_pricing'
  | 'billing.model_tier_map'
  | 'invite.welcome_credits'
  | 'invite.referral_credits'
  | 'invite.rebate_rate'
  | 'invite.daily_referral_cap'

const ENCRYPTED_KEYS: ConfigKey[] = [
  'platform.llm_api_key',
  'platform.fal_api_key',
  'platform.ark_api_key',
  'platform.google_ai_key',
  'platform.qwen_api_key',
]

const JSON_KEYS: ConfigKey[] = [
  'billing.credit_pricing',
  'billing.model_tier_map',
]

export interface CreditPricing {
  image: { basic: number; advanced: number }
  video: { basic_per_sec: number; advanced_per_sec: number }
  text: { per_1000_chars: number }
  audio: { per_10_sec: number }
  voiceDesign: { per_call: number }
  lipSync: { per_call: number }
}

export interface ModelTierMap {
  [modelKey: string]: 'basic' | 'advanced'
}

/**
 * 获取配置值（原始字符串）
 */
export async function getConfigRaw(key: ConfigKey): Promise<string | null> {
  const cached = configCache.get(key)
  if (cached) {
    return cached.value
  }

  const config = await prisma.systemConfig.findUnique({
    where: { key },
  })

  if (config) {
    configCache.set(key, { value: config.value, updatedAt: config.updatedAt })
    return config.value
  }

  return null
}

/**
 * 设置配置值（原始字符串）
 */
export async function setConfigRaw(
  key: ConfigKey,
  value: string,
  options?: { description?: string; updatedBy?: string }
): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { key },
    create: {
      key,
      value,
      description: options?.description ?? null,
      updatedBy: options?.updatedBy ?? null,
    },
    update: {
      value,
      description: options?.description ?? undefined,
      updatedBy: options?.updatedBy ?? undefined,
    },
  })

  configCache.delete(key)
}

/**
 * 获取平台 API Key（自动解密）
 */
export async function getPlatformApiKey(
  provider: 'llm' | 'fal' | 'ark' | 'google_ai' | 'qwen'
): Promise<string | null> {
  const keyMap: Record<string, ConfigKey> = {
    llm: 'platform.llm_api_key',
    fal: 'platform.fal_api_key',
    ark: 'platform.ark_api_key',
    google_ai: 'platform.google_ai_key',
    qwen: 'platform.qwen_api_key',
  }

  const raw = await getConfigRaw(keyMap[provider])
  if (!raw) return null

  try {
    return decryptApiKey(raw)
  } catch {
    return raw // 兼容明文（如果存在）
  }
}

/**
 * 设置平台 API Key（自动加密）
 */
export async function setPlatformApiKey(
  provider: 'llm' | 'fal' | 'ark' | 'google_ai' | 'qwen',
  value: string,
  options?: { updatedBy?: string }
): Promise<void> {
  const keyMap: Record<string, ConfigKey> = {
    llm: 'platform.llm_api_key',
    fal: 'platform.fal_api_key',
    ark: 'platform.ark_api_key',
    google_ai: 'platform.google_ai_key',
    qwen: 'platform.qwen_api_key',
  }

  const encrypted = encryptApiKey(value)
  await setConfigRaw(keyMap[provider], encrypted, options)
}

/**
 * 获取积分定价配置
 */
export async function getCreditPricing(): Promise<CreditPricing> {
  const raw = await getConfigRaw('billing.credit_pricing')
  if (!raw) {
    // 默认定价
    return {
      image: { basic: 1, advanced: 3 },
      video: { basic_per_sec: 5, advanced_per_sec: 20 },
      text: { per_1000_chars: 2 },
      audio: { per_10_sec: 2 },
      voiceDesign: { per_call: 5 },
      lipSync: { per_call: 10 },
    }
  }
  try {
    return JSON.parse(raw) as CreditPricing
  } catch {
    return {
      image: { basic: 1, advanced: 3 },
      video: { basic_per_sec: 5, advanced_per_sec: 20 },
      text: { per_1000_chars: 2 },
      audio: { per_10_sec: 2 },
      voiceDesign: { per_call: 5 },
      lipSync: { per_call: 10 },
    }
  }
}

/**
 * 获取模型档次映射
 */
export async function getModelTierMap(): Promise<ModelTierMap> {
  const raw = await getConfigRaw('billing.model_tier_map')
  if (!raw) return {}
  try {
    return JSON.parse(raw) as ModelTierMap
  } catch {
    return {}
  }
}

/**
 * 获取邀请配置（整数类型）
 */
export async function getInviteConfig(): Promise<{
  welcomeCredits: number
  referralCredits: number
  rebateRate: number
  dailyReferralCap: number
}> {
  const [welcome, referral, rebate, cap] = await Promise.all([
    getConfigRaw('invite.welcome_credits'),
    getConfigRaw('invite.referral_credits'),
    getConfigRaw('invite.rebate_rate'),
    getConfigRaw('invite.daily_referral_cap'),
  ])

  return {
    welcomeCredits: welcome ? parseInt(welcome, 10) || 100 : 100,
    referralCredits: referral ? parseInt(referral, 10) || 50 : 50,
    rebateRate: rebate ? parseFloat(rebate) || 0.1 : 0.1,
    dailyReferralCap: cap ? parseInt(cap, 10) || 10 : 10,
  }
}

/**
 * 配置键的默认描述信息（用于 admin 后台展示）
 */
const DEFAULT_KEY_DESCRIPTIONS: Record<ConfigKey, string> = {
  'platform.llm_api_key': '通用 LLM API Key（OpenRouter 等）',
  'platform.llm_base_url': 'LLM API Base URL',
  'platform.fal_api_key': 'FAL API Key（图片/视频生成）',
  'platform.ark_api_key': 'Ark API Key（字节火山引擎）',
  'platform.google_ai_key': 'Google AI API Key',
  'platform.qwen_api_key': '通义千问 API Key',
  'billing.credit_pricing': '积分定价配置（JSON）',
  'billing.model_tier_map': '模型档次映射（JSON）',
  'invite.welcome_credits': '新用户邀请欢迎积分',
  'invite.referral_credits': '邀请人奖励积分',
  'invite.rebate_rate': '邀请返利比例',
  'invite.daily_referral_cap': '每日邀请奖励上限',
}

const ALL_CONFIG_KEYS: ConfigKey[] = [
  'platform.llm_api_key',
  'platform.llm_base_url',
  'platform.fal_api_key',
  'platform.ark_api_key',
  'platform.google_ai_key',
  'platform.qwen_api_key',
  'billing.credit_pricing',
  'billing.model_tier_map',
  'invite.welcome_credits',
  'invite.referral_credits',
  'invite.rebate_rate',
  'invite.daily_referral_cap',
]

/**
 * 批量获取所有配置（管理员后台用，返回所有已知配置项）
 * 对于数据库不存在的配置，返回空值占位条目，以便 admin 页面展示所有可配置项
 */
export async function getAllConfigsForAdmin(): Promise<
  Array<{ key: string; value: string; description: string | null; updatedAt: Date }>
> {
  const configs = await prisma.systemConfig.findMany({
    orderBy: { key: 'asc' },
  })

  const configMap = new Map(configs.map((c) => [c.key, c]))

  // 确保所有已知配置键都出现在结果中
  const results: Array<{ key: string; value: string; description: string | null; updatedAt: Date }> = []

  for (const key of ALL_CONFIG_KEYS) {
    const existing = configMap.get(key)
    if (existing) {
      let maskedValue = existing.value
      if (ENCRYPTED_KEYS.includes(key)) {
        if (existing.value.length > 4) {
          maskedValue = `****${existing.value.slice(-4)}`
        } else {
          maskedValue = '****'
        }
      }
      results.push({
        key,
        value: maskedValue,
        description: existing.description || DEFAULT_KEY_DESCRIPTIONS[key] || null,
        updatedAt: existing.updatedAt,
      })
    } else {
      // 数据库中不存在的配置，返回空占位
      results.push({
        key,
        value: '',
        description: DEFAULT_KEY_DESCRIPTIONS[key] || null,
        updatedAt: new Date(0),
      })
    }
  }

  return results
}
