'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import Navbar from '@/components/Navbar'
import { AppIcon } from '@/components/ui/icons'
import { toast } from 'react-hot-toast'

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
  const { data: session } = useSession()
  const tc = useTranslations('common')
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

  useEffect(() => {
    if (session) {
      fetchInviteData()
    }
  }, [session])

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

  const copyInviteLink = () => {
    if (!inviteCode) {
      toast.error('暂无邀请码')
      return
    }
    const url = `${window.location.origin}/zh/auth/signup?invite=${inviteCode}`
    navigator.clipboard.writeText(url)
    toast.success('邀请链接已复制到剪贴板')
  }

  if (loading) {
    return (
      <div className="glass-page min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-[var(--glass-text-secondary)]">{tc('loading')}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-page min-h-screen">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-16">
        {/* 标题 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[var(--glass-text-primary)] mb-4">
            邀请好友，共赢奖励
          </h1>
          <p className="text-lg text-[var(--glass-text-secondary)]">
            分享您的邀请链接，好友注册后双方均可获得积分奖励
          </p>
        </div>

        {/* 邀请码卡片 */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-8 text-white">
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
          <div className="bg-[var(--glass-bg-surface)] rounded-2xl border border-[var(--glass-stroke-soft)] p-6">
            <h3 className="text-lg font-bold text-[var(--glass-text-primary)] mb-4">奖励规则</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <AppIcon name="usersRound" className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold text-[var(--glass-text-primary)]">新用户注册奖励</div>
                  <div className="text-sm text-[var(--glass-text-secondary)]">
                    通过您的链接注册，新用户将获得新手礼包积分
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <AppIcon name="sparkles" className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <div className="font-semibold text-[var(--glass-text-primary)]">邀请人奖励</div>
                  <div className="text-sm text-[var(--glass-text-secondary)]">
                    每成功邀请一位用户，您将获得永久积分奖励
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <AppIcon name="coins" className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <div className="font-semibold text-[var(--glass-text-primary)]">充值返佣</div>
                  <div className="text-sm text-[var(--glass-text-secondary)]">
                    被邀请人充值时，邀请人可获得返佣积分
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-[var(--glass-bg-surface)] rounded-xl border border-[var(--glass-stroke-soft)] p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-1">{stats.totalInvites}</div>
            <div className="text-sm text-[var(--glass-text-secondary)]">总邀请人数</div>
          </div>
          <div className="bg-[var(--glass-bg-surface)] rounded-xl border border-[var(--glass-stroke-soft)] p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-1">{stats.activatedInvites}</div>
            <div className="text-sm text-[var(--glass-text-secondary)]">已激活人数</div>
          </div>
          <div className="bg-[var(--glass-bg-surface)] rounded-xl border border-[var(--glass-stroke-soft)] p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-1">{stats.totalRewards}</div>
            <div className="text-sm text-[var(--glass-text-secondary)]">累计奖励积分</div>
          </div>
        </div>

        {/* Tab 切换 */}
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-4 mb-6 border-b border-[var(--glass-stroke-soft)]">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-3 font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-[var(--glass-text-secondary)] hover:text-[var(--glass-text-primary)]'
              }`}
            >
              邀请列表
            </button>
            <button
              onClick={() => setActiveTab('rebates')}
              className={`px-4 py-3 font-medium transition-colors ${
                activeTab === 'rebates'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-[var(--glass-text-secondary)] hover:text-[var(--glass-text-primary)]'
              }`}
            >
              返佣记录
            </button>
          </div>

          {/* 邀请列表 */}
          {activeTab === 'overview' && (
            <div className="bg-[var(--glass-bg-surface)] rounded-xl border border-[var(--glass-stroke-soft)] overflow-hidden">
              {inviteList.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-[var(--glass-bg-canvas)]">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--glass-text-secondary)]">
                        注册时间
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--glass-text-secondary)]">
                        状态
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--glass-text-secondary)]">
                        新用户积分
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--glass-text-secondary)]">
                        邀请人积分
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--glass-stroke-soft)]">
                    {inviteList.map((record) => (
                      <tr key={record.id} className="hover:bg-[var(--glass-bg-canvas)]">
                        <td className="px-4 py-3 text-sm">
                          {new Date(record.registeredAt).toLocaleDateString('zh-CN')}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              record.activatedAt
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {record.activatedAt ? '已激活' : '待激活'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-blue-600">
                          +{record.welcomeCredits}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-green-600">
                          +{record.referralCredits}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12 text-[var(--glass-text-tertiary)]">
                  暂无邀请记录
                </div>
              )}
            </div>
          )}

          {/* 返佣记录 */}
          {activeTab === 'rebates' && (
            <div className="bg-[var(--glass-bg-surface)] rounded-xl border border-[var(--glass-stroke-soft)] overflow-hidden">
              {rebateLogs.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-[var(--glass-bg-canvas)]">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--glass-text-secondary)]">
                        时间
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--glass-text-secondary)]">
                        触发类型
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--glass-text-secondary)]">
                        奖励积分
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--glass-stroke-soft)]">
                    {rebateLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[var(--glass-bg-canvas)]">
                        <td className="px-4 py-3 text-sm">
                          {new Date(log.createdAt).toLocaleDateString('zh-CN')}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                            {log.triggerType === 'activation' ? '注册激活' : '充值返佣'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-purple-600">
                          +{log.creditsAwarded}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12 text-[var(--glass-text-tertiary)]">
                  暂无返佣记录
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
