import type { ReactNode } from 'react'
import { AppIcon } from '@/components/ui/icons'

export type UiTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

export interface GlassChipProps {
  tone?: UiTone
  icon?: ReactNode
  onRemove?: () => void
  children: ReactNode
  className?: string
}

function cx(...names: Array<string | false | null | undefined>) {
  return names.filter(Boolean).join(' ')
}

export default function GlassChip({ tone = 'neutral', icon, onRemove, children, className }: GlassChipProps) {
  const toneClass =
    tone === 'info'
      ? 'text-[var(--wuhu-neon-purple)] border-[var(--wuhu-neon-purple)]/40 hover:border-[var(--wuhu-neon-purple)] hover:shadow-[0_0_10px_rgba(167,87,255,0.3)]'
      : tone === 'success'
        ? 'text-[var(--wuhu-neon-cyan)] border-[var(--wuhu-neon-cyan)]/40 hover:border-[var(--wuhu-neon-cyan)] hover:shadow-[0_0_10px_rgba(0,255,255,0.3)]'
        : tone === 'warning'
          ? 'text-[var(--wuhu-neon-orange)] border-[var(--wuhu-neon-orange)]/40 hover:border-[var(--wuhu-neon-orange)] hover:shadow-[0_0_10px_rgba(255,165,0,0.3)]'
          : tone === 'danger'
            ? 'text-red-400 border-red-500/40 hover:border-red-400 hover:shadow-[0_0_10px_rgba(255,0,0,0.3)]'
            : 'text-white/70 border-white/20 hover:border-white/40'

  return (
    <span className={cx(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
      'bg-[var(--wuhu-bg-surface)] border transition-all duration-200',
      toneClass,
      onRemove ? 'pr-1.5' : '',
      className
    )}>
      {icon}
      <span>{children}</span>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="rounded-full p-0.5 transition-colors hover:bg-white/10"
          aria-label="remove"
        >
          <AppIcon name="close" className="h-3 w-3" />
        </button>
      ) : null}
    </span>
  )
}
