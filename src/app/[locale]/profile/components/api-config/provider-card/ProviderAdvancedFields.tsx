'use client'

import { useEffect, useMemo, useState } from 'react'
import { AppIcon } from '@/components/ui/icons'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { getProviderKey, isPresetComingSoonModel, type CustomModel } from '../types'
import type { UseProviderCardStateResult } from './hooks/useProviderCardState'
import type {
  ProviderCardModelType,
  ProviderCardProps,
  ProviderCardTranslator,
} from './types'

interface ProviderAdvancedFieldsProps {
  provider: ProviderCardProps['provider']
  onToggleModel: ProviderCardProps['onToggleModel']
  onDeleteModel: ProviderCardProps['onDeleteModel']
  onUpdateModel: ProviderCardProps['onUpdateModel']
  t: ProviderCardTranslator
  state: UseProviderCardStateResult
}

const TypeIcon = ({
  type,
  className = 'w-4 h-4',
}: {
  type: ProviderCardModelType
  className?: string
}) => {
  switch (type) {
    case 'llm':
      return (
        <AppIcon name="menu" className={className} />
      )
    case 'image':
      return (
        <AppIcon name="image" className={className} />
      )
    case 'video':
      return (
        <AppIcon name="video" className={className} />
      )
    case 'audio':
      return (
        <AppIcon name="audioWave" className={className} />
      )
  }
}

const typeLabel = (type: ProviderCardModelType, t: ProviderCardTranslator) => {
  switch (type) {
    case 'llm':
      return t('typeText')
    case 'image':
      return t('typeImage')
    case 'video':
      return t('typeVideo')
    case 'audio':
      return t('typeAudio')
  }
}

const MODEL_TYPES: readonly ProviderCardModelType[] = ['llm', 'image', 'video', 'audio']

export function getAddableModelTypesForProvider(providerId: string): ProviderCardModelType[] {
  const providerKey = getProviderKey(providerId)
  if (providerKey === 'openai-compatible') return ['llm', 'image', 'video']
  return ['llm', 'image', 'video', 'audio']
}

export function shouldShowOpenAICompatVideoHint(
  providerId: string,
  type: ProviderCardModelType | null,
): boolean {
  return getProviderKey(providerId) === 'openai-compatible' && type === 'video'
}

function shouldShowDefaultTabs(providerId: string): boolean {
  const providerKey = getProviderKey(providerId)
  return providerKey === 'openai-compatible' || providerKey === 'gemini-compatible'
}

export function getVisibleModelTypesForProvider(
  providerId: string,
  groupedModels: Partial<Record<ProviderCardModelType, CustomModel[]>>,
): ProviderCardModelType[] {
  const shouldShowAllTabs = shouldShowDefaultTabs(providerId)
  const providerKey = getProviderKey(providerId)
  if (shouldShowAllTabs || providerKey === 'ark') {
    return getAddableModelTypesForProvider(providerId)
  }

  return MODEL_TYPES.filter((type) => {
    const modelsOfType = groupedModels[type]
    return Array.isArray(modelsOfType) && modelsOfType.length > 0
  })
}

function formatPriceAmount(amount: number): string {
  const fixed = amount.toFixed(4)
  const normalized = fixed.replace(/\.?0+$/, '')
  return normalized || '0'
}

function getModelPriceTexts(model: CustomModel, t: ProviderCardTranslator): string[] {
  if (
    model.type === 'llm'
    && typeof model.priceInput === 'number'
    && Number.isFinite(model.priceInput)
    && typeof model.priceOutput === 'number'
    && Number.isFinite(model.priceOutput)
  ) {
    return [
      t('priceInput', { amount: `¥${formatPriceAmount(model.priceInput)}` }),
      t('priceOutput', { amount: `¥${formatPriceAmount(model.priceOutput)}` }),
    ]
  }

  const label = typeof model.priceLabel === 'string' ? model.priceLabel.trim() : ''
  if (label) {
    return label === '--' ? [] : [`¥${label}`]
  }
  if (typeof model.price === 'number' && Number.isFinite(model.price) && model.price > 0) {
    return [`¥${formatPriceAmount(model.price)}`]
  }
  return []
}

