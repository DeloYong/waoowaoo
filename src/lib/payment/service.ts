/**
 * 支付核心服务
 * 处理订单创建、状态管理、支付回调、积分发放等
 */

import { prisma } from '@/lib/prisma'
import { grantCredits } from '@/lib/credit-billing/service'
import {
  CreateOrderParams,
  PaymentOrderInfo,
  PaymentCallbackData,
  PaymentStatus,
  PaymentMethod,
  RechargePackageInfo,
  RefundParams,
} from './types'

/**
 * 生成唯一订单号
 * 格式：PAY + 时间戳(13位) + 6位随机数
 */
export function generateOrderNo(): string {
  const timestamp = Date.now().toString()
  const random = Math.random().toString().slice(2, 8)
  return `PAY${timestamp}${random}`
}

/**
 * 创建支付订单
 */
export async function createPaymentOrder(
  params: CreateOrderParams
): Promise<PaymentOrderInfo> {
  const { userId, credits, amount, paymentMethod, paymentChannel = 'pc', packageId, returnUrl } = params

  // 验证金额和积分
  if (amount <= 0 || credits <= 0) {
    throw new Error('Invalid amount or credits')
  }

  // 生成订单号
  const orderNo = generateOrderNo()

  // 默认15分钟过期
  const expiredAt = new Date(Date.now() + 15 * 60 * 1000)

  // 创建数据库订单
  const order = await prisma.paymentOrder.create({
    data: {
      userId,
      orderNo,
      amount,
      currency: 'CNY',
      credits,
      status: 'pending',
      paymentMethod,
      paymentChannel,
      expiredAt,
      metadata: {
        packageId,
        returnUrl,
        description: params.description,
      },
    },
  })

  // TODO: 根据支付方式调用具体的支付提供商创建支付链接
  // 这里暂时返回模拟的支付URL，后续接入支付宝、微信等
  const paymentUrl = await generatePaymentUrl(paymentMethod, orderNo, amount, {
    returnUrl,
    description: params.description || `充值 ${credits} 积分`,
  })

  return {
    orderId: order.id,
    orderNo: order.orderNo,
    amount: order.amount.toNumber(),
    credits: order.credits,
    status: order.status as PaymentStatus,
    paymentMethod: order.paymentMethod as PaymentMethod | null,
    paymentUrl,
    expiredAt: order.expiredAt,
    createdAt: order.createdAt,
  }
}

/**
 * 生成支付URL（模拟实现，后续接入真实支付网关）
 */
async function generatePaymentUrl(
  paymentMethod: string,
  orderNo: string,
  amount: number,
  options: { returnUrl?: string; description?: string } = {}
): Promise<string> {
  // 开发环境返回模拟支付页面
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // 根据支付方式返回不同的URL
  switch (paymentMethod) {
    case 'alipay':
      return `${baseUrl}/api/payment/mock?orderNo=${orderNo}&method=alipay&amount=${amount}`
    case 'wechat':
      return `${baseUrl}/api/payment/mock?orderNo=${orderNo}&method=wechat&amount=${amount}`
    case 'stripe':
      return `${baseUrl}/api/payment/mock?orderNo=${orderNo}&method=stripe&amount=${amount}`
    default:
      return `${baseUrl}/api/payment/mock?orderNo=${orderNo}&method=mock&amount=${amount}`
  }
}

/**
 * 查询订单状态
 */
export async function getOrderStatus(orderId: string, userId: string): Promise<PaymentOrderInfo> {
  const order = await prisma.paymentOrder.findFirst({
    where: {
      id: orderId,
      userId,
    },
  })

  if (!order) {
    throw new Error('Order not found')
  }

  return {
    orderId: order.id,
    orderNo: order.orderNo,
    amount: order.amount.toNumber(),
    credits: order.credits,
    status: order.status as PaymentStatus,
    paymentMethod: order.paymentMethod as PaymentMethod | null,
    expiredAt: order.expiredAt,
    createdAt: order.createdAt,
  }
}

/**
 * 根据订单号查询订单（用于回调处理）
 */
export async function getOrderByNo(orderNo: string) {
  return await prisma.paymentOrder.findUnique({
    where: { orderNo },
  })
}

/**
 * 处理支付成功回调
 */
export async function handlePaymentSuccess(callbackData: PaymentCallbackData): Promise<boolean> {
  const { orderNo, thirdPartyOrderId, amount, paidAt } = callbackData

  // 查找订单
  const order = await getOrderByNo(orderNo)
  if (!order) {
    console.error('[Payment] Order not found:', orderNo)
    return false
  }

  // 检查订单状态
  if (order.status === 'paid') {
    console.warn('[Payment] Order already paid:', orderNo)
    return true
  }

  if (order.status !== 'pending') {
    console.error('[Payment] Invalid order status:', order.status)
    return false
  }

  // 验证金额（允许1分分差）
  const orderAmount = order.amount.toNumber()
  if (Math.abs(orderAmount - amount) > 0.01) {
    console.error('[Payment] Amount mismatch:', { order: orderAmount, callback: amount })
    return false
  }

  try {
    // 使用事务处理：更新订单状态 + 发放积分
    await prisma.$transaction(async (tx) => {
      // 1. 更新订单状态
      await tx.paymentOrder.update({
        where: { id: order.id },
        data: {
          status: 'paid',
          thirdPartyOrderId,
          paidAt: paidAt || new Date(),
        },
      })

      // 2. 发放积分到用户账户
      await grantCredits(order.userId, order.credits, 'recharge', {
        reason: `充值 ${order.credits} 积分`,
        idempotencyKey: orderNo,
      })
    })

    // 3. 异步发送支付成功邮件(失败不影响业务)
    try {
      const user = await prisma.user.findUnique({
        where: { id: order.userId },
        select: { email: true },
      })
      if (user?.email) {
        const { sendPaymentSuccessEmail } = await import('@/lib/notification/email')
        await sendPaymentSuccessEmail({
          email: user.email,
          credits: order.credits,
          amount: order.amount.toNumber(),
          orderNo,
          locale: 'zh',
        })
      }
    } catch (emailError) {
      console.warn('[Payment] email notification failed', {
        orderNo,
        error: emailError instanceof Error ? emailError.message : String(emailError),
      })
    }

    console.log('[Payment] Payment success, credits granted:', {
      orderNo,
      userId: order.userId,
      credits: order.credits,
      amount,
    })

    return true
  } catch (error) {
    console.error('[Payment] Failed to handle payment success:', error)
    return false
  }
}

