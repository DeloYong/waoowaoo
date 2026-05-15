# SaaS 积分计费系统完整实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完整实现 SaaS 订阅 + 积分计费 + 邀请分销系统，包括平台 Key 管理、积分扣费、订阅管理、邀请奖励和管理员后台。

**Architecture:** 基于现有 billing 模块扩展，新增积分计费层、平台配置层、订阅管理层、邀请系统层。所有代码遵循现有项目结构和模式。

**Tech Stack:** Prisma ORM、MySQL、Next.js 15 App Router、TypeScript、Vitest

**Spec:** `docs/superpowers/specs/2026-04-03-saas-platform-key-credit-billing-design.md`

---

## 模块划分

本系统分为以下可独立交付的模块：

| 模块 | 说明 | 依赖 |
|------|------|------|
| **Plan 1: Schema + 迁移** | 数据库表和字段 | 无 |
| **Plan 2: 平台配置模块** | SystemConfig 服务 + 加密缓存 | Plan 1 |
| **Plan 3: 积分计费核心** | credit-billing 目录 + Guard | Plan 1, Plan 2 |
| **Plan 4: 订阅管理模块** | 订阅状态 + 周期 Cron | Plan 1, Plan 3 |
| **Plan 5: 邀请分销模块** | 邀请码 + 注册奖励 | Plan 1, Plan 3 |
| **Plan 6: 管理员 API** | 后台 API 路由 | Plan 1-5 |
| **Plan 7: 用户侧 API + UI** | 前端页面和 API | Plan 1-6 |

---

## Plan 1: Prisma Schema + 数据库迁移

**已完成设计:** `docs/superpowers/plans/2026-04-04-saas-plan1-schema.md`

概要:
- 新增表: SystemConfig, SubscriptionPlan, UserSubscription, InviteRecord, InviteRebateLog
- 修改表: User (inviteCode, invitedBy, isAdmin), UserBalance (subscriptionCredits, permanentCredits, frozenCredits)
- 套餐种子数据: 5 个套餐 (starter, basic, pro, flagship, enterprise)

---

## Plan 2: 平台配置模块

**Files:**
- Create: `src/lib/platform-config.ts`
- Create: `src/lib/platform-config.test.ts`
- Modify: `src/lib/billing/ledger.ts` (预留积分方法占位)

### Task 2.1: 平台配置基础服务

- [ ] **Step 1: 创建 `src/lib/platform-config.ts`**

```typescript
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
 * 批量获取所有配置（管理员后台用，只返回掩码后的 Key）
 */
export async function getAllConfigsForAdmin(): Promise<
  Array<{ key: string; value: string; description: string | null; updatedAt: Date }>
> {
  const configs = await prisma.systemConfig.findMany({
    orderBy: { key: 'asc' },
  })

  return configs.map((c) => {
    let maskedValue = c.value
    if (ENCRYPTED_KEYS.includes(c.key as ConfigKey)) {
      // 只显示后 4 位
      if (c.value.length > 4) {
        maskedValue = `****${c.value.slice(-4)}`
      } else {
        maskedValue = '****'
      }
    }
    return {
      key: c.key,
      value: maskedValue,
      description: c.description,
      updatedAt: c.updatedAt,
    }
  })
}
```

- [ ] **Step 2: 运行类型检查**

```bash
npm run typecheck
```

期望：无错误

---

### Task 2.2: 平台配置测试

- [ ] **Step 1: 创建测试文件 `src/lib/platform-config.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getConfigRaw,
  setConfigRaw,
  getCreditPricing,
  getModelTierMap,
  getInviteConfig,
} from './platform-config'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    systemConfig: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

describe('platform-config', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getConfigRaw', () => {
    it('should return null when config not found', async () => {
      vi.mocked(prisma.systemConfig.findUnique).mockResolvedValue(null)
      const result = await getConfigRaw('platform.llm_api_key')
      expect(result).toBeNull()
    })

    it('should return cached value when available', async () => {
      vi.mocked(prisma.systemConfig.findUnique).mockResolvedValue({
        id: '1',
        key: 'invite.welcome_credits',
        value: '100',
        description: null,
        updatedAt: new Date(),
        updatedBy: null,
      })
      await getConfigRaw('invite.welcome_credits')
      const result = await getConfigRaw('invite.welcome_credits')
      expect(result).toBe('100')
      expect(prisma.systemConfig.findUnique).toHaveBeenCalledTimes(1)
    })
  })

  describe('getCreditPricing', () => {
    it('should return default pricing when no config', async () => {
      vi.mocked(prisma.systemConfig.findUnique).mockResolvedValue(null)
      const pricing = await getCreditPricing()
      expect(pricing.image.basic).toBe(1)
      expect(pricing.video.advanced_per_sec).toBe(20)
    })

    it('should parse stored JSON pricing', async () => {
      vi.mocked(prisma.systemConfig.findUnique).mockResolvedValue({
        id: '1',
        key: 'billing.credit_pricing',
        value: JSON.stringify({
          image: { basic: 2, advanced: 5 },
          video: { basic_per_sec: 10, advanced_per_sec: 30 },
          text: { per_1000_chars: 3 },
          audio: { per_10_sec: 3 },
          voiceDesign: { per_call: 8 },
          lipSync: { per_call: 15 },
        }),
        description: null,
        updatedAt: new Date(),
        updatedBy: null,
      })
      const pricing = await getCreditPricing()
      expect(pricing.image.basic).toBe(2)
      expect(pricing.video.basic_per_sec).toBe(10)
    })
  })

  describe('getInviteConfig', () => {
    it('should return defaults when no config', async () => {
      vi.mocked(prisma.systemConfig.findUnique).mockResolvedValue(null)
      const config = await getInviteConfig()
      expect(config.welcomeCredits).toBe(100)
      expect(config.referralCredits).toBe(50)
      expect(config.rebateRate).toBe(0.1)
      expect(config.dailyReferralCap).toBe(10)
    })
  })
})
```

