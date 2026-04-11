import { type GenerateResult } from './base'
import { getProviderConfig } from '@/lib/api-config'
import { logInfo, logError } from '@/lib/logging/core'

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
   * 克隆自定义音色
   */
  async cloneVoice(params: VoiceCloneParams): Promise<GenerateResult> {
    const { userId, name, audioUrl, audioText, language = 'zh', gender = 'neutral' } = params
    logInfo('ArkVoiceDesignGenerator: 开始克隆音色', { userId, name, audioUrl })

    try {
      const { apiKey } = await getProviderConfig(userId, 'ark')

      // 下载音频
      const audioResponse = await fetch(audioUrl)
      if (!audioResponse.ok) {
        const errorText = await audioResponse.text()
        throw new Error(`音频下载失败 (${audioResponse.status}): ${errorText}`)
      }

      const formData = new FormData()
      formData.append('name', name)
      formData.append('audio', new Blob([await audioResponse.arrayBuffer()]), 'audio.mp3')
      if (audioText) formData.append('text', audioText)
      formData.append('language', language)
      formData.append('gender', gender)

      // 调用克隆接口
      const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/audio/voices/clone', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`音色克隆失败: ${error.message || response.statusText}`)
      }

      const data = await response.json()
      logInfo('ArkVoiceDesignGenerator: 音色克隆成功', { userId, voiceId: data.id, name })

      return {
        success: true,
        metadata: {
          voiceId: data.id,
          name,
          status: data.status,
          provider: 'ark'
        }
      }
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

      const response = await fetch(`https://ark.cn-beijing.volces.com/api/v3/audio/voices/${voiceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${apiKey}` }
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`删除音色失败 (${response.status}): ${errorText}`)
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
  async getUserVoices(userId: string): Promise<Array<any>> {
    logInfo('ArkVoiceDesignGenerator: 获取用户音色列表', { userId })

    try {
      const { apiKey } = await getProviderConfig(userId, 'ark')

      const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/audio/voices?type=custom', {
        headers: { Authorization: `Bearer ${apiKey}` }
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`获取音色列表失败 (${response.status}): ${errorText}`)
      }

      const data = await response.json()
      logInfo('ArkVoiceDesignGenerator: 获取音色列表成功', { userId, count: data.voices?.length || 0 })
      return data.voices || []
    } catch (error) {
      logError('ArkVoiceDesignGenerator: 获取音色列表失败', { userId, error: (error as Error).message })
      throw error
    }
  }
}
