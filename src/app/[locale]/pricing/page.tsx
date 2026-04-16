'use client'

import { useState, useEffect } from 'react'
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

interface FAQItem {
  question: string
  answer: string
}

const FAQ_DATA: FAQItem[] = [
  {
    question: '积分如何使用？',
    answer: '积分可用于图片生成、视频生成、文本处理等所有AI功能。不同功能消耗的积分数量不同，系统会在执行任务前显示预计消耗的积分。',
  },
  {
    question: '套餐积分每月重置吗？',
    answer: '是的，套餐包含的积分每月重置。未使用的积分不会累积到下个月，建议在当月内使用完毕。',
  },
  {
    question: '可以随时升级或降级套餐吗？',
    answer: '可以随时升级套餐，升级后立即生效。降级将在当前计费周期结束后生效。',
  },
  {
    question: '支持哪些支付方式？',
    answer: '目前支持支付宝、微信支付和银行卡转账。企业版客户还支持对公转账和开具增值税专用发票。',
  },
  {
    question: '试用期结束后会自动扣费吗？',
    answer: '不会。试用期结束后，您的账户将自动切换到免费版，不会产生任何费用。如需继续使用高级功能，请手动订阅套餐。',
  },
  {
    question: '企业版可以定制套餐内容吗？',
    answer: '可以。企业版客户可以根据团队需求定制套餐内容，包括积分数量、并发任务数、专属模型等。请联系我们的商务团队获取详细方案。',
  },
]

const COMPARISON_FEATURES = [
  { key: 'monthlyCredits', label: '月度积分', format: (v: number, isEnterprise: boolean) => isEnterprise ? '无限' : `${v}` },
  { key: 'maxVideoSeconds', label: '视频时长/月', format: (v: number, isEnterprise: boolean) => isEnterprise ? '无限' : `${v} 秒` },
  { key: 'maxConcurrency', label: '并发任务数', format: (v: number) => `${v} 个` },
  { key: 'trialDays', label: '试用期', format: (v: number) => v > 0 ? `${v} 天` : '无' },
]

