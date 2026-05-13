'use client'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import './ImageSection.css'
import { MediaImageWithLoading } from '@/components/media/MediaImageWithLoading'
import TaskStatusOverlay from '@/components/task/TaskStatusOverlay'
import { resolveTaskPresentationState } from '@/lib/task/presentation'
import ImageSectionCandidateMode from './ImageSectionCandidateMode'
import ImageSectionActionButtons from './ImageSectionActionButtons'
import { AppIcon } from '@/components/ui/icons'

interface PanelCandidateData {
  candidates: string[]
  selectedIndex: number
}

interface ImageSectionProps {
  panelId: string
  imageUrl: string | null
  globalPanelNumber: number
  shotType: string
  videoRatio: string
  isDeleting: boolean
  isModifying: boolean
  isSubmittingPanelImageTask: boolean
  failedError: string | null
  candidateData: PanelCandidateData | null
  previousImageUrl?: string | null
  onRegeneratePanelImage: (panelId: string, count?: number, force?: boolean) => void
  onOpenEditModal: () => void
  onOpenAIDataModal: () => void
  onSelectCandidateIndex: (panelId: string, index: number) => void
  onConfirmCandidate: (panelId: string, imageUrl: string) => Promise<void>
  onCancelCandidate: (panelId: string) => void
  onClearError: () => void
  onUndo?: (panelId: string) => void
  onPreviewImage?: (url: string) => void
}

export default function ImageSection({
  panelId,
  imageUrl,
  globalPanelNumber,
  shotType,
  videoRatio,
  isDeleting,
  isModifying,
  isSubmittingPanelImageTask,
  failedError,
  candidateData,
  previousImageUrl,
  onRegeneratePanelImage,
  onOpenEditModal,
  onOpenAIDataModal,
  onSelectCandidateIndex,
  onConfirmCandidate,
  onCancelCandidate,
  onClearError,
  onUndo,
  onPreviewImage,
}: ImageSectionProps) {
  const t = useTranslations('storyboard')
  const [isTaskPulseAnimating, setIsTaskPulseAnimating] = useState(false)
  const cssAspectRatio = videoRatio.replace(':', '/')
  const hasValidCandidates = !!candidateData && candidateData.candidates.some((url) => !url.startsWith('PENDING:'))

  const triggerPulse = () => {
    setIsTaskPulseAnimating(true)
    setTimeout(() => setIsTaskPulseAnimating(false), 600)
  }

  const renderLoadingState = (
    intent: 'generate' | 'regenerate' | 'modify' | 'process',
    backdropImageUrl: string | null = null,
  ) => {
    const state = resolveTaskPresentationState({
      phase: 'processing',
      intent,
      resource: 'image',
      hasOutput: !!backdropImageUrl,
    })

    return (
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-black/40 backdrop-blur-md group/loading">
        {backdropImageUrl && (
          <MediaImageWithLoading
            src={backdropImageUrl}
            alt={t('image.clickToPreview')}
            containerClassName="absolute inset-0 h-full w-full"
            className="absolute inset-0 h-full w-full object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        )}
        <div className={`absolute inset-0 ${backdropImageUrl ? 'bg-black/45 backdrop-blur-[1px]' : 'bg-black/40 backdrop-blur-md'}`} />
        <TaskStatusOverlay
          state={state}
          className={backdropImageUrl ? 'bg-black/45 backdrop-blur-[1px]' : undefined}
        />
      </div>
    )
  }

  const renderFailedState = () => (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-red-500/15 text-red-400 border border-red-500/30 p-2">
      <AppIcon name="alert" className="w-6 h-6 mb-1" />
      <span className="text-xs text-center font-medium">{t('image.failed')}</span>
      <span className="text-[10px] text-center mt-1 line-clamp-2 px-1">{failedError}</span>
      <button
        onClick={onClearError}
        className="border border-red-500/50 bg-red-500/20 hover:bg-red-500/30 text-red-400 mt-1 px-2 py-1 text-[10px] rounded-md transition-all"
      >
        {t('variant.close')}
      </button>
    </div>
  )

  const renderEmptyState = () => (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[var(--wuhu-bg-surface)] text-white/50">
      <AppIcon name="imagePreview" className="w-8 h-8" />
      <span className="text-xs">{t('video.toolbar.showPending')}</span>
      <button
        onClick={() => {
          triggerPulse()
          onRegeneratePanelImage(panelId, 1, false)
        }}
        className="bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_15px_rgba(167,87,255,0.4)] px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-[0_0_25px_rgba(167,87,255,0.6)]"
      >
        {t('panel.generateImage')}
      </button>
    </div>
  )

  return (
    <div
      className={`relative overflow-hidden group rounded-t-2xl transition-all bg-[var(--wuhu-bg-surface)] border-b border-[var(--wuhu-neon-purple)]/20 ${isTaskPulseAnimating ? 'animate-brightness-boost' : ''}`}
      style={{ aspectRatio: cssAspectRatio }}
    >
      {isDeleting ? (
        renderLoadingState('process', imageUrl)
      ) : isModifying ? (
        renderLoadingState('modify', imageUrl)
      ) : isSubmittingPanelImageTask ? (
        renderLoadingState('regenerate', imageUrl)
      ) : candidateData ? (
        hasValidCandidates ? (
          <ImageSectionCandidateMode
            panelId={panelId}
            imageUrl={imageUrl}
            candidateData={candidateData}
            onSelectCandidateIndex={onSelectCandidateIndex}
            onConfirmCandidate={onConfirmCandidate}
            onCancelCandidate={onCancelCandidate}
            onPreviewImage={onPreviewImage}
          />
        ) : (
          renderLoadingState(imageUrl ? 'regenerate' : 'generate', imageUrl)
        )
      ) : failedError ? (
        renderFailedState()
      ) : imageUrl ? (
        <MediaImageWithLoading
          src={imageUrl}
          alt={t('variant.shotNum', { number: globalPanelNumber })}
          containerClassName="h-full w-full"
          className={`w-full h-full object-cover ${onPreviewImage ? 'cursor-zoom-in' : ''}`}
          onClick={onPreviewImage ? () => onPreviewImage(imageUrl) : undefined}
          title={onPreviewImage ? t('image.clickToPreview') : undefined}
          sizes="(max-width: 768px) 100vw, 33vw"
        />
      ) : (
        renderEmptyState()
      )}

      <div className="absolute top-2 left-2">
        <span className="bg-black/50 text-white px-2 py-0.5 rounded-lg text-xs font-medium backdrop-blur-sm">{globalPanelNumber}</span>
      </div>

      <div className="absolute top-2 right-2">
        <span className="bg-[var(--wuhu-neon-purple)]/30 text-[var(--wuhu-neon-purple)] border border-[var(--wuhu-neon-purple)]/40 px-2 py-0.5 rounded-lg text-xs">{shotType}</span>
      </div>

      {!candidateData && (
        <ImageSectionActionButtons
          panelId={panelId}
          imageUrl={imageUrl}
          previousImageUrl={previousImageUrl}
          isSubmittingPanelImageTask={isSubmittingPanelImageTask}
          isModifying={isModifying}
          onRegeneratePanelImage={onRegeneratePanelImage}
          onOpenEditModal={onOpenEditModal}
          onOpenAIDataModal={onOpenAIDataModal}
          onUndo={onUndo}
          triggerPulse={triggerPulse}
        />
      )}
    </div>
  )
}
