/**
 * 模型档次解析
 */
import { getModelTierMap } from '@/lib/platform-config'
import type { ModelTier } from './types'

let cachedTierMap: Record<string, ModelTier> | null = null
let tierMapCacheTime = 0
const TIER_MAP_CACHE_TTL = 60 * 1000 // 60 秒

async function getCachedTierMap(): Promise<Record<string, ModelTier>> {
  const now = Date.now()
  if (cachedTierMap && now - tierMapCacheTime < TIER_MAP_CACHE_TTL) {
    return cachedTierMap
  }
  cachedTierMap = await getModelTierMap()
  tierMapCacheTime = now
  return cachedTierMap
}

/**
 * 解析模型档次
 */
export async function resolveModelTier(modelKey: string): Promise<ModelTier> {
  const tierMap = await getCachedTierMap()
  return tierMap[modelKey] || 'basic'
}

/**
 * 清空缓存（测试用）
 */
export function clearTierMapCache(): void {
  cachedTierMap = null
  tierMapCacheTime = 0
}
