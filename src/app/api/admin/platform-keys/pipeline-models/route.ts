import { NextRequest, NextResponse } from 'next/server'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { requireAdmin } from '@/lib/admin/auth'
import {
  getPipelineModelAssignments,
  setPipelineModelAssignments,
  type PipelineModelAssignments,
} from '@/lib/platform-config'

export const GET = apiHandler(async () => {
  await requireAdmin()
  const assignments = await getPipelineModelAssignments()

  return NextResponse.json({ assignments })
})

export const POST = apiHandler(async (request: NextRequest) => {
  const adminId = await requireAdmin()
  const body = await request.json()
  const { assignments } = body as { assignments?: PipelineModelAssignments }

  if (!assignments) {
    throw new ApiError('INVALID_PARAMS')
  }

  await setPipelineModelAssignments(assignments, { updatedBy: adminId })

  return NextResponse.json({ success: true })
})
