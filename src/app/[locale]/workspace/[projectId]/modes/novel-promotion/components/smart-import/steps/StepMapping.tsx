'use client'

import { useTranslations } from 'next-intl'
import type { DeleteConfirmState, SplitEpisode } from '../types'
import { AppIcon } from '@/components/ui/icons'

interface StepMappingProps {
  episodes: SplitEpisode[]
  selectedEpisode: number
  onSelectEpisode: (index: number) => void
  onUpdateEpisodeNumber: (index: number, number: number) => void
  onUpdateEpisodeTitle: (index: number, title: string) => void
  onUpdateEpisodeSummary: (index: number, summary: string) => void
  onUpdateEpisodeContent: (index: number, content: string) => void
  onAddEpisode: () => void
  deleteConfirm: DeleteConfirmState
  onOpenDeleteConfirm: (index: number, title: string) => void
  onCloseDeleteConfirm: () => void
  onConfirmDeleteEpisode: () => void
}

export default function StepMapping({
  episodes,
  selectedEpisode,
  onSelectEpisode,
  onUpdateEpisodeNumber,
  onUpdateEpisodeTitle,
  onUpdateEpisodeSummary,
  onUpdateEpisodeContent,
  onAddEpisode,
  deleteConfirm,
  onOpenDeleteConfirm,
  onCloseDeleteConfirm,
  onConfirmDeleteEpisode,
}: StepMappingProps) {
  const t = useTranslations('smartImport')

  return (
    <>
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn flex items-center justify-center z-50" onClick={onCloseDeleteConfirm}>
          <div className="bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_50px_rgba(167,87,255,0.3)] rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AppIcon name="trash" className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{t('preview.deleteConfirm.title')}</h3>
              <p className="text-white/70">{t('preview.deleteConfirm.message', { title: deleteConfirm.title })}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onCloseDeleteConfirm}
                className="flex-1 px-4 py-2.5 border border-white/20 text-white/70 hover:border-[var(--wuhu-neon-pink)] hover:text-white hover:bg-white/10 rounded-xl font-medium transition-colors"
              >
                {t('preview.deleteConfirm.cancel')}
              </button>
              <button
                onClick={onConfirmDeleteEpisode}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
              >
                {t('preview.deleteConfirm.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-[var(--wuhu-bg-card)] rounded-2xl border border-[var(--wuhu-neon-purple)]/30 p-6 sticky top-6 shadow-[0_0_30px_rgba(167,87,255,0.15)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg text-white">{t('preview.episodeList')}</h3>
              <span className="text-sm text-white/50">{episodes.length} {t('preview.episodeList')}</span>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {episodes.map((ep, idx) => (
                <div
                  key={idx}
                  onClick={() => onSelectEpisode(idx)}
                  className={`p-4 rounded-xl transition-all duration-200 cursor-pointer relative group ${selectedEpisode === idx
                    ? 'bg-[var(--wuhu-neon-purple)]/15 border-2 border-[var(--wuhu-neon-pink)] shadow-[0_0_20px_rgba(255,100,200,0.3)]'
                    : 'bg-[var(--wuhu-bg-surface)] border border-[var(--wuhu-neon-purple)]/30 hover:border-[var(--wuhu-neon-purple)]/50'
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <input
                      type="text"
                      value={t('episode', { num: ep.number })}
                      onChange={(e) => {
                        const match = e.target.value.match(/\d+/)
                        const newNumber = match ? parseInt(match[0], 10) : ep.number
                        if (newNumber !== ep.number) {
                          onUpdateEpisodeNumber(idx, newNumber)
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className={`font-semibold bg-transparent border-b border-transparent hover:border-white/30 focus:border-[var(--wuhu-neon-pink)] focus:outline-none w-24 ${selectedEpisode === idx ? 'text-[var(--wuhu-neon-pink)]' : 'text-white/70'}`}
                    />
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${selectedEpisode === idx ? 'bg-[var(--wuhu-neon-purple)] text-white' : 'bg-white/10 text-white/70'
                        }`}>
                        {ep.wordCount.toLocaleString()} {t('upload.words')}
                      </span>
                      {episodes.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onOpenDeleteConfirm(idx, t('episode', { num: ep.number }))
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:bg-red-500/20 rounded transition-all"
                          title={t('preview.deleteEpisode')}
                        >
                          <AppIcon name="trash" className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    type="text"
                    value={ep.title}
                    onChange={(e) => onUpdateEpisodeTitle(idx, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder={t('preview.episodePlaceholder')}
                    className="text-sm text-white/70 font-medium w-full bg-transparent border-b border-transparent hover:border-white/30 focus:border-[var(--wuhu-neon-pink)] focus:outline-none"
                  />
                  <input
                    type="text"
                    value={ep.summary}
                    onChange={(e) => onUpdateEpisodeSummary(idx, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder={t('preview.summaryPlaceholder')}
                    className="text-xs text-white/50 w-full bg-transparent border-b border-transparent hover:border-white/30 focus:border-[var(--wuhu-neon-pink)] focus:outline-none mt-1"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={onAddEpisode}
              className="w-full mt-4 py-3 border-2 border-dashed border-white/20 rounded-xl text-white/50 hover:border-[var(--wuhu-neon-purple)] hover:text-[var(--wuhu-neon-purple)] hover:bg-[var(--wuhu-neon-purple)]/10 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <AppIcon name="plus" className="w-5 h-5" />
              {t('preview.addEpisode')}
            </button>

            <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/70">{t('preview.averageWords')}</span>
                <span className="font-semibold text-white">
                  {episodes.length > 0 ? Math.round(episodes.reduce((sum, ep) => sum + ep.wordCount, 0) / episodes.length).toLocaleString() : 0} {t('upload.words')}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {episodes[selectedEpisode] && (
            <div className="bg-[var(--wuhu-bg-card)] rounded-2xl border border-[var(--wuhu-neon-purple)]/30 p-6 shadow-[0_0_30px_rgba(167,87,255,0.15)]">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <input
                    type="text"
                    value={episodes[selectedEpisode].title}
                    onChange={(e) => onUpdateEpisodeTitle(selectedEpisode, e.target.value)}
                    className="text-2xl font-semibold text-white border-b-2 border-transparent hover:border-white/20 focus:border-[var(--wuhu-neon-pink)] focus:outline-none transition-colors duration-200 px-2 bg-transparent"
                  />
                  <span className="text-sm text-white/50">{t('episode', { num: episodes[selectedEpisode].number })}</span>
                </div>
                <span className="text-sm text-white/50">{episodes[selectedEpisode].wordCount.toLocaleString()} {t('upload.words')}</span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-white/70">{t('preview.episodeContent')}</label>
                  <span className="text-sm text-white/50">{episodes[selectedEpisode].wordCount.toLocaleString()} {t('upload.words')}</span>
                </div>
                <textarea
                  rows={16}
                  value={episodes[selectedEpisode].content}
                  onChange={(e) => onUpdateEpisodeContent(selectedEpisode, e.target.value)}
                  className="w-full border border-[var(--wuhu-neon-purple)]/30 rounded-xl p-4 bg-[var(--wuhu-bg-surface)] text-white focus:outline-none focus:shadow-[0_0_20px_rgba(255,100,200,0.3)] focus:border-[var(--wuhu-neon-pink)] resize-none font-mono text-sm leading-relaxed transition-all"
                />
              </div>

              <div className="mt-4 p-4 bg-[var(--wuhu-neon-purple)]/15 border border-[var(--wuhu-neon-purple)]/50 rounded-xl">
                <div className="flex items-start gap-3">
                  <AppIcon name="info" className="w-5 h-5 text-[var(--wuhu-neon-purple)] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-white mb-1">{t('plotSummary')}</p>
                    <p className="text-sm text-white/80">
                      {episodes[selectedEpisode].summary || t('preview.summaryPlaceholder')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
