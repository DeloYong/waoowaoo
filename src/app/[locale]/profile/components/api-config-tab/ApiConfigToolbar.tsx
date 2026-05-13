'use client'

import type { ComponentProps } from 'react'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import { AppIcon } from '@/components/ui/icons'

interface ApiConfigToolbarProps {
  title: string
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  savingState: ComponentProps<typeof TaskStatusInline>['state'] | null
  savingLabel: string
  savedLabel: string
  saveFailedLabel: string
}

export function ApiConfigToolbar({
  title,
  saveStatus,
  savingState,
  savingLabel,
  savedLabel,
  saveFailedLabel,
}: ApiConfigToolbarProps) {
  return (
    <div className="flex items-center justify-between bg-[var(--wuhu-bg-card)]/80 backdrop-blur border-b border-[var(--wuhu-neon-purple)]/20 px-6 py-4">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <div className="flex items-center gap-2 text-sm">
        {saveStatus === 'saving' && (
          <span className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[var(--wuhu-neon-purple)]/20 border border-[var(--wuhu-neon-purple)]/30 text-white/80">
            <TaskStatusInline state={savingState} className="[&>span]:sr-only" />
            <span>{savingLabel}</span>
          </span>
        )}
        {saveStatus === 'saved' && (
          <span className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[var(--wuhu-neon-cyan)]/20 border border-[var(--wuhu-neon-cyan)]/30 text-[var(--wuhu-neon-cyan)]">
            <AppIcon name="check" className="w-4 h-4" />
            {savedLabel}
          </span>
        )}
        {saveStatus === 'error' && (
          <span className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-400">
            <AppIcon name="close" className="w-4 h-4" />
            {saveFailedLabel}
          </span>
        )}
      </div>
    </div>
  )
}
