'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import Navbar from '@/components/Navbar'
import { AppIcon } from '@/components/ui/icons'
import { toast } from 'react-hot-toast'

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

interface InviteRecord {
  id: string
  inviteeId: string
  registeredAt: string
  activatedAt: string | null
  welcomeCredits: number
  referralCredits: number
}

interface InviteStats {
  inviteCode: string | null
  totalInvites: number
  activatedInvites: number
  totalRewards: number
}

interface RebateLog {
  id: string
  inviteeId: string
  triggerType: string
  creditsAwarded: number
  createdAt: string
}

export default function InvitePage() {
  const { data: session, status: sessionStatus } = useSession()
  const tc = useTranslations('common')
  const t = useTranslations('profile')
  const router = useRouter()
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [inviteList, setInviteList] = useState<InviteRecord[]>([])
  const [stats, setStats] = useState<InviteStats>({
    inviteCode: null,
    totalInvites: 0,
    activatedInvites: 0,
    totalRewards: 0,
  })
  const [rebateLogs, setRebateLogs] = useState<RebateLog[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'list' | 'rebates'>('overview')
  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null)

  // 计算总积分
  const totalCredits = useMemo(() => {
    if (!subInfo?.balance) return 0
    return subInfo.balance.subscriptionCredits + subInfo.balance.permanentCredits - subInfo.balance.frozenCredits
  }, [subInfo?.balance])

  // 获取套餐信息
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

  useEffect(() => {
    if (sessionStatus === 'loading') return
    if (!session) {
      router.push({ pathname: '/auth/signin' })
      return
    }
    if (session) {
      Promise.all([
        fetchInviteData(),
        fetchSubscriptionInfo()
      ])
    }
  }, [session, sessionStatus, router])

  const fetchInviteData = async () => {
    try {
      const res = await fetch('/api/user/invite')
      if (res.ok) {
        const data = await res.json()
        setInviteCode(data.inviteCode || null)
        setInviteList(data.invites || [])
        setStats(data.stats || {
          inviteCode: data.inviteCode,
          totalInvites: data.invites?.length || 0,
          activatedInvites: data.invites?.filter((i: InviteRecord) => i.activatedAt).length || 0,
          totalRewards: 0,
        })
        setRebateLogs(data.rebateLogs || [])
      }
    } catch (error) {
      toast.error('获取邀请数据失败')
    } finally {
      setLoading(false)
    }
  }

  const copyInviteLink = async () => {
    if (!inviteCode) {
      toast.error('暂无邀请码')
      return
    }
    const url = `${window.location.origin}/zh/auth/signup?invite=${inviteCode}`

    try {
      // 优先使用Clipboard API
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url)
        toast.success('邀请链接已复制到剪贴板')
      } else {
        // Fallback：使用传统复制方法
        const textArea = document.createElement('textarea')
        textArea.value = url
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()

        try {
          document.execCommand('copy')
          toast.success('邀请链接已复制到剪贴板')
        } catch (fallbackError) {
          console.error('Fallback copy failed:', fallbackError)
          toast.error('复制失败，请手动复制链接：' + url)
        }

        document.body.removeChild(textArea)
      }
    } catch (error) {
      console.error('Copy failed:', error)
      toast.error('复制失败，请手动复制链接：' + url)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-white/60">{tc('loading')}</div>
        </div>
      </div>
    )
  }

  if (sessionStatus === 'loading' || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-white/60">{tc('loading')}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="flex gap-6 h-[calc(100vh-140px)]">
          {/* 左侧侧边栏 */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/20 shadow-[0_0_30px_rgba(167,87,255,0.15)] rounded-2xl h-full flex flex-col p-5">
              {/* 用户信息 */}
              <div className="mb-6">
                <div className="mb-4">
                  <h2 className="font-semibold text-white">{session.user?.name || t('user')}</h2>
                  <p className="text-xs text-white/40">{t('personalAccount')}</p>
                </div>

                {/* 积分卡片 */}
                <div className="space-y-3">
                  <div className="bg-[var(--wuhu-bg-surface)]/50 rounded-2xl border border-[var(--wuhu-neon-purple)]/30 p-4">
                    <div className="text-xs font-medium text-white/60">可用积分</div>
                    <div className="mt-2 text-2xl font-bold text-white wuhu-text-gradient">
                      {totalCredits}
                    </div>
                  </div>

                  {subInfo?.subscription && (
                    <div className="bg-[var(--wuhu-bg-surface)]/50 rounded-2xl border border-[var(--wuhu-neon-purple)]/30 p-4">
                      <div className="text-xs font-medium text-white/60">{t('currentPlan')}</div>
                      <div className="mt-1 text-base font-semibold text-white wuhu-text-gradient">
                        {subInfo.plan?.name}
                      </div>
                      <div className="mt-1 text-xs text-white/40">
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
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-white/60 hover:bg-[var(--wuhu-neon-purple)]/20 hover:text-white transition-all cursor-pointer"
                >
                  <AppIcon name="receipt" className="w-5 h-5" />
                  <span className="font-medium">套餐与定价</span>
                </button>

                <button
                  onClick={() => router.push({ pathname: '/invite' })}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left bg-gradient-to-r from-[var(--wuhu-neon-purple)]/30 to-[var(--wuhu-neon-pink)]/30 text-white border border-[var(--wuhu-neon-purple)]/40 shadow-[0_0_15px_rgba(167,87,255,0.3)] transition-all cursor-pointer"
                >
                  <AppIcon name="sparkles" className="w-5 h-5" />
                  <span className="font-medium">邀请奖励</span>
                </button>
              </nav>

              {/* 返回个人中心 */}
              <button
                onClick={() => {
                  router.push({ pathname: '/profile' })
                }}
                className="mt-auto flex items-center gap-2 px-4 py-3 text-sm rounded-xl transition-all cursor-pointer border border-[var(--wuhu-neon-purple)]/30 text-white/70 hover:bg-[var(--wuhu-neon-purple)]/20 hover:text-white"
              >
                <AppIcon name="user" className="w-4 h-4" />
                返回个人中心
              </button>
            </div>
          </div>

          {/* 右侧内容区 */}
          <div className="flex-1 min-w-0 overflow-y-auto">
            <div className="bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/20 shadow-[0_0_30px_rgba(167,87,255,0.15)] rounded-2xl min-h-full flex flex-col p-8">
              <div className="max-w-none">
        {/* 标题 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            邀请好友，共赢奖励
          </h1>
          <p className="text-lg text-white/60">
            分享您的邀请链接，好友注册后双方均可获得积分奖励
          </p>
        </div>

        {/* 邀请码卡片 */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] rounded-2xl p-8 text-white shadow-[0_0_40px_rgba(167,87,255,0.4)]">
            <div className="text-center">
              <div className="text-sm opacity-80 mb-2">您的专属邀请码</div>
              <div className="text-5xl font-bold tracking-wider mb-4">
                {inviteCode || '未生成'}
              </div>
              <button
                onClick={copyInviteLink}
                className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                <AppIcon name="copy" className="w-5 h-5" />
                复制邀请链接
              </button>
            </div>
          </div>
        </div>

        {/* 奖励规则 */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="bg-[var(--wuhu-bg-card)]/80 rounded-2xl border border-[var(--wuhu-neon-purple)]/20 p-6 shadow-[0_0_20px_rgba(167,87,255,0.1)]">
            <h3 className="text-lg font-bold text-white mb-4">奖励规则</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-[var(--wuhu-neon-cyan)]/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <AppIcon name="usersRound" className="w-4 h-4 text-[var(--wuhu-neon-cyan)]" />
                </div>
                <div>
                  <div className="font-semibold text-white">新用户注册奖励</div>
                  <div className="text-sm text-white/60">
                    通过您的链接注册，新用户将获得新手礼包积分
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-[var(--wuhu-neon-pink)]/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <AppIcon name="sparkles" className="w-4 h-4 text-[var(--wuhu-neon-pink)]" />
                </div>
                <div>
                  <div className="font-semibold text-white">邀请人奖励</div>
                  <div className="text-sm text-white/60">
                    每成功邀请一位用户，您将获得永久积分奖励
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-[var(--wuhu-neon-purple)]/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <AppIcon name="coins" className="w-4 h-4 text-[var(--wuhu-neon-purple)]" />
                </div>
                <div>
                  <div className="font-semibold text-white">充值返佣</div>
                  <div className="text-sm text-white/60">
                    被邀请人充值时，邀请人可获得返佣积分
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-[var(--wuhu-bg-card)]/80 rounded-xl border border-[var(--wuhu-neon-purple)]/20 p-6 text-center shadow-[0_0_15px_rgba(167,87,255,0.15)]">
            <div className="text-3xl font-bold text-[var(--wuhu-neon-cyan)] mb-1">{stats.totalInvites}</div>
            <div className="text-sm text-white/50">总邀请人数</div>
          </div>
          <div className="bg-[var(--wuhu-bg-card)]/80 rounded-xl border border-[var(--wuhu-neon-purple)]/20 p-6 text-center shadow-[0_0_15px_rgba(167,87,255,0.15)]">
            <div className="text-3xl font-bold text-[var(--wuhu-neon-pink)] mb-1">{stats.activatedInvites}</div>
            <div className="text-sm text-white/50">已激活人数</div>
          </div>
          <div className="bg-[var(--wuhu-bg-card)]/80 rounded-xl border border-[var(--wuhu-neon-purple)]/20 p-6 text-center shadow-[0_0_15px_rgba(167,87,255,0.15)]">
            <div className="text-3xl font-bold text-[var(--wuhu-neon-purple)] mb-1">{stats.totalRewards}</div>
            <div className="text-sm text-white/50">累计奖励积分</div>
          </div>
        </div>

        {/* Tab 切换 */}
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-4 mb-6 border-b border-[var(--wuhu-neon-purple)]/20">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-3 font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'text-[var(--wuhu-neon-cyan)] border-b-2 border-[var(--wuhu-neon-cyan)] shadow-[0_-5px_15px_rgba(100,255,255,0.2)]'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              邀请列表
            </button>
            <button
              onClick={() => setActiveTab('rebates')}
              className={`px-4 py-3 font-medium transition-colors ${
                activeTab === 'rebates'
                  ? 'text-[var(--wuhu-neon-cyan)] border-b-2 border-[var(--wuhu-neon-cyan)] shadow-[0_-5px_15px_rgba(100,255,255,0.2)]'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              返佣记录
            </button>
          </div>

          {/* 邀请列表 */}
          {activeTab === 'overview' && (
            <div className="bg-[var(--wuhu-bg-card)]/50 rounded-xl border border-[var(--wuhu-neon-purple)]/20 shadow-[0_0_20px_rgba(167,87,255,0.1)] overflow-hidden">
              {inviteList.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-[var(--wuhu-bg-surface)]/30">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white/60">
                        注册时间
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white/60">
                        状态
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white/60">
                        新用户积分
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white/60">
                        邀请人积分
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--wuhu-neon-purple)]/15">
                    {inviteList.map((record) => (
                      <tr key={record.id} className="hover:bg-[var(--wuhu-neon-purple)]/10">
                        <td className="px-4 py-3 text-sm text-white">
                          {new Date(record.registeredAt).toLocaleDateString('zh-CN')}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded text-xs border ${
                              record.activatedAt
                                ? 'bg-[var(--wuhu-neon-pink)]/20 text-[var(--wuhu-neon-pink)] border-[var(--wuhu-neon-pink)]/30'
                                : 'bg-[var(--wuhu-neon-orange)]/20 text-[var(--wuhu-neon-orange)] border-[var(--wuhu-neon-orange)]/30'
                            }`}
                          >
                            {record.activatedAt ? '已激活' : '待激活'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-[var(--wuhu-neon-cyan)]">
                          +{record.welcomeCredits}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-[var(--wuhu-neon-pink)]">
                          +{record.referralCredits}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12 text-white/40">
                  暂无邀请记录
                </div>
              )}
            </div>
          )}

          {/* 返佣记录 */}
          {activeTab === 'rebates' && (
            <div className="bg-[var(--wuhu-bg-card)]/50 rounded-xl border border-[var(--wuhu-neon-purple)]/20 shadow-[0_0_20px_rgba(167,87,255,0.1)] overflow-hidden">
              {rebateLogs.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-[var(--wuhu-bg-surface)]/30">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white/60">
                        时间
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white/60">
                        触发类型
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white/60">
                        奖励积分
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--wuhu-neon-purple)]/15">
                    {rebateLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[var(--wuhu-neon-purple)]/10">
                        <td className="px-4 py-3 text-sm text-white">
                          {new Date(log.createdAt).toLocaleDateString('zh-CN')}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-[var(--wuhu-neon-purple)]/20 text-[var(--wuhu-neon-purple)] border border-[var(--wuhu-neon-purple)]/30 rounded text-xs">
                            {log.triggerType === 'activation' ? '注册激活' : '充值返佣'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-[var(--wuhu-neon-purple)]">
                          +{log.creditsAwarded}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12 text-white/40">
                  暂无返佣记录
                </div>
              )}
            </div>
          )}
        </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
