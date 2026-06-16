/**
 * 支付回调处理API
 * 处理各支付渠道的异步回调通知
 *
 * 流程:
 * 1. 解析 method + 原始 form data
 * 2. 读取配置,调用 verifyCallbackSignature 验签
 * 3. 验签失败 → 401 (不进入业务流,防止伪造回调)
 * 4. 验签通过 → 调用 handlePaymentSuccess / handlePaymentFailure
 */

import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-errors'
import { handlePaymentSuccess, handlePaymentFailure } from '@/lib/payment/service'
import { verifyCallbackSignature } from '@/lib/payment/signature'
import type { PaymentMethod } from '@/lib/payment/types'

/**
 * 处理支付宝回调
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams
  const method = (searchParams.get('method') || 'alipay') as PaymentMethod

  // 获取回调数据
  const formData = await request.formData()
  const rawData: Record<string, string> = {}
  formData.forEach((value, key) => {
    rawData[key] = value as string
  })

  // 验签:失败立即返 401,不进入业务流
  const publicKey = process.env.ALIPAY_PUBLIC_KEY
  const appId = process.env.ALIPAY_APP_ID
  if (!publicKey || !appId) {
    console.error('[Payment Callback] Missing ALIPAY env config')
    return new NextResponse('FAIL', { status: 500 })
  }

  const valid = await verifyCallbackSignature(method, rawData, {
    publicKey,
    appId,
  })
  if (!valid) {
    console.warn('[Payment Callback] Signature rejected', {
      method,
      outTradeNo: rawData.out_trade_no,
    })
    return new NextResponse('FAIL', { status: 401 })
  }

  const orderNo = rawData.out_trade_no || rawData.orderNo || searchParams.get('orderNo')

  if (!orderNo) {
    return new NextResponse('FAIL', { status: 400 })
  }

  // 验签通过,处理业务流
  const tradeStatus = rawData.trade_status || rawData.status || 'TRADE_SUCCESS'
  const isSuccess = tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'success' || tradeStatus === 'SUCCESS'

  if (isSuccess) {
    const success = await handlePaymentSuccess({
      orderNo,
      thirdPartyOrderId: rawData.trade_no || rawData.transaction_id || '',
      amount: parseFloat(rawData.total_amount || rawData.amount || '0'),
      status: 'success',
      paidAt: new Date(),
      rawData,
    })

    if (success) {
      return new NextResponse('SUCCESS')
    }
  } else {
    await handlePaymentFailure(orderNo, rawData.failure_reason || '支付失败')
  }

  return new NextResponse('FAIL', { status: 400 })
})

/**
 * GET 方式也支持回调（部分支付渠道用GET）
 */
export const GET = POST
