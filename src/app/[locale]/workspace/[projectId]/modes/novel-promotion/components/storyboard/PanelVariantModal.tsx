'use client'
import { useTranslations } from 'next-intl'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import { resolveTaskPresentationState } from '@/lib/task/presentation'
import { useAnalyzeProjectShotVariants } from '@/lib/query/hooks'
import { MediaImageWithLoading } from '@/components/media/MediaImageWithLoading'
import type { PanelInfo, ShotVariantSuggestion } from './PanelVariantModal.types'
import PanelVariantModalSuggestionList from './PanelVariantModalSuggestionList'
import PanelVariantModalCustomOptions from './PanelVariantModalCustomOptions'
import { AppIcon } from '@/components/ui/icons'

interface PanelVariantModalProps {
  isOpen: boolean
  onClose: () => void
  panel: PanelInfo
  projectId: string
  onVariant: (
    variant: Omit<ShotVariantSuggestion, 'id' | 'creative_score'>,
    options: { includeCharacterAssets: boolean; includeLocationAsset: boolean },
  ) => Promise<void>
  isSubmittingVariantTask: boolean
}

export default function PanelVariantModal({
  isOpen,
  onClose,
  panel,
  projectId,
  onVariant,
  isSubmittingVariantTask,
}: PanelVariantModalProps) {
  const t = useTranslations('storyboard')
  const [mounted, setMounted] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [suggestions, setSuggestions] = useState<ShotVariantSuggestion[]>([])
  const [error, setError] = useState<string | null>(null)
  const [customInput, setCustomInput] = useState('')
  const [includeCharacterAssets, setIncludeCharacterAssets] = useState(true)
  const [includeLocationAsset, setIncludeLocationAsset] = useState(true)
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null)
  const autoAnalyzeKeyRef = useRef<string | null>(null)
  const analyzingRef = useRef(false)
  const analyzeShotVariantsMutation = useAnalyzeProjectShotVariants(projectId)

  useEffect(() => {
    setMounted(true)
  }, [])

  const analyzeShotVariants = useCallback(async () => {
    if (analyzingRef.current) return
    analyzingRef.current = true
    setIsAnalyzing(true)
    setError(null)
    setSuggestions([])

    try {
      const data = await analyzeShotVariantsMutation.mutateAsync({ panelId: panel.id })
      setSuggestions(data.suggestions || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('variant.analyzeFailed'))
    } finally {
      setIsAnalyzing(false)
      analyzingRef.current = false
    }
  }, [analyzeShotVariantsMutation, panel.id, t])

  useEffect(() => {
    if (!isOpen || !panel.imageUrl) return
    const autoAnalyzeKey = `${panel.id}:${panel.imageUrl}`
    if (autoAnalyzeKeyRef.current === autoAnalyzeKey) return
    autoAnalyzeKeyRef.current = autoAnalyzeKey
    void analyzeShotVariants()
  }, [analyzeShotVariants, isOpen, panel.id, panel.imageUrl])

  useEffect(() => {
    if (isOpen) return
    autoAnalyzeKeyRef.current = null
    analyzingRef.current = false
  }, [isOpen])

  const handleSelectVariant = async (suggestion: ShotVariantSuggestion) => {
    setSelectedVariantId(suggestion.id)
    await onVariant(
      {
        title: suggestion.title,
        description: suggestion.description,
        shot_type: suggestion.shot_type,
        camera_move: suggestion.camera_move,
        video_prompt: suggestion.video_prompt,
      },
      { includeCharacterAssets, includeLocationAsset },
    )
  }

  const handleCustomVariant = async () => {
    if (!customInput.trim()) return

    await onVariant(
      {
        title: t('variant.customVariant'),
        description: customInput,
        shot_type: t('variant.defaultShotType'),
        camera_move: t('variant.defaultCameraMove'),
        video_prompt: customInput,
      },
      { includeCharacterAssets, includeLocationAsset },
    )
  }

  const handleClose = () => {
    if (!isSubmittingVariantTask && !isAnalyzing) {
      setSuggestions([])
      setError(null)
      setCustomInput('')
      setSelectedVariantId(null)
      autoAnalyzeKeyRef.current = null
      analyzingRef.current = false
      onClose()
    }
  }

  const variantTaskRunningState = isSubmittingVariantTask
    ? resolveTaskPresentationState({
      phase: 'processing',
      intent: 'generate',
      resource: 'image',
      hasOutput: !!panel.imageUrl,
    })
    : null

  const analyzeTaskRunningState = isAnalyzing
    ? resolveTaskPresentationState({
      phase: 'processing',
      intent: 'analyze',
      resource: 'image',
      hasOutput: false,
    })
    : null

  if (!isOpen || !mounted) return null

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
      onClick={handleClose}
    >
      <div
        className="bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_50px_rgba(167,87,255,0.3)] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-5 py-3 border-b border-[var(--wuhu-neon-purple)]/20 flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <AppIcon name="videoWide" className="h-4 w-4 text-white/70" />
            {t('variant.shotTitle', { number: panel.panelNumber ?? '' })}
          </h2>
          <button
            onClick={handleClose}
            disabled={isSubmittingVariantTask || isAnalyzing}
            className="text-white/50 hover:text-white transition-colors p-1.5 disabled:opacity-50"
          >
            <AppIcon name="close" className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex gap-4 items-start">
            <div className="w-32 flex-shrink-0">
              {panel.imageUrl ? (
                <MediaImageWithLoading
                  src={panel.imageUrl}
                  alt={t('variant.shotNum', { number: panel.panelNumber ?? '' })}
                  containerClassName="w-full aspect-[9/16] rounded-lg shadow-[0_0_20px_rgba(167,87,255,0.2)]"
                  className="w-full aspect-[9/16] object-cover rounded-lg shadow-[0_0_20px_rgba(167,87,255,0.2)]"
                  width={256}
                  height={456}
                  sizes="128px"
                />
              ) : (
                <div className="w-full aspect-[9/16] bg-[var(--wuhu-bg-surface)] rounded-lg flex items-center justify-center text-white/50 text-xs">
                  {t('variant.noImage')}
                </div>
              )}
              <div className="text-xs text-white/50 mt-1 text-center">#{panel.panelNumber}</div>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-white mb-1">{t('variant.originalDescription')}</h3>
              <p className="text-sm text-white/70">{panel.description || t('variant.noDescription')}</p>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-[var(--wuhu-neon-purple)]/30 to-transparent" />

          <PanelVariantModalSuggestionList
            isAnalyzing={isAnalyzing}
            suggestions={suggestions}
            error={error}
            selectedVariantId={selectedVariantId}
            isSubmittingVariantTask={isSubmittingVariantTask}
            analyzeTaskRunningState={analyzeTaskRunningState}
            variantTaskRunningState={variantTaskRunningState}
            onReanalyze={analyzeShotVariants}
            onSelectVariant={(suggestion) => {
              void handleSelectVariant(suggestion)
            }}
          />

          <div className="h-px bg-gradient-to-r from-transparent via-[var(--wuhu-neon-purple)]/30 to-transparent" />

          <PanelVariantModalCustomOptions
            customInput={customInput}
            includeCharacterAssets={includeCharacterAssets}
            includeLocationAsset={includeLocationAsset}
            isSubmittingVariantTask={isSubmittingVariantTask}
            onCustomInputChange={setCustomInput}
            onIncludeCharacterAssetsChange={setIncludeCharacterAssets}
            onIncludeLocationAssetChange={setIncludeLocationAsset}
          />
        </div>

        <div className="px-5 py-3 border-t border-[var(--wuhu-neon-purple)]/20 flex justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={isSubmittingVariantTask || isAnalyzing}
            className="border border-white/20 text-white/70 hover:border-[var(--wuhu-neon-pink)] hover:text-white hover:bg-white/10 px-4 py-2 text-sm rounded-lg transition-all disabled:opacity-50"
          >
            {t('candidate.cancel')}
          </button>
          <button
            onClick={() => {
              void handleCustomVariant()
            }}
            disabled={isSubmittingVariantTask || !customInput.trim()}
            className={`px-4 py-2 text-sm rounded-lg transition-all ${isSubmittingVariantTask || !customInput.trim() ? 'bg-[var(--wuhu-bg-surface)] text-white/30 cursor-not-allowed' : 'bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_15px_rgba(167,87,255,0.4)] hover:shadow-[0_0_25px_rgba(167,87,255,0.6)]'}`}
          >
            {isSubmittingVariantTask ? (
              <TaskStatusInline
                state={variantTaskRunningState}
                className="text-white/70 [&>span]:text-white/70 [&_svg]:text-white/70"
              />
            ) : t('variant.useCustomGenerate')}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
