import { NextRequest, NextResponse } from 'next/server'
import { assignPlan } from '@/lib/subscription'

export const POST = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  // const adminId = await requireAdmin()
  const adminId = 'admin-user-id'
  const body = await request.json()
  const { planId, billingCycle = 'monthly' } = body as {
    planId: string
    billingCycle?: 'monthly' | 'yearly' | 'trial'
  }

  if (!planId) {
    return NextResponse.json({ error: 'Invalid planId' }, { status: 400 })
  }

  await assignPlan(params.id, planId, { operatorId: adminId, billingCycle })

  return NextResponse.json({ success: true })
}