- [ ] **Step 2: 运行测试**

```bash
npx vitest run src/lib/platform-config.test.ts -v
```

期望：所有测试通过

---

## Plan 3: 积分计费核心模块

**Files:**
- Create: `src/lib/credit-billing/index.ts`
- Create: `src/lib/credit-billing/catalog.ts`
- Create: `src/lib/credit-billing/tier.ts`
- Create: `src/lib/credit-billing/service.ts`
- Create: `src/lib/credit-billing/guard.ts`
- Create: `src/lib/credit-billing/types.ts`
- Create: `tests/unit/credit-billing/service.test.ts`

### Task 3.1: 积分计费类型定义

- [ ] **Step 1: 创建 `src/lib/credit-billing/types.ts`**

```typescript
/**
 * 积分计费类型定义
 */
import type { CreditPricing, ModelTierMap } from '@/lib/platform-config'

export type MediaType = 'image' | 'video' | 'text' | 'audio' | 'voiceDesign' | 'lipSync'
export type ModelTier = 'basic' | 'advanced'

export interface CreditQuote {
  totalCredits: number
  breakdown: {
    tier: ModelTier
    quantity: number
    unitPrice: number
  }
  mediaType: MediaType
  modelKey: string
}

export interface CreditBalance {
  subscriptionCredits: number
  permanentCredits: number
  frozenCredits: number
  availableCredits: number
}

export interface CreditFreeze {
  id: string
  userId: string
  credits: number
  status: 'pending' | 'confirmed' | 'rolled_back'
  taskId?: string
  requestId?: string
  idempotencyKey?: string
}

export type CreditTransactionType =
  | 'subscription_grant'
  | 'subscription_expired_clear'
  | 'admin_grant'
  | 'package_purchase'
  | 'invite_welcome_gift'
  | 'invite_referral_reward'
  | 'invite_rebate'
  | 'credit_freeze'
  | 'credit_deduct'
  | 'credit_unfreeze'

export interface GuardCheckResult {
  passed: true
} | {
  passed: false
  httpStatus: 402 | 403 | 429
  errorCode:
    | 'NO_SUBSCRIPTION'
    | 'INSUFFICIENT_CREDITS'
    | 'CONCURRENCY_LIMIT'
    | 'PLAN_UPGRADE_REQUIRED'
    | 'VIDEO_QUOTA_EXCEEDED'
  message: string
}

export interface UserSubscriptionState {
  userId: string
  planId: string
  status: 'active' | 'expired' | 'cancelled'
  maxConcurrency: number
  monthlyCredits: number
  maxVideoSeconds: number
  videoSecondsUsed: number
  currentPeriodEnd: Date
}
```

---

### Task 3.2: 积分定价目录

- [ ] **Step 1: 创建 `src/lib/credit-billing/catalog.ts`**

```typescript
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
```

---

### Task 3.3: 模型档次解析

- [ ] **Step 1: 创建 `src/lib/credit-billing/tier.ts`**

```typescript
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
```

---

### Task 3.4: 积分服务（冻结/扣除/回滚）

- [ ] **Step 1: 创建 `src/lib/credit-billing/service.ts`**

