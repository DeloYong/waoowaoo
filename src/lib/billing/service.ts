import { createHash, randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { logError as _ulogError } from '@/lib/logging/core'
import { getLogContext } from '@/lib/logging/context'
import { prisma } from '@/lib/prisma'
import { parseModelKeyStrict } from '@/lib/model-config-contract'
import { trackEvent } from '@/lib/observability'
import {
  calcImage,
  calcLipSync,
  calcText,
  calcVideo,
  calcVideoByTokens,
  calcVoice,
  calcVoiceDesign,
  type ModelCustomPricing,
} from './cost'
import { getFreezeByIdempotencyKey, recordShadowUsage } from './ledger'
import { quoteCredits } from '../credit-billing/catalog'
import { freezeCredits, confirmCreditDeduct, unfreezeCredits } from '../credit-billing/service'
import type { MediaType } from '../credit-billing/types'

function mapApiTypeToMediaType(apiType: ApiType): MediaType {
  if (apiType === 'voice') return 'audio'
  if (apiType === 'voice-design') return 'voiceDesign'
  if (apiType === 'lip-sync') return 'lipSync'
  return apiType
}
import type { ApiType, UsageUnit } from './cost'
import { getBillingMode } from './mode'
import { BillingOperationError, InsufficientBalanceError } from './errors'
import { roundMoney } from './money'
import { withTextUsageCollection, type TextUsageEntry } from './runtime-usage'
import type {
  BillingRecordParams,
  TaskBillingInfo,
} from './types'
import { BUILTIN_PRICING_VERSION } from '@/lib/model-pricing/version'

type CostInput = {
  apiType: ApiType
  model: string
  quantity: number
  unit: UsageUnit
  metadata?: Record<string, unknown>
  quotedCost?: number
  maxCost?: number
  customPricing?: ModelCustomPricing | null
}

type SyncBillingParams<T> = {
  userId: string
  projectId: string
  action: string
  apiType: ApiType
  model: string
  quantity: number
  unit: UsageUnit
  metadata?: Record<string, unknown>
  quotedCost?: number
  maxCost?: number
  customPricing?: ModelCustomPricing | null
  extractActualQuantity?: (result: T) => number | null | undefined
}

type ResolvedActual = {
  actualCost: number
  actualQuantity: number
  metadata?: Record<string, unknown>
}

type UsageByModel = Record<string, { inputTokens: number; outputTokens: number; cost: number }>

const MONEY_SCALE = 6
const MONEY_EPSILON = 1e-9

function normalizeMoney(value: number): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return roundMoney(Math.max(0, numeric), MONEY_SCALE)
}

function asNumber(value: unknown): number | null {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return n
}

function resolveCost(input: CostInput) {
  const asMoney = (value: number) => normalizeMoney(value)

  if (typeof input.maxCost === 'number' && input.maxCost >= 0) {
    return asMoney(input.maxCost)
  }

  if (typeof input.quotedCost === 'number' && input.quotedCost >= 0) {
    return asMoney(input.quotedCost)
  }

  switch (input.apiType) {
    case 'text': {
      const inputTokens = Number(input.metadata?.inputTokens ?? Math.floor(input.quantity * 0.7))
      const outputTokens = Number(input.metadata?.outputTokens ?? Math.max(input.quantity - inputTokens, 0))
      return asMoney(calcText(input.model, Math.max(inputTokens, 0), Math.max(outputTokens, 0), input.customPricing))
    }
    case 'image':
      return asMoney(calcImage(input.model, input.quantity, input.metadata, input.customPricing))
    case 'video': {
      const resolution = typeof input.metadata?.resolution === 'string' ? input.metadata.resolution : '720p'
      return asMoney(calcVideo(input.model, resolution, input.quantity, input.metadata, input.customPricing))
    }
    case 'voice':
      return asMoney(calcVoice(input.quantity))
    case 'voice-design':
      return asMoney(calcVoiceDesign())
    case 'lip-sync':
      return asMoney(calcLipSync(input.model))
    default:
      throw new BillingOperationError('BILLING_INVALID_API_TYPE', `Unsupported billing apiType: ${String(input.apiType)}`, {
        apiType: input.apiType,
        model: input.model,
      })
  }
}

