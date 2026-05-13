'use client'

import { useTranslations } from 'next-intl'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import type { TaskPresentationState } from '@/lib/task/presentation'
import type { SplitEpisode } from '../types'

interface StepConfirmProps {
  episodes: SplitEpisode[]
  saving: boolean
  savingTaskState: TaskPresentationState | null
  onReanalyze: () => void
  onConfirm: () => void
  onConfirmWithGlobalAnalysis: () => void
}

export default function StepConfirm({
  episodes,
  saving,
  savingTaskState,
  onReanalyze,
  onConfirm,
  onConfirmWithGlobalAnalysis,
}: StepConfirmProps) {
  const t = useTranslations('smartImport')

  return (
    <div className="bg-[var(--wuhu-bg-card)] rounded-2xl border border-[var(--wuhu-neon-purple)]/30 p-6 mb-6 shadow-[0_0_30px_rgba(167,87,255,0.2)]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-2 text-white">{t('preview.title')}</h2>
          <p className="text-white/70">
            {t('preview.episodeCount', { count: episodes.length })}，
            {t('preview.totalWords', { count: episodes.reduce((sum, ep) => sum + ep.wordCount, 0).toLocaleString() })}
            <span className="text-[var(--wuhu-neon-cyan)] ml-2">{t('preview.autoSaved')}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onReanalyze}
            className="px-5 py-2.5 border border-white/20 text-white/70 hover:border-[var(--wuhu-neon-pink)] hover:text-white hover:bg-white/10 rounded-xl font-medium transition-colors duration-200"
          >
            {t('preview.reanalyze')}
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className="px-5 py-2.5 bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_15px_rgba(167,87,255,0.4)] hover:shadow-[0_0_25px_rgba(255,100,200,0.5)] rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving && <TaskStatusInline state={savingTaskState} className="text-white [&>span]:sr-only [&_svg]:text-white" />}
            {saving ? t('preview.saving') : t('preview.confirm')}
          </button>
          {episodes.length > 1 && (
            <button
              onClick={onConfirmWithGlobalAnalysis}
              disabled={saving}
              className="bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_15px_rgba(167,87,255,0.4)] hover:shadow-[0_0_25px_rgba(255,100,200,0.5)] px-5 py-2.5 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
            >
              {saving && <TaskStatusInline state={savingTaskState} className="text-white [&>span]:sr-only [&_svg]:text-white" />}
              {t('globalAnalysis.confirmAndAnalyze')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
