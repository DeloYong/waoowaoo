'use client'

import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AppIcon } from '@/components/ui/icons'

export interface GlassModalShellProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  footer?: ReactNode
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closeOnBackdrop?: boolean
  closeOnEsc?: boolean
  showCloseButton?: boolean
}

function cx(...names: Array<string | false | null | undefined>) {
  return names.filter(Boolean).join(' ')
}

export default function GlassModalShell({
  open,
  onClose,
  title,
  description,
  footer,
  children,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEsc = true,
  showCloseButton = true
}: GlassModalShellProps) {
  useEffect(() => {
    if (!open || !closeOnEsc) return
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeydown)
    return () => window.removeEventListener('keydown', onKeydown)
  }, [open, closeOnEsc, onClose])

  if (!open || typeof document === 'undefined') return null

  const maxWidthClass =
    size === 'sm' ? 'max-w-md' :
      size === 'lg' ? 'max-w-4xl' :
        size === 'xl' ? 'max-w-6xl' :
          'max-w-2xl'

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
        onMouseDown={() => {
          if (closeOnBackdrop) onClose()
        }}
      />
      <div className={cx(
        'bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_50px_rgba(167,87,255,0.3)] rounded-2xl',
        'relative z-10 w-full overflow-hidden',
        maxWidthClass
      )}>
        {(title || description || showCloseButton) && (
          <div className="flex items-start justify-between gap-4 px-5 py-4 sm:px-6">
            <div>
              {title ? <h2 className="text-lg font-semibold text-white sm:text-xl">{title}</h2> : null}
              {description ? <p className="mt-1 text-sm text-white/70">{description}</p> : null}
            </div>
            {showCloseButton ? (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center h-9 w-9 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all duration-200"
                aria-label="close"
              >
                <AppIcon name="close" className="h-5 w-5" />
              </button>
            ) : null}
          </div>
        )}

        <div className="border-t border-white/10" />
        <div className="px-5 py-4 sm:px-6 sm:py-5">{children}</div>

        {footer ? (
          <>
            <div className="border-t border-white/10" />
            <div className="px-5 py-4 sm:px-6">{footer}</div>
          </>
        ) : null}
      </div>
    </div>,
    document.body
  )
}