function resolveTextCostFromUsage(
  usage: TextUsageEntry[],
  customPricing?: ModelCustomPricing | null,
): ResolvedActual | null {
  if (!Array.isArray(usage) || usage.length === 0) return null

  let inputTokens = 0
  let outputTokens = 0
  let cost = 0
  const byModel: UsageByModel = {}

  for (const item of usage) {
    const inTokens = Math.max(0, Math.floor(Number(item.inputTokens || 0)))
    const outTokens = Math.max(0, Math.floor(Number(item.outputTokens || 0)))
    const model = item.model || 'unknown'
    const hasBillableTokens = inTokens > 0 || outTokens > 0
    const itemCost = hasBillableTokens ? normalizeMoney(calcText(model, inTokens, outTokens, customPricing)) : 0

    inputTokens += inTokens
    outputTokens += outTokens
    cost += itemCost

    if (!byModel[model]) {
      byModel[model] = { inputTokens: 0, outputTokens: 0, cost: 0 }
    }
    byModel[model].inputTokens += inTokens
    byModel[model].outputTokens += outTokens
    byModel[model].cost += itemCost
  }

  return {
    actualCost: normalizeMoney(cost),
    actualQuantity: inputTokens + outputTokens,
    metadata: {
      actualInputTokens: inputTokens,
      actualOutputTokens: outputTokens,
      usageByModel: byModel,
    },
  }
}

function resolveRecordModel(defaultModel: string, metadata?: Record<string, unknown>) {
  const usageByModelValue = metadata?.usageByModel
  if (!usageByModelValue || typeof usageByModelValue !== 'object' || Array.isArray(usageByModelValue)) {
    return {
      model: defaultModel,
      actualModels: [] as string[],
    }
  }
  const actualModels = Object.keys(usageByModelValue as UsageByModel).filter((item) => typeof item === 'string' && item.trim())
  if (actualModels.length === 0) {
    return {
      model: defaultModel,
      actualModels,
    }
  }
  if (actualModels.length === 1) {
    return {
      model: actualModels[0],
      actualModels,
    }
  }
  return {
    model: 'multi-model',
    actualModels,
  }
}

async function executeWithUsage<T>(
  apiType: ApiType,
  execute: () => Promise<T>,
): Promise<{ result: T; textUsage: TextUsageEntry[] }> {
  if (apiType !== 'text') {
    return {
      result: await execute(),
      textUsage: [],
    }
  }
  return await withTextUsageCollection(execute)
}

function clampChargedCost(actualCost: number, freezeCost: number) {
  const normalizedActual = normalizeMoney(actualCost)
  const normalizedFreeze = normalizeMoney(freezeCost)
  if (normalizedActual <= normalizedFreeze + MONEY_EPSILON) {
    return normalizedActual
  }
  _ulogError('[Billing] actual cost exceeds frozen max, overage freeze required', {
    actualCost: normalizedActual,
    frozenCost: normalizedFreeze,
    requiredOverage: normalizeMoney(normalizedActual - normalizedFreeze),
  })
  return normalizedActual
}



function resolveActualForSync<T>(
  params: SyncBillingParams<T>,
  result: T,
  textUsage: TextUsageEntry[],
  quotedCost: number,
): ResolvedActual {
  const textResolved = resolveTextCostFromUsage(textUsage, params.customPricing)
  if (params.apiType === 'text' && textResolved) {
    if (textResolved.actualQuantity > 0) {
      return textResolved
    }
    return {
      actualCost: quotedCost,
      actualQuantity: params.quantity,
      metadata: {
        ...(textResolved.metadata || {}),
      },
    }
  }

  if (params.extractActualQuantity) {
    const actualQuantity = asNumber(params.extractActualQuantity(result))
    if (actualQuantity !== null && actualQuantity >= 0) {
      return {
        actualCost: resolveCost({
          apiType: params.apiType,
          model: params.model,
          quantity: actualQuantity,
          unit: params.unit,
          metadata: params.metadata,
          customPricing: params.customPricing,
        }),
        actualQuantity,
      }
    }
  }

  return {
    actualCost: quotedCost,
    actualQuantity: params.quantity,
  }
}

