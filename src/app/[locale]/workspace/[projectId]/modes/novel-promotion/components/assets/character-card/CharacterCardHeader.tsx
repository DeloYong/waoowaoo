'use client'

import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'

type CharacterCardHeaderProps =
  | {
    mode: 'selection'
    characterName: string
    changeReason: string
    isPrimaryAppearance: boolean
    selectedIndex: number | null
    actions: ReactNode
  }
  | {
    mode: 'compact'
    characterName: string
    changeReason: string
    actions: ReactNode
  }

export default function CharacterCardHeader(props: CharacterCardHeaderProps) {
  const t = useTranslations('assets')

  if (props.mode === 'selection') {
    return (
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-[white]">{props.characterName}</span>
            <span className="text-xs text-[rgba(255,255,255,0.5)] bg-[rgba(255,255,255,0.05)] px-2 py-0.5 rounded">{props.changeReason}</span>
            {props.isPrimaryAppearance ? (
              <span className="text-xs text-[var(--wuhu-neon-purple)] bg-[rgba(167, 87, 255, 0.2)] px-2 py-0.5 rounded">{t('character.primary')}</span>
            ) : (
              <span className="text-xs text-[var(--wuhu-neon-cyan)] bg-[rgba(0, 255, 255, 0.1)] px-2 py-0.5 rounded">{t('character.secondary')}</span>
            )}
          </div>
          <div className="text-xs text-[rgba(255,255,255,0.5)]">
            {props.selectedIndex !== null ? t('image.optionSelected', { number: props.selectedIndex + 1 }) : t('image.selectFirst')}
          </div>
        </div>
        <div className="flex items-center gap-1 ml-2">{props.actions}</div>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-1">
        <div className="text-xs font-semibold text-[white] truncate" title={props.characterName}>
          {props.characterName}
        </div>
        <div className="flex items-center gap-1">{props.actions}</div>
      </div>
      <div className="text-xs text-[rgba(255,255,255,0.7)] truncate" title={props.changeReason}>
        {props.changeReason}
      </div>
    </div>
  )
}
