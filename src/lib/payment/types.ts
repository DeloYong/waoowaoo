/**
 * 支付相关类型定义
 */

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled' | 'expired'

export type PaymentMethod = 'alipay' | 'wechat' | 'stripe' | 'offline'

export type PaymentChannel = 'pc' | 'h5' | 'app' | 'qrcode' | 'jsapi'

export interface CreateOrderParams {
  userId: string
  credits: number
  amount: number
  paymentMethod: PaymentMethod
  paymentChannel?: PaymentChannel
  packageId?: string
  description?: string
  clientIp?: string
  returnUrl?: string
  notifyUrl?: string
  /** 内部使用:provider.createOrder 时由 service 注入 */
  orderNo?: string
}

export interface PaymentOrderInfo {
  orderId: string
  orderNo: string
  amount: number
  credits: number
  status: PaymentStatus
  paymentMethod: PaymentMethod | null
  paymentUrl?: string
  qrCode?: string
  expiredAt: Date
  createdAt: Date
}

export interface PaymentCallbackData {
  orderNo: string
  thirdPartyOrderId: string
  amount: number
  status: 'success' | 'failed'
  paidAt?: Date
  rawData: Record<string, unknown>
}

export interface RefundParams {
  orderId: string
  orderNo?: string
  reason?: string
  amount?: number
}

/**
 * 支付提供商接口
 */
export interface PaymentProvider {
  /**
   * 创建支付订单
   */
  createOrder(params: CreateOrderParams): Promise<{
    orderNo?: string
    paymentUrl?: string
    qrCode?: string
    rawData?: Record<string, unknown>
  }>

  /**
   * 查询订单状态
   */
  queryOrder(orderNo: string): Promise<{
    status: PaymentStatus
    thirdPartyOrderId?: string
    paidAt?: Date
    amount?: number
  }>

  /**
   * 处理支付回调
   */
  handleCallback(rawData: Record<string, unknown>): Promise<PaymentCallbackData>

  /**
   * 申请退款
   */
  refund(params: RefundParams): Promise<boolean>

  /**
   * 验证回调签名
   */
  verifySignature(rawData: Record<string, unknown>): boolean
}

/**
 * 充值套餐信息
 */
export interface RechargePackageInfo {
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