function resolveTaskActual(
  info: Extract<TaskBillingInfo, { billable: true }>,
  quotedCost: number,
  options?: {
    result?: Record<string, unknown> | void
    textUsage?: TextUsageEntry[]
  },
): ResolvedActual {
  const textResolved = resolveTextCostFromUsage(options?.textUsage || [])
  if (info.apiType === 'text' && textResolved) {
    if (textResolved.actualQuantity > 0) {
      return textResolved
    }
    return {
      actualCost: quotedCost,
      actualQuantity: info.quantity,
      metadata: {
        ...(textResolved.metadata || {}),
      },
    }
  }

  const payload = options?.result && typeof options.result === 'object' ? options.result : null
  const actualVideoTokens = payload
    ? asNumber((payload as Record<string, unknown>).actualVideoTokens)
    : null
  if (info.apiType === 'video' && actualVideoTokens !== null && actualVideoTokens >= 0) {
    return {
      actualCost: calcVideoByTokens(info.model, actualVideoTokens, info.metadata),
      actualQuantity: actualVideoTokens,
      metadata: {
        actualVideoTokens,
      },
    }
  }
  const actualQuantity = payload
    ? asNumber(
      (payload as Record<string, unknown>).actualQuantity
      ?? (payload as Record<string, unknown>).actualSeconds
      ?? (payload as Record<string, unknown>).actualDurationSeconds
      ?? (payload as Record<string, unknown>).actualCharacters
    )
    : null

  if (actualQuantity !== null && actualQuantity >= 0) {
    return {
      actualCost: resolveCost({
        apiType: info.apiType,
        model: info.model,
        quantity: actualQuantity,
        unit: info.unit,
        metadata: info.metadata,
      }),
      actualQuantity,
    }
  }

  return {
    actualCost: resolveCost({
      apiType: info.apiType,
      model: info.model,
      quantity: info.quantity,
      unit: info.unit,
      metadata: info.metadata,
      quotedCost: info.totalCredits,
    }),
    actualQuantity: info.quantity,
  }
}

function buildSyncBillingKey<T>(params: SyncBillingParams<T>, recordParams: BillingRecordParams) {
  if (recordParams.billingKey) return recordParams.billingKey

  const metadataFingerprint = JSON.stringify({
    ...(recordParams.metadata || {}),
    ...(params.metadata || {}),
  })
  const requestId =
    recordParams.requestId
    || (typeof recordParams.metadata?.requestId === 'string' ? recordParams.metadata.requestId : null)
    || getLogContext().requestId

  if (requestId) {
    const digest = createHash('sha1')
      .update(`${params.userId}:${params.projectId}:${params.action}:${params.apiType}:${params.model}:${params.quantity}:${metadataFingerprint}:${requestId}`)
      .digest('hex')
      .slice(0, 16)
    return `sync_${requestId}_${digest}`
  }

  return `sync_${randomUUID()}`
}

