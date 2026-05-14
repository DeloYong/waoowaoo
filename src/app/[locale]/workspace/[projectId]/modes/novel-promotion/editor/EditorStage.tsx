'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

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
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      } else if (data.status === 'failed') {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    } catch (err) {
      console.error('Failed to fetch generation status:', err)
    }
  }, [projectId, episodeId])

  // 组件加载时立即获取一次状态，恢复之前生成的视频
  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

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
      intervalRef.current = setInterval(fetchStatus, 3000)

    } catch (err) {
      console.error('Generation failed:', err)
      setGenerationStatus('failed')
      setStatusMessage(t('generating.failed'))
    }
  }

  const handlePreviewGeneratedVideo = () => {
    // 视频已经在页面显示，滚动到播放器位置
    const videoPlayer = document.querySelector('video')
    if (videoPlayer) {
      videoPlayer.scrollIntoView({ behavior: 'smooth', block: 'center' })
      videoPlayer.play().catch(() => {})
    }
  }

  const handleDownload = async () => {
    if (downloadUrl) {
      try {
        const response = await fetch(downloadUrl)
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `complete-video-${Date.now()}.mp4`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } catch (err) {
        console.error('Download failed:', err)
        window.open(downloadUrl, '_blank')
      }
    }
  }

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return (
    <div className="px-4 pb-8 max-w-[1920px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="bg-[var(--wuhu-bg-surface)] border border-white/20 hover:bg-white/5 rounded-lg text-white/70 hover:text-white transition-all flex items-center gap-2 px-4 py-2 text-sm font-medium border border-rgba(167, 87, 255, 0.2)"
          >
            <AppIcon name="chevronLeft" className="w-4 h-4" />
            {t('buttons.back')}
          </button>
          <h1 className="text-2xl font-bold text-rgba(255,255,255,0.9)">
            {t('title')}
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left: Video clips list */}
        <div className="col-span-3">
          <div className="bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_40px_rgba(167,87,255,0.2)] rounded-xl p-4 h-[calc(100vh-200px)] overflow-y-auto">
            <h3 className="text-sm font-semibold mb-4 text-rgba(255,255,255,0.9)">
              {t('clips.title')} ({clips.length})
            </h3>
            <div className="space-y-3">
              {clips.map(clip => (
                <div
                  key={clip.id}
                  className={`
                    rounded-lg p-2 cursor-pointer transition-all
                    ${selectedClip?.id === clip.id
                      ? 'bg-[rgba(0,255,255,0.1)] border border-[var(--wuhu-neon-cyan)]'
                      : 'hover:bg-white/5 border border-transparent'
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
                      <div className="w-full h-full bg-var(--wuhu-bg-surface) flex items-center justify-center">
                        <AppIcon name="video" className="w-6 h-6 text-rgba(255,255,255,0.4)" />
                      </div>
                    )}
                    <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                      {Math.round(clip.duration)}s
                    </div>
                  </div>
                  <p className="text-sm text-rgba(255,255,255,0.9) truncate">{clip.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Middle: Video player */}
        <div className="col-span-6">
          <div className="bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_40px_rgba(167,87,255,0.2)] rounded-xl p-4 h-[calc(100vh-200px)] flex flex-col">
            <h3 className="text-sm font-semibold mb-4 text-rgba(255,255,255,0.9)">
              {generationStatus === 'completed' && generatedVideoUrl
                ? t('player.generatedFullVideo')
                : selectedClip
                  ? selectedClip.name
                  : t('player.noVideoSelected')}
            </h3>
            <div className="flex-1 rounded-lg overflow-hidden bg-black flex items-center justify-center">
              {generationStatus === 'completed' && generatedVideoUrl ? (
                <video
                  src={generatedVideoUrl}
                  controls
                  className="w-full h-full object-contain"
                  autoPlay
                />
              ) : selectedClip ? (
                <video
                  src={selectedClip.videoUrl}
                  controls
                  className="w-full h-full object-contain"
                  poster={selectedClip.thumbnailUrl}
                />
              ) : (
                <div className="text-center">
                  <AppIcon name="video" className="w-12 h-12 text-rgba(255,255,255,0.4) mb-3 mx-auto" />
                  <p className="text-rgba(255,255,255,0.5)">{t('player.selectClipToPreview')}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions panel */}
        <div className="col-span-3">
          <div className="bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_40px_rgba(167,87,255,0.2)] rounded-xl p-6 h-[calc(100vh-200px)] flex flex-col">
            <h3 className="text-lg font-semibold mb-6 text-rgba(255,255,255,0.9)">
              {t('actions.title')}
            </h3>

            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              {generationStatus === 'idle' && (
                <button
                  onClick={handleGenerate}
                  disabled={clips.length === 0}
                  className="bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_20px_rgba(167,87,255,0.3)] hover:shadow-[0_0_30px_rgba(167,87,255,0.4)] rounded-lg transition-all flex items-center justify-center gap-2 px-6 py-8 text-lg font-medium w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <AppIcon name="wandOff" className="w-5 h-5" />
                  {t('buttons.generateFullVideo')}
                </button>
              )}

              {generationStatus === 'generating' && (
                <div className="w-full space-y-4">
                  <div className="text-center mb-2">
                    <AppIcon name="refresh" className="w-8 h-8 text-[var(--wuhu-neon-cyan)] animate-spin mx-auto" />
                    <p className="mt-3 text-rgba(255,255,255,0.9) font-medium">{statusMessage}</p>
                  </div>
                  <div className="w-full h-2 bg-var(--wuhu-bg-surface) rounded-full overflow-hidden">
                    <div
                      className="h-full bg-var(--wuhu-neon-cyan) transition-all duration-300 ease-out"
                      style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                    />
                  </div>
                  <p className="text-center text-sm text-rgba(255,255,255,0.5)">{progress}%</p>
                </div>
              )}

              {generationStatus === 'completed' && (
                <div className="w-full space-y-4">
                  <div className="text-center p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <AppIcon name="info" className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-green-500 font-medium">{t('generating.completed')}</p>
                  </div>

                  <button
                    onClick={handlePreviewGeneratedVideo}
                    className="bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_20px_rgba(167,87,255,0.3)] hover:shadow-[0_0_30px_rgba(167,87,255,0.4)] rounded-lg transition-all flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium w-full mb-3"
                  >
                    <AppIcon name="play" className="w-4 h-4" />
                    播放完整视频
                  </button>

                  <button
                    onClick={handleDownload}
                    className="bg-[var(--wuhu-bg-surface)] border border-white/20 hover:bg-white/5 rounded-lg text-white/70 hover:text-white transition-all flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium w-full border border-rgba(167, 87, 255, 0.2) mb-3"
                  >
                    <AppIcon name="download" className="w-4 h-4" />
                    {t('buttons.downloadVideo')}
                  </button>

                  <button
                    onClick={handleGenerate}
                    className="bg-[var(--wuhu-bg-surface)] border border-white/20 hover:bg-white/5 rounded-lg text-white/70 hover:text-white transition-all flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium w-full border border-rgba(167, 87, 255, 0.2)"
                  >
                    {t('buttons.regenerate')}
                  </button>
                </div>
              )}

              {generationStatus === 'failed' && (
                <div className="w-full space-y-4">
                  <div className="text-center p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <AppIcon name="alert" className="w-8 h-8 text-red-500 mx-auto mb-2" />
                    <p className="text-red-500 font-medium">{statusMessage}</p>
                  </div>

                  <button
                    onClick={handleGenerate}
                    className="bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_20px_rgba(167,87,255,0.3)] hover:shadow-[0_0_30px_rgba(167,87,255,0.4)] rounded-lg transition-all flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium w-full"
                  >
                    <AppIcon name="refresh" className="w-4 h-4" />
                    {t('buttons.retry')}
                  </button>
                </div>
              )}
            </div>

            {clips.length === 0 && (
              <div className="mt-auto pt-4 text-center text-sm text-rgba(255,255,255,0.4)">
                <AppIcon name="info" className="w-4 h-4 inline mr-1 mb-1" />
                {t('actions.noClipsAvailable')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
