/**
 * 平台级 API 配置管理接口（管理员专用）
 *
 * GET  - 读取平台配置(解密)
 * PUT  - 保存/更新平台配置(加密)
 *
 * 此配置对所有用户生效，用户个人配置会覆盖平台配置
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { encryptApiKey, decryptApiKey } from '@/lib/crypto-utils'
import { requireUserAuth, isErrorResponse } from '@/lib/api-auth'
import { apiHandler, ApiError } from '@/lib/api-errors'

// 从用户配置路由复用类型和工具函数
import {
  composeModelKey,
  type CapabilitySelections,
  type ModelCapabilities,
  type UnifiedModelType,
} from '@/lib/model-config-contract'
import { listBuiltinPricingCatalog, type PricingApiType } from '@/lib/model-pricing/catalog'
import { findBuiltinCapabilities } from '@/lib/model-capabilities/catalog'
import {
  DEFAULT_ANALYSIS_WORKFLOW_CONCURRENCY,
  DEFAULT_IMAGE_WORKFLOW_CONCURRENCY,
  DEFAULT_VIDEO_WORKFLOW_CONCURRENCY,
  normalizeWorkflowConcurrencyValue,
} from '@/lib/workflow-concurrency'

type ApiModeType = 'gemini-sdk' | 'openai-official'
type GatewayRouteType = 'official' | 'openai-compat'
type LlmProtocolType = 'responses' | 'chat-completions'
type OpenAICompatMediaTemplate = Record<string, unknown>
type OpenAICompatMediaTemplateSource = 'ai' | 'manual'

interface StoredProvider {
  id: string
  name: string
  baseUrl?: string
  apiKey?: string
  hidden?: boolean
  apiMode?: ApiModeType
  gatewayRoute?: GatewayRouteType
}

interface StoredModelCustomPricing {
  llm?: { inputPerMillion?: number; outputPerMillion?: number }
  image?: { basePrice?: number; optionPrices?: Record<string, Record<string, number>> }
  video?: { basePrice?: number; optionPrices?: Record<string, Record<string, number>> }
}

interface StoredModel {
  modelId: string
  modelKey: string
  name: string
  type: UnifiedModelType
  provider: string
  llmProtocol?: LlmProtocolType
  llmProtocolCheckedAt?: string
  compatMediaTemplate?: OpenAICompatMediaTemplate
  compatMediaTemplateCheckedAt?: string
  compatMediaTemplateSource?: OpenAICompatMediaTemplateSource
  price: number
  priceMin?: number
  priceMax?: number
  priceLabel?: string
  priceInput?: number
  priceOutput?: number
  capabilities?: ModelCapabilities
  customPricing?: StoredModelCustomPricing
  enabled?: boolean
}

interface PricingDisplayItem {
  min: number
  max: number
  label: string
  input?: number
  output?: number
}

type PricingDisplayMap = Record<string, PricingDisplayItem>

interface DefaultModelsPayload {
  analysisModel?: string
  characterModel?: string
  locationModel?: string
  storyboardModel?: string
  editModel?: string
  videoModel?: string
  audioModel?: string
  lipSyncModel?: string
  voiceDesignModel?: string
}

interface ApiConfigPutBody {
  models?: unknown
  providers?: unknown
  defaultModels?: unknown
  capabilityDefaults?: unknown
  workflowConcurrency?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function getProviderKey(providerId: string): string {
  const index = providerId.indexOf(':')
  return index === -1 ? providerId : providerId.slice(0, index)
}

function isUnifiedModelType(value: unknown): value is UnifiedModelType {
  return (
    value === 'llm'
    || value === 'image'
    || value === 'video'
    || value === 'audio'
    || value === 'lipsync'
  )
}

function isApiMode(value: unknown): value is ApiModeType {
  return value === 'gemini-sdk' || value === 'openai-official'
}

function isGatewayRoute(value: unknown): value is GatewayRouteType {
  return value === 'official' || value === 'openai-compat'
}

function isLlmProtocol(value: unknown): value is LlmProtocolType {
  return value === 'responses' || value === 'chat-completions'
}

function formatPriceAmount(amount: number): string {
  const fixed = amount.toFixed(4)
  const normalized = fixed.replace(/\.?0+$/, '')
  return normalized || '0'
}

function pricingApiTypeToModelType(apiType: PricingApiType): UnifiedModelType | null {
  if (apiType === 'text') return 'llm'
  if (apiType === 'image') return 'image'
  if (apiType === 'video') return 'video'
  if (apiType === 'voice') return 'audio'
  if (apiType === 'lip-sync') return 'lipsync'
  return null
}

function composePricingDisplayKey(modelType: UnifiedModelType, provider: string, modelId: string): string {
  return `${modelType}::${provider}::${modelId}`
}

function buildPricingDisplayMap(): PricingDisplayMap {
  const map: PricingDisplayMap = {}
  const entries = listBuiltinPricingCatalog()

  for (const entry of entries) {
    const modelType = pricingApiTypeToModelType(entry.apiType)
    if (!modelType) continue

    let min = 0
    let max = 0
    let input: number | undefined
    let output: number | undefined
    if (entry.pricing.mode === 'flat') {
      const amount = entry.pricing.flatAmount ?? 0
      min = amount
      max = amount
    } else {
      const tiers = entry.pricing.tiers || []
      const amounts = tiers.map((tier) => tier.amount)
      if (amounts.length === 0) continue
      min = Math.min(...amounts)
      max = Math.max(...amounts)

      if (entry.apiType === 'text') {
        for (const tier of tiers) {
          const tokenType = tier.when.tokenType
          if (tokenType === 'input') input = tier.amount
          if (tokenType === 'output') output = tier.amount
        }
      }
    }

    map[composePricingDisplayKey(modelType, entry.provider, entry.modelId)] = {
      min,
      max,
      label: min === max
        ? formatPriceAmount(min)
        : `${formatPriceAmount(min)}~${formatPriceAmount(max)}`,
      ...(typeof input === 'number' ? { input } : {}),
      ...(typeof output === 'number' ? { output } : {}),
    }
  }

  return map
}

function decryptProviderApiKey(provider: StoredProvider): StoredProvider {
  if (provider.apiKey) {
    try {
      return { ...provider, apiKey: decryptApiKey(provider.apiKey) }
    } catch {
      return provider
    }
  }
  return provider
}

function encryptProviderApiKey(provider: StoredProvider): StoredProvider {
  if (provider.apiKey && provider.apiKey.length > 0 && !provider.apiKey.startsWith('enc:')) {
    return { ...provider, apiKey: encryptApiKey(provider.apiKey) }
  }
  return provider
}

function parseStoredProviders(raw: unknown): StoredProvider[] {
  if (!raw) return []
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return []
    }
  }
  if (Array.isArray(raw)) return raw as StoredProvider[]
  return []
}

function parseStoredModels(raw: unknown): StoredModel[] {
  if (!raw) return []
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return []
    }
  }
  if (Array.isArray(raw)) return raw as StoredModel[]
  return []
}

function normalizeDefaultModelsPayload(raw: unknown): DefaultModelsPayload {
  if (!isRecord(raw)) return {}
  const out: DefaultModelsPayload = {}
  const validFields = [
    'analysisModel', 'characterModel', 'locationModel', 'storyboardModel',
    'editModel', 'videoModel', 'audioModel', 'lipSyncModel', 'voiceDesignModel'
  ] as const
  for (const field of validFields) {
    const value = raw[field]
    if (typeof value === 'string') {
      out[field] = value
    }
  }
  return out
}

function normalizeWorkflowConcurrencyPayload(raw: unknown): {
  analysis?: number
  image?: number
  video?: number
} {
  if (!isRecord(raw)) return {}
  return {
    analysis: typeof raw.analysis === 'number' ? normalizeWorkflowConcurrencyValue(raw.analysis, DEFAULT_ANALYSIS_WORKFLOW_CONCURRENCY) : undefined,
    image: typeof raw.image === 'number' ? normalizeWorkflowConcurrencyValue(raw.image, DEFAULT_IMAGE_WORKFLOW_CONCURRENCY) : undefined,
    video: typeof raw.video === 'number' ? normalizeWorkflowConcurrencyValue(raw.video, DEFAULT_VIDEO_WORKFLOW_CONCURRENCY) : undefined,
  }
}

function validateCapabilityDefaultsPayload(raw: unknown): CapabilitySelections | null {
  if (!isRecord(raw)) return null
  // Simplified validation - just return as-is if it's an object
  return raw as CapabilitySelections
}

// ==================== GET: 读取平台配置 ====================

export const GET = apiHandler(async () => {
  // 验证管理员权限
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult
  const { session } = authResult

  // 检查是否为管理员
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  })

  if (!user?.isAdmin) {
    return NextResponse.json(
      { error: 'Forbidden', message: '需要管理员权限' },
      { status: 403 }
    )
  }

  const platformConfig = await prisma.platformConfig.findUnique({
    where: { configKey: 'api_config' },
  })

  if (!platformConfig) {
    // 返回空配置
    return NextResponse.json({
      providers: [],
      models: [],
      defaultModels: {},
      workflowConcurrency: {
        analysis: DEFAULT_ANALYSIS_WORKFLOW_CONCURRENCY,
        image: DEFAULT_IMAGE_WORKFLOW_CONCURRENCY,
        video: DEFAULT_VIDEO_WORKFLOW_CONCURRENCY,
      },
      capabilityDefaults: {},
      pricingDisplay: buildPricingDisplayMap(),
    })
  }

  // 解密并构建 providers
  const providers: StoredProvider[] = parseStoredProviders(platformConfig.customProviders).map(decryptProviderApiKey)

  // 构建 models
  const models: StoredModel[] = parseStoredModels(platformConfig.customModels)

  // 构建 defaultModels
  const defaultModels: DefaultModelsPayload = {
    analysisModel: platformConfig.analysisModel || undefined,
    characterModel: platformConfig.characterModel || undefined,
    locationModel: platformConfig.locationModel || undefined,
    storyboardModel: platformConfig.storyboardModel || undefined,
    editModel: platformConfig.editModel || undefined,
    videoModel: platformConfig.videoModel || undefined,
    audioModel: platformConfig.audioModel || undefined,
    lipSyncModel: platformConfig.lipSyncModel || undefined,
    voiceDesignModel: platformConfig.voiceDesignModel || undefined,
  }

  // 构建 workflowConcurrency
  const workflowConcurrency = {
    analysis: platformConfig.analysisConcurrency ?? DEFAULT_ANALYSIS_WORKFLOW_CONCURRENCY,
    image: platformConfig.imageConcurrency ?? DEFAULT_IMAGE_WORKFLOW_CONCURRENCY,
    video: platformConfig.videoConcurrency ?? DEFAULT_VIDEO_WORKFLOW_CONCURRENCY,
  }

  // 构建 capabilityDefaults
  const capabilityDefaults: CapabilitySelections = platformConfig.capabilityDefaults
    ? JSON.parse(platformConfig.capabilityDefaults)
    : {}

  return NextResponse.json({
    providers,
    models,
    defaultModels,
    workflowConcurrency,
    capabilityDefaults,
    pricingDisplay: buildPricingDisplayMap(),
  })
})

// ==================== PUT: 保存平台配置 ====================

export const PUT = apiHandler(async (request: NextRequest) => {
  // 验证管理员权限
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult
  const { session } = authResult

  // 检查是否为管理员
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  })

  if (!user?.isAdmin) {
    return NextResponse.json(
      { error: 'Forbidden', message: '需要管理员权限' },
      { status: 403 }
    )
  }

  const body: ApiConfigPutBody = await request.json()

  if (!isRecord(body)) {
    throw new ApiError('INVALID_PARAMS', { code: 'INVALID_BODY' })
  }

  // 验证并处理 providers
  let providers: StoredProvider[] = []
  if (Array.isArray(body.providers)) {
    providers = (body.providers as StoredProvider[]).map((p) => {
      if (!isRecord(p) || typeof p.id !== 'string' || typeof p.name !== 'string') {
        throw new ApiError('INVALID_PARAMS', { code: 'PROVIDER_INVALID', field: 'providers' })
      }
      return encryptProviderApiKey(p)
    })
  }

  // 验证并处理 models
  let models: StoredModel[] = []
  if (Array.isArray(body.models)) {
    models = (body.models as StoredModel[]).map((m) => {
      if (!isRecord(m) || typeof m.modelId !== 'string' || typeof m.provider !== 'string') {
        throw new ApiError('INVALID_PARAMS', { code: 'MODEL_INVALID', field: 'models' })
      }
      if (!isUnifiedModelType(m.type)) {
        throw new ApiError('INVALID_PARAMS', { code: 'MODEL_TYPE_INVALID', field: 'models' })
      }
      const modelKey = m.modelKey || composeModelKey(m.provider, m.modelId)
      return { ...m, modelKey }
    })
  }

  // 验证 defaultModels
  const defaultModels = normalizeDefaultModelsPayload(body.defaultModels)

  // 验证 workflowConcurrency
  const concurrencyPayload = normalizeWorkflowConcurrencyPayload(body.workflowConcurrency)

  // 验证 capabilityDefaults
  let capabilityDefaults: CapabilitySelections = {}
  if (body.capabilityDefaults) {
    const validated = validateCapabilityDefaultsPayload(body.capabilityDefaults)
    if (validated) {
      capabilityDefaults = validated
    }
  }

  // 保存到数据库
  await prisma.platformConfig.upsert({
    where: { configKey: 'api_config' },
    update: {
      customProviders: JSON.stringify(providers),
      customModels: JSON.stringify(models),
      analysisConcurrency: concurrencyPayload.analysis,
      imageConcurrency: concurrencyPayload.image,
      videoConcurrency: concurrencyPayload.video,
      capabilityDefaults: JSON.stringify(capabilityDefaults),
      ...defaultModels,
    },
    create: {
      configKey: 'api_config',
      customProviders: JSON.stringify(providers),
      customModels: JSON.stringify(models),
      analysisConcurrency: concurrencyPayload.analysis,
      imageConcurrency: concurrencyPayload.image,
      videoConcurrency: concurrencyPayload.video,
      capabilityDefaults: JSON.stringify(capabilityDefaults),
      ...defaultModels,
    },
  })

  return NextResponse.json({ success: true })
})
