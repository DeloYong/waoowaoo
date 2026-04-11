import { BaseVideoGenerator, type VideoGenerateParams, type GenerateResult } from './base'
import { getProviderConfig } from '@/lib/api-config'
import { createStorageProvider } from '@/lib/storage/factory'
import { pollAsyncTask } from '@/lib/async-poll'
import { logInfo, logError } from '@/lib/logging/core'

export class ArkLipSyncGenerator extends BaseVideoGenerator {
  protected async doGenerate(params: VideoGenerateParams): Promise<GenerateResult> {
    const { userId, imageUrl, audioUrl, options = {} } = params
    logInfo('ArkLipSyncGenerator: 开始生成口型同步视频', { userId, imageUrl, audioUrl })

    try {
      const { apiKey } = await getProviderConfig(userId, 'ark')
      const { resolution = '720p', fps = 24 } = options as Record<string, any>

      // 验证必填参数
      if (!imageUrl) throw new Error('缺少图片URL')
      if (!audioUrl) throw new Error('缺少音频URL')

      // 准备请求参数
      const formData = new FormData()

      // 下载并添加图片
      const imageResponse = await fetch(imageUrl)
      if (!imageResponse.ok) {
        const errorText = await imageResponse.text()
        throw new Error(`图片下载失败 (${imageResponse.status}): ${errorText}`)
      }
      formData.append('image', new Blob([await imageResponse.arrayBuffer()]), 'image.png')

      // 下载并添加音频
      const audioResponse = await fetch(audioUrl)
      if (!audioResponse.ok) {
        const errorText = await audioResponse.text()
        throw new Error(`音频下载失败 (${audioResponse.status}): ${errorText}`)
      }
      formData.append('audio', new Blob([await audioResponse.arrayBuffer()]), 'audio.mp3')

      formData.append('resolution', resolution)
      formData.append('fps', String(fps))
      formData.append('model', options.modelId || 'doubao-lipsync-v1')

      // 创建口型同步任务
      const createResponse = await fetch('https://ark.cn-beijing.volces.com/api/v3/audio/lipsync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData
      })

      if (!createResponse.ok) {
        const error = await createResponse.json()
        throw new Error(`口型同步任务创建失败: ${error.message || createResponse.statusText}`)
      }

      const taskData = await createResponse.json()
      const taskId = taskData.id
      logInfo('ArkLipSyncGenerator: 口型同步任务已创建', { userId, taskId })

      // 轮询任务状态
      const result = await pollAsyncTask({
        taskId,
        provider: 'ark',
        pollUrl: `https://ark.cn-beijing.volces.com/api/v3/audio/lipsync/${taskId}`,
        headers: { Authorization: `Bearer ${apiKey}` },
        checkInterval: 3000,
        timeout: 300000, // 5分钟超时
        onProgress: (progress) => {
          logInfo('ArkLipSyncGenerator: 任务进度更新', { userId, taskId, progress })
          this.emit('progress', progress)
        }
      })

      if (!result.success || !result.videoUrl) {
        throw new Error(result.error || '口型同步生成失败')
      }

      // 上传到对象存储
      const videoResponse = await fetch(result.videoUrl)
      if (!videoResponse.ok) {
        const errorText = await videoResponse.text()
        throw new Error(`视频下载失败 (${videoResponse.status}): ${errorText}`)
      }

      const storage = createStorageProvider()
      const fileKey = storage.generateUniqueKey({ prefix: 'video/lipsync', ext: 'mp4' })
      await storage.uploadObject({
        key: fileKey,
        body: Buffer.from(await videoResponse.arrayBuffer()),
        contentType: 'video/mp4'
      })

      const videoUrl = storage.toFetchableUrl(fileKey)
      logInfo('ArkLipSyncGenerator: 口型同步生成成功', { userId, taskId, fileKey })

      return {
        success: true,
        videoUrl,
        async: false,
        metadata: {
          resolution,
          fps,
          provider: 'ark'
        }
      }
    } catch (error) {
      logError('ArkLipSyncGenerator: 口型同步生成失败', { userId, error: (error as Error).message })
      throw error
    }
  }
}
