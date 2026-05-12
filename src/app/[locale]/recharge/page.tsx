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
      pending: { text: '待支付', color: 'text-yellow-400' },
      paid: { text: '支付成功', color: 'text-green-400' },
      failed: { text: '支付失败', color: 'text-red-400' },
      cancelled: { text: '已取消', color: 'text-white/50' },
      expired: { text: '已过期', color: 'text-white/50' },
    }
    return statusMap[status] || { text: status, color: 'text-white/50' }
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
                <div className="text-white/60">加载中...</div>
              </div>
            ) : packages.length === 0 ? (
              <WuhuEmptyState
                title="暂无可用充值套餐"
                expression="thinking"
              />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedPackage(pkg)}
                      className={`relative cursor-pointer transition-all duration-300 ${selectedPackage?.id === pkg.id ? 'scale-[1.02]' : 'hover:scale-[1.01]'}`}
                    >
                      <WuhuCard
                        glow={selectedPackage?.id === pkg.id ? 'pink' : 'purple'}
                        className={`p-6 h-full ${selectedPackage?.id === pkg.id ? 'wuhu-package-selected' : ''}`}
                      >
                        {pkg.isPopular && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                            <span className="wuhu-tag-popular text-white text-xs font-bold px-3 py-1 rounded-full">
                              🔥 热门推荐
                            </span>
                          </div>
                        )}

                        <div className="text-center">
                          <h3 className="text-lg font-bold text-white mb-2">
                            {pkg.name}
                          </h3>

                          <div className="mb-4">
                            <span className="text-4xl font-black wuhu-neon-number">¥{pkg.price.toFixed(2)}</span>
                            {pkg.originalPrice && (
                              <span className="text-sm text-white/40 line-through ml-2">
                                ¥{pkg.originalPrice.toFixed(2)}
                              </span>
                            )}
                          </div>

                          <div className="space-y-2 text-sm mb-6">
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-white/60">基础积分：</span>
                              <span className="font-medium text-white">{pkg.credits}</span>
                            </div>
                            {pkg.bonusCredits > 0 && (
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-orange-400 font-medium">🎁 赠送积分：</span>
                                <span className="font-bold text-orange-400">+{pkg.bonusCredits}</span>
                              </div>
                            )}
                            <div className="pt-2 border-t border-white/10">
                              <span className="text-lg font-bold text-white">
                                总共 {pkg.totalCredits} 积分
                              </span>
                            </div>
                          </div>

                          {pkg.discount && (
                            <div className="inline-block bg-purple-500/30 text-purple-300 text-xs font-medium px-2 py-1 rounded border border-purple-500/30">
                              {pkg.discount}折优惠
                            </div>
                          )}
                        </div>
                      </WuhuCard>
                    </div>
                  ))}
                </div>
            )}

            {/* 支付方式选择 */}
            {selectedPackage && (
              <WuhuCard glow="cyan" className="p-6 mt-8">
                <h3 className="text-lg font-bold text-white mb-4">
                  选择支付方式
                </h3>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button
                    onClick={() => setPaymentMethod('alipay')}
                    className={`p-4 rounded-xl border-2 border-white/20 transition-all ${paymentMethod === 'alipay' ? 'wuhu-payment-alipay' : 'hover:border-white/40'}`}
                  >
                    <div className="flex items-center justify-center gap-3">
                      <AppIcon name="coins" className="w-8 h-8 text-blue-400" />
                      <div className="text-left">
                        <div className="font-semibold text-white">支付宝</div>
                        <div className="text-xs text-white/60">推荐使用</div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('wechat')}
                    className={`p-4 rounded-xl border-2 border-white/20 transition-all ${paymentMethod === 'wechat' ? 'wuhu-payment-wechat' : 'hover:border-white/40'}`}
                  >
                    <div className="flex items-center justify-center gap-3">
                      <AppIcon name="coins" className="w-8 h-8 text-green-400" />
                      <div className="text-left">
                        <div className="font-semibold text-white">微信支付</div>
                        <div className="text-xs text-white/60">便捷安全</div>
                      </div>
                    </div>
                  </button>
                </div>

                {/* 订单摘要 */}
                <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white/60">充值套餐</span>
                    <span className="font-medium text-white">{selectedPackage.name}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white/60">获得积分</span>
                    <span className="font-bold text-white">{selectedPackage.totalCredits} 积分</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-white/10">
                    <span className="text-white/60">应付金额</span>
                    <span className="text-3xl font-black wuhu-neon-number">¥{selectedPackage.price.toFixed(2)}</span>
                  </div>
                </div>

                <WuhuButton
                  variant="gradient"
                  glow={true}
                  onClick={handleRecharge}
                  disabled={submitting}
                  className="w-full py-4 text-lg font-bold"
                >
                  {submitting ? '创建订单中...' : '芜湖，立即起飞！🚀'}
                </WuhuButton>

                <p className="text-center text-xs text-white/40 mt-4">
                  支付成功后积分将自动发放到您的账户
                </p>
              </WuhuCard>
            )}
          </div>

          {/* 右侧 - 订单记录 */}
          <div className="w-80 flex-shrink-0">
            <WuhuCard glow="purple" className="p-6 sticky top-8">
              <h3 className="text-lg font-bold text-white mb-4">
                最近充值记录
              </h3>

              {recentOrders.length === 0 ? (
                <div className="py-8">
                  <WuhuEmptyState
                    title="暂无充值记录"
                    description="完成首次充值后记录将显示在这里"
                    expression="thinking"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {recentOrders.map((order) => {
                    const statusInfo = getStatusText(order.status)
                    return (
                      <div
                        key={order.orderId}
                        className="bg-white/5 rounded-xl p-4 border border-white/10"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-medium text-white">
                              {order.credits} 积分
                            </div>
                            <div className="text-xs text-white/40">
                              {order.orderNo}
                            </div>
                          </div>
                          <div className={`text-xs font-medium ${statusInfo.color}`}>
                            {statusInfo.text}
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-white/60">
                            {getPaymentMethodText(order.paymentMethod)}
                          </span>
                          <span className="font-bold text-white">
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
                className="w-full mt-6 py-3 rounded-xl border border-white/20 text-white/80 hover:text-white hover:border-white/40 transition-all text-sm font-medium"
              >
                查看全部记录
              </button>
            </WuhuCard>
          </div>
        </div>
      </main>
    </div>
  )
}
