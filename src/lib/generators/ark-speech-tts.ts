import { BaseAudioGenerator, type AudioGenerateParams, type GenerateResult } from './base'
import { getProviderConfig } from '@/lib/api-config'
import { arkTTSGeneration } from '@/lib/ark-api'
import { createStorageProvider } from '@/lib/storage/factory'
import { logInfo, logError } from '@/lib/logging/core'
export class ArkTTSGenerator extends BaseAudioGenerator {
  protected async doGenerate(params: AudioGenerateParams): Promise<GenerateResult> {
    const { userId, text, voice = 'zh_female_mars_bigtts', rate = 1.0, options = {} } = params
    // 校验选项
    const allowedOptionKeys = ['modelId', 'responseFormat', 'pitch', 'volume']
    Object.keys(options).forEach(key => {
      if (!allowedOptionKeys.includes(key)) {
        throw new Error(`不支持的选项: ${key}`)
      }
    })
    // 记录日志
    logInfo('ArkTTSGenerator: 开始生成TTS', { userId, textLength: text.length, voice, rate })
    try {
      const { apiKey } = await getProviderConfig(userId, 'ark')
      const { responseFormat = 'mp3', pitch = 1.0, volume = 1.0, modelId } = options as {
        responseFormat?: string
        pitch?: number
        volume?: number
        modelId?: string
      }
      // 校验参数
      if (rate < 0.5 || rate > 2.0) throw new Error('语速范围0.5-2.0')
      if (pitch < 0.5 || pitch > 2.0) throw new Error('音调范围0.5-2.0')
      if (volume < 0 || volume > 2.0) throw new Error('音量范围0-2.0')
      // 调用火山API
      const resolvedModel = (modelId || 'doubao-tts-v1') as 'doubao-tts-v1' | 'doubao-tts-premium-v1'
      const result = await arkTTSGeneration({
        model: resolvedModel,
        input: text,
        voice,
        speed: rate
      }, { apiKey })
      if (!result.audio) throw new Error('TTS生成失败，无返回音频')
      // 上传到对象存储
      const storage = createStorageProvider()
      const fileKey = storage.generateUniqueKey({ prefix: 'audio/tts', ext: responseFormat })
      await storage.uploadObject({
        key: fileKey,
        body: Buffer.from(await result.audio.arrayBuffer()),
        contentType: result.contentType
      })
      const audioUrl = storage.toFetchableUrl(fileKey)
      // 记录成功日志
      logInfo('ArkTTSGenerator: TTS生成成功', { userId, fileKey })
      return {
        success: true,
        audioUrl
      }
    } catch (error) {
      // 记录错误日志
      logError('ArkTTSGenerator: TTS生成失败', { userId, error: (error as Error).message })
      throw error
    }
  }
  /**
   * 获取支持的音色列表
   */
  async getVoiceList(userId: string): Promise<Array<{ id: string; name: string; gender: 'male' | 'female' | 'neutral'; language: string }>> {
    // 记录日志
    logInfo('ArkTTSGenerator: 获取音色列表', { userId })
    const { apiKey } = await getProviderConfig(userId, 'ark')
    // 调用火山音色列表接口
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/audio/voices', {
      headers: { Authorization: `Bearer ${apiKey}` }
    })
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`获取音色列表失败 (${response.status}): ${errorText}`)
    }
    const data = await response.json()
    return data.voices.map((v: { id: string; name: string; gender: string; language: string }) => ({
      id: v.id,
      name: v.name,
      gender: v.gender,
      language: v.language
    }))
  }
}
