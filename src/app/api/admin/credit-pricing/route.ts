import { NextRequest, NextResponse } from 'next/server'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { requireAdmin } from '@/lib/admin/auth'
import { setConfigRaw, getCreditPricing, getModelTierMap } from '@/lib/platform-config'

export const GET = apiHandler(async () => {
  await requireAdmin()
  const pricing = await getCreditPricing()
  const tierMap = await getModelTierMap()

  return NextResponse.json({ pricing, tierMap })
})

export const POST = apiHandler(async (request: NextRequest) => {
  const adminId = await requireAdmin()
  const body = await request.json()
  const { pricing, tierMap } = body as {
    pricing?: Record<string, unknown>
    tierMap?: Record<string, string>
  }

  if (pricing) {
    await setConfigRaw('billing.credit_pricing', JSON.stringify(pricing), {
      updatedBy: adminId,
    })
  }

  if (tierMap) {
    await setConfigRaw('billing.model_tier_map', JSON.stringify(tierMap), {
      updatedBy: adminId,
    })
  }

  return NextResponse.json({ success: true })
})
