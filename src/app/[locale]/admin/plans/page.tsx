'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'react-hot-toast'

interface Plan {
  id: string
  name: string
  monthlyPrice: number
  yearlyPrice: number | null
  trialDays: number
  monthlyCredits: number
  maxVideoSeconds: number
  maxConcurrency: number
  features: Record<string, unknown>
  isActive: boolean
  sortOrder: number
}

export default function PlansPage() {
  const t = useTranslations('admin')
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPlan, setEditingPlan] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Plan>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/admin/plans')
      if (!res.ok) throw new Error('获取失败')
      const data = await res.json()
      setPlans(data.plans || [])
    } catch (error) {
      toast.error('获取套餐列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan.id)
    setEditForm({ ...plan })
  }

  const handleSave = async () => {
    if (!editingPlan) return
    
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/plans/${editingPlan}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) throw new Error('保存失败')
      
      toast.success('保存成功')
      setEditingPlan(null)
      setEditForm({})
      fetchPlans()
    } catch (error) {
      toast.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditingPlan(null)
    setEditForm({})
  }

  const toggleActive = async (planId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      })
      if (!res.ok) throw new Error('更新失败')
      
      toast.success('状态已更新')
      fetchPlans()
    } catch (error) {
      toast.error('更新失败')
    }
  }

  if (loading) {
    return <div className="text-[var(--glass-text-secondary)]">加载中...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[var(--glass-text-primary)]">
          套餐管理
        </h2>
      </div>

      <div className="space-y-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="bg-[var(--glass-bg-surface)] rounded-lg border border-[var(--glass-stroke-soft)] p-6"
          >
            {editingPlan === plan.id ? (
              /* 编辑模式 */
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[var(--glass-text-primary)]">
                  编辑套餐: {plan.id}
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--glass-text-secondary)] mb-1">
                      套餐名称
                    </label>
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-[var(--glass-stroke-base)] rounded bg-[var(--glass-bg-canvas)] text-[var(--glass-text-primary)]"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[var(--glass-text-secondary)] mb-1">
                      月付价格 (¥)
                    </label>
                    <input
                      type="number"
                      value={editForm.monthlyPrice ?? 0}
                      onChange={(e) => setEditForm({ ...editForm, monthlyPrice: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-[var(--glass-stroke-base)] rounded bg-[var(--glass-bg-canvas)] text-[var(--glass-text-primary)]"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[var(--glass-text-secondary)] mb-1">
                      年付价格 (¥, 留空表示无年付)
                    </label>
                    <input
                      type="number"
                      value={editForm.yearlyPrice ?? ''}
                      onChange={(e) => setEditForm({ ...editForm, yearlyPrice: e.target.value ? parseFloat(e.target.value) : null })}
                      className="w-full px-3 py-2 border border-[var(--glass-stroke-base)] rounded bg-[var(--glass-bg-canvas)] text-[var(--glass-text-primary)]"
                      placeholder="可选"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[var(--glass-text-secondary)] mb-1">
                      每月积分
                    </label>
                    <input
                      type="number"
                      value={editForm.monthlyCredits ?? 0}
                      onChange={(e) => setEditForm({ ...editForm, monthlyCredits: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-[var(--glass-stroke-base)] rounded bg-[var(--glass-bg-canvas)] text-[var(--glass-text-primary)]"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[var(--glass-text-secondary)] mb-1">
                      视频时长上限 (秒)
                    </label>
                    <input
                      type="number"
                      value={editForm.maxVideoSeconds ?? 0}
                      onChange={(e) => setEditForm({ ...editForm, maxVideoSeconds: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-[var(--glass-stroke-base)] rounded bg-[var(--glass-bg-canvas)] text-[var(--glass-text-primary)]"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[var(--glass-text-secondary)] mb-1">
                      并发任务数
                    </label>
                    <input
                      type="number"
                      value={editForm.maxConcurrency ?? 0}
                      onChange={(e) => setEditForm({ ...editForm, maxConcurrency: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-[var(--glass-stroke-base)] rounded bg-[var(--glass-bg-canvas)] text-[var(--glass-text-primary)]"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[var(--glass-text-secondary)] mb-1">
                      试用天数 (0 表示无试用)
                    </label>
                    <input
                      type="number"
                      value={editForm.trialDays ?? 0}
                      onChange={(e) => setEditForm({ ...editForm, trialDays: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-[var(--glass-stroke-base)] rounded bg-[var(--glass-bg-canvas)] text-[var(--glass-text-primary)]"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[var(--glass-text-secondary)] mb-1">
                      排序顺序
                    </label>
                    <input
                      type="number"
                      value={editForm.sortOrder ?? 0}
                      onChange={(e) => setEditForm({ ...editForm, sortOrder: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-[var(--glass-stroke-base)] rounded bg-[var(--glass-bg-canvas)] text-[var(--glass-text-primary)]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`active-${plan.id}`}
                    checked={editForm.isActive ?? false}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor={`active-${plan.id}`} className="text-sm text-[var(--glass-text-secondary)]">
                    启用此套餐
                  </label>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                  >
                    {saving ? '保存中...' : '保存'}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : (
              /* 查看模式 */
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-[var(--glass-text-primary)]">
                        {plan.name}
                      </h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        plan.isActive 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {plan.isActive ? '启用' : '停用'}
                      </span>
                      {plan.id === 'pro' && (
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                          最受欢迎
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--glass-text-tertiary)] mt-1">
                      ID: {plan.id} | 排序: {plan.sortOrder}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleActive(plan.id, plan.isActive)}
                      className={`px-3 py-1 text-sm rounded ${
                        plan.isActive
                          ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {plan.isActive ? '停用' : '启用'}
                    </button>
                    <button
                      onClick={() => handleEdit(plan)}
                      className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      编辑
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="bg-[var(--glass-bg-canvas)] rounded p-3">
                    <div className="text-[var(--glass-text-tertiary)]">月付价格</div>
                    <div className="text-lg font-semibold text-[var(--glass-text-primary)] mt-1">
                      {plan.monthlyPrice < 0 ? '联系商务' : `¥${plan.monthlyPrice}`}
                    </div>
                  </div>
                  <div className="bg-[var(--glass-bg-canvas)] rounded p-3">
                    <div className="text-[var(--glass-text-tertiary)]">年付价格</div>
                    <div className="text-lg font-semibold text-[var(--glass-text-primary)] mt-1">
                      {plan.yearlyPrice === null ? '无' : plan.yearlyPrice < 0 ? '联系商务' : `¥${plan.yearlyPrice}`}
                    </div>
                  </div>
                  <div className="bg-[var(--glass-bg-canvas)] rounded p-3">
                    <div className="text-[var(--glass-text-tertiary)]">每月积分</div>
                    <div className="text-lg font-semibold text-[var(--glass-text-primary)] mt-1">
                      {plan.monthlyCredits}
                    </div>
                  </div>
                  <div className="bg-[var(--glass-bg-canvas)] rounded p-3">
                    <div className="text-[var(--glass-text-tertiary)]">视频时长</div>
                    <div className="text-lg font-semibold text-[var(--glass-text-primary)] mt-1">
                      {plan.maxVideoSeconds} 秒
                    </div>
                  </div>
                  <div className="bg-[var(--glass-bg-canvas)] rounded p-3">
                    <div className="text-[var(--glass-text-tertiary)]">并发任务</div>
                    <div className="text-lg font-semibold text-[var(--glass-text-primary)] mt-1">
                      {plan.maxConcurrency}
                    </div>
                  </div>
                  <div className="bg-[var(--glass-bg-canvas)] rounded p-3">
                    <div className="text-[var(--glass-text-tertiary)]">试用期</div>
                    <div className="text-lg font-semibold text-[var(--glass-text-primary)] mt-1">
                      {plan.trialDays > 0 ? `${plan.trialDays} 天` : '无'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
