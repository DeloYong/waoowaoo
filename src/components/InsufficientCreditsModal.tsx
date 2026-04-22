'use client'

import { AppIcon } from '@/components/ui/icons'
import { useRouter } from '@/i18n/navigation'
import { useEffect, useState } from 'react'

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
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setMounted(true)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleUpgrade = () => {
    onClose()
    router.push({ pathname: '/pricing' })
  }

  const handleSubscribe = () => {
    onClose()
    router.push({ pathname: '/pricing' })
  }

  const handleRecharge = () => {
    onClose()
    router.push({ pathname: '/pricing' })
  }

  const shortfall = estimatedCost !== undefined && currentBalance !== undefined
    ? Math.max(0, estimatedCost - currentBalance)
    : null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-[var(--glass-overlay-strong)] backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* 弹窗内容 */}
      <div
        className={`
          relative w-full max-w-[420px] mx-4
          bg-[var(--glass-bg-surface-modal)]
          rounded-2xl
          border border-[var(--glass-stroke-base)]
          shadow-[var(--glass-shadow-modal)]
          overflow-hidden
          ${mounted ? 'animate-scale-in' : 'opacity-0'}
        `}
      >
        {/* 顶部装饰渐变条 */}
        <div className="h-1 w-full bg-gradient-to-r from-[var(--glass-accent-from)] via-[var(--glass-accent-to)] to-[var(--glass-tone-info-bg)]" />

        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-[var(--glass-text-tertiary)] hover:text-[var(--glass-text-primary)] hover:bg-[var(--glass-ghost-hover-bg)] transition-all duration-200 z-10"
        >
          <AppIcon name="close" className="w-5 h-5" />
        </button>

        {/* 主内容区 */}
        <div className="px-8 pt-8 pb-6">
          {/* 动画图标区域 */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              {/* 图标背景光晕 */}
              <div className="absolute inset-0 bg-[var(--glass-tone-warning-bg)] rounded-full blur-xl opacity-60 scale-150" />
              {/* 图标容器 */}
              <div className="relative w-20 h-20 bg-gradient-to-br from-[var(--glass-tone-warning-bg)] to-[var(--glass-tone-warning-fg)] rounded-2xl flex items-center justify-center shadow-lg">
                <AppIcon name="coins" className="w-10 h-10 text-[var(--glass-tone-warning-fg)]" />
              </div>
              {/* 动画点缀 */}
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-[var(--glass-tone-warning-fg)] rounded-full flex items-center justify-center shadow-md animate-pulse">
                <span className="text-white text-xs font-bold">!</span>
              </div>
            </div>
          </div>

          {/* 标题 */}
          <h3 className="text-2xl font-bold text-[var(--glass-text-primary)] text-center mb-2">
            积分不足
          </h3>

          {/* 友好的提示文案 */}
          <p className="text-[var(--glass-text-secondary)] text-center text-sm leading-relaxed mb-6">
            别担心！您可以选择升级套餐获取更多积分，
            <br />
            或直接充值积分来完成此次操作
          </p>

          {/* 积分信息卡片 */}
          {(estimatedCost !== undefined || currentBalance !== undefined) && (
            <div className="bg-[var(--glass-bg-canvas)] rounded-xl p-4 mb-6 border border-[var(--glass-stroke-soft)]">
              <div className="grid grid-cols-3 gap-3 text-center">
                {/* 当前余额 */}
                <div className="flex flex-col items-center">
                  <span className="text-xs text-[var(--glass-text-tertiary)] mb-1">当前余额</span>
                  <span className="text-lg font-bold text-[var(--glass-text-primary)]">
                    {currentBalance ?? '-'}
                  </span>
                  <span className="text-xs text-[var(--glass-text-tertiary)]">积分</span>
                </div>

                {/* 分隔线 */}
                <div className="flex items-center justify-center">
                  <div className="w-px h-10 bg-[var(--glass-stroke-base)]" />
                </div>

                {/* 预估消耗 */}
                <div className="flex flex-col items-center">
                  <span className="text-xs text-[var(--glass-text-tertiary)] mb-1">预估消耗</span>
                  <span className="text-lg font-bold text-[var(--glass-text-primary)]">
                    {estimatedCost ?? '-'}
                  </span>
                  <span className="text-xs text-[var(--glass-text-tertiary)]">积分</span>
                </div>
              </div>

              {/* 还需补充 */}
              {shortfall !== null && shortfall > 0 && (
                <>
                  <div className="h-px bg-[var(--glass-stroke-soft)] my-4" />
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm text-[var(--glass-text-secondary)]">需补充</span>
                    <span className="text-lg font-bold text-[var(--glass-tone-warning-fg)]">
                      {shortfall}
                    </span>
                    <span className="text-sm text-[var(--glass-text-secondary)]">积分</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* 操作按钮组 */}
          <div className="space-y-3">
            {/* 主操作：升级套餐 */}
            <button
              onClick={handleUpgrade}
              className="w-full py-3.5 px-4 rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, var(--glass-accent-from) 0%, var(--glass-accent-to) 100%)',
              }}
            >
              <AppIcon name="arrowDownCircle" className="w-5 h-5 rotate-180" />
              升级套餐
            </button>

            {/* 次要操作：订阅 / 充值 */}
            <div className="grid grid-cols-2 gap-3">
              {/* 订阅 */}
              <button
                onClick={handleSubscribe}
                className="py-3 px-4 rounded-xl font-semibold text-[var(--glass-text-primary)] bg-[var(--glass-bg-canvas)] border border-[var(--glass-stroke-base)] transition-all duration-200 hover:bg-[var(--glass-bg-surface-strong)] hover:border-[var(--glass-stroke-strong)] active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <AppIcon name="sparkles" className="w-4 h-4" />
                订阅
              </button>

              {/* 充值 */}
              <button
                onClick={handleRecharge}
                className="py-3 px-4 rounded-xl font-semibold text-[var(--glass-text-primary)] bg-[var(--glass-bg-canvas)] border border-[var(--glass-stroke-base)] transition-all duration-200 hover:bg-[var(--glass-bg-surface-strong)] hover:border-[var(--glass-stroke-strong)] active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <AppIcon name="plus" className="w-4 h-4" />
                充值
              </button>
            </div>

            {/* 取消按钮 */}
            <button
              onClick={onClose}
              className="w-full py-2.5 text-sm text-[var(--glass-text-tertiary)] hover:text-[var(--glass-text-secondary)] transition-colors duration-200"
            >
              稍后再说
            </button>
          </div>
        </div>

        {/* 底部装饰 */}
        <div className="px-8 pb-6">
          <p className="text-xs text-center text-[var(--glass-text-tertiary)]">
            升级后可享受更多积分和高级功能
          </p>
        </div>
      </div>
    </div>
  )
}
