import { logInfo, logError } from '@/lib/logging/core'
import { arkListVoices, arkDeleteVoice } from '@/lib/ark-api'

// ============================================================
// 类型定义
// ============================================================

export interface ArkVoiceInfo {
  voiceId: string
  voiceName: string
  voiceType: 'system' | 'custom'
  gender?: 'male' | 'female' | 'neutral'
  language?: string
  description?: string
  createTime?: number
  status?: string
  previewAudioUrl?: string
}

export interface ArkListVoicesResult {
  success: boolean
  voices?: ArkVoiceInfo[]
  total?: number
  error?: string
}

export interface ArkDeleteVoiceResult {
  success: boolean
  error?: string
}

// ============================================================
// Ark 音色管理
// ============================================================

/**
 * 获取用户自定义音色列表
 */
export async function listArkVoices(
  apiKey: string,
  options?: {
    type?: 'system' | 'custom' | 'all'
    language?: string
  },
): Promise<ArkListVoicesResult> {
  if (!apiKey) {
    return {
      success: false,
      error: '请配置火山引擎 API Key',
    }
  }

  const type = options?.type || 'custom'
  logInfo('[Ark VoiceManage] 查询音色列表', { type, language: options?.language })

  try {
    const data = await arkListVoices({
      apiKey,
      type,
      language: options?.language,
    })

    const voices: ArkVoiceInfo[] = (data.voices || []).map((v) => ({
      voiceId: v.voice_id,
      voiceName: v.voice_name,
      voiceType: v.voice_type,
      gender: v.gender,
      language: v.language,
      description: v.description,
      createTime: v.create_time,
      status: v.status,
      previewAudioUrl: v.preview_audio_url,
    }))

    logInfo('[Ark VoiceManage] 查询音色列表成功', { total: data.total, count: voices.length })

    return {
      success: true,
      voices,
      total: data.total,
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询音色列表失败'
    logError('[Ark VoiceManage] 查询音色列表失败', { error: message })
    return {
      success: false,
      error: message,
    }
  }
}

/**
 * 删除自定义音色
 */
export async function deleteArkVoice(
  voiceId: string,
  apiKey: string,
): Promise<ArkDeleteVoiceResult> {
  if (!apiKey) {
    return {
      success: false,
      error: '请配置火山引擎 API Key',
    }
  }

  if (!voiceId) {
    return { success: false, error: 'voiceId 不能为空' }
  }

  logInfo('[Ark VoiceManage] 删除音色', { voiceId })

  try {
    await arkDeleteVoice(
      { voice_id: voiceId },
      { apiKey },
    )

    logInfo('[Ark VoiceManage] 删除音色成功', { voiceId })
    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '删除音色失败'
    logError('[Ark VoiceManage] 删除音色失败', { voiceId, error: message })
    return {
      success: false,
      error: message,
    }
  }
}