```typescript
/**
 * 积分服务 - 包装 ledger.ts，以积分整数执行冻结/扣除/回滚
 */
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import type { CreditBalance, CreditFreeze, CreditTransactionType } from './types'

/**
 * 获取用户积分余额
 */
export async function getCreditBalance(userId: string): Promise<CreditBalance> {
  let balance = await prisma.userBalance.findUnique({
    where: { userId },
    select: {
      subscriptionCredits: true,
      permanentCredits: true,
      frozenCredits: true,
    },
  })

  if (!balance) {
    balance = await prisma.userBalance.create({
      data: {
        userId,
        balance: 0,
        frozenAmount: 0,
        totalSpent: 0,
        subscriptionCredits: 0,
        permanentCredits: 0,
        frozenCredits: 0,
      },
      select: {
        subscriptionCredits: true,
        permanentCredits: true,
        frozenCredits: true,
      },
    })
  }

  return {
    subscriptionCredits: balance.subscriptionCredits,
    permanentCredits: balance.permanentCredits,
    frozenCredits: balance.frozenCredits,
    availableCredits:
      balance.subscriptionCredits + balance.permanentCredits - balance.frozenCredits,
  }
}

/**
 * 冻结积分
 */
export async function freezeCredits(
  userId: string,
  credits: number,
  options?: {
    source?: string
    taskId?: string
    requestId?: string
    idempotencyKey?: string
    metadata?: Record<string, unknown>
  }
): Promise<string | null> {
  if (credits <= 0) return null

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 幂等检查
      if (options?.idempotencyKey) {
        const existing = await tx.balanceFreeze.findFirst({
          where: { idempotencyKey: options.idempotencyKey },
        })
        if (existing) {
          return existing.id
        }
      }

      // 获取当前余额
      const balance = await tx.userBalance.findUnique({
        where: { userId },
      })
      if (!balance) {
        await tx.userBalance.create({
          data: {
            userId,
            balance: 0,
            frozenAmount: 0,
            totalSpent: 0,
            subscriptionCredits: 0,
            permanentCredits: 0,
            frozenCredits: 0,
          },
        })
      }

      // 检查可用积分
      const available =
        (balance?.subscriptionCredits ?? 0) +
        (balance?.permanentCredits ?? 0) -
        (balance?.frozenCredits ?? 0)

      if (available < credits) {
        return null
      }

      // 冻结积分（先扣 subscription，再扣 permanent）
      let remainingToFreeze = credits
      let subscriptionToFreeze = 0
      let permanentToFreeze = 0

      const currentSub = balance?.subscriptionCredits ?? 0
      if (currentSub > 0) {
        subscriptionToFreeze = Math.min(currentSub, remainingToFreeze)
        remainingToFreeze -= subscriptionToFreeze
      }
      if (remainingToFreeze > 0) {
        permanentToFreeze = remainingToFreeze
      }

      await tx.userBalance.update({
        where: { userId },
        data: {
          subscriptionCredits: { decrement: subscriptionToFreeze },
          permanentCredits: { decrement: permanentToFreeze },
          frozenCredits: { increment: credits },
        },
      })

      // 创建冻结记录（复用 BalanceFreeze 表，amount 存积分数）
      const freezeId = `credit_freeze_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
      await tx.balanceFreeze.create({
        data: {
          id: freezeId,
          userId,
          amount: new Prisma.Decimal(credits),
          status: 'pending',
          source: options?.source || 'credit',
          taskId: options?.taskId || null,
          requestId: options?.requestId || null,
          idempotencyKey: options?.idempotencyKey || null,
          metadata: options?.metadata ? JSON.stringify(options.metadata) : null,
        },
      })

      // 记录流水
      await tx.balanceTransaction.create({
        data: {
          userId,
          type: 'credit_freeze',
          amount: new Prisma.Decimal(0),
          balanceAfter: new Prisma.Decimal(0),
          description: `积分冻结: ${credits}`,
          freezeId,
          idempotencyKey: options?.idempotencyKey || null,
          billingMeta: JSON.stringify({
            credits,
            source: options?.source,
            breakdown: { subscriptionToFreeze, permanentToFreeze },
          }),
        },
      })

      return freezeId
    })

    return result
  } catch (error) {
    if (
      options?.idempotencyKey &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const existing = await prisma.balanceFreeze.findFirst({
        where: { idempotencyKey: options.idempotencyKey },
        select: { id: true },
      })
      if (existing?.id) return existing.id
    }
    return null
  }
}

/**
 * 确认扣除积分
 */
export async function confirmCreditDeduct(
  freezeId: string,
  actualCredits?: number
): Promise<boolean> {
  try {
    await prisma.$transaction(async (tx) => {
      const freeze = await tx.balanceFreeze.findUnique({
        where: { id: freezeId },
      })
      if (!freeze) {
        throw new Error('Invalid freeze record')
      }
      if (freeze.status === 'confirmed') return
      if (freeze.status !== 'pending') {
        throw new Error('Freeze is not pending')
      }

      const frozenCredits = freeze.amount.toNumber()
      const chargedCredits = actualCredits ?? frozenCredits
      const refundCredits = Math.max(0, frozenCredits - chargedCredits)

      // 更新冻结状态
      await tx.balanceFreeze.update({
        where: { id: freezeId },
        data: { status: 'confirmed' },
      })

      // 减少冻结积分
      const updateData: Prisma.UserBalanceUpdateInput = {
        frozenCredits: { decrement: frozenCredits },
      }

      // 退还多余积分（先退 permanent，再退 subscription）
      if (refundCredits > 0) {
        updateData.permanentCredits = { increment: refundCredits }
      }

      await tx.userBalance.update({
        where: { userId: freeze.userId },
        data: updateData,
      })

      // 记录流水
      await tx.balanceTransaction.create({
        data: {
          userId: freeze.userId,
          type: 'credit_deduct',
          amount: new Prisma.Decimal(0),
          balanceAfter: new Prisma.Decimal(0),
          description: `积分扣除: ${chargedCredits}`,
          freezeId,
          billingMeta: JSON.stringify({
            frozenCredits,
            chargedCredits,
            refundCredits,
          }),
        },
      })
    })
    return true
  } catch {
    return false
  }
}

/**
 * 解冻积分（回滚）
 */
export async function unfreezeCredits(freezeId: string): Promise<boolean> {
  try {
    await prisma.$transaction(async (tx) => {
      const freeze = await tx.balanceFreeze.findUnique({
        where: { id: freezeId },
      })
      if (!freeze) {
        throw new Error('Invalid freeze record')
      }
      if (freeze.status === 'rolled_back') return
      if (freeze.status !== 'pending') {
        throw new Error('Freeze is not pending')
      }

      const credits = freeze.amount.toNumber()

      await tx.balanceFreeze.update({
        where: { id: freezeId },
        data: { status: 'rolled_back' },
      })

      // 解冻（全部退还 permanent，简化处理）
      await tx.userBalance.update({
        where: { userId: freeze.userId },
        data: {
          frozenCredits: { decrement: credits },
          permanentCredits: { increment: credits },
        },
      })

      // 记录流水
      await tx.balanceTransaction.create({
        data: {
          userId: freeze.userId,
          type: 'credit_unfreeze',
          amount: new Prisma.Decimal(0),
          balanceAfter: new Prisma.Decimal(0),
          description: `积分解冻: ${credits}`,
          freezeId,
        },
      })
    })
    return true
  } catch {
    return false
  }
}