/**
 * 处理支付失败
 */
export async function handlePaymentFailure(
  orderNo: string,
  reason: string
): Promise<boolean> {
  const order = await getOrderByNo(orderNo)
  if (!order) {
    return false
  }

  if (order.status !== 'pending') {
    return true
  }

  await prisma.paymentOrder.update({
    where: { id: order.id },
    data: {
      status: 'failed',
      failureReason: reason,
    },
  })

  return true
}

/**
 * 取消订单
 */
export async function cancelOrder(orderId: string, userId: string): Promise<boolean> {
  const order = await prisma.paymentOrder.findFirst({
    where: {
      id: orderId,
      userId,
    },
  })

  if (!order) {
    throw new Error('Order not found')
  }

  if (order.status !== 'pending') {
    throw new Error('Cannot cancel non-pending order')
  }

  await prisma.paymentOrder.update({
    where: { id: order.id },
    data: {
      status: 'cancelled',
    },
  })

  return true
}

/**
 * 获取用户的支付订单列表
 */
export async function getUserOrders(
  userId: string,
  options: {
    status?: PaymentStatus
    limit?: number
    offset?: number
  } = {}
) {
  const { status, limit = 20, offset = 0 } = options

  const where: { userId: string; status?: string } = { userId }
  if (status) {
    where.status = status
  }

  const [orders, total] = await Promise.all([
    prisma.paymentOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.paymentOrder.count({ where }),
  ])

  return {
    orders: orders.map((order) => ({
      orderId: order.id,
      orderNo: order.orderNo,
      amount: order.amount.toNumber(),
      credits: order.credits,
      status: order.status,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt,
      paidAt: order.paidAt,
    })),
    total,
  }
}

/**
 * 获取充值套餐列表
 */
export async function getRechargePackages(): Promise<RechargePackageInfo[]> {
  // 不筛选 isActive，获取所有套餐，防止遗漏已配置的套餐
  const packages = await prisma.rechargePackage.findMany({
    orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
  })

  return packages.map((pkg) => {
    const totalCredits = pkg.credits + pkg.bonusCredits
    const originalPrice = pkg.originalPrice?.toNumber()
    const price = pkg.price.toNumber()

    return {
      id: pkg.id,
      name: pkg.name,
      credits: pkg.credits,
      bonusCredits: pkg.bonusCredits,
      totalCredits,
      price,
      originalPrice,
      discount: originalPrice ? Math.round((price / originalPrice) * 100) : undefined,
      isPopular: pkg.isPopular,
      description: pkg.description || undefined,
    }
  })
}

/**
 * 管理员创建充值套餐
 */
export async function createRechargePackage(data: {
  name: string
  credits: number
  price: number
  originalPrice?: number
  bonusCredits?: number
  isPopular?: boolean
  sortOrder?: number
  description?: string
}) {
  return await prisma.rechargePackage.create({
    data: {
      name: data.name,
      credits: data.credits,
      price: data.price,
      originalPrice: data.originalPrice,
      bonusCredits: data.bonusCredits || 0,
      isPopular: data.isPopular || false,
      sortOrder: data.sortOrder || 0,
      description: data.description,
    },
  })
}

/**
 * 处理退款
 */
export async function refundOrder(params: RefundParams & { operatorId?: string }): Promise<boolean> {
  const { orderId, reason, amount, operatorId } = params

  const order = await prisma.paymentOrder.findUnique({
    where: { id: orderId },
  })

  if (!order) {
    throw new Error('Order not found')
  }

  if (order.status !== 'paid') {
    throw new Error('Only paid orders can be refunded')
  }

  const refundAmount = amount || order.amount.toNumber()

  try {
    // TODO: 调用支付提供商退款接口

    await prisma.$transaction(async (tx) => {
      // 更新订单状态
      await tx.paymentOrder.update({
        where: { id: orderId },
        data: {
          status: 'refunded',
          refundAmount,
          refundedAt: new Date(),
        },
      })

      // TODO: 扣除用户积分？需要考虑积分是否已使用
      // 这里暂时只记录退款，积分扣除逻辑需要根据业务需求实现
    })

    console.log('[Payment] Refund success:', { orderId, refundAmount, reason })

    return true
  } catch (error) {
    console.error('[Payment] Refund failed:', error)
    return false
  }
}

/**
 * 清理过期订单
 */
export async function cleanExpiredOrders(): Promise<number> {
  const result = await prisma.paymentOrder.updateMany({
    where: {
      status: 'pending',
      expiredAt: { lte: new Date() },
    },
    data: {
      status: 'expired',
    },
  })

  if (result.count > 0) {
    console.log('[Payment] Cleaned expired orders:', result.count)
  }

  return result.count
}
