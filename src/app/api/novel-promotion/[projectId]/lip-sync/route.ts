import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireProjectAuthLight, isErrorResponse } from '@/lib/api-auth'
import { apiHandler, ApiError, getRequestId } from '@/lib/api-errors'
import { submitTask } from '@/lib/task/submitter'
import { resolveRequiredTaskLocale } from '@/lib/task/resolve-locale'
import { TASK_TYPE } from '@/lib/task/types'
import { buildDefaultTaskBillingInfo } from '@/lib/billing'
import { hasPanelLipSyncOutput } from '@/lib/task/has-output'
import { withTaskUiPayload } from '@/lib/task/ui-payload'
import { parseModelKeyStrict, composeModelKey } from '@/lib/model-config-contract'
import { getModelsByType } from '@/lib/api-config'

export const POST = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) => {
  const { projectId } = await context.params

  const authResult = await requireProjectAuthLight(projectId)
  if (isErrorResponse(authResult)) return authResult
  const { session } = authResult

  const body = await request.json()
  const locale = resolveRequiredTaskLocale(request, body)
  const storyboardId = body?.storyboardId
  const panelIndex = body?.panelIndex
  const voiceLineId = body?.voiceLineId
  const requestedLipSyncModel = typeof body?.lipSyncModel === 'string' ? body.lipSyncModel.trim() : ''

  if (!storyboardId || panelIndex === undefined || !voiceLineId) {
    throw new ApiError('INVALID_PARAMS')
  }
  if (requestedLipSyncModel && !parseModelKeyStrict(requestedLipSyncModel)) {
    throw new ApiError('INVALID_PARAMS', {
      code: 'MODEL_KEY_INVALID',
      field: 'lipSyncModel',
    })
  }

  const pref = await prisma.userPreference.findUnique({
    where: { userId: session.user.id },
    select: { lipSyncModel: true },
  })
  const preferredLipSyncModel = typeof pref?.lipSyncModel === 'string' ? pref.lipSyncModel.trim() : ''
  let resolvedLipSyncModel = requestedLipSyncModel || preferredLipSyncModel || ''

  // When no model specified, auto-select the first available lipsync model
  // that has a configured API key (skip models whose provider lacks credentials)
  if (!resolvedLipSyncModel) {
    const availableModels = await getModelsByType(session.user.id, 'lipsync')
    if (availableModels.length === 0) {
      throw new ApiError('INVALID_PARAMS', {
        code: 'MODEL_NOT_CONFIGURED',
        message: '未配置可用口型同步模型，请先前往设置页面配置后再试',
      })
    }
    // Use the first model (providers without apiKey will be caught later
    // by getProviderConfig with a clearer error message)
    resolvedLipSyncModel = composeModelKey(availableModels[0].provider, availableModels[0].modelId)
  }

  if (resolvedLipSyncModel && !parseModelKeyStrict(resolvedLipSyncModel)) {
    throw new ApiError('INVALID_PARAMS', {
      code: 'MODEL_KEY_INVALID',
      field: 'lipSyncModel',
    })
  }

  const panel = await prisma.novelPromotionPanel.findFirst({
    where: { storyboardId, panelIndex: Number(panelIndex) },
    select: { id: true },
  })

  if (!panel) {
    throw new ApiError('NOT_FOUND')
  }

  const payload = {
    ...body,
    lipSyncModel: resolvedLipSyncModel,
  }

  const result = await submitTask({
    userId: session.user.id,
    locale,
    requestId: getRequestId(request),
    projectId,
    type: TASK_TYPE.LIP_SYNC,
    targetType: 'NovelPromotionPanel',
    targetId: panel.id,
    payload: withTaskUiPayload(payload, {
      hasOutputAtStart: await hasPanelLipSyncOutput(panel.id),
    }),
    dedupeKey: `lip_sync:${panel.id}:${voiceLineId}`,
    billingInfo: buildDefaultTaskBillingInfo(TASK_TYPE.LIP_SYNC, payload),
  })

  return NextResponse.json(result)
})
