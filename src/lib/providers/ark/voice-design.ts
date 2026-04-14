import { logInfo, logError } from '@/lib/logging/core'
import { fetchWithTimeoutAndRetry } from '@/lib/ark-api'
import { validateVoicePrompt, validatePreviewText } from '@/lib/providers/shared/voice-design-validation'

// ============================================================
// 类型定义
// ============================================================

export interface ArkVoiceDesignInput {
  voicePrompt: string
  previewText: string
  preferredName?: string
  language?: 'zh' | 'en'
}

export interface ArkVoiceDesignResult {
  success: boolean
  voiceId?: string
  audioBase64?: string
  sampleRate?: number
  responseFormat?: string
  error?: string
  errorCode?: string
}

// ============================================================
// 常量
// ============================================================

const ARK_VOICE_DESIGN_URL = 'https://ark.cn-beijing.volces.com/api/v3/audio/voices/design'
const VOICE_DESIGN_TIMEOUT_MS = 60_000
const VOICE_DESIGN_MAX_RETRIES = 3

// ============================================================
// Ark 音色设计（文本→音色）
// ============================================================

export async function createArkVoiceDesign(
  input: ArkVoiceDesignInput,
  apiKey: string,
): Promise<ArkVoiceDesignResult> {
  if (!apiKey) {
    return {
      success: false,
      error: '请配置火山引擎 API Key',
    }
  }

  // 验证输入
  const promptValidation = validateVoicePrompt(input.voicePrompt)
  if (!promptValidation.valid) {
    return { success: false, error: promptValidation.error }
  }

  const textValidation = validatePreviewText(input.previewText)
  if (!textValidation.valid) {
    return { success: false, error: textValidation.error }
  }

  const requestBody = {
    model: 'doubao-voice-design-v1',
    voice_prompt: input.voicePrompt,
    preview_text: input.previewText,
    preferred_name: input.preferredName || 'custom_voice',
    language: input.language || 'zh',
  }

  logInfo('[Ark VoiceDesign] 请求体:', JSON.stringify(requestBody, null, 2))

  try {
    const response = await fetchWithTimeoutAndRetry(ARK_VOICE_DESIGN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      timeoutMs: VOICE_DESIGN_TIMEOUT_MS,
      maxRetries: VOICE_DESIGN_MAX_RETRIES,
      logPrefix: '[Ark VoiceDesign]',
    })

    const data = await response.json() as {
      id?: string
      preview_audio?: string
      sample_rate?: number
      response_format?: string
      status?: string
      error?: { code?: string; message?: string }
      code?: string
      message?: string
    }

    if (response.ok && data.id) {
      logInfo('[Ark VoiceDesign] 音色设计成功', { voiceId: data.id, status: data.status })
      return {
        success: true,
        voiceId: data.id,
        audioBase64: data.preview_audio,
        sampleRate: data.sample_rate,
        responseFormat: data.response_format,
      }
    }

    // API 返回业务错误
    const errorMsg = data.error?.message || data.message || '音色设计 API 调用失败'
    const errorCode = data.error?.code || data.code

    logError('[Ark VoiceDesign] 音色设计失败', { errorCode, errorMsg })
    return {
      success: false,
      error: errorMsg,
      errorCode,
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '网络请求失败'
    logError('[Ark VoiceDesign] 网络请求失败', { error: message })
    return {
      success: false,
      error: message,
    }
  }
}
