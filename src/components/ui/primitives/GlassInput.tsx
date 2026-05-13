import { forwardRef, type InputHTMLAttributes } from 'react'

export interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  density?: 'compact' | 'default'
}

function cx(...names: Array<string | false | null | undefined>) {
  return names.filter(Boolean).join(' ')
}

const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(function GlassInput(
  { density = 'default', className, disabled, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={cx(
        'w-full rounded-xl border border-white/20 bg-[var(--wuhu-bg-surface)] text-white placeholder:text-white/40',
        'focus:outline-none focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_15px_rgba(255,100,200,0.3)]',
        'transition-all duration-200',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
        density === 'compact' ? 'h-9 px-3 text-sm leading-5' : 'h-10 px-3 text-sm leading-5',
        className
      )}
      disabled={disabled}
      {...props}
    />
  )
})

export default GlassInput
