'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'
import TaskStatusInline from '@/components/task/TaskStatusInline'

interface VideoClip {
  id: string
  name: string
  thumbnailUrl: string
  videoUrl: string
  duration: number
}

interface EditorStageProps {
  projectId: string
  episodeId: string
  clips: VideoClip[]
  onBack: () => void
}

type GenerationStatus = 'idle' | 'generating' | 'completed' | 'failed'

interface GenerationResponse {
  status: GenerationStatus
  progress: number
  message?: string
  videoUrl?: string
  downloadUrl?: string
}

export default function EditorStage({
  projectId,
  episodeId,
  clips,
  onBack,
}: EditorStageProps) {
  const t = useTranslations('editor')
  const [selectedClip, setSelectedClip] = useState<VideoClip | null>(clips[0] || null)
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState('')
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/editor/status?episodeId=${episodeId}`)
      const data: GenerationResponse = await res.json()

      setGenerationStatus(data.status)
      setProgress(data.progress)
      if (data.message) setStatusMessage(data.message)

      if (data.status === 'completed') {
        setGeneratedVideoUrl(data.videoUrl || null)
        setDownloadUrl(data.downloadUrl || null)
        if (pollingInterval) {
          clearInterval(pollingInterval)
          setPollingInterval(null)
        }
      } else if (data.status === 'failed') {
        if (pollingInterval) {
          clearInterval(pollingInterval)
          setPollingInterval(null)
        }
      }
    } catch (err) {
      console.error('Failed to fetch generation status:', err)
    }
  }, [projectId, episodeId, pollingInterval])

  const handleGenerate = async () => {
    if (generationStatus === 'generating') return

    try {
      setGenerationStatus('generating')
      setProgress(0)
      setStatusMessage(t('generating.starting'))

      const res = await fetch(`/api/projects/${projectId}/editor/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          episodeId,
          clipIds: clips.map(clip => clip.id),
        }),
      })

      if (!res.ok) throw new Error('Failed to start generation')

      // Start polling
      const interval = setInterval(fetchStatus, 3000)
      setPollingInterval(interval)

    } catch (err) {
      console.error('Generation failed:', err)
      setGenerationStatus('failed')
      setStatusMessage(t('generating.failed'))
    }
  }

  const handlePreviewGeneratedVideo = () => {
    if (generatedVideoUrl) {
      window.open(generatedVideoUrl, '_blank')
    }
  }

  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank')
    }
  }

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [pollingInterval])

  return (
    <div className="px-4 pb-8 max-w-[1920px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="glass-btn-base glass-btn-secondary flex items-center gap-2 px-4 py-2 text-sm font-medium border border-(--glass-stroke-base)"
          >
            <AppIcon name="chevronLeft" className="w-4 h-4" />
            {t('buttons.back')}
          </button>
          <h1 className="text-2xl font-bold text-(--glass-text-primary)">
            {t('title')}
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left: Video clips list */}
        <div className="col-span-3">
          <div className="glass-surface p-4 h-[calc(100vh-200px)] overflow-y-auto">
            <h3 className="text-sm font-semibold mb-4 text-(--glass-text-primary)">
              {t('clips.title')} ({clips.length})
            </h3>
            <div className="space-y-3">
              {clips.map(clip => (
                <div
                  key={clip.id}
                  className={`
                    rounded-lg p-2 cursor-pointer transition-all
                    ${selectedClip?.id === clip.id
                      ? 'bg-(--glass-active) border border-(--glass-border-active)'
                      : 'hover:bg-(--glass-hover) border border-transparent'
                    }
                  `}
                  onClick={() => setSelectedClip(clip)}
                >
                  <div className="relative rounded-md overflow-hidden aspect-video mb-2">
                    {clip.thumbnailUrl ? (
                      <img
                        src={clip.thumbnailUrl}
                        alt={clip.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-(--glass-bg-secondary) flex items-center justify-center">
                        <AppIcon name="video" className="w-6 h-6 text-(--glass-text-tertiary)" />
                      </div>
                    )}
                    <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                      {Math.round(clip.duration)}s
                    </div>
                  </div>
                  <p className="text-sm text-(--glass-text-primary) truncate">{clip.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Middle: Video player */}
        <div className="col-span-6">
          <div className="glass-surface p-4 h-[calc(100vh-200px)] flex flex-col">
            <h3 className="text-sm font-semibold mb-4 text-(--glass-text-primary)">
              {selectedClip ? selectedClip.name : t('player.noVideoSelected')}
            </h3>
            <div className="flex-1 rounded-lg overflow-hidden bg-black flex items-center justify-center">
              {selectedClip ? (
                <video
                  src={selectedClip.videoUrl}
                  controls
                  className="w-full h-full object-contain"
                  poster={selectedClip.thumbnailUrl}
                />
              ) : (
                <div className="text-center">
                  <AppIcon name="video" className="w-12 h-12 text-(--glass-text-tertiary) mb-3 mx-auto" />
                  <p className="text-(--glass-text-secondary)">{t('player.selectClipToPreview')}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions panel */}
        <div className="col-span-3">
          <div className="glass-surface p-6 h-[calc(100vh-200px)] flex flex-col">
            <h3 className="text-lg font-semibold mb-6 text-(--glass-text-primary)">
              {t('actions.title')}
            </h3>

            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              {generationStatus === 'idle' && (
                <button
                  onClick={handleGenerate}
                  disabled={clips.length === 0}
                  className="glass-btn-base glass-btn-primary flex items-center justify-center gap-2 px-6 py-8 text-lg font-medium w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <AppIcon name="wandOff" className="w-5 h-5" />
                  {t('buttons.generateFullVideo')}
                </button>
              )}

              {generationStatus === 'generating' && (
                <div className="w-full space-y-4">
                  <div className="text-center mb-2">
                    <AppIcon name="spin" className="w-8 h-8 text-[var(--glass-tone-info-fg)] animate-spin mx-auto" />
                    <p className="mt-3 text-(--glass-text-primary) font-medium">{statusMessage}</p>
                  </div>
                  <div className="w-full h-2 bg-(--glass-bg-secondary) rounded-full overflow-hidden">
                    <div
                      className="h-full bg-(--glass-tone-info) transition-all duration-300 ease-out"
                      style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                    />
                  </div>
                  <p className="text-center text-sm text-(--glass-text-secondary)">{progress}%</p>
                </div>
              )}

              {generationStatus === 'completed' && (
                <div className="w-full space-y-4">
                  <div className="text-center p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <AppIcon name="checkCircle" className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-green-500 font-medium">{t('generating.completed')}</p>
                  </div>

                  <button
                    onClick={handlePreviewGeneratedVideo}
                    className="glass-btn-base glass-btn-primary flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium w-full mb-3"
                  >
                    <AppIcon name="play" className="w-4 h-4" />
                    {t('buttons.previewFullVideo')}
                  </button>

                  <button
                    onClick={handleDownload}
                    className="glass-btn-base glass-btn-secondary flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium w-full border border-(--glass-stroke-base) mb-3"
                  >
                    <AppIcon name="download" className="w-4 h-4" />
                    {t('buttons.downloadVideo')}
                  </button>

                  <button
                    onClick={handleGenerate}
                    className="glass-btn-base glass-btn-secondary flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium w-full border border-(--glass-stroke-base)"
                  >
                    {t('buttons.regenerate')}
                  </button>
                </div>
              )}

              {generationStatus === 'failed' && (
                <div className="w-full space-y-4">
                  <div className="text-center p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <AppIcon name="alertCircle" className="w-8 h-8 text-red-500 mx-auto mb-2" />
                    <p className="text-red-500 font-medium">{statusMessage}</p>
                  </div>

                  <button
                    onClick={handleGenerate}
                    className="glass-btn-base glass-btn-primary flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium w-full"
                  >
                    <AppIcon name="refreshCw" className="w-4 h-4" />
                    {t('buttons.retry')}
                  </button>
                </div>
              )}
            </div>

            {clips.length === 0 && (
              <div className="mt-auto pt-4 text-center text-sm text-(--glass-text-tertiary)">
                <AppIcon name="Info" className="w-4 h-4 inline mr-1 mb-1" />
                {t('actions.noClipsAvailable')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
