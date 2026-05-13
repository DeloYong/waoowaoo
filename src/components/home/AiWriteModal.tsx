'use client'

/**
 * AI 帮我写 — 首页轻量模态框
 *
 * 用户输入创意/关键词/大纲，直接生成结果并回填首页主输入框
 */

import { useState, useCallback } from 'react'
import { AppIcon } from '@/components/ui/icons'

interface AiWriteModalProps {
  open: boolean
  loading: boolean
  onClose: () => void
  onStart: (prompt: string) => void
  t: (key: string) => string
}

export default function AiWriteModal({
  open,
  loading,
  onClose,
  onStart,
  t,
}: AiWriteModalProps) {
  const [promptText, setPromptText] = useState('')

  const handleClose = useCallback(() => {
    if (loading) return
    setPromptText('')
    onClose()
  }, [loading, onClose])

  const handleStart = useCallback(() => {
    if (!promptText.trim() || loading) return
    onStart(promptText.trim())
  }, [promptText, loading, onStart])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg mx-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 模态框容器 */}
        <div className="bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_40px_rgba(167,87,255,0.2)] rounded-xl rounded-2xl p-6 space-y-5">
          {/* 头部 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15))' }}
              >
                <AppIcon name="sparkles" className="w-5 h-5 text-[#7c3aed]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[white]">
                  {t('modalTitle')}
                </h3>
                <p className="text-xs text-[rgba(255,255,255,0.5)]">
                  {t('modalSubtitle')}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="bg-[var(--wuhu-bg-surface)] border border-white/20 hover:bg-white/5 rounded-lg text-white/70 hover:text-white transition-all p-1.5 disabled:opacity-30"
              disabled={loading}
            >
              <AppIcon name="close" className="w-4 h-4" />
            </button>
          </div>

          {/* 输入区域 */}
          <div>
            <label className="text-sm font-medium text-[rgba(255,255,255,0.7)] mb-2 block">
              {t('inputLabel')}
            </label>
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder={t('placeholder')}
              className="bg-[var(--wuhu-bg-surface)] border border-white/20 rounded-lg text-white focus:border-[var(--wuhu-neon-pink)] focus:outline-none transition-all custom-scrollbar h-36 px-4 py-3 text-sm resize-none placeholder:text-[rgba(255,255,255,0.5)]"
              disabled={loading}
              autoFocus
            />
          </div>

          {/* 提示文案 */}
          <div
            className="px-3 py-2 rounded-lg text-xs text-[rgba(255,255,255,0.5)] leading-relaxed"
            style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(139,92,246,0.06))' }}
          >
            {t('hint')}
          </div>

          {/* 按钮区域 */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              disabled={loading}
              className="flex-1 py-2.5 text-sm text-[rgba(255,255,255,0.5)] hover:text-[rgba(255,255,255,0.7)] transition-colors rounded-xl"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleStart}
              disabled={!promptText.trim() || loading}
              className="flex-1 py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #7c3aed)' }}
            >
              <AppIcon name="sparkles" className="w-4 h-4" />
              <span>{loading ? '...' : t('startAiWrite')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
