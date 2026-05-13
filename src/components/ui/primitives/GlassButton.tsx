import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import { resolveTaskPresentationState } from '@/lib/task/presentation'

export interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  iconLeft?: ReactNode
  iconRight?: ReactNode
}

function cx(...names: Array<string | false | null | undefined>) {
  return names.filter(Boolean).join(' ')
}

const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(function GlassButton(
  {
    variant = 'secondary',
    size = 'md',
    loading = false,
    iconLeft,
    iconRight,
    className,
    children,
    disabled,
    ...props
  },
  ref
) {
  const variantClass =
    variant === 'primary'
      ? 'bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_15px_rgba(167,87,255,0.4)] hover:shadow-[0_0_25px_rgba(255,100,200,0.5)] transition-all duration-300'
      : variant === 'ghost'
        ? 'bg-transparent text-white/70 hover:bg-white/10 hover:text-white transition-all duration-200'
        : variant === 'danger'
          ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)] hover:shadow-[0_0_25px_rgba(239,68,68,0.5)] transition-all duration-300'
          : 'bg-[var(--wuhu-bg-surface)] border border-white/20 text-white hover:border-[var(--wuhu-neon-pink)] hover:shadow-[0_0_15px_rgba(255,100,200,0.3)] transition-all duration-300'

  const sizeClass =
    size === 'sm' ? 'h-8 px-3 text-xs' :
      size === 'lg' ? 'h-11 px-5 text-base' :
        'h-9 px-4 text-sm'
  const loadingState = loading
    ? resolveTaskPresentationState({
      phase: 'processing',
      intent: 'generate',
      resource: 'text',
      hasOutput: true,
    })
    : null

  return (
    <button
      ref={ref}
      className={cx(
        'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 whitespace-nowrap',
        variantClass,
        sizeClass,
        disabled ? 'opacity-40 cursor-not-allowed' : '',
        loading ? 'animate-pulse' : '',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <TaskStatusInline state={loadingState} className="[&>span]:sr-only" />
      ) : iconLeft}
      {children}
      {!loading && iconRight}
    </button>
  )
})

export default GlassButton
