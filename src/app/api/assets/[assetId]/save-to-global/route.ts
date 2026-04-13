import { NextRequest, NextResponse } from 'next/server'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { isErrorResponse, requireProjectAuthLight } from '@/lib/api-auth'
import { saveAssetToGlobal } from '@/lib/assets/services/asset-actions'
import type { AssetKind } from '@/lib/assets/contracts'

type SaveToGlobalBody = {
  kind?: AssetKind
  projectId?: string
  folderId?: string | null
}

export const POST = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ assetId: string }> },
) => {
  const { assetId } = await context.params
  const body = await request.json() as SaveToGlobalBody

  if (
    !body.projectId
    || (body.kind !== 'character' && body.kind !== 'location' && body.kind !== 'prop' && body.kind !== 'voice')
  ) {
    throw new ApiError('INVALID_PARAMS')
  }

  const authResult = await requireProjectAuthLight(body.projectId)
  if (isErrorResponse(authResult)) return authResult

  const result = await saveAssetToGlobal({
    kind: body.kind,
    assetId,
    access: {
      userId: authResult.session.user.id,
      projectId: body.projectId,
    },
    folderId: body.folderId,
  })

  return NextResponse.json(result)
})
