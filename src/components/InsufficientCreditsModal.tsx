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
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* 弹窗内容 */}
      <div
        className={`
          relative w-full max-w-[420px] mx-4
          bg-[var(--wuhu-bg-card)]
          rounded-2xl
          border border-[var(--wuhu-neon-purple)]/30
          shadow-[0_0_50px_rgba(167,87,255,0.35)]
          overflow-hidden
          ${mounted ? 'animate-scale-in' : 'opacity-0'}
        `}
      >
        {/* 顶部装饰渐变条 */}
        <div className="h-1 w-full bg-gradient-to-r from-[var(--wuhu-neon-purple)] via-[var(--wuhu-neon-pink)] to-[var(--wuhu-neon-cyan)] shadow-[0_0_15px_rgba(167,87,255,0.5)]" />

        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all duration-200 z-10"
        >
          <AppIcon name="close" className="w-5 h-5" />
        </button>

        {/* 主内容区 */}
        <div className="px-8 pt-8 pb-6">
          {/* 动画图标区域 */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              {/* 图标背景光晕 */}
              <div className="absolute inset-0 bg-[var(--wuhu-neon-orange)]/30 rounded-full blur-xl opacity-60 scale-150 shadow-[0_0_30px_rgba(249,115,22,0.4)]" />
              {/* 图标容器 */}
              <div className="relative w-20 h-20 bg-gradient-to-br from-[var(--wuhu-neon-orange)]/40 to-[var(--wuhu-neon-orange)]/60 rounded-2xl flex items-center justify-center shadow-lg">
                <AppIcon name="coins" className="w-10 h-10 text-[var(--wuhu-neon-orange)]" />
              </div>
              {/* 动画点缀 */}
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(239,68,68,0.6)] animate-pulse">
                <span className="text-white text-xs font-bold">!</span>
              </div>
            </div>
          </div>

          {/* 标题 */}
          <h3 className="text-2xl font-bold text-white text-center mb-2">
            积分不足
          </h3>

          {/* 友好的提示文案 */}
          <p className="text-white/70 text-center text-sm leading-relaxed mb-6">
            别担心！您可以选择升级套餐获取更多积分，
            <br />
            或直接充值积分来完成此次操作
          </p>

          {/* 积分信息卡片 */}
          {(estimatedCost !== undefined || currentBalance !== undefined) && (
            <div className="bg-[var(--wuhu-bg-surface)]/50 rounded-xl p-4 mb-6 border border-[var(--wuhu-neon-purple)]/20">
              <div className="grid grid-cols-3 gap-3 text-center">
                {/* 当前余额 */}
                <div className="flex flex-col items-center">
                  <span className="text-xs text-white/50 mb-1">当前余额</span>
                  <span className="text-lg font-bold text-white">
                    {currentBalance ?? '-'}
                  </span>
                  <span className="text-xs text-white/50">积分</span>
                </div>

                {/* 分隔线 */}
                <div className="flex items-center justify-center">
                  <div className="w-px h-10 bg-[var(--wuhu-neon-purple)]/20" />
                </div>

                {/* 预估消耗 */}
                <div className="flex flex-col items-center">
                  <span className="text-xs text-white/50 mb-1">预估消耗</span>
                  <span className="text-lg font-bold text-white">
                    {estimatedCost ?? '-'}
                  </span>
                  <span className="text-xs text-white/50">积分</span>
                </div>
              </div>

              {/* 还需补充 */}
              {shortfall !== null && shortfall > 0 && (
                <>
                  <div className="h-px bg-[var(--wuhu-neon-purple)]/20 my-4" />
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm text-white/70">需补充</span>
                    <span className="text-lg font-bold text-[var(--wuhu-neon-orange)]">
                      {shortfall}
                    </span>
                    <span className="text-sm text-white/70">积分</span>
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
              className="w-full py-3.5 px-4 rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(167,87,255,0.5)] hover:shadow-[0_0_30px_rgba(255,100,200,0.5)] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, var(--wuhu-neon-purple) 0%, var(--wuhu-neon-pink) 100%)',
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
                className="py-3 px-4 rounded-xl font-semibold text-white bg-[var(--wuhu-bg-surface)]/30 border border-[var(--wuhu-neon-purple)]/30 transition-all duration-200 hover:bg-[var(--wuhu-neon-purple)]/20 hover:border-[var(--wuhu-neon-pink)]/50 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <AppIcon name="sparkles" className="w-4 h-4" />
                订阅
              </button>

              {/* 充值 */}
              <button
                onClick={handleRecharge}
                className="py-3 px-4 rounded-xl font-semibold text-white bg-[var(--wuhu-bg-surface)]/30 border border-[var(--wuhu-neon-purple)]/30 transition-all duration-200 hover:bg-[var(--wuhu-neon-purple)]/20 hover:border-[var(--wuhu-neon-pink)]/50 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <AppIcon name="plus" className="w-4 h-4" />
                充值
              </button>
            </div>

            {/* 取消按钮 */}
            <button
              onClick={onClose}
              className="w-full py-2.5 text-sm text-white/40 hover:text-white/70 transition-colors duration-200"
            >
              稍后再说
            </button>
          </div>
        </div>

        {/* 底部装饰 */}
        <div className="px-8 pb-6">
          <p className="text-xs text-center text-white/40">
            升级后可享受更多积分和高级功能
          </p>
        </div>
      </div>
    </div>
  )
}
