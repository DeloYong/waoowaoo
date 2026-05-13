'use client'

import { useTranslations } from 'next-intl'

interface ConfigConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  confirmDisabled?: boolean
}

export function ConfigConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText,
  danger = false,
  confirmDisabled = false,
}: ConfigConfirmModalProps) {
  const t = useTranslations('configModal')
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_50px_rgba(167,87,255,0.3)] rounded-2xl w-full max-w-md p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {description && (
            <p className="mt-2 text-sm text-white/70">{description}</p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="border border-white/20 hover:border-[var(--wuhu-neon-pink)] text-white/70 hover:text-white px-3 py-1.5 text-sm rounded-lg transition-all">
            {cancelText || t('cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={`px-3 py-1.5 text-sm rounded-lg transition-all ${danger ? 'bg-red-500 hover:bg-red-400 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_15px_rgba(167,87,255,0.4)] hover:shadow-[0_0_20px_rgba(167,87,255,0.5)]'} disabled:pointer-events-none disabled:opacity-50`}
          >
            {confirmText || t('confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
