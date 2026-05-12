'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from '@/i18n/navigation'
import Navbar from '@/components/Navbar'
import { AppIcon } from '@/components/ui/icons'
import { toast } from 'react-hot-toast'
import WuhuMascot from '@/components/WuhuMascot'
import { WuhuCard } from '@/components/ui/wuhu-card'
import { WuhuButton } from '@/components/ui/wuhu-button'
import WuhuEmptyState from '@/components/WuhuEmptyState'

interface RechargePackage {
  id: string
  name: string
  credits: number
  bonusCredits: number
  totalCredits: number
  price: number
  originalPrice?: number
  discount?: number
  isPopular: boolean
  description?: string
}

interface PaymentOrder {
  orderId: string
  orderNo: string
  amount: number
  credits: number
  status: string
  paymentMethod: string
  paymentUrl?: string
  createdAt: string
}

type PaymentMethod = 'alipay' | 'wechat'

export default function RechargePage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const [packages, setPackages] = useState<RechargePackage[]>([])
  const [selectedPackage, setSelectedPackage] = useState<RechargePackage | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('alipay')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [balance, setBalance] = useState({ subscriptionCredits: 0, permanentCredits: 0, frozenCredits: 0 })
  const [recentOrders, setRecentOrders] = useState<PaymentOrder[]>([])

  // 加载套餐和余额
  const loadData = useCallback(async () => {
    if (!session?.user) return

    try {
      const [packagesRes, balanceRes, ordersRes] = await Promise.all([
        fetch('/api/payment/packages'),
        fetch('/api/user/balance'),
        fetch('/api/payment/orders?limit=5'),
      ])

      const packagesData = await packagesRes.json()
      const balanceData = await balanceRes.json()
      const ordersData = await ordersRes.json()

      setPackages(packagesData.packages || [])
      setBalance(balanceData)
      setRecentOrders(ordersData.orders || [])

      // 默认选中第一个套餐
      if (packagesData.packages?.length > 0 && !selectedPackage) {
        setSelectedPackage(packagesData.packages[0])
      }
    } catch (error) {
      console.error('加载数据失败:', error)
      toast.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }, [session, selectedPackage])

  useEffect(() => {
    if (sessionStatus === 'loading') return
    if (!session) {
      router.push({ pathname: '/auth/signin' })
      return
    }
    loadData()
  }, [session, sessionStatus, router, loadData])

  // 创建支付订单
  const handleRecharge = async () => {
    if (!selectedPackage) {
      toast.error('请选择充值套餐')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/payment/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: selectedPackage.id,
          credits: selectedPackage.totalCredits,
          amount: selectedPackage.price,
          paymentMethod,
          description: `充值 ${selectedPackage.name}`,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || '创建订单失败')
      }

      const data = await res.json()
      const order = data.order

      // 打开支付页面
      if (order.paymentUrl) {
        const paymentWindow = window.open(
          order.paymentUrl,
          '_blank',
          'width=600,height=700,scrollbars=yes'
        )

        // 监听支付完成消息
        const messageHandler = (event: MessageEvent) => {
          if (event.data?.type === 'payment_success') {
            toast.success('支付成功！积分已发放')
            loadData() // 刷新余额和订单列表
            window.removeEventListener('message', messageHandler)
          }
        }
        window.addEventListener('message', messageHandler)

        // 轮询订单状态（备选方案）
        const pollInterval = setInterval(async () => {
          try {
            const orderRes = await fetch(`/api/payment/orders/${order.orderId}`)
            if (orderRes.ok) {
              const orderData = await orderRes.json()
              if (orderData.status === 'paid') {
                toast.success('支付成功！积分已发放')
                loadData()
                clearInterval(pollInterval)
                if (paymentWindow && !paymentWindow.closed) {
                  paymentWindow.close()
                }
              }
            }
          } catch (e) {
            // 忽略轮询错误
          }
        }, 2000)

        // 2分钟后停止轮询
        setTimeout(() => clearInterval(pollInterval), 120000)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '创建订单失败')
    } finally {
      setSubmitting(false)
    }
  }

  // 获取状态显示文本
  const getStatusText = (status: string) => {
    const statusMap: Record<string, { text: string; color: string }> = {
      pending: { text: '待支付', color: 'text-yellow-600' },
      paid: { text: '支付成功', color: 'text-green-600' },
      failed: { text: '支付失败', color: 'text-red-600' },
      cancelled: { text: '已取消', color: 'text-gray-500' },
      expired: { text: '已过期', color: 'text-gray-500' },
    }
    return statusMap[status] || { text: status, color: 'text-gray-500' }
  }

  const getPaymentMethodText = (method: string) => {
    const methodMap: Record<string, string> = {
      alipay: '支付宝',
      wechat: '微信支付',
      stripe: 'Stripe',
    }
    return methodMap[method] || method
  }

  if (sessionStatus === 'loading' || !session) {
    return (
      <div className="glass-page flex min-h-screen items-center justify-center">
        <div className="text-[var(--glass-text-secondary)]">加载中...</div>
      </div>
    )
  }

  return (
    <div className="wuhu-page-bg min-h-screen">
      <Navbar />

      <main className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* 左侧 - 套餐选择 */}
          <div className="flex-1">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">
                积分充值
              </h1>
              <p className="text-white/60">
                选择适合您的充值套餐，立即获得积分用于AI创作
              </p>
            </div>

            {/* 欢迎区域 - 带吉祥物 */}
            <WuhuCard glow="purple" className="mb-8 overflow-hidden">
              <div className="flex items-center gap-6 p-2">
                {/* 吉祥物 */}
                <div className="flex-shrink-0">
                  <WuhuMascot expression="happy" size="md" animated={true} />
                </div>

                {/* 余额信息 */}
                <div className="flex-1">
                  <div className="text-lg font-bold text-white mb-1">
                    芜湖起飞！🚀
                  </div>
                  <div className="text-sm text-white/60 mb-3">
                    当前可用积分
                  </div>
                  <div className="text-5xl font-black wuhu-neon-number mb-4">
                    {balance.subscriptionCredits + balance.permanentCredits - balance.frozenCredits}
                  </div>
                  <div className="flex gap-6">
                    <div className="text-sm">
                      <span className="text-white/60">套餐积分：</span>
                      <span className="font-medium text-white">{balance.subscriptionCredits}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-white/60">永久积分：</span>
                      <span className="font-medium text-white">{balance.permanentCredits}</span>
                    </div>
                  </div>
                </div>

                {/* 查看明细按钮 */}
                <button
                  onClick={() => router.push({ pathname: '/profile' })}
                  className="flex-shrink-0 px-5 py-2.5 rounded-xl border border-white/20 text-white/80 hover:text-white hover:border-white/40 transition-all text-sm font-medium"
                >
                  查看明细
                </button>
              </div>
            </WuhuCard>

            {/* 套餐列表 */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-[var(--glass-text-secondary)]">加载中...</div>
              </div>
            ) : packages.length === 0 ? (
              <div className="glass-surface-elevated rounded-2xl p-12 text-center">
                <AppIcon name="package" className="w-16 h-16 mx-auto mb-4 text-[var(--glass-text-tertiary)]" />
                <p className="text-[var(--glass-text-secondary)]">暂无可用充值套餐</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedPackage(pkg)}
                    className={`glass-surface-elevated rounded-2xl p-6 cursor-pointer transition-all duration-200 relative ${
                      selectedPackage?.id === pkg.id
                        ? 'ring-2 ring-blue-500 shadow-lg scale-[1.02]'
                        : 'hover:shadow-md'
                    }`}
                  >
                    {pkg.isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                          🔥 热门推荐
                        </span>
                      </div>
                    )}

                    <div className="text-center">
                      <h3 className="text-lg font-bold text-[var(--glass-text-primary)] mb-2">
                        {pkg.name}
                      </h3>

                      <div className="mb-4">
                        <span className="text-4xl font-bold text-blue-600">¥{pkg.price.toFixed(2)}</span>
                        {pkg.originalPrice && (
                          <span className="text-sm text-[var(--glass-text-tertiary)] line-through ml-2">
                            ¥{pkg.originalPrice.toFixed(2)}
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 text-sm mb-6">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-[var(--glass-text-secondary)]">基础积分：</span>
                          <span className="font-medium text-[var(--glass-text-primary)]">{pkg.credits}</span>
                        </div>
                        {pkg.bonusCredits > 0 && (
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-orange-500 font-medium">🎁 赠送积分：</span>
                            <span className="font-bold text-orange-500">+{pkg.bonusCredits}</span>
                          </div>
                        )}
                        <div className="pt-2 border-t border-[var(--glass-stroke-base)]">
                          <span className="text-lg font-bold text-[var(--glass-text-primary)]">
                            总共 {pkg.totalCredits} 积分
                          </span>
                        </div>
                      </div>

                      {pkg.discount && (
                        <div className="inline-block bg-blue-50 text-blue-600 text-xs font-medium px-2 py-1 rounded">
                          {pkg.discount}折优惠
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 支付方式选择 */}
            {selectedPackage && (
              <div className="glass-surface-elevated rounded-2xl p-6 mt-8">
                <h3 className="text-lg font-bold text-[var(--glass-text-primary)] mb-4">
                  选择支付方式
                </h3>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button
                    onClick={() => setPaymentMethod('alipay')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      paymentMethod === 'alipay'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-[var(--glass-stroke-base)] hover:border-[var(--glass-stroke-strong)]'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-3">
                      <AppIcon name="coins" className="w-8 h-8 text-blue-500" />
                      <div className="text-left">
                        <div className="font-semibold text-[var(--glass-text-primary)]">支付宝</div>
                        <div className="text-xs text-[var(--glass-text-secondary)]">推荐使用</div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('wechat')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      paymentMethod === 'wechat'
                        ? 'border-green-500 bg-green-50'
                        : 'border-[var(--glass-stroke-base)] hover:border-[var(--glass-stroke-strong)]'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-3">
                      <AppIcon name="coins" className="w-8 h-8 text-green-500" />
                      <div className="text-left">
                        <div className="font-semibold text-[var(--glass-text-primary)]">微信支付</div>
                        <div className="text-xs text-[var(--glass-text-secondary)]">便捷安全</div>
                      </div>
                    </div>
                  </button>
                </div>

                {/* 订单摘要 */}
                <div className="bg-[var(--glass-bg-surface)] rounded-xl p-4 mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[var(--glass-text-secondary)]">充值套餐</span>
                    <span className="font-medium text-[var(--glass-text-primary)]">{selectedPackage.name}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[var(--glass-text-secondary)]">获得积分</span>
                    <span className="font-bold text-[var(--glass-text-primary)]">{selectedPackage.totalCredits} 积分</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-[var(--glass-stroke-base)]">
                    <span className="text-[var(--glass-text-secondary)]">应付金额</span>
                    <span className="text-2xl font-bold text-blue-600">¥{selectedPackage.price.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={handleRecharge}
                  disabled={submitting}
                  className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? '创建订单中...' : '立即支付'}
                </button>

                <p className="text-center text-xs text-[var(--glass-text-tertiary)] mt-4">
                  支付成功后积分将自动发放到您的账户
                </p>
              </div>
            )}
          </div>

          {/* 右侧 - 订单记录 */}
          <div className="w-80 flex-shrink-0">
            <div className="glass-surface-elevated rounded-2xl p-6 sticky top-8">
              <h3 className="text-lg font-bold text-[var(--glass-text-primary)] mb-4">
                最近充值记录
              </h3>

              {recentOrders.length === 0 ? (
                <div className="text-center py-8">
                  <AppIcon name="receipt" className="w-12 h-12 mx-auto mb-3 text-[var(--glass-text-tertiary)]" />
                  <p className="text-sm text-[var(--glass-text-secondary)]">暂无充值记录</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentOrders.map((order) => {
                    const statusInfo = getStatusText(order.status)
                    return (
                      <div
                        key={order.orderId}
                        className="bg-[var(--glass-bg-surface)] rounded-xl p-4"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-medium text-[var(--glass-text-primary)]">
                              {order.credits} 积分
                            </div>
                            <div className="text-xs text-[var(--glass-text-tertiary)]">
                              {order.orderNo}
                            </div>
                          </div>
                          <div className={`text-xs font-medium ${statusInfo.color}`}>
                            {statusInfo.text}
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-[var(--glass-text-secondary)]">
                            {getPaymentMethodText(order.paymentMethod)}
                          </span>
                          <span className="font-bold text-[var(--glass-text-primary)]">
                            ¥{order.amount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <button
                onClick={() => router.push({ pathname: '/profile' })}
                className="w-full mt-6 glass-btn-base glass-btn-tone-default py-3 text-sm"
              >
                查看全部记录
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