/**
 * 增加积分（管理员充值/奖励等）
 */
export async function grantCredits(
  userId: string,
  credits: number,
  type: CreditTransactionType,
  options?: {
    reason?: string
    operatorId?: string
    idempotencyKey?: string
    isPermanent?: boolean
  }
): Promise<boolean> {
  if (credits <= 0) return false

  try {
    await prisma.$transaction(async (tx) => {
      // 幂等检查
      if (options?.idempotencyKey) {
        const existing = await tx.balanceTransaction.findFirst({
          where: {
            userId,
            type,
            idempotencyKey: options.idempotencyKey,
          },
        })
        if (existing) return
      }

      const isPermanent = options?.isPermanent ?? true

      await tx.userBalance.upsert({
        where: { userId },
        create: {
          userId,
          balance: 0,
          frozenAmount: 0,
          totalSpent: 0,
          subscriptionCredits: isPermanent ? 0 : credits,
          permanentCredits: isPermanent ? credits : 0,
          frozenCredits: 0,
        },
        update: {
          subscriptionCredits: isPermanent ? undefined : { increment: credits },
          permanentCredits: isPermanent ? { increment: credits } : undefined,
        },
      })

      await tx.balanceTransaction.create({
        data: {
          userId,
          type,
          amount: new Prisma.Decimal(0),
          balanceAfter: new Prisma.Decimal(0),
          description: options?.reason || `积分发放: ${credits}`,
          operatorId: options?.operatorId || null,
          idempotencyKey: options?.idempotencyKey || null,
          billingMeta: JSON.stringify({ credits, isPermanent }),
        },
      })
    })
    return true
  } catch {
    return false
  }
}
```

---

### Task 3.5: 门卫校验

- [ ] **Step 1: 创建 `src/lib/credit-billing/guard.ts`**

```typescript
/**
 * 请求前门卫校验
 */
import { prisma } from '@/lib/prisma'
import { getCreditBalance } from './service'
import type { GuardCheckResult, UserSubscriptionState, CreditQuote } from './types'

/**
 * 获取用户订阅状态
 */
export async function getUserSubscriptionState(
  userId: string
): Promise<UserSubscriptionState | null> {
  const subscription = await prisma.userSubscription.findUnique({
    where: { userId },
    include: { plan: true },
  })

  if (!subscription || subscription.status !== 'active') {
    return null
  }

  return {
    userId,
    planId: subscription.planId,
    status: subscription.status as 'active' | 'expired' | 'cancelled',
    maxConcurrency: subscription.plan.maxConcurrency,
    monthlyCredits: subscription.plan.monthlyCredits,
    maxVideoSeconds: subscription.plan.maxVideoSeconds,
    videoSecondsUsed: subscription.videoSecondsUsed,
    currentPeriodEnd: subscription.currentPeriodEnd,
  }
}

/**
 * 获取当前运行任务数（用于并发校验）
 */
async function getActiveTaskCount(userId: string): Promise<number> {
  return await prisma.task.count({
    where: {
      userId,
      status: { in: ['queued', 'processing'] },
    },
  })
}

/**
 * 执行门卫校验
 */
export async function guardCheck(
  userId: string,
  creditQuote: CreditQuote,
  options?: { skipConcurrency?: boolean }
): Promise<GuardCheckResult> {
  // 1. 检查有效订阅
  const subscription = await getUserSubscriptionState(userId)
  if (!subscription) {
    return {
      passed: false,
      httpStatus: 402,
      errorCode: 'NO_SUBSCRIPTION',
      message: '需要有效的订阅才能使用此功能',
    }
  }

  // 2. 检查积分余额
  const balance = await getCreditBalance(userId)
  if (balance.availableCredits < creditQuote.totalCredits) {
    return {
      passed: false,
      httpStatus: 402,
      errorCode: 'INSUFFICIENT_CREDITS',
      message: `积分不足，需要 ${creditQuote.totalCredits} 积分，当前可用 ${balance.availableCredits} 积分`,
    }
  }

  // 3. 检查并发限制
  if (!options?.skipConcurrency) {
    const activeCount = await getActiveTaskCount(userId)
    if (activeCount >= subscription.maxConcurrency) {
      return {
        passed: false,
        httpStatus: 429,
        errorCode: 'CONCURRENCY_LIMIT',
        message: `已达到并发上限 ${subscription.maxConcurrency}`,
      }
    }
  }

  // 4. 检查视频配额
  if (creditQuote.mediaType === 'video') {
    if (subscription.videoSecondsUsed >= subscription.maxVideoSeconds) {
      return {
        passed: false,
        httpStatus: 402,
        errorCode: 'VIDEO_QUOTA_EXCEEDED',
        message: '本月视频配额已用完',
      }
    }
  }

  return { passed: true }
}
```

---

### Task 3.6: 积分计费模块导出

- [ ] **Step 1: 创建 `src/lib/credit-billing/index.ts`**

```typescript
export * from './types'
export * from './catalog'
export * from './tier'
export * from './service'
export * from './guard'
```

---

### Task 3.7: 积分计费单元测试

- [ ] **Step 1: 创建 `tests/unit/credit-billing/service.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getCreditBalance,
  freezeCredits,
  confirmCreditDeduct,
  unfreezeCredits,
  grantCredits,
} from '@/lib/credit-billing/service'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    userBalance: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    balanceFreeze: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    balanceTransaction: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

