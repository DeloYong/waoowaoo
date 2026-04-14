import { logInfo, logError } from '@/lib/logging/core'
import { fetchWithTimeoutAndRetry } from '@/lib/ark-api'

// ============================================================
// 类型定义
// ============================================================

export interface ArkVoiceCloneInput {
  name: string
  audioUrl: string
  audioText?: string
  language?: string
  gender?: 'male' | 'female' | 'neutral'
}

export interface ArkVoiceCloneResult {
  success: boolean
  voiceId?: string
  voiceName?: string
  error?: string
  errorCode?: string
}

// ============================================================
// 常量
// ============================================================

const ARK_VOICE_CLONE_URL = 'https://ark.cn-beijing.volces.com/api/v3/audio/voices/clone'
const VOICE_CLONE_TIMEOUT_MS = 120_000
const VOICE_CLONE_MAX_RETRIES = 3

// ============================================================
// Ark 音色克隆（音频→音色）
// ============================================================

export async function createArkVoiceClone(
  input: ArkVoiceCloneInput,
  apiKey: string,
): Promise<ArkVoiceCloneResult> {
  if (!apiKey) {
    return {
      success: false,
      error: '请配置火山引擎 API Key',
    }
  }

  if (!input.name || !input.name.trim()) {
    return { success: false, error: '音色名称不能为空' }
  }

  if (!input.audioUrl || !input.audioUrl.trim()) {
    return { success: false, error: '音频地址不能为空' }
  }

  logInfo('[Ark VoiceClone] 开始音色克隆', { name: input.name, audioUrl: input.audioUrl })

  try {
    // 下载音频文件
    const audioResponse = await fetch(input.audioUrl)
    if (!audioResponse.ok) {
      const errorText = await audioResponse.text()
      return {
        success: false,
        error: `音频下载失败 (${audioResponse.status}): ${errorText}`,
      }
    }

    const audioBuffer = await audioResponse.arrayBuffer()

    // 构建 multipart/form-data
    const formData = new FormData()
    formData.append('name', input.name)
    formData.append('audio', new Blob([audioBuffer]), 'audio.mp3')
    if (input.audioText) formData.append('text', input.audioText)
    formData.append('language', input.language || 'zh')
    if (input.gender) formData.append('gender', input.gender)

    // 调用克隆接口
    const response = await fetchWithTimeoutAndRetry(ARK_VOICE_CLONE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
      timeoutMs: VOICE_CLONE_TIMEOUT_MS,
      maxRetries: VOICE_CLONE_MAX_RETRIES,
      logPrefix: '[Ark VoiceClone]',
    })

    const data = await response.json() as {
      id?: string
      name?: string
      status?: string
      error?: { code?: string; message?: string }
      code?: string
      message?: string
    }

    if (response.ok && data.id) {
      logInfo('[Ark VoiceClone] 音色克隆成功', { voiceId: data.id, name: data.name })
      return {
        success: true,
        voiceId: data.id,
        voiceName: data.name,
      }
    }

    const errorMsg = data.error?.message || data.message || '音色克隆 API 调用失败'
    const errorCode = data.error?.code || data.code

    logError('[Ark VoiceClone] 音色克隆失败', { errorCode, errorMsg })
    return {
      success: false,
      error: errorMsg,
      errorCode,
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '网络请求失败'
    logError('[Ark VoiceClone] 网络请求失败', { error: message })
    return {
      success: false,
      error: message,
    }
  }
}