async function withSyncBillingCore<T>(
  params: SyncBillingParams<T>,
  recordParams: BillingRecordParams,
  execute: () => Promise<T>,
): Promise<T> {
  const pricingVersion = BUILTIN_PRICING_VERSION
  const pricingSelections = params.metadata || {}
  const mode = await getBillingMode()
  if (mode === 'OFF') {
    return await execute()
  }

  let quote: { totalCredits: number }
  try {
    quote = await quoteCredits(
      mapApiTypeToMediaType(params.apiType),
      params.model,
      params.quantity,
      {
        resolution: typeof params.metadata?.resolution === 'string' ? params.metadata.resolution : undefined,
        duration: typeof params.metadata?.duration === 'number' ? params.metadata.duration : undefined,
      }
    )
  } catch (error) {
    throw error
  }
  const quotedCost = quote.totalCredits

  if (quotedCost <= 0) {
    return await execute()
  }

  if (mode === 'SHADOW') {
    return await execute()
  }

  const billingKey = buildSyncBillingKey(params, recordParams)
  const requestId = recordParams.requestId || getLogContext().requestId || undefined
  const existingFreeze = await getFreezeByIdempotencyKey(billingKey)
  if (existingFreeze) {
    if (existingFreeze.status === 'confirmed') {
      throw new BillingOperationError(
        'BILLING_IDEMPOTENT_ALREADY_CONFIRMED',
        'duplicate billing request already confirmed',
        { billingKey, freezeId: existingFreeze.id },
      )
    }
    if (existingFreeze.status === 'pending') {
      throw new BillingOperationError(
        'BILLING_IDEMPOTENT_IN_PROGRESS',
        'duplicate billing request is already in progress',
        { billingKey, freezeId: existingFreeze.id },
      )
    }
    if (existingFreeze.status === 'rolled_back') {
      throw new BillingOperationError(
        'BILLING_IDEMPOTENT_ROLLED_BACK',
        'duplicate billing request was already rolled back',
        { billingKey, freezeId: existingFreeze.id },
      )
    }
  }

  const freezeId = await freezeCredits(params.userId, quotedCost, {
    source: 'sync',
    requestId,
    idempotencyKey: billingKey,
    metadata: {
      projectId: params.projectId,
      action: params.action,
      apiType: params.apiType,
      model: params.model,
      unit: params.unit,
      quantity: params.quantity,
      billingKey,
      requestId,
      ...(recordParams.metadata || {}),
      ...(params.metadata || {}),
      pricingVersion,
      pricingSelections,
    },
  })
  if (!freezeId) {
    const { getCreditBalance } = await import('../credit-billing/service')
    const balance = await getCreditBalance(params.userId)
    throw new InsufficientBalanceError(quotedCost, balance.availableCredits)
  }

  try {
    const { result } = await executeWithUsage(params.apiType, execute)
    await confirmCreditDeduct(freezeId, quotedCost)
    return result
  } catch (error) {
    await unfreezeCredits(freezeId)
    if (error instanceof BillingOperationError) {
      throw new BillingOperationError(error.code, error.message, {
        ...(error.details || {}),
        billingKey,
        pricingVersion,
      }, error)
    }
    throw error
  }
}

/**
 * Load user custom pricing for a specific model from their stored config.
 */
async function loadUserCustomPricing(
  userId: string,
  model: string,
): Promise<ModelCustomPricing | null> {
  const parsed = parseModelKeyStrict(model)
  if (!parsed) return null

  const pref = await prisma.userPreference.findUnique({
    where: { userId },
    select: { customModels: true },
  })
  if (!pref?.customModels) return null

  let models: Array<{ modelKey: string; customPricing?: unknown }>
  try {
    models = JSON.parse(pref.customModels) as typeof models
  } catch {
    return null
  }
  if (!Array.isArray(models)) return null

  const target = models.find((m) => m.modelKey === parsed.modelKey)
  const raw = target?.customPricing
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const pricing = raw as Record<string, unknown>

  const llmRaw = (pricing.llm && typeof pricing.llm === 'object' && !Array.isArray(pricing.llm))
    ? (pricing.llm as Record<string, unknown>)
    : pricing

  const inputPerMillion = typeof llmRaw.inputPerMillion === 'number'
    ? llmRaw.inputPerMillion
    : typeof pricing.input === 'number'
      ? pricing.input
      : undefined
  const outputPerMillion = typeof llmRaw.outputPerMillion === 'number'
    ? llmRaw.outputPerMillion
    : typeof pricing.output === 'number'
      ? pricing.output
      : undefined

  const normalizeMedia = (value: unknown): ModelCustomPricing['image'] | undefined => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
    const record = value as Record<string, unknown>
    const basePrice = typeof record.basePrice === 'number' ? record.basePrice : undefined
    const rawOptions = record.optionPrices
    let optionPrices: Record<string, Record<string, number>> | undefined
    if (rawOptions && typeof rawOptions === 'object' && !Array.isArray(rawOptions)) {
      optionPrices = {}
      for (const [field, rawFieldOptions] of Object.entries(rawOptions as Record<string, unknown>)) {
        if (!rawFieldOptions || typeof rawFieldOptions !== 'object' || Array.isArray(rawFieldOptions)) continue
        const normalizedField: Record<string, number> = {}
        for (const [optionKey, rawAmount] of Object.entries(rawFieldOptions as Record<string, unknown>)) {
          if (typeof rawAmount !== 'number' || !Number.isFinite(rawAmount) || rawAmount < 0) continue
          normalizedField[optionKey] = rawAmount
        }
        if (Object.keys(normalizedField).length > 0) {
          optionPrices[field] = normalizedField
        }
      }
      if (Object.keys(optionPrices).length === 0) {
        optionPrices = undefined
      }
    }
    if (basePrice === undefined && optionPrices === undefined) return undefined
    return {
      ...(basePrice !== undefined ? { basePrice } : {}),
      ...(optionPrices ? { optionPrices } : {}),
    }
  }

  const image = normalizeMedia(pricing.image)
  const video = normalizeMedia(pricing.video)
  const llm = (typeof inputPerMillion === 'number' || typeof outputPerMillion === 'number')
    ? {
      ...(typeof inputPerMillion === 'number' ? { inputPerMillion } : {}),
      ...(typeof outputPerMillion === 'number' ? { outputPerMillion } : {}),
    }
    : undefined

  if (!llm && !image && !video) return null
  return {
    ...(llm ? { llm } : {}),
    ...(image ? { image } : {}),
    ...(video ? { video } : {}),
  }
}