export function ProviderAdvancedFields({
  provider,
  onToggleModel,
  onDeleteModel,
  onUpdateModel,
  t,
  state,
}: ProviderAdvancedFieldsProps) {
  const providerKey = getProviderKey(provider.id)
  const addableModelTypes = new Set<ProviderCardModelType>(getAddableModelTypesForProvider(provider.id))
  const visibleTypes = useMemo(
    () => getVisibleModelTypesForProvider(provider.id, state.groupedModels),
    [provider.id, state.groupedModels],
  )
  const [activeType, setActiveType] = useState<ProviderCardModelType | null>(
    visibleTypes[0] ?? null,
  )
  const activeTypeSignature = visibleTypes.join('|')

  useEffect(() => {
    if (visibleTypes.length === 0) {
      setActiveType(null)
      return
    }
    if (!activeType || !visibleTypes.includes(activeType)) {
      setActiveType(visibleTypes[0])
    }
  }, [activeType, activeTypeSignature, visibleTypes])

  const currentType = activeType ?? visibleTypes[0] ?? null
  const currentModels = currentType ? (state.groupedModels[currentType] ?? []) : []
  const shouldShowAddButton =
    !!currentType
    && addableModelTypes.has(currentType)
    && state.showAddForm !== currentType
  const defaultAddType: ProviderCardModelType = providerKey === 'openrouter' ? 'llm' : 'image'
  const useTabbedLayout = state.hasModels || shouldShowDefaultTabs(provider.id)
  const shouldShowVideoHint = shouldShowOpenAICompatVideoHint(provider.id, currentType)

  return useTabbedLayout ? (
    <div className="space-y-2.5 p-3">
      <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg">
        {visibleTypes.map((type) => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${
              (currentType ?? visibleTypes[0]) === type
                ? 'bg-[var(--wuhu-neon-purple)] text-white shadow-[0_0_10px_rgba(167,87,255,0.3)]'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <TypeIcon type={type} className="h-3 w-3" />
            <span>{typeLabel(type, t)}</span>
          </button>
        ))}
      </div>

      {currentType && (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-white">
            <TypeIcon type={currentType} className="h-3 w-3 text-white/60" />
            <span>{typeLabel(currentType, t)}</span>
            <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[11px] font-semibold text-white/60">
              {currentModels.length}
            </span>
          </div>
          {shouldShowAddButton && (
            <button
              onClick={() => state.setShowAddForm(currentType)}
              className="px-2 py-1 text-[12px] font-medium rounded-lg border border-white/20 hover:border-[var(--wuhu-neon-purple)] hover:bg-[var(--wuhu-neon-purple)]/10 text-white/70 hover:text-white transition-all flex items-center gap-1"
            >
              <AppIcon name="plus" className="h-3.5 w-3.5" />
              {t('add')}
            </button>
          )}
        </div>
      )}

      {currentType && state.showAddForm === currentType && addableModelTypes.has(currentType) && (
        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <div className="mb-2.5 flex items-center gap-2">
            <input
              type="text"
              value={state.newModel.name}
              onChange={(event) =>
                state.setNewModel({ ...state.newModel, name: event.target.value })
              }
              placeholder={t('modelDisplayName')}
              className="bg-[var(--wuhu-bg-surface)] border border-white/20 focus:border-[var(--wuhu-neon-purple)] focus:shadow-[0_0_10px_rgba(167,87,255,0.2)] rounded-lg px-3 py-1.5 text-[12px] text-white placeholder:text-white/30 outline-none transition-all flex-1"
              autoFocus
            />
            <button onClick={state.handleCancelAdd} className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
              <AppIcon name="close" className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={state.newModel.modelId}
              onChange={(event) =>
                state.setNewModel({ ...state.newModel, modelId: event.target.value })
              }
              placeholder={t('modelActualId')}
              className={`bg-[var(--wuhu-bg-surface)] border border-white/20 focus:border-[var(--wuhu-neon-purple)] focus:shadow-[0_0_10px_rgba(167,87,255,0.2)] rounded-lg flex-1 px-3 py-1.5 text-[12px] font-mono text-white placeholder:text-white/30 outline-none transition-all ${currentType === 'video' && state.batchMode && provider.id === 'ark' ? 'rounded-r-none' : ''}`}
            />
            {currentType === 'video' && state.batchMode && provider.id === 'ark' && (
              <span className="rounded-r-lg bg-white/10 px-2 py-1.5 font-mono text-[12px] text-white/60">
                -batch
              </span>
            )}
            <button
              onClick={() => state.handleAddModel(currentType)}
              disabled={state.isModelSavePending}
              className="px-3 py-1.5 text-[12px] font-medium rounded-lg bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_15px_rgba(167,87,255,0.3)] hover:shadow-[0_0_20px_rgba(167,87,255,0.4)] transition-all"
            >
              {state.isModelSavePending ? t('saving') : t('save')}
            </button>
          </div>
          {shouldShowVideoHint && (
            <p className="mt-2 text-xs text-white/40">
              {t('openaiCompatVideoOnlyHint')}
            </p>
          )}
          {currentType === 'video' && provider.id === 'ark' && (
            <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-white/5 px-2 py-2 border border-white/10">
              <button
                onClick={() => state.setBatchMode(!state.batchMode)}
                className={`w-4 h-4 rounded flex items-center justify-center transition-all ${
                  state.batchMode ? 'bg-[var(--wuhu-neon-purple)]' : 'bg-white/20'
                }`}
              >
                {state.batchMode && (
                  <AppIcon name="checkSm" className="h-2.5 w-2.5 text-white" />
                )}
              </button>
              <span className="text-xs font-medium text-white/60">
                {t('batchModeHalfPrice')}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="bg-white/5 rounded-xl p-2 border border-white/10">
        <div
          className="h-[280px] overflow-y-auto pr-1"
          style={{ scrollbarGutter: 'stable' }}
        >
          <div className="space-y-2">
            {currentModels.map((model, index) => (
              <ModelRow
                key={`${model.modelKey}-${index}`}
                model={model}
                t={t}
                state={state}
                onToggleModel={onToggleModel}
                onDeleteModel={onDeleteModel}
                onUpdateModel={onUpdateModel}
                hasApiKey={!!provider.hasApiKey}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div className="p-3">
      {state.showAddForm === null ? (
        <div className="text-center">
          <p className="mb-3 text-[12px] text-white/40">{t('noModelsForProvider')}</p>
          <div className="flex items-center justify-center">
            <button
              onClick={() => state.setShowAddForm(defaultAddType)}
              className="px-3 py-1.5 text-[12px] rounded-lg border border-white/20 hover:border-[var(--wuhu-neon-purple)] hover:bg-[var(--wuhu-neon-purple)]/10 text-white/70 hover:text-white transition-all flex items-center gap-1"
            >
              <AppIcon name="plus" className="h-3.5 w-3.5" />
              {t('addModel')}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <div className="mb-2.5 flex items-center gap-2">
            <input
              type="text"
              value={state.newModel.name}
              onChange={(event) =>
                state.setNewModel({ ...state.newModel, name: event.target.value })
              }
              placeholder={t('modelDisplayName')}
              className="bg-[var(--wuhu-bg-surface)] border border-white/20 focus:border-[var(--wuhu-neon-purple)] focus:shadow-[0_0_10px_rgba(167,87,255,0.2)] rounded-lg flex-1 px-3 py-1.5 text-[12px] text-white placeholder:text-white/30 outline-none transition-all"
              autoFocus
            />
            <button onClick={state.handleCancelAdd} className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
              <AppIcon name="close" className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={state.newModel.modelId}
              onChange={(event) =>
                state.setNewModel({ ...state.newModel, modelId: event.target.value })
              }
              placeholder={t('modelActualId')}
              className="bg-[var(--wuhu-bg-surface)] border border-white/20 focus:border-[var(--wuhu-neon-purple)] focus:shadow-[0_0_10px_rgba(167,87,255,0.2)] rounded-lg flex-1 px-3 py-1.5 text-[12px] font-mono text-white placeholder:text-white/30 outline-none transition-all"
            />
            <button
              onClick={() => state.showAddForm && state.handleAddModel(state.showAddForm)}
              disabled={state.isModelSavePending}
              className="px-3 py-1.5 text-[12px] font-medium rounded-lg bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_15px_rgba(167,87,255,0.3)] hover:shadow-[0_0_20px_rgba(167,87,255,0.4)] transition-all"
            >
              {state.isModelSavePending ? t('saving') : t('save')}
            </button>
          </div>
          {shouldShowOpenAICompatVideoHint(provider.id, state.showAddForm) && (
            <p className="mt-2 text-xs text-white/40">
              {t('openaiCompatVideoOnlyHint')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

interface ModelRowProps {
  model: CustomModel
  t: ProviderCardTranslator
  state: UseProviderCardStateResult
  onToggleModel: ProviderCardProps['onToggleModel']
  onDeleteModel: ProviderCardProps['onDeleteModel']
  onUpdateModel: ProviderCardProps['onUpdateModel']
  hasApiKey: boolean
}

function ModelRow({
  model,
  t,
  state,
  onToggleModel,
  onDeleteModel,
  onUpdateModel,
  hasApiKey,
}: ModelRowProps) {
  const priceTexts = getModelPriceTexts(model, t)
  const priceText = priceTexts.join(' / ')
  const hasPriceText = priceText.length > 0
  const isComingSoonModel = isPresetComingSoonModel(model.provider, model.modelId)
  const toggleDisabled = isComingSoonModel || !hasApiKey
  const rowDisabledClass = model.enabled ? '' : 'opacity-50'

  return (
    <div className={`group flex items-center justify-between gap-2 rounded-xl bg-[var(--wuhu-bg-surface)] px-3 py-2 transition-colors hover:bg-white/5 border border-white/5 ${rowDisabledClass}`}>
      {state.editingModelId === model.modelKey ? (
        <>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <input
              type="text"
              value={state.editModel.name}
              onChange={(event) =>
                state.setEditModel({ ...state.editModel, name: event.target.value })
              }
              className="bg-[var(--wuhu-bg-surface)] border border-white/20 focus:border-[var(--wuhu-neon-purple)] focus:shadow-[0_0_10px_rgba(167,87,255,0.2)] rounded-lg w-full px-3 py-1.5 text-[12px] text-white placeholder:text-white/30 outline-none transition-all"
              placeholder={t('modelDisplayName')}
            />
            <input
              type="text"
              value={state.editModel.modelId}
              onChange={(event) =>
                state.setEditModel({ ...state.editModel, modelId: event.target.value })
              }
              className="bg-[var(--wuhu-bg-surface)] border border-white/20 focus:border-[var(--wuhu-neon-purple)] focus:shadow-[0_0_10px_rgba(167,87,255,0.2)] rounded-lg w-full px-3 py-1.5 text-[12px] font-mono text-white placeholder:text-white/30 outline-none transition-all"
              placeholder={t('modelActualId')}
            />
            {hasPriceText && (
              <div className="text-xs text-white/40">{priceText}</div>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => state.handleSaveModel(model.modelKey)}
              disabled={state.isModelSavePending}
              className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
              title={t('save')}
            >
              {state.isModelSavePending
                ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                : <AppIcon name="check" className="h-4 w-4" />}
            </button>
            <button
              onClick={state.handleCancelEditModel}
              className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              title={t('cancel')}
            >
              <AppIcon name="close" className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-[12px] font-semibold ${model.enabled ? 'text-white' : 'text-white/60'}`}>
                {model.name}
              </span>
              {state.isDefaultModel(model) && model.enabled && (
                <span className="shrink-0 rounded-md bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] px-1.5 py-0.5 text-[10px] leading-none text-white">
                  {t('default')}
                </span>
              )}
              {hasPriceText && (
                <span className="shrink-0 text-[11px] text-white/40">{priceText}</span>
              )}
            </div>
            <span className="break-all text-[11px] text-white/40">{model.modelId}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {!state.isPresetModel(model.modelKey) && onUpdateModel && (
              <button
                onClick={() => state.handleEditModel(model)}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 opacity-0 transition-opacity group-hover:opacity-100"
                title={t('configure')}
              >
                <AppIcon name="edit" className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={() => onDeleteModel(model.modelKey)}
              className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-white/10 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <AppIcon name="trash" className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={() => {
                if (toggleDisabled) return
                onToggleModel(model.modelKey)
              }}
              className={`relative h-5 w-9 rounded-full transition-all ${toggleDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${model.enabled ? 'bg-[var(--wuhu-neon-purple)] shadow-[0_0_8px_rgba(167,87,255,0.4)]' : 'bg-white/20'}`}
              disabled={toggleDisabled}
              title={isComingSoonModel ? t('comingSoon') : !hasApiKey ? t('configureApiKey') : undefined}
            >
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${model.enabled ? 'translate-x-4' : 'translate-x-0'}`}></div>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
