'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'

export interface UpdateNoticeModalProps {
  show: boolean
  currentVersion: string
  latestVersion: string
  releaseUrl: string
  releaseName: string | null
  publishedAt: string | null
  onDismiss: () => void
}

export default function UpdateNoticeModal({
  show,
  currentVersion,
  latestVersion,
  releaseUrl,
  releaseName,
  publishedAt,
  onDismiss,
}: UpdateNoticeModalProps) {
  const t = useTranslations('common.updateNotice')
  const locale = useLocale()

  const formattedPublishedAt = useMemo(() => {
    if (!publishedAt) return null
    const parsed = new Date(publishedAt)
    if (Number.isNaN(parsed.getTime())) {
      return publishedAt
    }

    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(parsed)
  }, [locale, publishedAt])

  if (!show) return null

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onDismiss} />
      <div className="fixed inset-0 z-[81] flex items-center justify-center p-4 pointer-events-none">
        <section
          className="bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_40px_rgba(167,87,255,0.3)] rounded-2xl w-full max-w-lg p-6 pointer-events-auto animate-scale-in"
          onClick={(event) => event.stopPropagation()}
        >
          <header className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[var(--wuhu-neon-cyan)]/20 to-[var(--wuhu-neon-purple)]/30 border border-[var(--wuhu-neon-cyan)]/40 shadow-[0_0_20px_rgba(100,255,255,0.3)]">
                <AppIcon name="sparkles" className="h-5 w-5 text-[var(--wuhu-neon-cyan)]" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">{t('title')}</h3>
                <p className="mt-1 text-sm text-white/70">
                  {t('subtitle', { current: currentVersion, latest: latestVersion })}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-lg p-1.5 text-white/40 hover:text-white hover:bg-white/10 transition-all"
              aria-label={t('close')}
            >
              <AppIcon name="close" className="h-4 w-4" />
            </button>
          </header>

          <p className="mt-4 text-sm leading-6 text-white/70">{t('description')}</p>

          <div className="mt-4 space-y-2 rounded-xl border border-[var(--wuhu-neon-purple)]/20 bg-[var(--wuhu-bg-surface)]/50 p-3.5">
            {releaseName ? (
              <div className="flex items-start justify-between gap-3 text-sm">
                <span className="text-white/50">{t('releaseName')}</span>
                <span className="text-right font-medium text-white">{releaseName}</span>
              </div>
            ) : null}
            {formattedPublishedAt ? (
              <div className="flex items-start justify-between gap-3 text-sm">
                <span className="text-white/50">{t('publishedAt')}</span>
                <span className="text-right text-white">{formattedPublishedAt}</span>
              </div>
            ) : null}
          </div>

          <footer className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onDismiss}
              className="border border-[var(--wuhu-neon-purple)]/30 text-white/70 hover:bg-[var(--wuhu-neon-purple)]/20 hover:text-white rounded-xl px-4 py-2.5 text-sm font-medium"
            >
              {t('close')}
            </button>
            <Link
              href={releaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_20px_rgba(167,87,255,0.5)] inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium"
            >
              <AppIcon name="externalLink" className="h-4 w-4" />
              {t('viewRelease')}
            </Link>
          </footer>
        </section>
      </div>
    </>
  )
}