describe('credit-billing/service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      return await fn(prisma as any)
    })
  })

  describe('getCreditBalance', () => {
    it('should return zero balance when user has no balance', async () => {
      vi.mocked(prisma.userBalance.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.userBalance.create).mockResolvedValue({
        subscriptionCredits: 0,
        permanentCredits: 0,
        frozenCredits: 0,
      } as any)

      const balance = await getCreditBalance('user-1')
      expect(balance.availableCredits).toBe(0)
    })

    it('should calculate available credits correctly', async () => {
      vi.mocked(prisma.userBalance.findUnique).mockResolvedValue({
        subscriptionCredits: 100,
        permanentCredits: 200,
        frozenCredits: 50,
      } as any)

      const balance = await getCreditBalance('user-1')
      expect(balance.subscriptionCredits).toBe(100)
      expect(balance.permanentCredits).toBe(200)
      expect(balance.frozenCredits).toBe(50)
      expect(balance.availableCredits).toBe(250)
    })
  })

  describe('freezeCredits', () => {
    it('should return null when insufficient credits', async () => {
      vi.mocked(prisma.userBalance.findUnique).mockResolvedValue({
        subscriptionCredits: 10,
        permanentCredits: 10,
        frozenCredits: 0,
      } as any)

      const result = await freezeCredits('user-1', 100)
      expect(result).toBeNull()
    })
  })

  describe('grantCredits', () => {
    it('should grant permanent credits', async () => {
      vi.mocked(prisma.userBalance.upsert).mockResolvedValue({} as any)
      vi.mocked(prisma.balanceTransaction.create).mockResolvedValue({} as any)

      const result = await grantCredits('user-1', 100, 'admin_grant', {
        reason: '测试充值',
        isPermanent: true,
      })
      expect(result).toBe(true)
    })
  })
})
```

- [ ] **Step 2: 运行测试**

```bash
npx vitest run tests/unit/credit-billing/service.test.ts -v
```

期望：所有测试通过

---

## Plan 4: 订阅管理模块

**Files:**
- Create: `src/lib/subscription/index.ts`
- Create: `src/lib/subscription/service.ts`
- Create: `src/app/api/cron/subscription-cycle/route.ts`
- Create: `tests/unit/subscription/service.test.ts`

### Task 4.1: 订阅服务

- [ ] **Step 1: 创建 `src/lib/subscription/service.ts`**

```typescript
/**
 * 订阅管理服务
 */
import { prisma } from '@/lib/prisma'
import { grantCredits } from '@/lib/credit-billing/service'

/**
 * 为用户分配套餐
 */
export async function assignPlan(
  userId: string,
  planId: string,
  options?: {
    operatorId?: string
    billingCycle?: 'monthly' | 'yearly' | 'trial'
  }
): Promise<void> {
  const billingCycle = options?.billingCycle ?? 'monthly'

  await prisma.$transaction(async (tx) => {
    const plan = await tx.subscriptionPlan.findUniqueOrThrow({
      where: { id: planId },
    })

    const now = new Date()
    let currentPeriodEnd = new Date(now)
    if (billingCycle === 'yearly') {
      currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1)
    } else if (billingCycle === 'trial') {
      currentPeriodEnd.setDate(currentPeriodEnd.getDate() + plan.trialDays)
    } else {
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1)
    }

    // 取消旧订阅
    await tx.userSubscription.updateMany({
      where: { userId, status: 'active' },
      data: { status: 'cancelled', cancelledAt: now },
    })

    // 创建新订阅
    const subscription = await tx.userSubscription.create({
      data: {
        userId,
        planId,
        billingCycle,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd,
        creditsGranted: 0,
        videoSecondsUsed: 0,
      },
    })

    // 发放套餐积分
    if (plan.monthlyCredits > 0) {
      await grantCredits(userId, plan.monthlyCredits, 'subscription_grant', {
        reason: `${plan.name} 套餐积分`,
        isPermanent: false,
      })
      await tx.userSubscription.update({
        where: { id: subscription.id },
        data: { creditsGranted: plan.monthlyCredits },
      })
    }
  })
}

/**
 * 处理订阅周期到期（Cron Job 调用）
 */
export async function processExpiredSubscriptions(): Promise<{
  processed: number
  errors: number
}> {
  const now = new Date()
  let processed = 0
  let errors = 0

  const expiredSubscriptions = await prisma.userSubscription.findMany({
    where: {
      status: 'active',
      currentPeriodEnd: { lt: now },
    },
  })

  for (const subscription of expiredSubscriptions) {
    try {
      await prisma.$transaction(async (tx) => {
        // 标记为过期
        await tx.userSubscription.update({
          where: { id: subscription.id },
          data: { status: 'expired' },
        })

        // 清零套餐积分
        const balance = await tx.userBalance.findUnique({
          where: { userId: subscription.userId },
        })
        if (balance && balance.subscriptionCredits > 0) {
          await tx.userBalance.update({
            where: { userId: subscription.userId },
            data: { subscriptionCredits: 0 },
          })

          // 记录流水
          await tx.balanceTransaction.create({
            data: {
              userId: subscription.userId,
              type: 'subscription_expired_clear',
              amount: 0,
              balanceAfter: 0,
              description: `套餐过期，清零 ${balance.subscriptionCredits} 套餐积分`,
            },
          })
        }
      })
      processed++
    } catch {
      errors++
    }
  }

  return { processed, errors }
}

/**
 * 获取套餐列表
 */
