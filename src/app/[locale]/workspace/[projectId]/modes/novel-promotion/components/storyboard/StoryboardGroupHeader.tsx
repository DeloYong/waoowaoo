'use client'

import { useTranslations } from 'next-intl'
import { NovelPromotionClip } from '@/types/project'
import { AppIcon } from '@/components/ui/icons'

interface StoryboardGroupHeaderProps {
  clip: NovelPromotionClip | undefined
  sbIndex: number
  totalStoryboards: number
  movingClipId: string | null
  storyboardClipId: string
  formatClipTitle: (clip: NovelPromotionClip | undefined) => string
  onMoveUp: () => void
  onMoveDown: () => void
}

export default function StoryboardGroupHeader({
  clip,
  sbIndex,
  totalStoryboards,
  movingClipId,
  storyboardClipId,
  formatClipTitle,
  onMoveUp,
  onMoveDown,
}: StoryboardGroupHeaderProps) {
  const t = useTranslations('storyboard')

  return (
    <div className="flex items-center gap-4">
      <div className="flex flex-col gap-1">
        <button
          onClick={onMoveUp}
          disabled={sbIndex === 0 || movingClipId === storyboardClipId}
          className={`rounded p-1 transition-colors ${sbIndex === 0 || movingClipId === storyboardClipId
            ? 'cursor-not-allowed text-white/30'
            : 'text-white/50 hover:bg-[var(--wuhu-neon-purple)]/20 hover:text-[var(--wuhu-neon-purple)]'
            }`}
          title={t('panel.moveUp')}
        >
          <AppIcon name="chevronUp" className="w-4 h-4" />
        </button>
        <button
          onClick={onMoveDown}
          disabled={sbIndex === totalStoryboards - 1 || movingClipId === storyboardClipId}
          className={`rounded p-1 transition-colors ${sbIndex === totalStoryboards - 1 || movingClipId === storyboardClipId
            ? 'cursor-not-allowed text-white/30'
            : 'text-white/50 hover:bg-[var(--wuhu-neon-purple)]/20 hover:text-[var(--wuhu-neon-purple)]'
            }`}
          title={t('panel.moveDown')}
        >
          <AppIcon name="chevronDown" className="w-4 h-4" />
        </button>
      </div>
      <div className="bg-[var(--wuhu-bg-surface)] border border-[var(--wuhu-neon-purple)]/30 flex h-12 w-12 items-center justify-center rounded-2xl text-2xl font-bold text-[var(--wuhu-neon-purple)] shadow-[0_0_10px_rgba(167,87,255,0.2)]">
        {sbIndex + 1}
      </div>
      <div>
        <h3 className="text-sm font-medium text-white">
          {t('group.segment')}【{formatClipTitle(clip)}】
        </h3>
        <p className="mt-0.5 line-clamp-1 text-xs text-white/50">{clip?.summary}</p>
      </div>
    </div>
  )
}
