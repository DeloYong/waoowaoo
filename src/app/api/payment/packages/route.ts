/**
 * 充值套餐API
 */

import { NextRequest, NextResponse } from 'next/server'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { requireAdmin } from '@/lib/admin/auth'
import { getRechargePackages, createRechargePackage } from '@/lib/payment/service'

/**
 * 获取充值套餐列表（公开）
 */
export const GET = apiHandler(async (request: NextRequest) => {
  const packages = await getRechargePackages()
  return NextResponse.json({ packages })
})

/**
 * 创建充值套餐（仅管理员）
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const adminId = await requireAdmin()
  const body = await request.json()

  const {
    name,
    credits,
    price,
    originalPrice,
    bonusCredits,
    isPopular,
    sortOrder,
    description,
  } = body

  if (!name || !credits || !price) {
    throw new ApiError('INVALID_PARAMS', { message: '请填写完整的套餐信息' })
  }

  const pkg = await createRechargePackage({
    name,
    credits,
    price,
    originalPrice,
    bonusCredits,
    isPopular,
    sortOrder,
    description,
  })

  return NextResponse.json({ success: true, package: pkg })
})