export async function getActivePlans() {
  return await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  })
}
```

---

### Task 4.2: 订阅模块导出

- [ ] **Step 1: 创建 `src/lib/subscription/index.ts`**

```typescript
export * from './service'
```

---

### Task 4.3: 订阅周期 Cron API

- [ ] **Step 1: 创建 `src/app/api/cron/subscription-cycle/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { processExpiredSubscriptions } from '@/lib/subscription'
import { logAdminAction } from '@/lib/logging/semantic'

export const POST = apiHandler(async (request: NextRequest) => {
  // 简单的认证：检查 Authorization header
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    throw new ApiError('UNAUTHORIZED')
  }

  const result = await processExpiredSubscriptions()

  logAdminAction('SUBSCRIPTION_CYCLE', 'system', result)

  return NextResponse.json({
    success: true,
    processed: result.processed,
    errors: result.errors,
  })
})
```

---

## Plan 5: 邀请分销模块

**Files:**
- Create: `src/lib/invite/index.ts`
- Create: `src/lib/invite/service.ts`
- Create: `src/lib/invite/code.ts`
- Modify: `src/app/api/auth/register/route.ts` (集成邀请逻辑)
- Create: `tests/unit/invite/service.test.ts`

### Task 5.1: 邀请码生成

- [ ] **Step 1: 创建 `src/lib/invite/code.ts`**

```typescript
/**
 * 邀请码生成工具
 */
import { prisma } from '@/lib/prisma'

const CODE_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const CODE_LENGTH = 6
const MAX_RETRIES = 5

/**
 * 生成随机邀请码
 */
function generateRandomCode(): string {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARACTERS.charAt(Math.floor(Math.random() * CODE_CHARACTERS.length))
  }
  return code
}

/**
 * 生成唯一邀请码（带查重重试）
 */
export async function generateUniqueInviteCode(): Promise<string> {
  for (let i = 0; i < MAX_RETRIES; i++) {
    const code = generateRandomCode()
    const existing = await prisma.user.findFirst({
      where: { inviteCode: code },
      select: { id: true },
    })
    if (!existing) {
      return code
    }
  }
  throw new Error('Failed to generate unique invite code')
}

/**
 * 根据邀请码查找邀请人
 */
export async function getInviterByCode(inviteCode: string) {
  const inviter = await prisma.user.findUnique({
    where: { inviteCode },
    select: { id: true, name: true },
  })
  return inviter
}
```

---

### Task 5.2: 邀请服务

- [ ] **Step 1: 创建 `src/lib/invite/service.ts`**

```typescript
/**
 * 邀请分销服务
 */
import { prisma } from '@/lib/prisma'
import { getInviteConfig } from '@/lib/platform-config'
import { grantCredits } from '@/lib/credit-billing/service'
import type { PrismaClient, User } from '@prisma/client'

/**
 * 处理带邀请的用户注册（在事务中调用）
 */
export async function processInviteOnRegistration(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$transaction' | '$on' | '$use'>,
  newUser: User,
  inviterId: string,
  inviteCode: string
): Promise<void> {
  const config = await getInviteConfig()
  const now = new Date()
  const rebateEndsAt = new Date(now)
  rebateEndsAt.setFullYear(rebateEndsAt.getFullYear() + 1)

  // 检查当天邀请上限
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const todayCount = await tx.inviteRebateLog.count({
    where: {
      inviterId,
      triggerType: 'activation',
      createdAt: { gte: todayStart },
    },
  })

  const shouldAwardInviter = todayCount < config.dailyReferralCap

  // 创建邀请记录
  const inviteRecord = await tx.inviteRecord.create({
    data: {
      inviterId,
      inviteeId: newUser.id,
      inviteCode,
      rebateEndsAt,
      welcomeCredits: config.welcomeCredits,
      referralCredits: shouldAwardInviter ? config.referralCredits : 0,
    },
  })

  // 给新用户发放欢迎积分
  if (config.welcomeCredits > 0) {
    await grantCredits(newUser.id, config.welcomeCredits, 'invite_welcome_gift', {
      reason: '新用户注册欢迎礼',
      isPermanent: false,
      idempotencyKey: `invite_${newUser.id}_welcome`,
    })
  }

  // 给邀请人发放奖励积分
  if (shouldAwardInviter && config.referralCredits > 0) {
    await grantCredits(inviterId, config.referralCredits, 'invite_referral_reward', {
      reason: '邀请新人奖励',
      isPermanent: true,
      idempotencyKey: `invite_${newUser.id}_referral`,
    })
  }

  // 更新邀请记录的交易 ID
  await tx.inviteRecord.update({
    where: { id: inviteRecord.id },
    data: {
      welcomeTxId: config.welcomeCredits > 0 ? `invite_${newUser.id}_welcome` : null,
      referralTxId: shouldAwardInviter && config.referralCredits > 0 ? `invite_${newUser.id}_referral` : null,
    },
  })
}

/**
 * 获取用户邀请列表
 */
