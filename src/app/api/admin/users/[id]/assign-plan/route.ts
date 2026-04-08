import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-errors'
import { requireAdmin } from '@/lib/admin/auth'
import { assignPlan } from '@/lib/subscription'

export const POST = apiHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const adminId = await requireAdmin()
  const { id } = await params
  const body = await request.json()
  const { planId, billingCycle = 'monthly' } = body as {
    planId: string
    billingCycle?: 'monthly' | 'yearly' | 'trial'
  }

  if (!planId) {
    return NextResponse.json({ error: 'Invalid planId' }, { status: 400 })
  }

  await assignPlan(id, planId, { operatorId: adminId, billingCycle })

  return NextResponse.json({ success: true })
})
