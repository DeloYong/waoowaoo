'use client'
import { useTranslations } from 'next-intl'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import type { TaskPresentationState } from '@/lib/task/presentation'
import type { ShotVariantSuggestion } from './PanelVariantModal.types'

interface PanelVariantModalSuggestionListProps {
  isAnalyzing: boolean
  suggestions: ShotVariantSuggestion[]
  error: string | null
  selectedVariantId: number | null
  isSubmittingVariantTask: boolean
  analyzeTaskRunningState: TaskPresentationState | null
  variantTaskRunningState: TaskPresentationState | null
  onReanalyze: () => void
  onSelectVariant: (suggestion: ShotVariantSuggestion) => void
}

export default function PanelVariantModalSuggestionList({
  isAnalyzing,
  suggestions,
  error,
  selectedVariantId,
  isSubmittingVariantTask,
  analyzeTaskRunningState,
  variantTaskRunningState,
  onReanalyze,
  onSelectVariant,
}: PanelVariantModalSuggestionListProps) {
  const t = useTranslations('storyboard')
  const renderScore = (score: number) => t('variant.creativeScore', { score })

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-[white] flex items-center gap-2">
          {t('variant.aiRecommend')}
          {isAnalyzing && (
            <TaskStatusInline
              state={analyzeTaskRunningState}
              className="text-[var(--wuhu-neon-cyan)] [&>span]:text-[var(--wuhu-neon-cyan)] [&_svg]:text-[var(--wuhu-neon-cyan)]"
            />
          )}
        </h3>
        {!isAnalyzing && suggestions.length > 0 && (
          <button
            onClick={onReanalyze}
            className="text-xs text-[var(--wuhu-neon-cyan)] hover:text-[white] flex items-center gap-1"
          >
            {t('variant.reanalyze')}
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-[rgba(255, 100, 200, 0.1)] text-[var(--wuhu-neon-pink)] text-sm rounded-lg mb-3 border border-[var(--wuhu-neon-pink)]">
          {error}
        </div>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className={`p-3 border rounded-lg transition-colors cursor-pointer ${selectedVariantId === suggestion.id ? 'border-[var(--wuhu-neon-cyan)] bg-[rgba(0, 255, 255, 0.1)]' : 'border-[rgba(167, 87, 255, 0.2)] hover:border-[var(--wuhu-neon-cyan)] hover:bg-[rgba(255,255,255,0.05)]'}`}
            onClick={() => !isSubmittingVariantTask && onSelectVariant(suggestion)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--wuhu-neon-pink)]">{renderScore(suggestion.creative_score)}</span>
                  <h4 className="text-sm font-medium text-[white]">{suggestion.title}</h4>
                </div>
                <p className="text-xs text-[rgba(255,255,255,0.7)] mt-1">{suggestion.description}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs text-[rgba(255,255,255,0.5)]">{t('variant.shotType')} {suggestion.shot_type}</span>
                  <span className="text-xs text-[rgba(255,255,255,0.5)]">{t('variant.cameraMove')} {suggestion.camera_move}</span>
                </div>
              </div>
              <button
                disabled={isSubmittingVariantTask}
                className={`bg-[var(--wuhu-bg-surface)] border border-white/20 hover:bg-white/5 rounded-lg transition-all px-3 py-1 text-xs rounded-lg ${isSubmittingVariantTask && selectedVariantId === suggestion.id ? 'bg-white/5 text-white/70 text-[rgba(255,255,255,0.5)]' : 'bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_20px_rgba(167,87,255,0.3)] text-white'}`}
              >
                {isSubmittingVariantTask && selectedVariantId === suggestion.id ? (
                  <TaskStatusInline
                    state={variantTaskRunningState}
                    className="text-[rgba(255,255,255,0.5)] [&>span]:text-[rgba(255,255,255,0.5)] [&_svg]:text-[rgba(255,255,255,0.5)]"
                  />
                ) : t('candidate.select')}
              </button>
            </div>
          </div>
        ))}

        {!isAnalyzing && suggestions.length === 0 && !error && (
          <div className="text-center py-8 text-[rgba(255,255,255,0.5)] text-sm">
            {t('variant.clickToAnalyze')}
          </div>
        )}
      </div>
    </div>
  )
}
