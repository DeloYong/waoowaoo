import type { ReactNode } from 'react'

export interface GlassFieldProps {
  id?: string
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  required?: boolean
  actions?: ReactNode
  className?: string
  children: ReactNode
}

function cx(...names: Array<string | false | null | undefined>) {
  return names.filter(Boolean).join(' ')
}

export default function GlassField({
  id,
  label,
  hint,
  error,
  required = false,
  actions,
  className,
  children
}: GlassFieldProps) {
  return (
    <div className={cx('space-y-1.5', className)}>
      {(label || actions) && (
        <div className="flex items-center justify-between gap-2">
          {label ? (
            <label htmlFor={id} className="text-sm font-semibold text-white">
              {label}
              {required ? <span className="ml-1 text-red-400">*</span> : null}
            </label>
          ) : <span />}
          {actions}
        </div>
      )}
      {children}
      {error ? (
        <p className="text-xs text-red-400">{error}</p>
      ) : hint ? (
        <p className="text-xs text-white/50">{hint}</p>
      ) : null}
    </div>
  )
}