export async function withTextBilling<T>(
  userId: string,
  model: string,
  maxInputTokens: number,
  maxOutputTokens: number,
  recordParams: BillingRecordParams,
  generateFn: () => Promise<T>,
): Promise<T> {
  const customPricing = await loadUserCustomPricing(userId, model)
  const quotedCost = calcText(model, maxInputTokens, maxOutputTokens, customPricing)
  return await withSyncBillingCore(
    {
      userId,
      projectId: recordParams.projectId,
      action: recordParams.action,
      apiType: 'text',
      model,
      quantity: maxInputTokens + maxOutputTokens,
      unit: 'token',
      metadata: {
        ...recordParams.metadata,
        maxInputTokens,
        maxOutputTokens,
      },
      maxCost: quotedCost,
      customPricing,
    },
    recordParams,
    generateFn,
  )
}

export async function withImageBilling<T>(
  userId: string,
  model: string,
  count: number,
  recordParams: BillingRecordParams,
  generateFn: () => Promise<T>,
): Promise<T> {
  const customPricing = await loadUserCustomPricing(userId, model)
  return await withSyncBillingCore(
    {
      userId,
      projectId: recordParams.projectId,
      action: recordParams.action,
      apiType: 'image',
      model,
      quantity: count,
      unit: 'image',
      metadata: recordParams.metadata,
      customPricing,
    },
    recordParams,
    generateFn,
  )
}

export async function withVideoBilling<T>(
  userId: string,
  model: string,
  resolution: string,
  maxCount: number,
  recordParams: BillingRecordParams,
  generateFn: () => Promise<T>,
): Promise<T> {
  const customPricing = await loadUserCustomPricing(userId, model)
  return await withSyncBillingCore(
    {
      userId,
      projectId: recordParams.projectId,
      action: recordParams.action,
      apiType: 'video',
      model,
      quantity: maxCount,
      unit: 'video',
      metadata: { ...recordParams.metadata, resolution },
      customPricing,
    },
    recordParams,
    generateFn,
  )
}

export async function withVoiceBilling<T>(
  userId: string,
  maxFreezeSeconds: number,
  recordParams: BillingRecordParams,
  generateFn: () => Promise<T>,
): Promise<T> {
  return await withSyncBillingCore(
    {
      userId,
      projectId: recordParams.projectId,
      action: recordParams.action,
      apiType: 'voice',
      model: 'index-tts2',
      quantity: maxFreezeSeconds,
      unit: 'second',
      metadata: recordParams.metadata,
      maxCost: calcVoice(maxFreezeSeconds),
      extractActualQuantity: (result) => {
        if (!result || typeof result !== 'object') return null
        const value =
          (result as Record<string, unknown>).actualDurationSeconds
          ?? (result as Record<string, unknown>).actualSeconds
        return asNumber(value)
      },
    },
    recordParams,
    generateFn,
  )
}

