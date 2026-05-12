'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import LanguageSwitcher from './LanguageSwitcher'
import { AppIcon } from '@/components/ui/icons'
import WuhuLogo from './WuhuLogo'
import UpdateNoticeModal from './UpdateNoticeModal'
import { useGithubReleaseUpdate } from '@/hooks/common/useGithubReleaseUpdate'
import { Link } from '@/i18n/navigation'
import { buildAuthenticatedHomeTarget } from '@/lib/home/default-route'

interface CreditsInfo {
  totalCredits: number
  planName: string | null
}

interface Plan {
  id: string
  name: string
}

export default function Navbar() {
  const { data: session, status } = useSession()
  const t = useTranslations('nav')
  const tc = useTranslations('common')
  const { currentVersion, update, shouldPulse, showModal, openModal, dismissCurrentUpdate, checkNow } = useGithubReleaseUpdate()
  const [checkMsg, setCheckMsg] = useState<string | null>(null)
  const [checkMsgFading, setCheckMsgFading] = useState(false)
  const [manualChecking, setManualChecking] = useState(false)
  const [creditsInfo, setCreditsInfo] = useState<CreditsInfo | null>(null)
  const downloadLogsHref = '/api/admin/download-logs'

  useEffect(() => {
    if (status === 'authenticated' && session) {
      fetchCreditsInfo()
    }
  }, [status, session])

  const fetchCreditsInfo = async () => {
    try {
      const res = await fetch('/api/user/subscription')
      if (res.ok) {
        const data = await res.json()
        const balance = data.balance
        const totalCredits = balance
          ? balance.subscriptionCredits + balance.permanentCredits - balance.frozenCredits
          : 0

        // 从 plans 列表中查找当前订阅的套餐名称
        let planName: string | null = null
        if (data.subscription?.planId && data.plans) {
          const matchedPlan = data.plans.find((p: Plan) => p.id === data.subscription.planId)
          if (matchedPlan) {
            planName = matchedPlan.name
          }
        }
        if (!planName && data.subscription?.planId) {
          planName = data.subscription.planId
        }

        setCreditsInfo({
          totalCredits,
          planName,
        })
      }
    } catch (error) {
      console.error('获取积分信息失败:', error)
    }
  }

  const handleCheckUpdate = async () => {
    setCheckMsg(null)
    setCheckMsgFading(false)
    setManualChecking(true)
    const minSpin = new Promise(r => setTimeout(r, 1000))
    await Promise.all([checkNow(), minSpin])
    setManualChecking(false)
    setTimeout(() => {
      setCheckMsg('upToDate')
      setTimeout(() => setCheckMsgFading(true), 2000)
      setTimeout(() => { setCheckMsg(null); setCheckMsgFading(false) }, 3000)
    }, 100)
  }

  return (
    <>
      <nav className="sticky top-0 z-50 bg-[var(--wuhu-bg-surface)]/90 backdrop-blur-xl border-b border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_30px_rgba(167,87,255,0.2)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Link href={session ? buildAuthenticatedHomeTarget() : { pathname: '/' }} className="group">
                <WuhuLogo size="md" animated={true} />
              </Link>
              <button
                type="button"
                onClick={openModal}
                disabled={!update}
                className={`relative inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.02em] transition-all ${update
                  ? 'border-[var(--wuhu-neon-orange)]/40 bg-[var(--wuhu-bg-card)] text-[var(--wuhu-neon-orange)] shadow-[0_8px_24px_-16px_rgba(255,159,67,0.4)] hover:brightness-110'
                  : 'border-[var(--wuhu-neon-purple)]/30 bg-[var(--wuhu-bg-surface)] text-white/60 hover:border-[var(--wuhu-neon-purple)]/60 hover:text-white disabled:cursor-default'
                  }`}
                aria-label={tc('updateNotice.openDialog')}
              >
                <span className="inline-flex items-center gap-1.5">
                  <AppIcon name="sparkles" className="h-3.5 w-3.5" />
                  {tc('betaVersion', { version: currentVersion })}
                  {update ? (
                    <span className="relative inline-flex items-center">
                      {shouldPulse ? <span className="absolute -inset-1.5 animate-ping rounded-full bg-[var(--wuhu-neon-orange)] opacity-20" /> : null}
                      <span className="relative inline-flex items-center gap-1 rounded-full bg-[var(--wuhu-neon-orange)]/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em]">
                        <AppIcon name="upload" className="h-3 w-3" />
                        {tc('updateNotice.updateTag')}
                      </span>
                    </span>
                  ) : null}
                </span>
              </button>
              <button
                type="button"
                onClick={() => void handleCheckUpdate()}
                disabled={manualChecking}
                className="rounded-full p-1.5 text-white/40 hover:bg-[var(--wuhu-bg-card)] hover:text-white/70 transition-colors disabled:opacity-40"
                title={tc('updateNotice.checkUpdate')}
              >
                <AppIcon name="refresh" className={`h-3.5 w-3.5 ${manualChecking ? 'animate-spin' : ''}`} />
              </button>
              {checkMsg === 'upToDate' && !update && (
                <span
                  className="text-[11px] text-[var(--wuhu-neon-cyan)] font-medium transition-opacity duration-1000"
                  style={{ opacity: checkMsgFading ? 0 : 1 }}
                >
                  ✓ {tc('updateNotice.upToDate')}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-6">
              {status === 'loading' ? (
                /* Session 加载中骨架屏 */
                <div className="flex items-center space-x-4">
                  <div className="h-4 w-16 rounded-full bg-[var(--wuhu-bg-card)] animate-pulse" />
                  <div className="h-4 w-16 rounded-full bg-[var(--wuhu-bg-card)] animate-pulse" />
                  <div className="h-8 w-20 rounded-lg bg-[var(--wuhu-bg-card)] animate-pulse" />
                </div>
              ) : session ? (
                <>
                  {/* 积分余额显示 */}
                  {creditsInfo && (
                    <div className="flex items-center gap-3">
                      <Link
                        href={{ pathname: '/recharge' }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[var(--wuhu-bg-card)] rounded-lg border border-[var(--wuhu-neon-purple)]/30 hover:border-[var(--wuhu-neon-pink)] hover:shadow-[0_0_15px_rgba(255,100,200,0.3)] transition-all duration-300"
                        title="点击充值"
                      >
                        <AppIcon name="coins" className="w-4 h-4 text-[var(--wuhu-neon-orange)]" />
                        <span className="text-sm font-semibold text-white wuhu-text-gradient">
                          {creditsInfo.totalCredits}
                        </span>
                        <AppIcon name="plus" className="w-3.5 h-3.5 text-[var(--wuhu-neon-cyan)]" />
                      </Link>
                      {creditsInfo.planName && (
                        <div className="px-3 py-1.5 bg-[var(--wuhu-neon-purple)]/20 rounded-lg text-sm font-medium text-[var(--wuhu-neon-purple)] border border-[var(--wuhu-neon-purple)]/40">
                          {creditsInfo.planName}
                        </div>
                      )}
                    </div>
                  )}

                  <Link
                    href={{ pathname: '/workspace' }}
                    className="text-sm text-white/70 hover:text-white font-medium transition-colors flex items-center gap-1"
                  >
                    <AppIcon name="monitor" className="w-4 h-4" />
                    {t('workspace')}
                  </Link>
                  <Link
                    href={{ pathname: '/workspace/asset-hub' }}
                    className="text-sm text-white/70 hover:text-white font-medium transition-colors flex items-center gap-1"
                  >
                    <AppIcon name="folderHeart" className="w-4 h-4" />
                    {t('assetHub')}
                  </Link>
                  <Link
                    href={{ pathname: '/profile' }}
                    className="text-sm text-white/70 hover:text-white font-medium transition-colors flex items-center gap-1"
                    title={t('profile')}
                  >
                    <AppIcon name="userRoundCog" className="w-5 h-5" />
                    {t('profile')}
                  </Link>
                  <LanguageSwitcher />
                  <a
                    href={downloadLogsHref}
                    download
                    className="text-sm text-white/70 hover:text-white font-medium transition-colors flex items-center gap-1"
                    title={t('downloadLogs')}
                  >
                    <AppIcon name="download" className="w-4 h-4" />
                    {t('downloadLogs')}
                  </a>
                </>

              ) : (
                <>
                  <Link
                    href={{ pathname: '/auth/signin' }}
                    className="text-sm text-white/70 hover:text-white font-medium transition-colors"
                  >
                    {t('signin')}
                  </Link>
                  <Link
                    href={{ pathname: '/auth/signup' }}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_15px_rgba(167,87,255,0.4)] hover:shadow-[0_0_25px_rgba(255,100,200,0.5)] transition-all duration-300"
                  >
                    {t('signup')}
                  </Link>
                  <LanguageSwitcher />
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
      {update ? (
        <UpdateNoticeModal
          show={showModal}
          currentVersion={currentVersion}
          latestVersion={update.latestVersion}
          releaseUrl={update.releaseUrl}
          releaseName={update.releaseName}
          publishedAt={update.publishedAt}
          onDismiss={dismissCurrentUpdate}
        />
      ) : null}
    </>
  )
}
