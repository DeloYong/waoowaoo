'use client'

import { AppIcon } from '@/components/ui/icons'
import { useRouter } from '@/i18n/navigation'

interface InsufficientCreditsModalProps {
  isOpen: boolean
  onClose: () => void
  estimatedCost?: number
  currentBalance?: number
}

export default function InsufficientCreditsModal({
  isOpen,
  onClose,
  estimatedCost,
  currentBalance,
}: InsufficientCreditsModalProps) {
  const router = useRouter()

  if (!isOpen) return null

  const handleUpgrade = () => {
    onClose()
    router.push({ pathname: '/pricing' })
  }

  const handleRecharge = () => {
    onClose()
    router.push({ pathname: '/pricing' })
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 弹窗内容 */}
      <div className="relative bg-[var(--glass-bg-surface)] rounded-2xl border border-[var(--glass-stroke-base)] shadow-2xl max-w-md w-full mx-4 p-8">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[var(--glass-text-tertiary)] hover:text-[var(--glass-text-primary)] transition-colors"
        >
          <AppIcon name="close" className="w-5 h-5" />
        </button>

        {/* 图标 */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
            <AppIcon name="coins" className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        {/* 标题 */}
        <h3 className="text-2xl font-bold text-[var(--glass-text-primary)] text-center mb-2">
          积分不足
        </h3>

        <p className="text-[var(--glass-text-secondary)] text-center mb-6">
          您的积分余额不足以完成此次操作
        </p>

        {/* 积分详情 */}
        {(estimatedCost !== undefined || currentBalance !== undefined) && (
          <div className="bg-[var(--glass-bg-canvas)] rounded-lg p-4 mb-6">
            <div className="space-y-2 text-sm">
              {currentBalance !== undefined && (
                <div className="flex justify-between">
                  <span className="text-[var(--glass-text-secondary)]">当前余额</span>
                  <span className="font-semibold text-[var(--glass-text-primary)]">
                    {currentBalance} 积分
                  </span>
                </div>
              )}
              {estimatedCost !== undefined && (
                <div className="flex justify-between">
                  <span className="text-[var(--glass-text-secondary)]">预估消耗</span>
                  <span className="font-semibold text-[var(--glass-text-primary)]">
                    {estimatedCost} 积分
                  </span>
                </div>
              )}
              {estimatedCost !== undefined && currentBalance !== undefined && (
                <div className="flex justify-between pt-2 border-t border-[var(--glass-stroke-soft)]">
                  <span className="text-[var(--glass-text-secondary)]">还需</span>
                  <span className="font-semibold text-orange-600">
                    {estimatedCost - currentBalance} 积分
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="space-y-3">
          <button
            onClick={handleUpgrade}
            className="w-full py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors"
          >
            升级套餐
          </button>
          <button
            onClick={handleRecharge}
            className="w-full py-3 bg-[var(--glass-bg-canvas)] text-[var(--glass-text-primary)] border border-[var(--glass-stroke-base)] rounded-lg font-semibold hover:bg-[var(--glass-bg-surface-strong)] transition-colors"
          >
            充值积分
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 text-[var(--glass-text-secondary)] hover:text-[var(--glass-text-primary)] transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  )
}
