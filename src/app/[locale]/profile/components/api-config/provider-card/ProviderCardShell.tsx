'use client'

import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { ProviderCardProps, ProviderCardTranslator } from './types'
import { VERIFIABLE_PROVIDER_KEYS } from './types'
import type { UseProviderCardStateResult } from './hooks/useProviderCardState'
import { AppIcon } from '@/components/ui/icons'
import { getProviderKey } from '../types'

interface ProviderCardShellProps {
  provider: ProviderCardProps['provider']
  dragHandle?: ProviderCardProps['dragHandle']
  onDeleteProvider: ProviderCardProps['onDeleteProvider']
  onToggleProviderHidden?: ProviderCardProps['onToggleProviderHidden']
  hideProviderLabel?: ProviderCardProps['hideProviderLabel']
  showProviderLabel?: ProviderCardProps['showProviderLabel']
  t: ProviderCardTranslator
  state: UseProviderCardStateResult
  children: ReactNode
}

export function getCompatibilityLayerBadgeLabel(
  providerId: string,
  t: ProviderCardTranslator,
): string | null {
  const providerKey = getProviderKey(providerId)
  if (providerKey === 'openai-compatible') return t('compatibilityLayerOpenAI')
  if (providerKey === 'gemini-compatible') return t('compatibilityLayerGemini')
  return null
}

// 连接状态图标
function StatusIcon({ connected }: { connected: boolean }) {
  if (connected) {
    return <AppIcon name="bolt" className="h-3.5 w-3.5 text-green-500" />
  }
  return <AppIcon name="unplug" className="h-3.5 w-3.5 text-red-400" />
}

// 使用统一的 VERIFIABLE_PROVIDER_KEYS（从 types 导入）

export function ProviderCardShell({
  provider,
  dragHandle,
  onDeleteProvider,
  onToggleProviderHidden,
  hideProviderLabel,
  showProviderLabel,
  t,
  state,
  children,
}: ProviderCardShellProps) {
  const compatibilityLayerLabel = getCompatibilityLayerBadgeLabel(provider.id, t)
  const providerKey = getProviderKey(provider.id)
  const isVerifiable = VERIFIABLE_PROVIDER_KEYS.has(providerKey)
  const canTest = isVerifiable && !!provider.hasApiKey
  const isHidden = provider.hidden === true
  const hiddenToggleLabel = isHidden
    ? (showProviderLabel || t('showProvider'))
    : (hideProviderLabel || t('hideProvider'))

  return (
    <div className="bg-[var(--wuhu-bg-card)] border border-white/10 rounded-xl transition-all duration-300 hover:border-[var(--wuhu-neon-purple)]/40 hover:shadow-[0_0_25px_rgba(167,87,255,0.2)] overflow-hidden">

      {/* ── 头部：logo + 名称 + 心电图 + 右侧操作 ── */}
      <div className={`flex items-center justify-between px-3.5 py-2.5 ${provider.hasApiKey ? 'border-b border-[var(--wuhu-neon-cyan)]/20' : ''}`}>
        <div className="flex items-center gap-2">
          {dragHandle}
          {onToggleProviderHidden && (
            <button
              type="button"
              title={hiddenToggleLabel}
              aria-label={hiddenToggleLabel}
              onClick={() => {
                if (isHidden) {
                  // Restoring — no confirmation needed
                  onToggleProviderHidden(provider.id, false)
                } else {
                  // Hiding — confirm first
                  if (window.confirm(t('hideProviderConfirm'))) {
                    onToggleProviderHidden(provider.id, true)
                  }
                }
              }}
              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-white/40 transition-colors hover:text-white/70"
            >
              <AppIcon name={isHidden ? 'plus' : 'minus'} className="h-3.5 w-3.5" />
            </button>
          )}
          <h3 className="text-[15px] font-bold text-white">{provider.name}</h3>
          {compatibilityLayerLabel && (
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-white/60">
              {compatibilityLayerLabel}
            </span>
          )}
          {/* 连接状态图标 */}
          <span title={provider.hasApiKey ? t('connected') : t('notConfigured')}>
            <StatusIcon connected={!!provider.hasApiKey} />
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* 测试连接按钮（内联在标题行） */}
          {isVerifiable && !state.isEditing && state.keyTestStatus === 'idle' && (
            <button
              onClick={state.handleTestOnly}
              disabled={!canTest}
              className={[
                'flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition-all',
                canTest
                  ? 'border-white/20 text-white/60 hover:border-[var(--wuhu-neon-purple)] hover:bg-[var(--wuhu-neon-purple)]/10 hover:text-white cursor-pointer'
                  : 'border-white/10 cursor-not-allowed text-white/30 opacity-40',
              ].join(' ')}
            >
              <AppIcon name="refresh" className="h-3 w-3" />
              {t('testConnection')}
            </button>
          )}
          {!state.isPresetProvider && onDeleteProvider && (
            <button
              onClick={() => onDeleteProvider(provider.id)}
              className="rounded p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-red-400"
              title={t('delete')}
            >
              <AppIcon name="trash" className="w-3.5 h-3.5" />
            </button>
          )}
          {state.tutorial && (
            <button
              onClick={() => state.setShowTutorial(true)}
              className="cursor-pointer flex items-center gap-1 rounded-lg border border-white/20 bg-transparent px-2 py-1 text-[12px] font-medium text-white hover:border-[var(--wuhu-neon-purple)] hover:bg-[var(--wuhu-neon-purple)]/10 transition-all"
            >
              <AppIcon name="bookOpen" className="h-3 w-3" />
              {t('tutorial.button')}
            </button>
          )}
        </div>
      </div>

      {/* ── 教程弹窗 ── */}
      {state.showTutorial && state.tutorial && typeof document !== 'undefined'
        ? createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"
            onClick={() => state.setShowTutorial(false)}
          >
            <div
              className="bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_50px_rgba(167,87,255,0.3)] mx-4 w-full max-w-lg overflow-hidden rounded-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[var(--wuhu-neon-purple)]/20 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_15px_rgba(167,87,255,0.4)]">
                    <AppIcon name="bookOpen" className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {provider.name} {t('tutorial.title')}
                    </h3>
                    <p className="text-xs text-white/60">{t('tutorial.subtitle')}</p>
                  </div>
                </div>
                <button
                  onClick={() => state.setShowTutorial(false)}
                  className="rounded-lg p-1.5 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <AppIcon name="close" className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4 p-5">
                {state.tutorial.steps.map((step, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--wuhu-neon-purple)]/40 text-xs font-bold text-white/70 bg-[var(--wuhu-neon-purple)]/10">
                      {index + 1}
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className="text-sm leading-relaxed text-white/70">
                        {t(`tutorial.steps.${step.text}`)}
                      </p>
                      {step.url && (
                        <a
                          href={step.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs text-white/50 hover:text-[var(--wuhu-neon-cyan)] hover:underline transition-colors"
                        >
                          <AppIcon name="externalLink" className="w-3 h-3" />
                          {t('tutorial.openLink')}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end border-t border-[var(--wuhu-neon-purple)]/20 px-5 py-3">
                <button
                  onClick={() => state.setShowTutorial(false)}
                  className="border border-white/20 hover:border-[var(--wuhu-neon-pink)] text-white/70 hover:text-white rounded-lg px-4 py-2 text-sm font-medium transition-all"
                >
                  {t('tutorial.close')}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
        : null}

      {children}
    </div>
  )
}
