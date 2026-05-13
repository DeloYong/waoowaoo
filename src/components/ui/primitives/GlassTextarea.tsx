import { forwardRef, type TextareaHTMLAttributes } from 'react'

export interface GlassTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  density?: 'compact' | 'default'
}

function cx(...names: Array<string | false | null | undefined>) {
  return names.filter(Boolean).join(' ')
}

const GlassTextarea = forwardRef<HTMLTextAreaElement, GlassTextareaProps>(function GlassTextarea(
  { density = 'default', className, disabled, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={cx(
        'w-full rounded-xl border border-white/20 bg-[var(--wuhu-bg-surface)] text-white placeholder:text-white/40 resize-none',
        'focus:outline-none focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_15px_rgba(255,100,200,0.3)]',
        'transition-all duration-200',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
        density === 'compact' ? 'px-3 py-2 text-sm leading-6' : 'px-3 py-2.5 text-sm leading-6',
        className
      )}
      disabled={disabled}
      {...props}
    />
  )
})

export default GlassTextarea
