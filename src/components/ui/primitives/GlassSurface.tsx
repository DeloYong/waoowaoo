import type { ReactNode } from 'react'

export type UiDensity = 'compact' | 'default'

export interface GlassSurfaceProps {
  children: ReactNode
  className?: string
  variant?: 'panel' | 'card' | 'elevated' | 'modal' | 'soft'
  density?: UiDensity
  interactive?: boolean
  padded?: boolean
}

function cx(...names: Array<string | false | null | undefined>) {
  return names.filter(Boolean).join(' ')
}

export default function GlassSurface({
  children,
  className,
  variant = 'panel',
  density = 'default',
  interactive = false,
  padded = true
}: GlassSurfaceProps) {
  const variantClass =
    variant === 'elevated'
      ? 'bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/20 shadow-[0_0_30px_rgba(167,87,255,0.15)]'
      : variant === 'modal'
        ? 'bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_50px_rgba(167,87,255,0.3)]'
        : variant === 'soft'
          ? 'bg-[var(--wuhu-bg-surface)]/50 border border-white/5'
          : 'bg-[var(--wuhu-bg-card)] border border-white/10'

  const densityClass = density === 'compact' ? 'scale-[0.86]' : ''

  return (
    <div
      className={cx(
        'rounded-2xl transition-all duration-300',
        variantClass,
        densityClass,
        padded ? 'p-4 md:p-6' : '',
        interactive ? 'hover:-translate-y-0.5 hover:border-[var(--wuhu-neon-pink)]/50 hover:shadow-[0_0_40px_rgba(255,100,200,0.2)]' : '',
        className
      )}
    >
      {children}
    </div>
  )
}
