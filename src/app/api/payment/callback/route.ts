/**
 * 支付回调处理API
 * 处理各支付渠道的异步回调通知
 */

import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-errors'
import { handlePaymentSuccess, handlePaymentFailure } from '@/lib/payment/service'

/**
 * 处理支付宝回调
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams
  const method = searchParams.get('method') || 'alipay'

  try {
    // 获取回调数据
    const formData = await request.formData()
    const rawData: Record<string, string> = {}
    formData.forEach((value, key) => {
      rawData[key] = value as string
    })

    console.log('[Payment Callback] Received:', { method, rawData })

    // TODO: 根据不同支付渠道验证签名和解析数据
    // 这里是通用处理，后续需要根据具体支付渠道实现

    const orderNo = rawData.out_trade_no || rawData.orderNo || searchParams.get('orderNo')

    if (!orderNo) {
      return new NextResponse('FAIL', { status: 400 })
    }

    // 模拟支付成功状态
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
  } catch (error) {
    console.error('[Payment Callback] Error:', error)
    return new NextResponse('FAIL', { status: 500 })
  }
})

/**
 * GET 方式也支持回调（部分支付渠道用GET）
 */
export const GET = POST
