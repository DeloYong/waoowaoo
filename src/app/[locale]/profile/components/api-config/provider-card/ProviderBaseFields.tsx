'use client'

import type { ProviderCardProps, ProviderCardTranslator } from './types'
import type { UseProviderCardStateResult } from './hooks/useProviderCardState'
import { AppIcon } from '@/components/ui/icons'

interface ProviderBaseFieldsProps {
  provider: ProviderCardProps['provider']
  t: ProviderCardTranslator
  state: UseProviderCardStateResult
}

export function ProviderBaseFields({ provider, t, state }: ProviderBaseFieldsProps) {
  const baseUrlPlaceholder = (() => {
    switch (state.providerKey) {
      case 'gemini-compatible':
        return 'https://your-api-domain.com'
      case 'openai-compatible':
        return 'https://api.openai.com/v1'
      default:
        return 'http://localhost:8000'
    }
  })()

  return (
    <>
      <div className="px-3.5 pt-2.5">
        <div className="bg-white/5 flex items-center gap-2.5 rounded-xl px-3 py-2 border border-white/10">
          <span className="w-[64px] shrink-0 whitespace-nowrap text-[12px] font-semibold text-white/70">
            {t('apiKeyLabel')}
          </span>
          {state.isEditing ? (
            <div className="flex flex-1 items-center gap-2">
              <input
                type="text"
                value={state.tempKey}
                onChange={(event) => state.setTempKey(event.target.value)}
                placeholder={t('enterApiKey')}
                className="bg-[var(--wuhu-bg-surface)] border border-white/20 focus:border-[var(--wuhu-neon-purple)] focus:shadow-[0_0_10px_rgba(167,87,255,0.2)] rounded-lg flex-1 px-3 py-1.5 text-[12px] text-white placeholder:text-white/30 outline-none transition-all"
                disabled={state.keyTestStatus === 'testing'}
                autoFocus
              />
              <button
                onClick={state.handleSaveKey}
                disabled={state.keyTestStatus === 'testing'}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                title={state.keyTestStatus === 'failed' ? t('testRetry') : t('save')}
              >
                {state.keyTestStatus === 'testing' ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <AppIcon name="check" className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={state.handleCancelEdit}
                disabled={state.keyTestStatus === 'testing'}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                title={t('cancel')}
              >
                <AppIcon name="close" className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {provider.hasApiKey ? (
                <>
                  <span className="min-w-0 flex-1 overflow-hidden whitespace-nowrap rounded-lg bg-[var(--wuhu-bg-surface)] border border-white/10 px-3 py-1.5 font-mono text-[12px] text-white/60">
                    {state.showKey ? provider.apiKey : state.maskedKey}
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => state.setShowKey(!state.showKey)}
                      className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                      title={state.showKey ? t('hide') : t('show')}
                    >
                      {state.showKey ? (
                        <AppIcon name="eye" className="h-4 w-4" />
                      ) : (
                        <AppIcon name="eyeOff" className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={state.startEditKey}
                      className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                      title={t('configure')}
                    >
                      <AppIcon name="edit" className="h-4 w-4" />
                    </button>
                  </div>
                </>
              ) : (
                <button
                  onClick={state.startEditKey}
                  className="h-7 px-2.5 text-[12px] font-semibold rounded-lg bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_15px_rgba(167,87,255,0.3)] hover:shadow-[0_0_20px_rgba(167,87,255,0.4)] transition-all flex items-center gap-1"
                >
                  <AppIcon name="plus" className="h-3.5 w-3.5" />
                  <span>{t('connect')}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {state.keyTestStatus !== 'idle' && (
        <div className="px-3.5 pt-2">
          <div className={`space-y-2 rounded-xl border-2 p-3 ${state.keyTestStatus === 'passed'
            ? 'border-[var(--wuhu-neon-cyan)]/40 bg-[var(--wuhu-neon-cyan)]/5'
            : state.keyTestStatus === 'failed'
              ? 'border-red-500/40 bg-red-500/5'
              : 'border-white/20 bg-[var(--wuhu-bg-surface)]'
            }`}>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                {state.keyTestStatus === 'testing' && (
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                )}
                {state.keyTestStatus === 'passed' && (
                  <span className="text-[var(--wuhu-neon-cyan)]">
                    <AppIcon name="check" className="h-4 w-4" />
                  </span>
                )}
                {state.keyTestStatus === 'failed' && (
                  <span className="text-red-400">
                    <AppIcon name="close" className="h-4 w-4" />
                  </span>
                )}
                {t('testConnection')}
              </div>
              {(state.keyTestStatus === 'passed' || state.keyTestStatus === 'failed') && (
                <div className="flex items-center gap-1">
                  {/* 重新测试 */}
                  <button
                    onClick={state.handleTestOnly}
                    className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
                    title={t('testRetry')}
                  >
                    <AppIcon name="refresh" className="h-3 w-3" />
                  </button>
                  {/* 关闭结果 */}
                  <button
                    onClick={state.handleDismissTest}
                    className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
                    title={t('close')}
                  >
                    <AppIcon name="close" className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Testing spinner when no steps yet */}
            {state.keyTestStatus === 'testing' && state.keyTestSteps.length === 0 && (
              <div className="flex items-center gap-2 text-xs text-white/60">
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {t('testing')}
              </div>
            )}

            {/* Step results */}
            {state.keyTestSteps.map((step) => {
              const stepLabel = t(`testStep.${step.name}`)
              return (
                <div key={step.name} className="space-y-0.5">
                  <div className="flex items-center gap-2 text-xs">
                    {step.status === 'pass' && (
                      <span className="text-[var(--wuhu-neon-cyan)]">
                        <AppIcon name="check" className="h-3.5 w-3.5" />
                      </span>
                    )}
                    {step.status === 'fail' && (
                      <span className="text-red-400">
                        <AppIcon name="close" className="h-3.5 w-3.5" />
                      </span>
                    )}
                    {step.status === 'skip' && (
                      <span className="text-white/40">–</span>
                    )}
                    <span className="font-medium text-white">
                      {stepLabel}
                    </span>
                    {step.model && (
                      <span className="rounded bg-[var(--wuhu-bg-surface)] border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/60">
                        {step.model}
                      </span>
                    )}
                  </div>
                  <p className={`pl-6 text-[11px] ${step.status === 'fail' ? 'text-red-400' : 'text-white/60'}`}>
                    {step.message}
                  </p>
                  {step.detail && (
                    <p className="pl-6 text-[10px] text-white/40 break-all line-clamp-3">
                      {step.detail}
                    </p>
                  )}
                </div>
              )
            })}

            {/* Success banner */}
            {state.keyTestStatus === 'passed' && (
              <div className="flex items-center gap-2 rounded-lg bg-[var(--wuhu-neon-cyan)]/10 px-3 py-2 text-xs font-medium text-[var(--wuhu-neon-cyan)]">
                <AppIcon name="check" className="h-4 w-4 shrink-0" />
                {t('testPassed')}
              </div>
            )}

            {/* Failure warning */}
            {state.keyTestStatus === 'failed' && (
              <div className="flex items-start gap-2 rounded-lg bg-[var(--wuhu-neon-orange)]/10 px-3 py-2 text-[11px] text-white">
                <span className="mt-0.5 shrink-0 text-sm text-[var(--wuhu-neon-orange)]">&#9888;</span>
                <span>{t('testWarning')}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {state.showBaseUrlEdit && (
        <div className="px-3.5 pb-2.5 pt-2">
          <div className="bg-white/5 flex items-center gap-2.5 rounded-xl px-3 py-2 border border-white/10">
            <span className="w-[64px] shrink-0 whitespace-nowrap text-[12px] font-semibold text-white/50">
              {t('baseUrl')}
            </span>
            {state.isEditingUrl ? (
              <div className="flex flex-1 items-center gap-2">
                <input
                  type="text"
                  value={state.tempUrl}
                  onChange={(event) => state.setTempUrl(event.target.value)}
                  placeholder={baseUrlPlaceholder}
                  className="bg-[var(--wuhu-bg-surface)] border border-white/20 focus:border-[var(--wuhu-neon-purple)] focus:shadow-[0_0_10px_rgba(167,87,255,0.2)] rounded-lg flex-1 px-3 py-1.5 text-[12px] font-mono text-white placeholder:text-white/30 outline-none transition-all"
                  autoFocus
                />
                <button
                  onClick={state.handleSaveUrl}
                  className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                  title={t('save')}
                >
                  <AppIcon name="check" className="h-4 w-4" />
                </button>
                <button
                  onClick={state.handleCancelUrlEdit}
                  className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                  title={t('cancel')}
                >
                  <AppIcon name="close" className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex min-w-0 flex-1 items-center gap-2">
                {provider.baseUrl ? (
                  <>
                    <span className="min-w-0 flex-1 truncate rounded-lg bg-[var(--wuhu-bg-surface)] border border-white/10 px-3 py-1.5 font-mono text-[12px] text-white/60">
                      {provider.baseUrl}
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={state.startEditUrl}
                        className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                        title={t('configure')}
                      >
                        <AppIcon name="edit" className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={state.startEditUrl}
                    className="h-7 px-2.5 text-[12px] font-semibold rounded-lg bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_15px_rgba(167,87,255,0.3)] hover:shadow-[0_0_20px_rgba(167,87,255,0.4)] transition-all flex items-center gap-1"
                  >
                    <AppIcon name="plus" className="h-3.5 w-3.5" />
                    <span>{t('configureBaseUrl')}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
