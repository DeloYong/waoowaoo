'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'react-hot-toast'

interface User {
  id: string
  name: string | null
  email: string | null
  createdAt: string
  balance: {
    subscriptionCredits: number
    permanentCredits: number
    frozenCredits: number
  } | null
  subscription: {
    planId: string
    status: string
    currentPeriodEnd: string
  } | null
  isAdmin: boolean
}

interface Plan {
  id: string
  name: string
  monthlyCredits: number
}

export default function UsersPage() {
  const t = useTranslations('admin')
  const [users, setUsers] = useState<User[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [grantCredits, setGrantCredits] = useState(0)
  const [grantReason, setGrantReason] = useState('')
  const [isPermanent, setIsPermanent] = useState(true)
  const [assignPlanId, setAssignPlanId] = useState('')
  const [assignBillingCycle, setAssignBillingCycle] = useState('monthly')
  const [showGrantModal, setShowGrantModal] = useState(false)
  const [showPlanModal, setShowPlanModal] = useState(false)

  useEffect(() => {
    fetchUsers()
    fetchPlans()
  }, [page, search])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        skip: String((page - 1) * 20),
        take: '20',
      })
      if (search) params.set('search', search)

      const res = await fetch(`/api/admin/users?${params}`)
      if (!res.ok) throw new Error('获取失败')
      const data = await res.json()
      setUsers(data.users || [])
      setTotal(data.total || 0)
    } catch (error) {
      toast.error('获取用户列表失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/user/subscription')
      if (res.ok) {
        const data = await res.json()
        setPlans(data.plans || [])
      }
    } catch (error) {
      // 静默失败
    }
  }

  const handleGrantCredits = async () => {
    if (!selectedUser || grantCredits <= 0) return

    try {
      const res = await fetch(`/api/admin/users/${selectedUser}/grant-credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credits: grantCredits,
          reason: grantReason || '管理员手动充值',
          isPermanent,
        }),
      })
      if (!res.ok) throw new Error('充值失败')
      toast.success('充值成功')
      setShowGrantModal(false)
      fetchUsers()
    } catch (error) {
      toast.error('充值失败')
    }
  }

  const handleAssignPlan = async () => {
    if (!selectedUser || !assignPlanId) return

    try {
      const res = await fetch(`/api/admin/users/${selectedUser}/assign-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: assignPlanId,
          billingCycle: assignBillingCycle,
        }),
      })
      if (!res.ok) throw new Error('分配失败')
      toast.success('分配套餐成功')
      setShowPlanModal(false)
      fetchUsers()
    } catch (error) {
      toast.error('分配套餐失败')
    }
  }

  const openGrantModal = (userId: string) => {
    setSelectedUser(userId)
    setGrantCredits(0)
    setGrantReason('')
    setIsPermanent(true)
    setShowGrantModal(true)
  }

  const openPlanModal = (userId: string) => {
    setSelectedUser(userId)
    setAssignPlanId('')
    setAssignBillingCycle('monthly')
    setShowPlanModal(true)
  }

  if (loading) {
    return <div className="text-[rgba(255,255,255,0.7)]">加载中...</div>
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-[white] mb-6">
        用户管理
      </h2>

      {/* 搜索 */}
      <div className="mb-6 flex gap-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索用户名或邮箱..."
          className="flex-1 px-4 py-2 border border-[rgba(167, 87, 255, 0.2)] rounded bg-[var(--wuhu-bg-canvas)]"
          onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
        />
        <button
          onClick={fetchUsers}
          className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          搜索
        </button>
      </div>

      {/* 用户列表 */}
      <div className="bg-[var(--wuhu-bg-surface)] rounded-lg border border-[rgba(167, 87, 255, 0.2)] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[var(--wuhu-bg-canvas)]">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[rgba(255,255,255,0.7)]">
                用户
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[rgba(255,255,255,0.7)]">
                订阅状态
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[rgba(255,255,255,0.7)]">
                积分余额
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-[rgba(255,255,255,0.7)]">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(167, 87, 255, 0.2)]">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-[var(--wuhu-bg-canvas)]">
                <td className="px-4 py-3">
                  <div>
                    <div className="font-medium text-[white]">
                      {user.name || '未命名'}
                    </div>
                    <div className="text-sm text-[rgba(255,255,255,0.5)]">
                      {user.email || '无邮箱'}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {user.subscription ? (
                    <div>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                        {user.subscription.planId}
                      </span>
                      <div className="text-xs text-[rgba(255,255,255,0.5)] mt-1">
                        状态: {user.subscription.status}
                      </div>
                    </div>
                  ) : (
                    <span className="text-[rgba(255,255,255,0.5)]">无订阅</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {user.balance ? (
                    <div className="text-sm">
                      <div>套餐积分: {user.balance.subscriptionCredits}</div>
                      <div>永久积分: {user.balance.permanentCredits}</div>
                      {user.balance.frozenCredits > 0 && (
                        <div className="text-orange-600">冻结: {user.balance.frozenCredits}</div>
                      )}
                    </div>
                  ) : (
                    <span className="text-[rgba(255,255,255,0.5)]">0</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openGrantModal(user.id)}
                      className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                    >
                      充值
                    </button>
                    <button
                      onClick={() => openPlanModal(user.id)}
                      className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                    >
                      分配套餐
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <div className="mt-6 flex justify-center gap-2">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-4 py-2 bg-[var(--wuhu-bg-surface)] border border-[rgba(167, 87, 255, 0.2)] rounded disabled:opacity-50"
        >
          上一页
        </button>
        <span className="px-4 py-2 text-[rgba(255,255,255,0.7)]">
          第 {page} 页 / 共 {Math.ceil(total / 20)} 页
        </span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={page >= Math.ceil(total / 20)}
          className="px-4 py-2 bg-[var(--wuhu-bg-surface)] border border-[rgba(167, 87, 255, 0.2)] rounded disabled:opacity-50"
        >
          下一页
        </button>
      </div>

      {/* 充值弹窗 */}
      {showGrantModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--wuhu-bg-surface)] rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-[white] mb-4">
              手动充值积分
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[rgba(255,255,255,0.7)] mb-2">
                  积分数量
                </label>
                <input
                  type="number"
                  value={grantCredits}
                  onChange={(e) => setGrantCredits(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-[rgba(167, 87, 255, 0.2)] rounded"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm text-[rgba(255,255,255,0.7)] mb-2">
                  原因
                </label>
                <input
                  type="text"
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  placeholder="管理员手动充值"
                  className="w-full px-4 py-2 border border-[rgba(167, 87, 255, 0.2)] rounded"
                />
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isPermanent}
                  onChange={(e) => setIsPermanent(e.target.checked)}
                />
                <span className="text-sm text-[rgba(255,255,255,0.7)]">永久积分</span>
              </label>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleGrantCredits}
                disabled={grantCredits <= 0}
                className="flex-1 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
              >
                确认充值
              </button>
              <button
                onClick={() => setShowGrantModal(false)}
                className="flex-1 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 分配套餐弹窗 */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--wuhu-bg-surface)] rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-[white] mb-4">
              分配订阅套餐
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[rgba(255,255,255,0.7)] mb-2">
                  套餐
                </label>
                <select
                  value={assignPlanId}
                  onChange={(e) => setAssignPlanId(e.target.value)}
                  className="w-full px-4 py-2 border border-[rgba(167, 87, 255, 0.2)] rounded"
                >
                  <option value="">选择套餐...</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} ({plan.monthlyCredits} 积分)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-[rgba(255,255,255,0.7)] mb-2">
                  计费周期
                </label>
                <select
                  value={assignBillingCycle}
                  onChange={(e) => setAssignBillingCycle(e.target.value)}
                  className="w-full px-4 py-2 border border-[rgba(167, 87, 255, 0.2)] rounded"
                >
                  <option value="monthly">月付</option>
                  <option value="yearly">年付</option>
                  <option value="trial">试用</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleAssignPlan}
                disabled={!assignPlanId}
                className="flex-1 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                确认分配
              </button>
              <button
                onClick={() => setShowPlanModal(false)}
                className="flex-1 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
