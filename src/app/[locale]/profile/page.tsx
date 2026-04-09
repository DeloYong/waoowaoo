'use client'
import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import Navbar from '@/components/Navbar'
import { AppIcon } from '@/components/ui/icons'
import { useRouter } from '@/i18n/navigation'

interface SubscriptionInfo {
  subscription: {
    planId: string
    status: string
    currentPeriodEnd: string
    creditsGranted: number
    videoSecondsUsed: number
  } | null
  balance: {
    subscriptionCredits: number
    permanentCredits: number
    frozenCredits: number
  } | null
  plan: {
    name: string
    maxConcurrency: number
    maxVideoSeconds: number
  } | null
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const t = useTranslations('profile')
  const tc = useTranslations('common')

  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push({ pathname: '/auth/signin' }); return }
  }, [router, session, status])

  useEffect(() => {
    if (status === 'authenticated' && session) {
      fetchSubscriptionInfo()
    }
  }, [status, session])

  const fetchSubscriptionInfo = async () => {
    try {
      const res = await fetch('/api/user/subscription')
      if (res.ok) {
        const data = await res.json()
        setSubInfo(data)
      }
    } catch (error) {
      console.error('获取订阅信息失败:', error)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || !session) {
    return (
      <div className="glass-page flex min-h-screen items-center justify-center">
        <div className="text-[var(--glass-text-secondary)]">{tc('loading')}</div>
      </div>
    )
  }

  const totalCredits = subInfo?.balance
    ? subInfo.balance.subscriptionCredits + subInfo.balance.permanentCredits - subInfo.balance.frozenCredits
    : 0

  return (
    <div className="glass-page min-h-screen">
      <Navbar />

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="flex gap-6 h-[calc(100vh-140px)]">

          {/* 左侧侧边栏 */}
          <div className="w-64 flex-shrink-0">
            <div className="glass-surface-elevated h-full flex flex-col p-5">

              {/* 用户信息 */}
              <div className="mb-6">
                <div className="mb-4">
                  <h2 className="font-semibold text-[var(--glass-text-primary)]">{session.user?.name || t('user')}</h2>
                  <p className="text-xs text-[var(--glass-text-tertiary)]">{t('personalAccount')}</p>
                </div>

                {/* 积分和订阅卡片 */}
                <div className="space-y-3">
                  <div className="glass-surface-soft rounded-2xl border border-[var(--glass-stroke-base)] p-4">
                    <div className="text-xs font-medium text-[var(--glass-text-secondary)]">可用积分</div>
                    <div className="mt-2 text-2xl font-bold text-[var(--glass-text-primary)]">
                      {loading ? '...' : totalCredits}
                    </div>
                  </div>

                  {subInfo?.subscription && (
                    <div className="glass-surface-soft rounded-2xl border border-[var(--glass-stroke-base)] p-4">
                      <div className="text-xs font-medium text-[var(--glass-text-secondary)]">当前套餐</div>
                      <div className="mt-1 text-base font-semibold text-[var(--glass-text-primary)]">
                        {subInfo.plan?.name || subInfo.subscription.planId}
                      </div>
                      <div className="mt-1 text-xs text-[var(--glass-text-tertiary)]">
                        状态: {subInfo.subscription.status}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 导航菜单 */}
              <nav className="flex-1 space-y-2">
                <button
                  onClick={() => router.push({ pathname: '/pricing' })}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-[var(--glass-text-secondary)] hover:bg-[var(--glass-bg-muted)] transition-all cursor-pointer"
                >
                  <AppIcon name="receipt" className="w-5 h-5" />
                  <span className="font-medium">套餐与定价</span>
                </button>

                <button
                  onClick={() => router.push({ pathname: '/invite' })}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-[var(--glass-text-secondary)] hover:bg-[var(--glass-bg-muted)] transition-all cursor-pointer"
                >
                  <AppIcon name="sparkles" className="w-5 h-5" />
                  <span className="font-medium">邀请奖励</span>
                </button>

                <div
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-[var(--glass-text-tertiary)] cursor-not-allowed opacity-50"
                  title="模型配置已由管理员统一管理"
                >
                  <AppIcon name="settingsHex" className="w-5 h-5" />
                  <span className="font-medium">API 配置</span>
                  <span className="ml-auto text-xs">(已禁用)</span>
                </div>
              </nav>

              {/* 退出登录 */}
              <button
                onClick={() => {
                  signOut({ callbackUrl: '/' })
                }}
                className="glass-btn-base glass-btn-tone-danger mt-auto flex items-center gap-2 px-4 py-3 text-sm rounded-xl transition-all cursor-pointer"
              >
                <AppIcon name="logout" className="w-4 h-4" />
                {t('logout')}
              </button>
            </div>
          </div>

          {/* 右侧内容区 */}
          <div className="flex-1 min-w-0">
            <div className="glass-surface-elevated h-full flex flex-col p-8">
              <div className="max-w-3xl">
                <h2 className="text-2xl font-bold text-[var(--glass-text-primary)] mb-6">账户概览</h2>

                <div className="space-y-6">
                  {/* 积分详情 */}
                  {subInfo?.balance && (
                    <div className="glass-surface-soft rounded-2xl border border-[var(--glass-stroke-base)] p-6">
                      <h3 className="text-lg font-semibold text-[var(--glass-text-primary)] mb-4">积分详情</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className="text-sm text-[var(--glass-text-secondary)]">套餐积分</div>
                          <div className="mt-1 text-2xl font-bold text-blue-600">
                            {subInfo.balance.subscriptionCredits}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-[var(--glass-text-secondary)]">永久积分</div>
                          <div className="mt-1 text-2xl font-bold text-green-600">
                            {subInfo.balance.permanentCredits}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-[var(--glass-text-secondary)]">冻结积分</div>
                          <div className="mt-1 text-2xl font-bold text-orange-600">
                            {subInfo.balance.frozenCredits}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 订阅详情 */}
                  {subInfo?.subscription && (
                    <div className="glass-surface-soft rounded-2xl border border-[var(--glass-stroke-base)] p-6">
                      <h3 className="text-lg font-semibold text-[var(--glass-text-primary)] mb-4">订阅详情</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-[var(--glass-text-secondary)]">套餐</span>
                          <span className="font-medium">{subInfo.plan?.name || subInfo.subscription.planId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--glass-text-secondary)]">状态</span>
                          <span className="font-medium">{subInfo.subscription.status}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--glass-text-secondary)]">周期结束</span>
                          <span className="font-medium">
                            {new Date(subInfo.subscription.currentPeriodEnd).toLocaleDateString('zh-CN')}
                          </span>
                        </div>
                        {subInfo.plan && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-[var(--glass-text-secondary)]">最大并发</span>
                              <span className="font-medium">{subInfo.plan.maxConcurrency}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[var(--glass-text-secondary)]">视频时长上限</span>
                              <span className="font-medium">{subInfo.plan.maxVideoSeconds} 秒</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {!subInfo && !loading && (
                    <div className="text-center py-12 text-[var(--glass-text-tertiary)]">
                      暂无订阅信息
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main >
    </div >
  )
}
