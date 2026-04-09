'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import Navbar from '@/components/Navbar'
import { AppIcon } from '@/components/ui/icons'
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
}

export default function PricingPage() {
  const { data: session } = useSession()
  const tc = useTranslations('common')
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/user/subscription')
      if (res.ok) {
        const data = await res.json()
        setPlans(data.plans || [])
      }
    } catch (error) {
      toast.error('获取套餐列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handlePurchase = (planId: string) => {
    toast('购买功能即将开放', { icon: '🚧' })
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

      <main className="max-w-7xl mx-auto px-6 py-16">
        {/* 标题 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[var(--glass-text-primary)] mb-4">
            选择适合您的套餐
          </h1>
          <p className="text-lg text-[var(--glass-text-secondary)]">
            灵活的定价方案，满足从个人创作者到企业团队的所有需求
          </p>
        </div>

        {/* 计费周期切换 */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex bg-[var(--glass-bg-surface)] rounded-lg p-1 border border-[var(--glass-stroke-soft)]">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === 'monthly'
                  ? 'bg-blue-500 text-white'
                  : 'text-[var(--glass-text-secondary)] hover:text-[var(--glass-text-primary)]'
              }`}
            >
              月付
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === 'yearly'
                  ? 'bg-blue-500 text-white'
                  : 'text-[var(--glass-text-secondary)] hover:text-[var(--glass-text-primary)]'
              }`}
            >
              年付
              <span className="ml-1 text-xs text-green-600">省20%</span>
            </button>
          </div>
        </div>

        {/* 套餐卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.filter(p => p.isActive).map((plan) => {
            const isEnterprise = plan.monthlyPrice < 0
            const hasYearly = plan.yearlyPrice !== null && plan.yearlyPrice! > 0

            // 计算价格 - 格式化小数
            let priceDisplay = ''
            let priceNote = ''

            if (isEnterprise) {
              priceDisplay = '联系商务'
              priceNote = ''
            } else if (billingCycle === 'monthly') {
              priceDisplay = `¥${Number(plan.monthlyPrice).toFixed(2)}`
              priceNote = '/月'
            } else {
              // 年付
              if (hasYearly) {
                priceDisplay = `¥${Number(plan.yearlyPrice).toFixed(2)}`
                priceNote = '/年'
              } else {
                // 没有年付选项
                priceDisplay = `¥${(Number(plan.monthlyPrice) * 12).toFixed(2)}`
                priceNote = '/年 (无年付优惠)'
              }
            }

            const isPopular = plan.id === 'pro'

            return (
              <div
                key={plan.id}
                className={`relative bg-[var(--glass-bg-surface)] rounded-2xl border-2 p-6 transition-all hover:shadow-lg ${
                  isPopular
                    ? 'border-blue-500 shadow-blue-100'
                    : 'border-[var(--glass-stroke-soft)]'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                      最受欢迎
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-bold text-[var(--glass-text-primary)] mb-2">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-[var(--glass-text-primary)]">
                      {priceDisplay}
                    </span>
                    {priceNote && (
                      <span className="text-sm text-[var(--glass-text-tertiary)]">{priceNote}</span>
                    )}
                  </div>
                </div>

                {/* 套餐权益 */}
                <div className="space-y-3 mb-6">
                  {!isEnterprise && (
                    <>
                      <div className="flex items-center gap-2 text-sm">
                        <AppIcon name="coins" className="w-4 h-4 text-yellow-600" />
                        <span>{plan.monthlyCredits} 积分/月</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <AppIcon name="video" className="w-4 h-4 text-blue-600" />
                        <span>{plan.maxVideoSeconds} 秒视频时长</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <AppIcon name="package" className="w-4 h-4 text-green-600" />
                        <span>{plan.maxConcurrency} 个并发任务</span>
                      </div>
                      {plan.trialDays > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <AppIcon name="sparkles" className="w-4 h-4 text-purple-600" />
                          <span>{plan.trialDays} 天试用期</span>
                        </div>
                      )}
                    </>
                  )}
                  {isEnterprise && (
                    <>
                      <div className="flex items-center gap-2 text-sm">
                        <AppIcon name="coins" className="w-4 h-4 text-yellow-600" />
                        <span>无限积分</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <AppIcon name="video" className="w-4 h-4 text-blue-600" />
                        <span>无限视频时长</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <AppIcon name="bolt" className="w-4 h-4 text-green-600" />
                        <span>{plan.maxConcurrency} 个并发任务</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <AppIcon name="cpu" className="w-4 h-4 text-purple-600" />
                        <span>API 访问权限</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <AppIcon name="bookmark" className="w-4 h-4 text-indigo-600" />
                        <span>专属技术支持</span>
                      </div>
                    </>
                  )}
                </div>

                {/* 购买按钮 */}
                <button
                  onClick={() => handlePurchase(plan.id)}
                  className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                    isEnterprise
                      ? 'bg-purple-500 text-white hover:bg-purple-600'
                      : isPopular
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-[var(--glass-bg-canvas)] text-[var(--glass-text-primary)] border border-[var(--glass-stroke-base)] hover:bg-[var(--glass-bg-surface-strong)]'
                  }`}
                >
                  {isEnterprise ? '联系我们' : '立即订阅'}
                </button>
              </div>
            )
          })}
        </div>

        {/* 说明 */}
        <div className="mt-16 text-center text-sm text-[var(--glass-text-tertiary)]">
          <p>* 所有套餐均包含基础 AI 模型访问权限</p>
          <p className="mt-1">* 积分可用于图片生成、视频生成、文本处理等所有功能</p>
          <p className="mt-1">* 套餐积分每月重置，未使用积分不累积到下月</p>
        </div>
      </main>
    </div>
  )
}
