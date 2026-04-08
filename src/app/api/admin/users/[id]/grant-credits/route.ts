import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-errors'
import { requireAdmin } from '@/lib/admin/auth'
import { grantCredits } from '@/lib/credit-billing/service'

export const POST = apiHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const adminId = await requireAdmin()
  const { id } = await params
  const body = await request.json()
  const { credits, reason, isPermanent = true } = body as {
    credits: number
    reason?: string
    isPermanent?: boolean
  }

  if (!credits || credits <= 0) {
    return NextResponse.json({ error: 'Invalid credits' }, { status: 400 })
  }

  const success = await grantCredits(id, credits, 'admin_grant', {
    reason: reason || '管理员充值',
    operatorId: adminId,
    isPermanent,
  })

  if (!success) {
    return NextResponse.json({ error: 'Failed to grant credits' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
})
