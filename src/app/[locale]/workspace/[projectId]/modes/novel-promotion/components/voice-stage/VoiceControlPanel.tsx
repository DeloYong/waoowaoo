import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import type { TaskPresentationState } from '@/lib/task/presentation'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import VoiceToolbar from '../voice/VoiceToolbar'
import EmbeddedVoiceToolbar from '../voice/EmbeddedVoiceToolbar'
import SpeakerVoiceStatus from '../voice/SpeakerVoiceStatus'
import { AppIcon } from '@/components/ui/icons'

interface BindablePanelOption {
  id: string
  storyboardId: string
  panelIndex: number
  label: string
}

interface VoiceControlPanelProps {
  children: ReactNode
  embedded: boolean
  onBack?: () => void
  analyzing: boolean
  isBatchSubmittingAll: boolean
  isDownloading: boolean
  runningLineCount: number
  allSpeakersHaveVoice: boolean
  totalLines: number
  linesWithVoice: number
  linesWithAudio: number
  speakers: string[]
  speakerStats: Record<string, number>
  isLineEditorOpen: boolean
  isSavingLineEditor: boolean
  editingLineId: string | null
  editingContent: string
  editingSpeaker: string
  editingMatchedPanelId: string
  speakerOptions: string[]
  bindablePanelOptions: BindablePanelOption[]
  savingLineEditorState: TaskPresentationState | null
  onAnalyze: () => Promise<void>
  onGenerateAll: () => Promise<void>
  onDownloadAll: () => Promise<void>
  onStartAdd: () => void
  onOpenAssetLibraryForSpeaker: (speaker: string) => void
  onOpenInlineBinding?: (speaker: string) => void
  hasSpeakerCharacter?: (speaker: string) => boolean
  onCancelEdit: () => void
  onSaveEdit: () => Promise<void>
  onEditingContentChange: (value: string) => void
  onEditingSpeakerChange: (value: string) => void
  onEditingMatchedPanelIdChange: (value: string) => void
  getSpeakerVoiceUrl: (speaker: string) => string | null
}

export default function VoiceControlPanel({
  children,
  embedded,
  onBack,
  analyzing,
  isBatchSubmittingAll,
  isDownloading,
  runningLineCount,
  allSpeakersHaveVoice,
  totalLines,
  linesWithVoice,
  linesWithAudio,
  speakers,
  speakerStats,
  isLineEditorOpen,
  isSavingLineEditor,
  editingLineId,
  editingContent,
  editingSpeaker,
  editingMatchedPanelId,
  speakerOptions,
  bindablePanelOptions,
  savingLineEditorState,
  onAnalyze,
  onGenerateAll,
  onDownloadAll,
  onStartAdd,
  onOpenAssetLibraryForSpeaker,
  onOpenInlineBinding,
  hasSpeakerCharacter,
  onCancelEdit,
  onSaveEdit,
  onEditingContentChange,
  onEditingSpeakerChange,
  onEditingMatchedPanelIdChange,
  getSpeakerVoiceUrl,
}: VoiceControlPanelProps) {
  const t = useTranslations('voice')

  return (
    <div className="space-y-6 pb-20">
      {!embedded ? (
        <VoiceToolbar
          onBack={onBack}
          onAddLine={onStartAdd}
          onAnalyze={onAnalyze}
          onGenerateAll={onGenerateAll}
          onDownloadAll={onDownloadAll}
          analyzing={analyzing}
          isBatchSubmitting={isBatchSubmittingAll}
          runningCount={runningLineCount}
          isDownloading={isDownloading}
          allSpeakersHaveVoice={allSpeakersHaveVoice}
          totalLines={totalLines}
          linesWithVoice={linesWithVoice}
          linesWithAudio={linesWithAudio}
        />
      ) : (
        <EmbeddedVoiceToolbar
          totalLines={totalLines}
          linesWithAudio={linesWithAudio}
          analyzing={analyzing}
          isDownloading={isDownloading}
          isBatchSubmitting={isBatchSubmittingAll}
          runningCount={runningLineCount}
          allSpeakersHaveVoice={allSpeakersHaveVoice}
          onAddLine={onStartAdd}
          onAnalyze={onAnalyze}
          onDownloadAll={onDownloadAll}
          onGenerateAll={onGenerateAll}
        />
      )}

      {speakers.length > 0 && (
        <SpeakerVoiceStatus
          speakers={speakers}
          speakerStats={speakerStats}
          getSpeakerVoiceUrl={getSpeakerVoiceUrl}
          onOpenAssetLibrary={onOpenAssetLibraryForSpeaker}
          onOpenInlineBinding={onOpenInlineBinding}
          hasSpeakerCharacter={hasSpeakerCharacter}
          embedded={embedded}
        />
      )}

      {children}

      {isLineEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onCancelEdit}>
          <div className="w-full max-w-xl bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_50px_rgba(167,87,255,0.3)] rounded-2xl p-5" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                {editingLineId ? t('lineEditor.editTitle') : t('lineEditor.addTitle')}</h3>
              <button
                onClick={onCancelEdit}
                className="p-1 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title={t('common.cancel')}
              >
                <AppIcon name="close" className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">{t('lineEditor.contentLabel')}</label>
                <textarea
                  value={editingContent}
                  onChange={(event) => onEditingContentChange(event.target.value)}
                  placeholder={t('lineEditor.contentPlaceholder')}
                  rows={4}
                  className="w-full rounded-xl border border-white/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--wuhu-neon-purple)] resize-y bg-[var(--wuhu-bg-card)] text-white/70 placeholder:text-white/30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">{t('lineEditor.speakerLabel')}</label>
                <select
                  value={editingSpeaker}
                  onChange={(event) => onEditingSpeakerChange(event.target.value)}
                  className="w-full rounded-xl border border-white/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--wuhu-neon-purple)] bg-[var(--wuhu-bg-card)] text-white/70"
                >
                  <option value="" disabled>{t('lineEditor.selectSpeaker')}</option>
                  {speakerOptions.map((speaker) => (
                    <option key={speaker} value={speaker}>
                      {speaker}
                    </option>
                  ))}
                </select>
                {speakerOptions.length === 0 && (
                  <p className="mt-1 text-xs text-[var(--wuhu-neon-orange)]">{t('lineEditor.noSpeakerOptions')}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">{t('lineEditor.bindPanelLabel')}</label>
                <select
                  value={editingMatchedPanelId}
                  onChange={(event) => onEditingMatchedPanelIdChange(event.target.value)}
                  className="w-full rounded-xl border border-white/20 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--wuhu-neon-purple)] bg-[var(--wuhu-bg-card)] text-white/70"
                >
                  <option value="">{t('lineEditor.unboundPanel')}</option>
                  {bindablePanelOptions.map((panel) => (
                    <option key={panel.id} value={panel.id}>
                      {panel.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={onCancelEdit}
                disabled={isSavingLineEditor}
                className="px-4 py-2 text-sm rounded-lg border border-white/20 text-white/70 hover:bg-white/10 disabled:opacity-60 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={onSaveEdit}
                disabled={isSavingLineEditor}
                className="px-4 py-2 text-sm rounded-lg bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_15px_rgba(167,87,255,0.4)] disabled:opacity-60 flex items-center gap-2 transition-all"
              >
                {isSavingLineEditor && (
                  <TaskStatusInline state={savingLineEditorState} className="text-white [&>span]:text-white [&_svg]:text-white" />
                )}
                <span>{editingLineId ? t('lineEditor.saveEdit') : t('lineEditor.saveAdd')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
