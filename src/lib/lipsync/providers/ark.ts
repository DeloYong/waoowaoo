import { getProviderConfig } from '@/lib/api-config'
import { formatExternalId } from '@/lib/async-poll'
import { logInfo, logError } from '@/lib/logging/core'
import type { LipSyncParams, LipSyncResult, LipSyncSubmitContext } from '@/lib/lipsync/types'

const ARK_LIPSYNC_ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/audio/lipsync'

function readTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * 提交火山引擎口型同步任务
 *
 * Ark 口型同步 API：POST /api/v3/audio/lipsync
 * - Bearer Token 认证
 * - FormData 上传视频和音频文件
 * - 异步任务模式，返回 taskId 用于轮询
 */
export async function submitArkLipSync(
  params: LipSyncParams,
  context: LipSyncSubmitContext,
): Promise<LipSyncResult> {
  const modelId = readTrimmedString(context.modelId) || 'doubao-lipsync-v1'
  const { apiKey } = await getProviderConfig(context.userId, context.providerId)

  logInfo('[Ark LipSync] 提交口型同步任务', {
    userId: context.userId,
    modelId,
    providerId: context.providerId,
  })

  // 下载视频文件
  const videoResponse = await fetch(params.videoUrl)
  if (!videoResponse.ok) {
    throw new Error(`ARK_LIPSYNC_VIDEO_DOWNLOAD_FAILED(${videoResponse.status})`)
  }

  // 下载音频文件
  const audioResponse = await fetch(params.audioUrl)
  if (!audioResponse.ok) {
    throw new Error(`ARK_LIPSYNC_AUDIO_DOWNLOAD_FAILED(${audioResponse.status})`)
  }

  // 构建 FormData
  const formData = new FormData()
  formData.append('video', new Blob([await videoResponse.arrayBuffer()]), 'video.mp4')
  formData.append('audio', new Blob([await audioResponse.arrayBuffer()]), 'audio.wav')
  formData.append('model', modelId)

  // 提交任务
  const createResponse = await fetch(ARK_LIPSYNC_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  })

  if (!createResponse.ok) {
    const errorText = await createResponse.text()
    logError('[Ark LipSync] 任务创建失败', {
      status: createResponse.status,
      error: errorText,
    })
    throw new Error(`ARK_LIPSYNC_SUBMIT_FAILED(${createResponse.status}): ${errorText}`)
  }

  const taskData = await createResponse.json() as { id?: string }
  const taskId = readTrimmedString(taskData.id)
  if (!taskId) {
    throw new Error('ARK_LIPSYNC_TASK_ID_MISSING')
  }

  const externalId = formatExternalId('ARK', 'VIDEO', taskId)

  logInfo('[Ark LipSync] 任务已创建', { userId: context.userId, taskId, externalId })

  return {
    requestId: taskId,
    externalId,
    async: true,
  }
}