export async function withVoiceDesignBilling<T>(
  userId: string,
  recordParams: BillingRecordParams,
  generateFn: () => Promise<T>,
): Promise<T> {
  return await withSyncBillingCore(
    {
      userId,
      projectId: recordParams.projectId,
      action: recordParams.action,
      apiType: 'voice-design',
      model: 'bailian',
      quantity: 1,
      unit: 'call',
      metadata: recordParams.metadata,
    },
    recordParams,
    generateFn,
  )
}

export async function withLipSyncBilling<T>(
  userId: string,
  recordParams: BillingRecordParams,
  model = 'kling',
  generateFn: () => Promise<T>,
): Promise<T> {
  return await withSyncBillingCore(
    {
      userId,
      projectId: recordParams.projectId,
      action: recordParams.action,
      apiType: 'lip-sync',
      model,
      quantity: 1,
      unit: 'call',
      metadata: recordParams.metadata,
    },
    recordParams,
    generateFn,
  )
}

export function handleBillingError(error: unknown): NextResponse | null {
  if (error instanceof InsufficientBalanceError) {
    return NextResponse.json(
      {
        error: error.message,
        code: 'INSUFFICIENT_BALANCE',
        required: error.required,
        available: error.available,
      },
      { status: 402 },
    )
  }
  return null
}

export async function prepareTaskBilling(task: {
  id: string
  userId: string
  projectId: string
  billingInfo: TaskBillingInfo | { billable: false } | null
}) {
  const info = task.billingInfo
  if (!info || !info.billable) {
    console.log('[Billing] prepareTaskBilling SKIP: not billable', {
      taskId: task.id,
      hasInfo: !!info,
      billable: info?.billable,
    })
    return info
  }

  const mode = await getBillingMode()
  const next: TaskBillingInfo = {
    ...info,
    modeSnapshot: mode,
    billingKey: info.billingKey || task.id,
    pricingVersion: info.pricingVersion || BUILTIN_PRICING_VERSION,
  }

  console.log('[Billing] prepareTaskBilling ENTER', {
    taskId: task.id,
    apiType: info.apiType,
    model: info.model,
    quantity: info.quantity,
    mode,
  })

  if (mode === 'OFF') {
    console.log('[Billing] prepareTaskBilling SKIP: mode is OFF')
    next.status = 'skipped'
    trackEvent({
      event: 'billing.prepare',
      taskId: task.id,
      userId: task.userId,
      mode,
      apiType: info.apiType,
      model: info.model,
      quantity: info.quantity,
      quotedCost: 0,
      skipReason: 'mode_OFF',
    })
    return next
  }

  const customPricing = await loadUserCustomPricing(task.userId, info.model)
  let quote: { totalCredits: number }
  try {
    quote = await quoteCredits(
      mapApiTypeToMediaType(info.apiType),
      info.model,
      info.quantity,
      {
        resolution: typeof info.metadata?.resolution === 'string' ? info.metadata.resolution : undefined,
        duration: typeof info.metadata?.duration === 'number' ? info.metadata.duration : undefined,
      }
    )
  } catch (error) {
    if (mode !== 'ENFORCE' && error instanceof BillingOperationError && error.code === 'BILLING_UNKNOWN_MODEL') {
      next.status = mode === 'SHADOW' ? 'quoted' : 'skipped'
      next.totalCredits = 0
      return next
    }
    throw error
  }
  const quotedCost = quote.totalCredits

  if (quotedCost <= 0) {
    _ulogError('[Billing] prepareTaskBilling skipped: quotedCost <= 0', {
      taskId: task.id,
      apiType: info.apiType,
      model: info.model,
      quantity: info.quantity,
      mediaType: mapApiTypeToMediaType(info.apiType),
      quotedCost,
    })
    next.status = 'skipped'
    trackEvent({
      event: 'billing.prepare',
      taskId: task.id,
      userId: task.userId,
      mode,
      apiType: info.apiType,
      model: info.model,
      quantity: info.quantity,
      quotedCost: 0,
      skipReason: 'quotedCost_zero',
    })
    return next
  }

  if (mode === 'SHADOW') {
    next.status = 'quoted'
    next.totalCredits = quotedCost
    trackEvent({
      event: 'billing.prepare',
      taskId: task.id,
      userId: task.userId,
      mode,
      apiType: info.apiType,
      model: info.model,
      quantity: info.quantity,
      quotedCost,
      skipReason: 'mode_SHADOW',
    })
    return next
  }

  const freezeId = await freezeCredits(task.userId, quotedCost, {
    source: 'task',
    taskId: task.id,
    idempotencyKey: info.billingKey || task.id,
    metadata: {
      taskType: info.taskType,
      action: info.action,
      apiType: info.apiType,
      model: info.model,
      quantity: info.quantity,
      unit: info.unit,
      billingKey: info.billingKey || task.id,
      pricingVersion: info.pricingVersion || BUILTIN_PRICING_VERSION,
      pricingSelections: info.metadata || {},
      ...(info.metadata || {}),
    },
  })
  if (!freezeId) {
    const { getCreditBalance } = await import('../credit-billing/service')
    const balance = await getCreditBalance(task.userId)

    // 记录积分不足的日志，方便排查
    _ulogError('积分不足，无法完成操作', {
      userId: task.userId,
      taskId: task.id,
      taskType: info.taskType,
      requiredCredits: quotedCost,
      availableCredits: balance.availableCredits,
      subscriptionCredits: balance.subscriptionCredits,
      permanentCredits: balance.permanentCredits,
      frozenCredits: balance.frozenCredits,
      model: info.model,
      quantity: info.quantity,
      metadata: info.metadata,
    })

    throw new InsufficientBalanceError(quotedCost, balance.availableCredits)
  }

  _ulogError('[Billing] prepareTaskBilling frozen', {
    taskId: task.id,
    apiType: info.apiType,
    model: info.model,
    quantity: info.quantity,
    quotedCost,
    freezeId,
    userId: task.userId,
  })

  next.status = 'frozen'
  next.freezeId = freezeId
  next.totalCredits = quotedCost

  trackEvent({
    event: 'billing.prepare',
    taskId: task.id,
    userId: task.userId,
    mode,
    apiType: info.apiType,
    model: info.model,
    quantity: info.quantity,
    quotedCost,
    freezeId,
  })

  return next
}

