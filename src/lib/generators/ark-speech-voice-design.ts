import { type GenerateResult } from './base'
import { getProviderConfig } from '@/lib/api-config'
import { logInfo, logError } from '@/lib/logging/core'
import { createArkVoiceDesign, type ArkVoiceDesignResult } from '@/lib/providers/ark/voice-design'
import { createArkVoiceClone, type ArkVoiceCloneResult } from '@/lib/providers/ark/voice-clone'
import { listArkVoices, deleteArkVoice, type ArkListVoicesResult, type ArkDeleteVoiceResult } from '@/lib/providers/ark/voice-manage'

interface VoiceCloneParams {
  userId: string
  name: string
  audioUrl: string
  audioText?: string
  language?: string
  gender?: 'male' | 'female' | 'neutral'
}

interface VoiceManageParams {
  userId: string
  voiceId: string
  action: 'delete' | 'preview' | 'list'
}

export class ArkVoiceDesignGenerator {
  /**
   * 通过文本提示创建音色（文本→音色）
   */
  async createVoiceFromPrompt(params: {
    userId: string
    voicePrompt: string
    previewText: string
    preferredName?: string
    language?: string
  }): Promise<GenerateResult> {
    try {
      const { apiKey } = await getProviderConfig(params.userId, 'ark')
      const result: ArkVoiceDesignResult = await createArkVoiceDesign({
        voicePrompt: params.voicePrompt,
        previewText: params.previewText,
        preferredName: params.preferredName,
        language: params.language as 'zh' | 'en' | undefined,
      }, apiKey)
      if (!result.success) {
        throw new Error(result.error || '音色设计失败')
      }
      logInfo('ArkVoiceDesignGenerator: 音色设计成功', { userId: params.userId, voiceId: result.voiceId })
      return {
        success: true,
        audioUrl: result.audioBase64 ? `data:audio/wav;base64,${result.audioBase64}` : undefined,
      }
    } catch (error) {
      logError('ArkVoiceDesignGenerator: 音色设计失败', { userId: params.userId, error: (error as Error).message })
      throw error
    }
  }

  /**
   * 克隆自定义音色
   */
  async cloneVoice(params: VoiceCloneParams): Promise<GenerateResult> {
    const { userId, name, audioUrl, audioText, language = 'zh', gender = 'neutral' } = params
    logInfo('ArkVoiceDesignGenerator: 开始克隆音色', { userId, name, audioUrl })

    try {
      const { apiKey } = await getProviderConfig(userId, 'ark')
      const result: ArkVoiceCloneResult = await createArkVoiceClone({
        name,
        audioUrl,
        audioText,
        language,
        gender,
      }, apiKey)

      if (!result.success) {
        throw new Error(result.error || '音色克隆失败')
      }

      logInfo('ArkVoiceDesignGenerator: 音色克隆成功', { userId, voiceId: result.voiceId, name })
      return { success: true }
    } catch (error) {
      logError('ArkVoiceDesignGenerator: 音色克隆失败', { userId, error: (error as Error).message })
      throw error
    }
  }

  /**
   * 删除自定义音色
   */
  async deleteVoice(params: VoiceManageParams): Promise<GenerateResult> {
    const { userId, voiceId } = params
    logInfo('ArkVoiceDesignGenerator: 开始删除音色', { userId, voiceId })

    try {
      const { apiKey } = await getProviderConfig(userId, 'ark')
      const result: ArkDeleteVoiceResult = await deleteArkVoice(voiceId, apiKey)

      if (!result.success) {
        throw new Error(result.error || '删除音色失败')
      }

      logInfo('ArkVoiceDesignGenerator: 音色删除成功', { userId, voiceId })
      return { success: true }
    } catch (error) {
      logError('ArkVoiceDesignGenerator: 音色删除失败', { userId, voiceId, error: (error as Error).message })
      throw error
    }
  }

  /**
   * 获取用户自定义音色列表
   */
  async getUserVoices(userId: string): Promise<Array<Record<string, unknown>>> {
    logInfo('ArkVoiceDesignGenerator: 获取用户音色列表', { userId })

    try {
      const { apiKey } = await getProviderConfig(userId, 'ark')
      const result: ArkListVoicesResult = await listArkVoices(apiKey, { type: 'custom' })

      if (!result.success) {
        throw new Error(result.error || '获取音色列表失败')
      }

      logInfo('ArkVoiceDesignGenerator: 获取音色列表成功', { userId, count: result.voices?.length || 0 })
      return (result.voices || []) as unknown as Array<Record<string, unknown>>
    } catch (error) {
      logError('ArkVoiceDesignGenerator: 获取音色列表失败', { userId, error: (error as Error).message })
      throw error
    }
  }
}