export async function getUserInvites(userId: string) {
  const invites = await prisma.inviteRecord.findMany({
    where: { inviterId: userId },
    include: { invitee: { select: { id: true, name: true, createdAt: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return invites
}

/**
 * 获取用户邀请统计
 */
export async function getUserInviteStats(userId: string) {
  const [totalInvites, totalRebates] = await Promise.all([
    prisma.inviteRecord.count({ where: { inviterId: userId } }),
    prisma.inviteRebateLog.aggregate({
      where: { inviterId: userId },
      _sum: { creditsAwarded: true },
    }),
  ])

  return {
    totalInvites,
    totalCreditsEarned: totalRebates._sum.creditsAwarded ?? 0,
  }
}
```

---

### Task 5.3: 邀请模块导出

- [ ] **Step 1: 创建 `src/lib/invite/index.ts`**

```typescript
export * from './code'
export * from './service'
```

---

### Task 5.4: 集成邀请到注册流程

- [ ] **Step 1: 修改 `src/app/api/auth/register/route.ts`，集成邀请逻辑**

```typescript
// 在文件顶部添加导入
import { generateUniqueInviteCode, processInviteOnRegistration } from '@/lib/invite'

// 在创建用户的事务中，添加邀请码生成和邀请处理
// 原代码中：
// const user = await prisma.$transaction(async (tx) => {
//   // 创建用户
//   const newUser = await tx.user.create({
//     data: {
//       name,
//       password: hashedPassword
//     }
//   })

// 修改为：

const inviteCodeFromQuery = body.inviteCode as string | undefined

const user = await prisma.$transaction(async (tx) => {
  // 生成邀请码
  const inviteCode = await generateUniqueInviteCode()

  // 查找邀请人
  const inviter = inviteCodeFromQuery
    ? await tx.user.findUnique({
        where: { inviteCode: inviteCodeFromQuery },
        select: { id: true },
      })
    : null

  // 创建用户
  const newUser = await tx.user.create({
    data: {
      name,
      password: hashedPassword,
      inviteCode,
      invitedBy: inviter?.id ?? null,
    },
  })

  // 创建用户余额记录
  await tx.userBalance.create({
    data: {
      userId: newUser.id,
      balance: 0,
      frozenAmount: 0,
      totalSpent: 0,
      subscriptionCredits: 0,
      permanentCredits: 0,
      frozenCredits: 0,
    },
  })

  // 处理邀请奖励
  if (inviter) {
    await processInviteOnRegistration(tx, newUser, inviter.id, inviteCodeFromQuery!)
  }

  return newUser
})
```

---

## Plan 6: 管理员 API

**Files:**
- Create: `src/app/api/admin/platform-keys/route.ts`
- Create: `src/app/api/admin/credit-pricing/route.ts`
- Create: `src/app/api/admin/users/route.ts`
- Create: `src/app/api/admin/users/[id]/grant-credits/route.ts`
- Create: `src/app/api/admin/users/[id]/assign-plan/route.ts`
- Create: `src/app/api/admin/invite-leaderboard/route.ts`
- Create: `src/lib/admin/auth.ts` (管理员鉴权中间件)

### Task 6.1: 管理员鉴权

- [ ] **Step 1: 创建 `src/lib/admin/auth.ts`**

```typescript
/**
 * 管理员鉴权
 */
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  })

  if (!user?.isAdmin) {
    throw new Error('Forbidden')
  }

  return session.user.id
}
```

---

### Task 6.2: 平台 Key 管理 API

- [ ] **Step 1: 创建 `src/app/api/admin/platform-keys/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { requireAdmin } from '@/lib/admin/auth'
import {
  getAllConfigsForAdmin,
  setConfigRaw,
  getConfigRaw,
  setPlatformApiKey,
  type ConfigKey,
} from '@/lib/platform-config'
import { logAdminAction } from '@/lib/logging/semantic'

export const GET = apiHandler(async () => {
  const adminId = await requireAdmin()
  const configs = await getAllConfigsForAdmin()

  logAdminAction('LIST_PLATFORM_KEYS', adminId, { count: configs.length })

  return NextResponse.json({ configs })
})

export const POST = apiHandler(async (request: NextRequest) => {
  const adminId = await requireAdmin()
  const body = await request.json()
  const { key, value } = body as { key: string; value?: string }

  if (!key) {
    throw new ApiError('INVALID_PARAMS')
  }

  const configKey = key as ConfigKey

  // 处理 API Key（自动加密）
  const providerKeyMap: Record<string, 'llm' | 'fal' | 'ark' | 'google_ai' | 'qwen'> = {
    'platform.llm_api_key': 'llm',
    'platform.fal_api_key': 'fal',
    'platform.ark_api_key': 'ark',
    'platform.google_ai_key': 'google_ai',
    'platform.qwen_api_key': 'qwen',
  }

  if (providerKeyMap[configKey] && value) {
    await setPlatformApiKey(providerKeyMap[configKey], value, { updatedBy: adminId })
  } else if (value !== undefined) {
    await setConfigRaw(configKey, value, { updatedBy: adminId })
  }

  logAdminAction('UPDATE_PLATFORM_KEY', adminId, { key })

  return NextResponse.json({ success: true })
})
```

---

### Task 6.3: 积分定价 API

- [ ] **Step 1: 创建 `src/app/api/admin/credit-pricing/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { requireAdmin } from '@/lib/admin/auth'
import { setConfigRaw, getCreditPricing, getModelTierMap } from '@/lib/platform-config'
import { logAdminAction } from '@/lib/logging/semantic'

export const GET = apiHandler(async () => {
  await requireAdmin()
  const pricing = await getCreditPricing()
  const tierMap = await getModelTierMap()

  return NextResponse.json({ pricing, tierMap })
})

export const POST = apiHandler(async (request: NextRequest) => {
  const adminId = await requireAdmin()
  const body = await request.json()
  const { pricing, tierMap } = body as {
    pricing?: Record<string, unknown>
    tierMap?: Record<string, string>
  }

  if (pricing) {
    await setConfigRaw('billing.credit_pricing', JSON.stringify(pricing), {
      updatedBy: adminId,
    })
  }

  if (tierMap) {
    await setConfigRaw('billing.model_tier_map', JSON.stringify(tierMap), {
      updatedBy: adminId,
    })
  }

  logAdminAction('UPDATE_CREDIT_PRICING', adminId, { pricing, tierMap })

  return NextResponse.json({ success: true })
})
```

---

### Task 6.4: 用户管理 API

- [ ] **Step 1: 创建 `src/app/api/admin/users/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-errors'
import { requireAdmin } from '@/lib/admin/auth'
import { prisma } from '@/lib/prisma'

export const GET = apiHandler(async (request: NextRequest) => {
  await requireAdmin()
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const skip = parseInt(searchParams.get('skip') || '0', 10)
  const take = Math.min(parseInt(searchParams.get('take') || '50', 10), 100)

  const where = search
    ? {
        OR: [{ name: { contains: search } }, { email: { contains: search } }],
      }
    : {}

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        balance: true,
        subscription: { include: { plan: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.user.count({ where }),
  ])

  return NextResponse.json({ users, total, skip, take })
})
```

---

### Task 6.5: 手动充值 API

- [ ] **Step 1: 创建 `src/app/api/admin/users/[id]/grant-credits/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { requireAdmin } from '@/lib/admin/auth'
import { grantCredits } from '@/lib/credit-billing/service'
import { logAdminAction } from '@/lib/logging/semantic'

export const POST = apiHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const adminId = await requireAdmin()
  const body = await request.json()
  const { credits, reason, isPermanent = true } = body as {
    credits: number
    reason?: string
    isPermanent?: boolean
  }

  if (!credits || credits <= 0) {
    throw new ApiError('INVALID_PARAMS')
  }

  const success = await grantCredits(params.id, credits, 'admin_grant', {
    reason: reason || '管理员充值',
    operatorId: adminId,
    isPermanent,
  })

  if (!success) {
    throw new ApiError('INTERNAL_ERROR')
  }

  logAdminAction('GRANT_CREDITS', adminId, { userId: params.id, credits, reason })

  return NextResponse.json({ success: true })
})
```

---

### Task 6.6: 分配套餐 API

- [ ] **Step 1: 创建 `src/app/api/admin/users/[id]/assign-plan/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { requireAdmin } from '@/lib/admin/auth'
import { assignPlan } from '@/lib/subscription'
import { logAdminAction } from '@/lib/logging/semantic'