export async function settleTaskBilling(task: {
  id: string
  projectId: string
  episodeId?: string | null
  userId: string
  billingInfo: TaskBillingInfo | { billable: false } | null
}, options?: {
  result?: Record<string, unknown> | void
  textUsage?: TextUsageEntry[]
}) {
  const info = task.billingInfo
  if (!info || !info.billable) return info

  const mode = info.modeSnapshot || await getBillingMode()

  console.log('[Billing] settleTaskBilling ENTER', {
    taskId: task.id,
    apiType: info.apiType,
    model: info.model,
    quantity: info.quantity,
    mode,
    billingStatus: info.status,
    freezeId: info.freezeId || 'NONE',
  })

  const noChargeStatus = info.status === 'skipped' ? 'skipped' : 'settled'
  if (mode === 'OFF') {
    return {
      ...info,
      modeSnapshot: mode,
      status: noChargeStatus,
      chargedCredits: 0,
    } satisfies TaskBillingInfo
  }

  let quote: { totalCredits: number }
  try {
    quote = await quoteCredits(
      mapApiTypeToMediaType(info.apiType),
      info.model,
      info.quantity,
      {
        resolution: typeof info.metadata?.resolution === 'string' ? info.metadata.resolution : undefined,
        duration: typeof info.metadata?.duration === 'number' ? info.metadata.duration : undefined,
      }
    )
  } catch (error) {
    if (mode === 'SHADOW' && error instanceof BillingOperationError && error.code === 'BILLING_UNKNOWN_MODEL') {
      return {
        ...info,
        modeSnapshot: mode,
        status: noChargeStatus,
        chargedCredits: 0,
      } satisfies TaskBillingInfo
    }
    throw error
  }

  const quotedCost = quote.totalCredits

  if (mode === 'SHADOW' && quotedCost <= 0) {
    return {
      ...info,
      modeSnapshot: mode,
      status: noChargeStatus,
      chargedCredits: 0,
    } satisfies TaskBillingInfo
  }

  let actualQuantity = info.quantity
  if (options?.result && typeof options.result === 'object') {
    const payload = options.result as Record<string, unknown>
    const aq = Number(payload.actualQuantity ?? payload.actualSeconds ?? payload.actualDurationSeconds ?? payload.actualCharacters ?? payload.actualVideoTokens)
    if (Number.isFinite(aq) && aq >= 0) {
      actualQuantity = aq
    }
  }

  if (mode === 'SHADOW') {
    return {
      ...info,
      modeSnapshot: mode,
      status: info.status === 'skipped' ? 'skipped' : 'settled',
      chargedCredits: 0,
    } satisfies TaskBillingInfo
  }

  if (mode !== 'ENFORCE') {
    return {
      ...info,
      modeSnapshot: mode,
      status: info.status === 'skipped' ? 'skipped' : 'settled',
      chargedCredits: 0,
    } satisfies TaskBillingInfo
  }

  // 如果计费在准备阶段被跳过（如 quotedCost <= 0），直接返回 skipped 而非 failed
  if (info.status === 'skipped') {
    return {
      ...info,
      modeSnapshot: mode,
      status: 'skipped',
      chargedCredits: 0,
    } satisfies TaskBillingInfo
  }

  if (!info.freezeId) {
    return {
      ...info,
      status: 'failed',
    } satisfies TaskBillingInfo
  }

  let chargedCredits = quotedCost
  if (actualQuantity !== info.quantity) {
    try {
      const actualQuote = await quoteCredits(
        mapApiTypeToMediaType(info.apiType),
        info.model,
        actualQuantity,
        {
          resolution: typeof info.metadata?.resolution === 'string' ? info.metadata.resolution : undefined,
          duration: typeof info.metadata?.duration === 'number' ? info.metadata.duration : undefined,
        }
      )
      chargedCredits = actualQuote.totalCredits
    } catch {}
  }

  _ulogError('[Billing] settleTaskBilling', {
    taskId: task.id,
    apiType: info.apiType,
    model: info.model,
    quantity: info.quantity,
    actualQuantity,
    chargedCredits,
    freezeId: info.freezeId,
    status: info.status,
  })

  try {
    await confirmCreditDeduct(info.freezeId, chargedCredits)
  } catch (error) {
    const rolledBack = (await rollbackTaskBilling({
      id: task.id,
      billingInfo: info,
    })) as TaskBillingInfo
    if (rolledBack.billable && rolledBack.status !== 'rolled_back') {
      throw new BillingOperationError('BILLING_CONFIRM_FAILED', 'confirm task charge failed; billing rollback failed', {
        taskId: task.id,
        freezeId: info.freezeId,
      }, error)
    }
    if (error instanceof BillingOperationError) {
      throw new BillingOperationError(error.code, error.message, {
        ...(error.details || {}),
        taskId: task.id,
        freezeId: info.freezeId,
      }, error)
    }
    throw error
  }

  trackEvent({
    event: 'billing.settle',
    taskId: task.id,
    userId: task.userId,
    mode: info.modeSnapshot || 'ENFORCE',
    chargedCredits,
    freezeId: info.freezeId,
  })

  return {
    ...info,
    status: 'settled',
    chargedCredits,
  } satisfies TaskBillingInfo
}

export async function rollbackTaskBilling(task: {
  id: string
  billingInfo: TaskBillingInfo | { billable: false } | null
}) {
  const info = task.billingInfo
  if (!info || !info.billable) return info
  if (!info.freezeId) return info
  if (info.modeSnapshot !== 'ENFORCE') return info

  try {
    await unfreezeCredits(info.freezeId)
    return {
      ...info,
      status: 'rolled_back',
    } satisfies TaskBillingInfo
  } catch (error) {
    _ulogError('[Billing] rollback task freeze failed:', error)
    return {
      ...info,
      status: 'failed',
    } satisfies TaskBillingInfo
  }
}
