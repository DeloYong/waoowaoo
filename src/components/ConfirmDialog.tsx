'use client'

import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'

interface ConfirmDialogProps {
  show: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  type?: 'danger' | 'warning' | 'info'
}

export default function ConfirmDialog({
  show,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  type = 'danger'
}: ConfirmDialogProps) {
  const t = useTranslations('common')

  const finalConfirmText = confirmText || t('confirm')
  const finalCancelText = cancelText || t('cancel')
  if (!show) return null

  const typeStyles = {
    danger: {
      icon: (
        <AppIcon name="alert" className="w-6 h-6 text-red-400" />
      ),
      confirmBg: 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]',
      iconBg: 'bg-gradient-to-br from-red-500/20 to-red-600/30 border border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
    },
    warning: {
      icon: (
        <AppIcon name="alert" className="w-6 h-6 text-orange-400" />
      ),
      confirmBg: 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]',
      iconBg: 'bg-gradient-to-br from-orange-500/20 to-orange-600/30 border border-orange-500/40 shadow-[0_0_20px_rgba(249,115,22,0.3)]'
    },
    info: {
      icon: (
        <AppIcon name="info" className="w-6 h-6 text-[var(--wuhu-neon-cyan)]" />
      ),
      confirmBg: 'bg-gradient-to-r from-[var(--wuhu-neon-cyan)] to-[var(--wuhu-neon-purple)] text-white shadow-[0_0_15px_rgba(100,255,255,0.4)]',
      iconBg: 'bg-gradient-to-br from-[var(--wuhu-neon-cyan)]/20 to-[var(--wuhu-neon-purple)]/30 border border-[var(--wuhu-neon-cyan)]/40 shadow-[0_0_20px_rgba(100,255,255,0.3)]'
    }
  }

  const currentStyle = typeStyles[type]

  return (
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
      />

      {/* 对话框 */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_40px_rgba(167,87,255,0.3)] rounded-2xl max-w-md w-full p-6 pointer-events-auto animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 图标 */}
          <div className={`w-12 h-12 rounded-full ${currentStyle.iconBg} flex items-center justify-center mb-4`}>
            {currentStyle.icon}
          </div>

          {/* 标题 */}
          <h3 className="mb-2 text-xl font-semibold text-white">
            {title}
          </h3>

          {/* 消息 */}
          <p className="mb-6 text-white/70">
            {message}
          </p>

          {/* 按钮 */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="border border-[var(--wuhu-neon-purple)]/30 text-white/70 hover:bg-[var(--wuhu-neon-purple)]/20 hover:text-white rounded-xl flex-1 px-4 py-2.5 font-medium"
            >
              {finalCancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 px-4 py-2.5 font-medium rounded-xl ${currentStyle.confirmBg}`}
            >
              {finalConfirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