export default function PricingPage() {
  const tc = useTranslations('common')
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasingPlanId, setPurchasingPlanId] = useState<string | null>(null)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [openFAQ, setOpenFAQ] = useState<number | null>(null)

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
    } catch {
      toast.error('获取套餐列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handlePurchase = async (planId: string) => {
    setPurchasingPlanId(planId)
    try {
      const res = await fetch('/api/user/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, billingCycle }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || '订阅失败')
      }
      toast.success('订阅成功！')
      // 重新获取套餐信息
      await fetchPlans()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '订阅失败，请稍后重试')
    } finally {
      setPurchasingPlanId(null)
    }
  }

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index)
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

  const activePlans = plans.filter(p => p.isActive)

  return (
    <div className="glass-page min-h-screen">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-16">
        {/* 标题区域 */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-[var(--glass-text-primary)] mb-6">
            选择适合您的套餐
          </h1>
          <p className="text-xl text-[var(--glass-text-secondary)] max-w-2xl mx-auto">
            灵活的定价方案，满足从个人创作者到企业团队的所有需求
          </p>
        </div>

        {/* 计费周期切换 */}
        <div className="flex justify-center mb-16">
          <div className="inline-flex bg-[var(--glass-bg-surface)] rounded-xl p-1.5 border border-[var(--glass-stroke-soft)] shadow-sm">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-8 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                billingCycle === 'monthly'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                  : 'text-[var(--glass-text-secondary)] hover:text-[var(--glass-text-primary)] hover:bg-[var(--glass-bg-surface-strong)]'
              }`}
            >
              月付
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-8 py-3 rounded-lg text-sm font-semibold transition-all duration-200 relative ${
                billingCycle === 'yearly'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                  : 'text-[var(--glass-text-secondary)] hover:text-[var(--glass-text-primary)] hover:bg-[var(--glass-bg-surface-strong)]'
              }`}
            >
              年付
              <span className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                省20%
              </span>
            </button>
          </div>
        </div>

        {/* 套餐卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-24">
          {activePlans.map((plan, index) => {
            const isEnterprise = plan.monthlyPrice < 0
            const hasYearly = plan.yearlyPrice !== null && plan.yearlyPrice! > 0

            let priceDisplay = ''
            let priceNote = ''

            if (isEnterprise) {
              priceDisplay = '联系商务'
              priceNote = ''
            } else if (billingCycle === 'monthly') {
              priceDisplay = `¥${Number(plan.monthlyPrice).toFixed(2)}`
              priceNote = '/月'
            } else {
              if (hasYearly) {
                priceDisplay = `¥${Number(plan.yearlyPrice).toFixed(2)}`
                priceNote = '/年'
              } else {
                priceDisplay = `¥${(Number(plan.monthlyPrice) * 12).toFixed(2)}`
                priceNote = '/年 (无年付优惠)'
              }
            }

            const isPopular = plan.id === 'pro'

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-px transition-all duration-300 hover:scale-[1.02] ${
                  isPopular
                    ? 'bg-gradient-to-b from-blue-400 via-blue-500 to-blue-600 shadow-xl shadow-blue-200'
                    : 'bg-[var(--glass-stroke-soft)] hover:shadow-lg'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-md">
                      最受欢迎
                    </span>
                  </div>
                )}

                <div className={`h-full rounded-2xl p-6 ${
                  isPopular
                    ? 'bg-gradient-to-b from-white to-blue-50'
                    : 'bg-[var(--glass-bg-surface)]'
                }`}>
                  {/* 套餐名称 */}
                  <div className="mb-6">
                    <h3 className={`text-xl font-bold mb-2 ${
                      isPopular ? 'text-blue-600' : 'text-[var(--glass-text-primary)]'
                    }`}>
                      {plan.name}
                    </h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-[var(--glass-text-primary)]">
                        {priceDisplay}
                      </span>
                      {priceNote && (
                        <span className="text-sm text-[var(--glass-text-tertiary)]">{priceNote}</span>
                      )}
                    </div>
                  </div>

                  {/* 套餐权益 */}
                  <div className="space-y-4 mb-8">
                    {!isEnterprise && (
                      <>
                        <div className="flex items-center gap-3 text-sm">
                          <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                            <AppIcon name="coins" className="w-4 h-4 text-yellow-600" />
                          </div>
                          <span className="text-[var(--glass-text-secondary)]">{plan.monthlyCredits} 积分/月</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <AppIcon name="video" className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="text-[var(--glass-text-secondary)]">{plan.maxVideoSeconds} 秒视频时长</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                            <AppIcon name="package" className="w-4 h-4 text-green-600" />
                          </div>
                          <span className="text-[var(--glass-text-secondary)]">{plan.maxConcurrency} 个并发任务</span>
                        </div>
                        {plan.trialDays > 0 && (
                          <div className="flex items-center gap-3 text-sm">
                            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                              <AppIcon name="sparkles" className="w-4 h-4 text-purple-600" />
                            </div>
                            <span className="text-[var(--glass-text-secondary)]">{plan.trialDays} 天试用期</span>
                          </div>
                        )}
                      </>
                    )}
                    {isEnterprise && (
                      <>
                        <div className="flex items-center gap-3 text-sm">
                          <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                            <AppIcon name="coins" className="w-4 h-4 text-yellow-600" />
                          </div>
                          <span className="text-[var(--glass-text-secondary)]">无限积分</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <AppIcon name="video" className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="text-[var(--glass-text-secondary)]">无限视频时长</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                            <AppIcon name="bolt" className="w-4 h-4 text-green-600" />
                          </div>
                          <span className="text-[var(--glass-text-secondary)]">{plan.maxConcurrency} 个并发任务</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                            <AppIcon name="cpu" className="w-4 h-4 text-purple-600" />
                          </div>
                          <span className="text-[var(--glass-text-secondary)]">API 访问权限</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <AppIcon name="bookmark" className="w-4 h-4 text-indigo-600" />
                          </div>
                          <span className="text-[var(--glass-text-secondary)]">专属技术支持</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* 购买按钮 */}
                  <button
                    onClick={() => handlePurchase(plan.id)}
                    disabled={purchasingPlanId === plan.id}
                    className={`w-full py-3.5 rounded-xl font-semibold transition-all duration-200 ${
                      purchasingPlanId === plan.id ? 'opacity-70 cursor-not-allowed' : ''
                    } ${
                      isEnterprise
                        ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 shadow-md hover:shadow-lg'
                        : isPopular
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-md hover:shadow-lg'
                        : 'bg-[var(--glass-bg-canvas)] text-[var(--glass-text-primary)] border-2 border-[var(--glass-stroke-base)] hover:bg-[var(--glass-bg-surface-strong)] hover:border-[var(--glass-stroke-strong)]'
                    }`}
                  >
                    {purchasingPlanId === plan.id ? '订阅中...' : isEnterprise ? '联系我们' : '立即订阅'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* 功能对比表 */}
        <div className="mb-24">
          <h2 className="text-3xl font-bold text-center text-[var(--glass-text-primary)] mb-12">
            功能对比
          </h2>
          <div className="bg-[var(--glass-bg-surface)] rounded-2xl border border-[var(--glass-stroke-soft)] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[var(--glass-bg-surface-strong)] border-b border-[var(--glass-stroke-soft)]">
                    <th className="text-left py-5 px-6 font-semibold text-[var(--glass-text-secondary)]">功能</th>
                    {activePlans.map(plan => (
                      <th key={plan.id} className="py-5 px-6 text-center font-semibold text-[var(--glass-text-primary)]">
                        {plan.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_FEATURES.map((feature, idx) => (
                    <tr key={feature.key} className={`border-b border-[var(--glass-stroke-soft)] ${
                      idx % 2 === 0 ? 'bg-transparent' : 'bg-[var(--glass-bg-canvas)]/30'
                    }`}>
                      <td className="py-4 px-6 text-[var(--glass-text-secondary)] font-medium">
                        {feature.label}
                      </td>
                      {activePlans.map(plan => {
                        const isEnterprise = plan.monthlyPrice < 0
                        return (
                          <td key={plan.id} className="py-4 px-6 text-center text-[var(--glass-text-primary)]">
                            {feature.format(
                              plan[feature.key as keyof Plan] as number,
                              isEnterprise
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                  {/* 额外功能行 */}
                  <tr className="border-b border-[var(--glass-stroke-soft)]">
                    <td className="py-4 px-6 text-[var(--glass-text-secondary)] font-medium">AI模型访问</td>
                    {activePlans.map(plan => (
                      <td key={plan.id} className="py-4 px-6 text-center">
                        {plan.id === 'free' ? (
                          <span className="text-[var(--glass-text-tertiary)]">基础模型</span>
                        ) : plan.id === 'enterprise' ? (
                          <span className="text-green-600 font-medium">全部模型 + 专属</span>
                        ) : (
                          <span className="text-green-600 font-medium">全部模型</span>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-[var(--glass-stroke-soft)]">
                    <td className="py-4 px-6 text-[var(--glass-text-secondary)] font-medium">技术支持</td>
                    {activePlans.map(plan => (
                      <td key={plan.id} className="py-4 px-6 text-center">
                        {plan.id === 'enterprise' ? (
                          <span className="text-green-600 font-medium">专属客服</span>
                        ) : plan.id === 'free' ? (
                          <span className="text-[var(--glass-text-tertiary)]">社区支持</span>
                        ) : (
                          <span>标准支持</span>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-4 px-6 text-[var(--glass-text-secondary)] font-medium">API访问</td>
                    {activePlans.map(plan => (
                      <td key={plan.id} className="py-4 px-6 text-center">
                        {plan.id === 'enterprise' ? (
                          <AppIcon name="check" className="w-5 h-5 text-green-600 inline" />
                        ) : (
                          <AppIcon name="close" className="w-5 h-5 text-[var(--glass-text-tertiary)] inline" />
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* FAQ 区域 */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-[var(--glass-text-primary)] mb-12">
            常见问题
          </h2>
          <div className="max-w-3xl mx-auto space-y-4">
            {FAQ_DATA.map((item, index) => (
              <div
                key={index}
                className="bg-[var(--glass-bg-surface)] rounded-xl border border-[var(--glass-stroke-soft)] overflow-hidden transition-all duration-200 hover:shadow-md"
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full flex items-center justify-between py-5 px-6 text-left"
                >
                  <span className="font-semibold text-[var(--glass-text-primary)] pr-4">
                    {item.question}
                  </span>
                  <AppIcon
                    name={openFAQ === index ? 'chevronUp' : 'chevronDown'}
                    className="w-5 h-5 text-[var(--glass-text-secondary)] flex-shrink-0 transition-transform duration-200"
                  />
                </button>
                {openFAQ === index && (
                  <div className="px-6 pb-5 text-[var(--glass-text-secondary)] leading-relaxed">
                    {item.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 底部说明 */}
        <div className="mt-16 text-center">
          <p className="text-sm text-[var(--glass-text-tertiary)] mb-2">* 所有套餐均包含基础 AI 模型访问权限</p>
          <p className="text-sm text-[var(--glass-text-tertiary)] mb-2">* 积分可用于图片生成、视频生成、文本处理等所有功能</p>
          <p className="text-sm text-[var(--glass-text-tertiary)]">* 套餐积分每月重置，未使用积分不累积到下月</p>
        </div>
      </main>
    </div>
  )
}
