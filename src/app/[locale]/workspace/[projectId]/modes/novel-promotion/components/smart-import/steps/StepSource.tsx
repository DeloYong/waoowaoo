'use client'

import { useTranslations } from 'next-intl'
import { countWords } from '@/lib/word-count'
import type { EpisodeMarkerResult } from '@/lib/episode-marker-detector'
import { AppIcon } from '@/components/ui/icons'

interface StepSourceProps {
  onManualCreate: () => void
  rawContent: string
  onRawContentChange: (content: string) => void
  onAnalyze: () => void
  error: string | null
  showMarkerConfirm: boolean
  markerResult: EpisodeMarkerResult | null
  onCloseMarkerConfirm: () => void
  onUseMarkerSplit: () => void
  onUseAiSplit: () => void
}

export default function StepSource({
  onManualCreate,
  rawContent,
  onRawContentChange,
  onAnalyze,
  error,
  showMarkerConfirm,
  markerResult,
  onCloseMarkerConfirm,
  onUseMarkerSplit,
  onUseAiSplit,
}: StepSourceProps) {
  const t = useTranslations('smartImport')

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-8">
      {showMarkerConfirm && markerResult && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onCloseMarkerConfirm}>
          <div className="bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_40px_rgba(167,87,255,0.2)] p-6 w-full max-w-lg animate-in fade-in zoom-in-95 duration-200 rounded-2xl" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-[var(--wuhu-neon-purple)]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AppIcon name="fileText" className="w-7 h-7 text-[var(--wuhu-neon-purple)]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{t('markerDetected.title')}</h3>
              <p className="text-white/70">
                {t('markerDetected.description', {
                  count: markerResult.matches.length,
                  type: t(`markerDetected.markerTypes.${markerResult.markerTypeKey}` as 'numbered' | 'chapter' | 'custom'),
                })}
              </p>
            </div>

            <div className="mb-6">
              <p className="text-sm font-medium text-white/50 mb-3">{t('markerDetected.preview')}</p>
              <div className="bg-[var(--wuhu-bg-surface)] rounded-xl p-4 max-h-64 overflow-y-auto space-y-2">
                {markerResult.previewSplits.map((split, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-sm">
                    <span className="flex-shrink-0 w-16 font-medium text-[var(--wuhu-neon-purple)]">
                      {t('episode', { num: split.number })}
                    </span>
                    <span className="text-white/70 truncate flex-1">
                      {split.preview || split.title}
                    </span>
                    <span className="flex-shrink-0 text-white/40 text-xs">
                      ~{split.wordCount.toLocaleString()}{t('upload.words')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <button
                onClick={onUseMarkerSplit}
                className="bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] py-4 px-3 rounded-xl font-bold transition-all flex flex-col items-center gap-1 text-white shadow-[0_0_20px_rgba(167,87,255,0.4)] hover:shadow-[0_0_30px_rgba(255,100,200,0.5)]"
              >
                <span>{t('markerDetected.useMarker')}</span>
                <span className="text-xs font-normal opacity-80">{t('markerDetected.useMarkerDesc')}</span>
              </button>
              <button
                onClick={onUseAiSplit}
                className="py-4 bg-[var(--wuhu-bg-card)] border-2 border-[var(--wuhu-neon-purple)]/30 text-white/80 rounded-xl font-bold hover:border-[var(--wuhu-neon-pink)]/50 hover:bg-[var(--wuhu-neon-purple)]/10 transition-all flex flex-col items-center gap-1 hover:shadow-[0_0_20px_rgba(167,87,255,0.2)]"
              >
                <span>{t('markerDetected.useAI')}</span>
                <span className="text-xs font-normal text-white/50">{t('markerDetected.useAIDesc')}</span>
              </button>
            </div>

            <button
              onClick={onCloseMarkerConfirm}
              className="w-full py-2.5 text-white/40 hover:text-white/70 font-medium transition-colors"
            >
              {t('markerDetected.cancel')}
            </button>
          </div>
        </div>
      )}

      <div className="max-w-5xl w-full">
        <div className="text-center mb-12 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[var(--wuhu-neon-purple)]/10 rounded-full blur-3xl -z-10"></div>
          <div className="inline-block relative">
            <h1 className="text-5xl md:text-6xl font-extrabold mb-6 tracking-tight">
              <span className="wuhu-text-gradient">
                {t('title')}
              </span>
            </h1>
          </div>
          <p className="text-white/50 text-xl font-medium max-w-2xl mx-auto leading-relaxed">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-stretch">
          <button
            onClick={onManualCreate}
            className="group bg-[var(--wuhu-bg-card)] border-2 border-[var(--wuhu-neon-purple)]/20 hover:border-[var(--wuhu-neon-pink)]/50 rounded-2xl p-8 text-left transition-all duration-200 hover:shadow-[0_0_40px_rgba(167,87,255,0.2)] cursor-pointer flex flex-col justify-center"
          >
            <div className="w-16 h-16 bg-[var(--wuhu-bg-surface)] rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[var(--wuhu-neon-purple)]/20 transition-colors duration-200">
              <AppIcon name="edit" className="w-8 h-8 text-white/60 group-hover:text-[var(--wuhu-neon-purple)] transition-colors duration-200" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-white">{t('manualCreate.title')}</h3>
            <p className="text-white/50 mb-6 leading-relaxed">{t('manualCreate.description')}</p>
            <div className="flex items-center text-[var(--wuhu-neon-pink)] font-bold">
              <span>{t('manualCreate.button')}</span>
              <AppIcon name="chevronRight" className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
            </div>
          </button>

          <div className="relative rounded-2xl border-2 border-[var(--wuhu-neon-purple)]/20 bg-[var(--wuhu-bg-card)] p-6 flex flex-col shadow-[0_0_30px_rgba(167,87,255,0.1)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-[var(--wuhu-neon-purple)]/20 rounded-xl flex items-center justify-center">
                <AppIcon name="bolt" className="w-6 h-6 text-[var(--wuhu-neon-purple)]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{t('smartImport.title')}</h3>
                <p className="text-sm text-white/50">{t('smartImport.description')}</p>
              </div>
            </div>

            <div className="flex-grow flex flex-col">
              <textarea
                value={rawContent}
                onChange={(e) => onRawContentChange(e.target.value)}
                className="flex-grow w-full bg-[var(--wuhu-bg-surface)] border-2 border-[var(--wuhu-neon-purple)]/20 rounded-xl p-4 text-sm text-white placeholder:text-white/30 focus:bg-[var(--wuhu-bg-card)] focus:border-[var(--wuhu-neon-pink)] focus:ring-4 focus:ring-[var(--wuhu-neon-pink)]/10 outline-none transition-all resize-none leading-relaxed min-h-[180px]"
                placeholder={t('upload.placeholder')}
              />

              <div className="mt-4 flex items-center justify-between gap-6">
                <span className="text-sm text-white/40 whitespace-nowrap">
                  {countWords(rawContent).toLocaleString()} {t('upload.words')} / 30,000
                </span>
                <button
                  onClick={onAnalyze}
                  disabled={!rawContent.trim() || rawContent.length < 100}
                  className="bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] px-5 py-2 rounded-xl font-bold active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap text-white shadow-[0_0_20px_rgba(167,87,255,0.4)] hover:shadow-[0_0_30px_rgba(255,100,200,0.5)] transition-all"
                >
                  <span>{t('upload.startAnalysis')}</span>
                  <AppIcon name="arrowRightWide" className="w-4 h-4" />
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-[var(--wuhu-neon-pink)]/10 border border-[var(--wuhu-neon-pink)]/30 rounded-lg text-[var(--wuhu-neon-pink)] text-sm">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