export const POST = apiHandler(async (request: NextRequest, { params }: { params: { id: string } }) => {
  const adminId = await requireAdmin()
  const body = await request.json()
  const { planId, billingCycle = 'monthly' } = body as {
    planId: string
    billingCycle?: 'monthly' | 'yearly' | 'trial'
  }

  if (!planId) {
    throw new ApiError('INVALID_PARAMS')
  }

  await assignPlan(params.id, planId, { operatorId: adminId, billingCycle })

  logAdminAction('ASSIGN_PLAN', adminId, { userId: params.id, planId, billingCycle })

  return NextResponse.json({ success: true })
})
```

---

## Plan 7: 用户侧 API + UI

**Files:**
- Create: `src/app/api/user/subscription/route.ts`
- Create: `src/app/api/user/invite/route.ts`
- Create: `src/app/[locale]/pricing/page.tsx`
- Create: `src/app/[locale]/invite/page.tsx`
- Modify: 导航栏显示积分余额

### Task 7.1: 用户订阅 API

- [ ] **Step 1: 创建 `src/app/api/user/subscription/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-errors'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getUserSubscriptionState } from '@/lib/credit-billing/guard'
import { getCreditBalance } from '@/lib/credit-billing/service'
import { getActivePlans } from '@/lib/subscription'

export const GET = apiHandler(async () => {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [subscription, balance, plans] = await Promise.all([
    getUserSubscriptionState(session.user.id),
    getCreditBalance(session.user.id),
    getActivePlans(),
  ])

  return NextResponse.json({
    subscription,
    balance,
    plans,
  })
})
```

---

### Task 7.2: 用户邀请 API

- [ ] **Step 1: 创建 `src/app/api/user/invite/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-errors'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { getUserInvites, getUserInviteStats } from '@/lib/invite'

export const GET = apiHandler(async () => {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { inviteCode: true },
  })

  const [invites, stats] = await Promise.all([
    getUserInvites(session.user.id),
    getUserInviteStats(session.user.id),
  ])

  return NextResponse.json({
    inviteCode: user?.inviteCode,
    invites,
    stats,
  })
})
```

---

## 验证清单

完成所有计划后，确认以下内容：

- [ ] Plan 1: Schema 迁移成功，套餐数据已写入
- [ ] Plan 2: 平台配置服务能正确加密/解密 API Key
- [ ] Plan 3: 积分服务能正确冻结、扣除、回滚积分
- [ ] Plan 4: 订阅服务能正确分配套餐和处理过期
- [ ] Plan 5: 邀请注册能正确发放双边奖励
- [ ] Plan 6: 管理员 API 能正常工作（需要管理员权限）
- [ ] Plan 7: 用户 API 能正确返回订阅和邀请信息

---

## 执行选项

**Plan 1 (Schema) 已部分设计完成**，可优先执行。其他模块按顺序执行。

**执行方式选择：**

1. **Subagent-Driven (推荐)** - 每个 Plan 由独立 subagent 执行，分步审查
2. **Inline Execution** - 在当前会话批量执行，设置检查点
