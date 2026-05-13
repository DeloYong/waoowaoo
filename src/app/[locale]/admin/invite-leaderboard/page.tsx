'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'react-hot-toast'

interface LeaderboardEntry {
  rank: number
  userId: string
  user: {
    id: string
    name: string | null
    email: string | null
    inviteCode: string | null
  } | null
  inviteCount: number
}

export default function InviteLeaderboardPage() {
  const t = useTranslations('admin')
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [period, setPeriod] = useState<'month' | 'all'>('month')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeaderboard()
  }, [period])

  const fetchLeaderboard = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/invite-leaderboard?period=${period}`)
      if (!res.ok) throw new Error('获取失败')
      const data = await res.json()
      setLeaderboard(data.leaderboard || [])
    } catch (error) {
      toast.error('获取邀请榜单失败')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-[rgba(255,255,255,0.7)]">加载中...</div>
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-[white] mb-6">
        邀请榜单
      </h2>

      {/* 周期选择 */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={() => setPeriod('month')}
          className={`px-6 py-2 rounded ${
            period === 'month'
              ? 'bg-blue-500 text-white'
              : 'bg-[var(--wuhu-bg-surface)] text-[rgba(255,255,255,0.7)] border border-[rgba(167, 87, 255, 0.2)]'
          }`}
        >
          本月
        </button>
        <button
          onClick={() => setPeriod('all')}
          className={`px-6 py-2 rounded ${
            period === 'all'
              ? 'bg-blue-500 text-white'
              : 'bg-[var(--wuhu-bg-surface)] text-[rgba(255,255,255,0.7)] border border-[rgba(167, 87, 255, 0.2)]'
          }`}
        >
          全部时间
        </button>
      </div>

      {/* 榜单 */}
      <div className="bg-[var(--wuhu-bg-surface)] rounded-lg border border-[rgba(167, 87, 255, 0.2)] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[var(--wuhu-bg-canvas)]">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[rgba(255,255,255,0.7)]">
                排名
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[rgba(255,255,255,0.7)]">
                用户
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[rgba(255,255,255,0.7)]">
                邀请码
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[rgba(255,255,255,0.7)]">
                邀请人数
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(167, 87, 255, 0.2)]">
            {leaderboard.map((entry) => (
              <tr
                key={entry.userId}
                className="hover:bg-[var(--wuhu-bg-canvas)]"
              >
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                      entry.rank === 1
                        ? 'bg-yellow-400 text-yellow-900'
                        : entry.rank === 2
                        ? 'bg-gray-300 text-gray-700'
                        : entry.rank === 3
                        ? 'bg-orange-400 text-orange-900'
                        : 'bg-[var(--wuhu-bg-canvas)] text-[rgba(255,255,255,0.7)]'
                    }`}
                  >
                    {entry.rank}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <div className="font-medium text-[white]">
                      {entry.user?.name || '未命名'}
                    </div>
                    <div className="text-sm text-[rgba(255,255,255,0.5)]">
                      {entry.user?.email || '无邮箱'}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <code className="px-2 py-1 bg-[var(--wuhu-bg-canvas)] rounded text-sm">
                    {entry.user?.inviteCode || '-'}
                  </code>
                </td>
                <td className="px-4 py-3">
                  <span className="text-lg font-bold text-blue-600">
                    {entry.inviteCount}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {leaderboard.length === 0 && (
          <div className="text-center py-12 text-[rgba(255,255,255,0.5)]">
            暂无邀请数据
          </div>
        )}
      </div>
    </div>
  )
}
