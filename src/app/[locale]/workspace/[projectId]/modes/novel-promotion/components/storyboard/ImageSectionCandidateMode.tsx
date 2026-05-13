'use client'
import { logInfo as _ulogInfo, logError as _ulogError } from '@/lib/logging/core'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { MediaImageWithLoading } from '@/components/media/MediaImageWithLoading'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import { resolveTaskPresentationState } from '@/lib/task/presentation'
import { AppIcon } from '@/components/ui/icons'

interface PanelCandidateData {
  candidates: string[]
  selectedIndex: number
}

interface ImageSectionCandidateModeProps {
  panelId: string
  imageUrl: string | null
  candidateData: PanelCandidateData
  onSelectCandidateIndex: (panelId: string, index: number) => void
  onConfirmCandidate: (panelId: string, imageUrl: string) => Promise<void>
  onCancelCandidate: (panelId: string) => void
  onPreviewImage?: (url: string) => void
}

export default function ImageSectionCandidateMode({
  panelId,
  imageUrl,
  candidateData,
  onSelectCandidateIndex,
  onConfirmCandidate,
  onCancelCandidate,
  onPreviewImage,
}: ImageSectionCandidateModeProps) {
  const t = useTranslations('storyboard')
  const [isConfirming, setIsConfirming] = useState(false)

  const validCandidates = candidateData.candidates.filter((url) => !url.startsWith('PENDING:'))
  if (validCandidates.length === 0) {
    return null
  }

  const safeSelectedIndex = Math.min(candidateData.selectedIndex, validCandidates.length - 1)
  const confirmingState = isConfirming
    ? resolveTaskPresentationState({
      phase: 'processing',
      intent: 'process',
      resource: 'image',
      hasOutput: !!imageUrl,
    })
    : null

  return (
    <div className="w-full h-full relative">
      <MediaImageWithLoading
        src={validCandidates[safeSelectedIndex]}
        alt={t('image.candidateCount', { count: safeSelectedIndex + 1 })}
        containerClassName="h-full w-full"
        className="w-full h-full object-cover cursor-pointer"
        onClick={() => onPreviewImage?.(validCandidates[safeSelectedIndex])}
        title={t('image.clickToPreview')}
        sizes="(max-width: 768px) 100vw, 33vw"
      />

      <div className="absolute bottom-2 left-2 right-2 bg-[var(--wuhu-bg-surface)] border border-white/20 p-2 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {validCandidates.map((url, idx) => (
              <div key={idx} className="relative group/thumb">
                <button
                  onClick={() => onSelectCandidateIndex(panelId, idx)}
                  className={`w-8 h-8 rounded border-2 overflow-hidden ${idx === safeSelectedIndex
                    ? 'border-[var(--wuhu-neon-pink)]'
                    : 'border-white/20 hover:border-[var(--wuhu-neon-purple)]'
                    } transition-all`}
                >
                  <MediaImageWithLoading
                    src={url}
                    alt={t('image.candidateCount', { count: idx + 1 })}
                    containerClassName="h-full w-full"
                    className="w-full h-full object-cover"
                  />
                </button>
                {onPreviewImage && (
                  <button
                    onClick={(event) => {
                      event.stopPropagation()
                      onPreviewImage(url)
                    }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--wuhu-bg-surface)] text-white rounded-full flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-all"
                    title={t('image.enlargePreview')}
                  >
                    <AppIcon name="searchPlus" className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-1">
            <button
              onClick={() => onCancelCandidate(panelId)}
              disabled={isConfirming}
              className="bg-[var(--wuhu-bg-surface)] border border-white/20 hover:bg-white/5 px-2 py-1 text-xs rounded text-white/70 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              取消候选
            </button>
            <button
              onClick={async () => {
                _ulogInfo('[ImageSection] 🎯 确认按钮被点击')
                _ulogInfo('[ImageSection] panelId:', panelId)
                _ulogInfo('[ImageSection] 选中的图片索引:', safeSelectedIndex)
                _ulogInfo('[ImageSection] 选中的图片 URL:', validCandidates[safeSelectedIndex])
                setIsConfirming(true)
                try {
                  await onConfirmCandidate(panelId, validCandidates[safeSelectedIndex])
                  _ulogInfo('[ImageSection] ✅ 确认操作完成')
                } catch (error) {
                  _ulogError('[ImageSection] ❌ 确认操作失败:', error)
                  setIsConfirming(false)
                  _ulogInfo('[ImageSection] isConfirming 状态已重置为 false (失败重试)')
                }
              }}
              disabled={isConfirming}
              className="bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] shadow-[0_0_20px_rgba(167,87,255,0.3)] hover:shadow-[0_0_30px_rgba(167,87,255,0.4)] text-white flex items-center gap-1 rounded px-2 py-1 text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConfirming ? (
                <TaskStatusInline state={confirmingState} className="text-white [&>span]:text-white [&_svg]:text-white" />
              ) : (
                t('common.confirm')
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[var(--wuhu-neon-purple)]/20 text-[var(--wuhu-neon-purple)] absolute top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 text-xs rounded-lg">
        {t('image.candidateCount', { count: safeSelectedIndex + 1 })}/{validCandidates.length}
        {candidateData.candidates.length > validCandidates.length &&
          ` (${t('image.candidateGenerating', { count: candidateData.candidates.length - validCandidates.length })})`}
      </div>
    </div>
  )
}
