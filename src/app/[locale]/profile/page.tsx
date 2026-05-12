'use client'
import { useEffect, useState, useMemo } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { AppIcon } from '@/components/ui/icons'
import { useRouter } from '@/i18n/navigation'
import { SegmentedControl } from '@/components/ui/SegmentedControl'

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

interface UsageTrendItem {
  date: string
  credits: number
  totalCredits?: number
  taskCount?: number
}

interface UsageTypeItem {
  type: string
  credits: number
  name: string
}

interface ConsumptionRecord {
  id: string
  date: string
  createdAt: string
  type: string
  description: string
  credits: number
  cost: number
  model?: string
  action?: string
  status: 'success' | 'failed' | 'processing'
}

interface TaskRecord {
  id: string
  date: string
  name: string
  type: string
  duration: number
  credits: number
  status: 'completed' | 'failed' | 'running'
}

interface UsageData {
  overview: {
    totalCredits: number
    usedThisMonth: number
    remainingCredits: number
    usedVideoSeconds: number
    planRemainingDays: number
  }
  trends: {
    '7d': UsageTrendItem[]
    '30d': UsageTrendItem[]
  }
  typeDistribution: UsageTypeItem[]
  consumptionRecords: ConsumptionRecord[]
  taskRecords: TaskRecord[]
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const rawLocale = params?.locale
  const locale = Array.isArray(rawLocale) ? rawLocale[0] : (rawLocale as string || 'zh')
  const t = useTranslations('profile')
  const tc = useTranslations('common')

  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null)
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterDate, setFilterDate] = useState<string>('all')

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push({ pathname: '/auth/signin' }); return }
  }, [router, session, status])

  useEffect(() => {
    if (status === 'authenticated' && session) {
      Promise.all([
        fetchSubscriptionInfo(),
        fetchUsageData()
      ])
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
    }
  }

  const fetchUsageData = async () => {
    try {
      const res = await fetch('/api/user/usage')
      if (res.ok) {
        const result = await res.json()
        const data = result.data

        // 适配后端返回的数据结构
        setUsageData({
          overview: {
            totalCredits: data.overview.availableCredits,
            usedThisMonth: data.overview.periodUsage,
            remainingCredits: data.overview.availableCredits,
            usedVideoSeconds: 0, // 后端暂时未返回
            planRemainingDays: data.overview.subscription
              ? Math.ceil((new Date(data.overview.subscription.currentPeriodEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
              : 0,
          },
          trends: {
            '7d': data.trend.map((item: UsageTrendItem) => ({ date: item.date, credits: item.totalCredits })),
            '30d': data.trend.map((item: UsageTrendItem) => ({ date: item.date, credits: item.totalCredits })),
          },
          typeDistribution: [], // 后端暂时未返回
          consumptionRecords: data.details.list.map((item: ConsumptionRecord) => ({
            id: item.id,
            date: item.createdAt,
            type: item.model || item.action || 'unknown',
            description: item.description || `${item.model} 调用`,
            credits: item.cost,
            status: 'success' as const,
          })),
          taskRecords: [], // 后端暂时未返回任务记录
        })
      }
    } catch (error) {
      console.error('获取使用数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--wuhu-bg-primary)]">
        <div className="text-white/70">{tc('loading')}</div>
      </div>
    )
  }

  const totalCredits = subInfo?.balance
    ? subInfo.balance.subscriptionCredits + subInfo.balance.permanentCredits - subInfo.balance.frozenCredits
    : 0

  return (
    <div className="min-h-screen bg-[var(--wuhu-bg-primary)]">
      <Navbar />

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="flex gap-6 h-[calc(100vh-140px)]">

          {/* 左侧侧边栏 */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-[var(--wuhu-bg-card)]/90 border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_30px_rgba(167,87,255,0.15)] rounded-xl h-full flex flex-col p-5">

              {/* 用户信息 */}
              <div className="mb-6">
                <div className="mb-4">
                  <h2 className="font-semibold text-white">{session.user?.name || t('user')}</h2>
                  <p className="text-xs text-white/50">{t('personalAccount')}</p>
                </div>

                {/* 积分和订阅卡片 */}
                <div className="space-y-3">
                  <div className="bg-black/30 border border-[var(--wuhu-neon-purple)]/20 rounded-2xl p-4">
                    <div className="text-xs font-medium text-white/70">可用积分</div>
                    <div className="mt-2 text-2xl font-bold text-white">
                      {loading ? '...' : totalCredits}
                    </div>
                  </div>

                  {subInfo?.subscription && (
                    <div className="bg-black/30 border border-[var(--wuhu-neon-purple)]/20 rounded-2xl p-4">
                      <div className="text-xs font-medium text-white/70">{t('currentPlan')}</div>
                      <div className="mt-1 text-base font-semibold text-white">
                        {subInfo.plan?.name}
                      </div>
                      <div className="mt-1 text-xs text-white/50">
                        状态: {subInfo.subscription.status === 'active' ? '已激活' : subInfo.subscription.status}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 导航菜单 */}
              <nav className="flex-1 space-y-2">
                <button
                  onClick={() => router.push({ pathname: '/pricing' })}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-white/70 hover:bg-[var(--wuhu-neon-purple)]/20 transition-all cursor-pointer"
                >
                  <AppIcon name="receipt" className="w-5 h-5" />
                  <span className="font-medium">套餐与定价</span>
                </button>

                <button
                  onClick={() => router.push({ pathname: '/invite' })}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-white/70 hover:bg-[var(--wuhu-neon-purple)]/20 transition-all cursor-pointer"
                >
                  <AppIcon name="sparkles" className="w-5 h-5" />
                  <span className="font-medium">邀请奖励</span>
                </button>

              </nav>

              {/* 退出登录 */}
              <button
                onClick={async () => {
                  await signOut({ redirect: false })
                  // 手动跳转到当前域名的 home 页面，不依赖 NEXTAUTH_URL
                  window.location.href = window.location.origin + '/home'
                }}
                className="mt-auto flex items-center gap-2 px-4 py-3 text-sm rounded-xl transition-all cursor-pointer border border-[var(--wuhu-neon-pink)]/30 text-[var(--wuhu-neon-pink)] hover:bg-[var(--wuhu-neon-pink)]/10"
              >
                <AppIcon name="logout" className="w-4 h-4" />
                {t('logout')}
              </button>
            </div>
          </div>

          {/* 右侧内容区 */}
          <div className="flex-1 min-w-0 overflow-y-auto">
            <div className="bg-[var(--wuhu-bg-card)]/90 border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_30px_rgba(167,87,255,0.15)] rounded-xl min-h-full flex flex-col p-8">
              <div className="max-w-none">
                <h2 className="text-2xl font-bold text-white mb-6">上量面板</h2>

                <div className="space-y-8">
                  {/* 1. 概览区域 */}
                  {usageData?.overview && (
                    <div className="bg-black/30 border border-[var(--wuhu-neon-purple)]/20 rounded-2xl p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">使用概览</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-[var(--wuhu-neon-purple)]/10 border border-[var(--wuhu-neon-purple)]/30 rounded-xl">
                          <div className="text-sm text-white/70 mb-1">积分余额</div>
                          <div className="text-2xl font-bold text-white">
                            {loading ? '...' : usageData.overview.totalCredits}
                          </div>
                        </div>
                        <div className="p-4 bg-[var(--wuhu-neon-pink)]/10 border border-[var(--wuhu-neon-pink)]/30 rounded-xl">
                          <div className="text-sm text-white/70 mb-1">本月已用</div>
                          <div className="text-2xl font-bold text-white">
                            {loading ? '...' : usageData.overview.usedThisMonth}
                          </div>
                        </div>
                        <div className="p-4 bg-[var(--wuhu-neon-purple)]/10 border border-[var(--wuhu-neon-purple)]/30 rounded-xl">
                          <div className="text-sm text-white/70 mb-1">套餐剩余天数</div>
                          <div className="text-2xl font-bold text-white">
                            {loading ? '...' : usageData.overview.planRemainingDays}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. 消费明细列表 */}
                  {usageData && (
                    <div className="bg-black/30 border border-[var(--wuhu-neon-purple)]/20 rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">消费明细</h3>
                        <div className="flex gap-3">
                          <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="text-sm px-3 py-2 rounded-lg bg-black/30 border border-[var(--wuhu-neon-purple)]/30 text-white focus:outline-none focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_10px_rgba(236,72,153,0.2)] transition-all"
                          >
                            <option value="all">全部类型</option>
                            <option value="video">视频生成</option>
                            <option value="audio">音频生成</option>
                            <option value="image">图片生成</option>
                            <option value="lipsync">口型同步</option>
                          </select>
                          <select
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="text-sm px-3 py-2 rounded-lg bg-black/30 border border-[var(--wuhu-neon-purple)]/30 text-white focus:outline-none focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_10px_rgba(236,72,153,0.2)] transition-all"
                          >
                            <option value="all">全部时间</option>
                            <option value="today">今天</option>
                            <option value="yesterday">昨天</option>
                            <option value="7d">近7天</option>
                            <option value="30d">近30天</option>
                          </select>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-[var(--wuhu-neon-purple)]/20">
                              <th className="text-left py-3 px-4 text-sm font-medium text-white/70">日期</th>
                              <th className="text-left py-3 px-4 text-sm font-medium text-white/70">类型</th>
                              <th className="text-left py-3 px-4 text-sm font-medium text-white/70">描述</th>
                              <th className="text-right py-3 px-4 text-sm font-medium text-white/70">消耗积分</th>
                              <th className="text-right py-3 px-4 text-sm font-medium text-white/70">状态</th>
                            </tr>
                          </thead>
                          <tbody>
                            {usageData.consumptionRecords.map((record) => (
                              <tr key={record.id} className="border-b border-[var(--wuhu-neon-purple)]/20 last:border-0">
                                <td className="py-4 px-4 text-sm text-white">
                                  {new Date(record.date).toLocaleString('zh-CN')}
                                </td>
                                <td className="py-4 px-4 text-sm text-white">
                                  <span className="inline-block px-2 py-1 rounded-full bg-[var(--wuhu-neon-purple)]/20 text-white/80 text-xs">
                                    {record.type}
                                  </span>
                                </td>
                                <td className="py-4 px-4 text-sm text-white">
                                  {record.description}
                                </td>
                                <td className="py-4 px-4 text-sm text-right font-medium text-[var(--wuhu-neon-pink)]">
                                  -{record.credits}
                                </td>
                                <td className="py-4 px-4 text-sm text-right">
                                  <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                                    record.status === 'success'
                                      ? 'bg-green-500/20 text-green-400'
                                      : record.status === 'failed'
                                      ? 'bg-red-500/20 text-red-400'
                                      : 'bg-yellow-500/20 text-yellow-400'
                                  }`}>
                                    {record.status === 'success' ? '成功' : record.status === 'failed' ? '失败' : '处理中'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {usageData.consumptionRecords.length === 0 && (
                          <div className="text-center py-12 text-white/50">
                            暂无消费记录
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {!subInfo && !usageData && !loading && (
                    <div className="text-center py-12 text-white/50">
                      暂无账户信息
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
