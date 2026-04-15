import { logInfo, logError } from '@/lib/logging/core'
import * as crypto from 'crypto'

// ============================================================
// 类型定义
// ============================================================

export interface ArkLongTTSInput {
  text: string
  voiceType: string
  format?: 'mp3' | 'wav' | 'pcm'
  appid: string
  accessKey: string
}

export interface ArkLongTTSResult {
  success: boolean
  audioUrl?: string
  duration?: number
  taskId?: string
  error?: string
  errorCode?: string | number
}

// ============================================================
// 常量
// ============================================================

const OPENSPEECH_SUBMIT_URL = 'https://openspeech.bytedance.com/api/v1/tts_async/submit'
const OPENSPEECH_QUERY_URL = 'https://openspeech.bytedance.com/api/v1/tts_async/query'
const SUBMIT_TIMEOUT_MS = 30_000
const QUERY_TIMEOUT_MS = 15_000
const POLL_INTERVAL_MS = 2_000
const MAX_POLL_DURATION_MS = 300_000

// ============================================================
// 签名
// ============================================================

function generateOpenspeechSignature(
  method: string,
  resourcePath: string,
  timestamp: string,
  accessKey: string,
): string {
  const stringToSign = `${method}\n${resourcePath}\n${timestamp}`
  return crypto.createHmac('sha256', accessKey).update(stringToSign).digest('base64')
}

// ============================================================
// 环境变量
// ============================================================

function getOpenspeechCredentials(): { appid: string; accessKey: string } {
  const appid = process.env.ARK_OPENSPEECH_APP_ID || ''
  const accessKey = process.env.ARK_OPENSPEECH_ACCESS_KEY || ''
  if (!appid || !accessKey) {
    throw new Error('ARK_OPENSPEECH_APP_ID 和 ARK_OPENSPEECH_ACCESS_KEY 环境变量未配置')
  }
  return { appid, accessKey }
}

// ============================================================
// 提交异步任务
// ============================================================

export async function submitLongTTS(
  input: ArkLongTTSInput,
): Promise<{ taskId: string }> {
  const { text, voiceType, format, appid, accessKey } = input
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const resourcePath = '/api/v1/tts_async/submit'
  const signature = generateOpenspeechSignature('POST', resourcePath, timestamp, accessKey)

  const requestBody = {
    appid,
    text,
    voice_type: voiceType,
    format: format || 'mp3',
  }

  logInfo('[Ark LongTTS] 提交异步任务', { voiceType, format: format || 'mp3', textLength: text.length })

  const response = await fetch(OPENSPEECH_SUBMIT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-App-Id': appid,
      'X-Api-Access-Key': accessKey,
      'X-Api-Timestamp': timestamp,
      'X-Api-Resource-Path': resourcePath,
      'X-Api-Signature': signature,
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(SUBMIT_TIMEOUT_MS),
  })

  const data = await response.json() as {
    code?: number
    message?: string
    data?: { task_id?: string }
  }

  if (response.ok && data.code === 0 && data.data?.task_id) {
    logInfo('[Ark LongTTS] 任务提交成功', { taskId: data.data.task_id })
    return { taskId: data.data.task_id }
  }

  const errorMsg = data.message || '长文本 TTS 任务提交失败'
  const errorCode = data.code
  logError('[Ark LongTTS] 任务提交失败', { errorCode, errorMsg })
  throw new Error(`长文本 TTS 提交失败: ${errorMsg} (code: ${errorCode})`)
}

// ============================================================
// 查询任务状态
// ============================================================

export async function queryLongTTS(
  taskId: string,
  appid: string,
  accessKey: string,
): Promise<ArkLongTTSResult> {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const resourcePath = '/api/v1/tts_async/query'
  const signature = generateOpenspeechSignature('GET', resourcePath, timestamp, accessKey)

  const url = `${OPENSPEECH_QUERY_URL}?task_id=${encodeURIComponent(taskId)}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Api-App-Id': appid,
      'X-Api-Access-Key': accessKey,
      'X-Api-Timestamp': timestamp,
      'X-Api-Resource-Path': resourcePath,
      'X-Api-Signature': signature,
    },
    signal: AbortSignal.timeout(QUERY_TIMEOUT_MS),
  })

  const data = await response.json() as {
    code?: number
    message?: string
    data?: {
      task_id?: string
      status?: number  // 0=排队中, 1=处理中, 2=已完成, 3=失败
      audio_url?: string
      duration?: number
    }
  }

  if (!response.ok || data.code !== 0) {
    const errorMsg = data.message || '查询任务状态失败'
    const errorCode = data.code
    logError('[Ark LongTTS] 查询任务状态失败', { taskId, errorCode, errorMsg })
    return {
      success: false,
      taskId,
      error: errorMsg,
      errorCode,
    }
  }

  const status = data.data?.status
  if (status === 2) {
    logInfo('[Ark LongTTS] 任务完成', { taskId, duration: data.data?.duration })
    return {
      success: true,
      taskId,
      audioUrl: data.data?.audio_url,
      duration: data.data?.duration,
    }
  }

  if (status === 3) {
    logError('[Ark LongTTS] 任务失败', { taskId })
    return {
      success: false,
      taskId,
      error: '长文本 TTS 异步任务处理失败',
      errorCode: 3,
    }
  }

  // 排队中或处理中
  return {
    success: false,
    taskId,
    error: `任务进行中 (status: ${status})`,
    errorCode: status,
  }
}

// ============================================================
// 完整流程：提交 → 轮询 → 返回结果
// ============================================================

export async function createArkLongTTS(
  input: ArkLongTTSInput,
): Promise<ArkLongTTSResult> {
  const { appid, accessKey } = input

  if (!appid || !accessKey) {
    return {
      success: false,
      error: '请配置 openspeech appid 和 accessKey',
    }
  }

  try {
    // 提交任务
    const { taskId } = await submitLongTTS(input)

    // 轮询等待
    const startTime = Date.now()
    while (Date.now() - startTime < MAX_POLL_DURATION_MS) {
      const result = await queryLongTTS(taskId, appid, accessKey)

      if (result.success) {
        return result
      }

      // 任务失败
      if (result.errorCode === 3) {
        return result
      }

      // 排队中或处理中，等待后重试
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
    }

    // 超时
    logError('[Ark LongTTS] 轮询超时', { taskId })
    return {
      success: false,
      taskId,
      error: `长文本 TTS 超时（${MAX_POLL_DURATION_MS / 1000}秒）`,
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '网络请求失败'
    logError('[Ark LongTTS] 网络请求失败', { error: message })
    return {
      success: false,
      error: message,
    }
  }
}

// ============================================================
// 便捷函数（自动读取环境变量）
// ============================================================

export async function synthesizeLongTTS(params: {
  text: string
  voiceType: string
  format?: 'mp3' | 'wav' | 'pcm'
}): Promise<ArkLongTTSResult> {
  const { appid, accessKey } = getOpenspeechCredentials()
  return createArkLongTTS({
    text: params.text,
    voiceType: params.voiceType,
    format: params.format,
    appid,
    accessKey,
  })
}
