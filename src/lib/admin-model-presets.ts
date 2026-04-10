/**
 * 预设Provider和模型定义（管理员后台和用户端共享）
 * 从main分支迁移而来
 */

export interface Provider {
  id: string
  name: string
  baseUrl?: string
  apiKey?: string
  hasApiKey?: boolean
  hidden?: boolean
  apiMode?: 'gemini-sdk' | 'openai-official'
  gatewayRoute?: 'official' | 'openai-compat'
}

export interface PresetModel {
  modelId: string
  name: string
  type: 'llm' | 'image' | 'video' | 'audio' | 'lipsync' | 'voicedesign'
  provider: string
}

// 预设Provider（平台级）
export const ADMIN_PRESET_PROVIDERS: Omit<Provider, 'apiKey' | 'hasApiKey'>[] = [
  { id: 'ark', name: 'Volcengine Ark (字节火山引擎)' },
  { id: 'fal', name: 'FAL.ai' },
  { id: 'google_ai', name: 'Google AI Studio' },
  { id: 'qwen', name: 'Alibaba Bailian (通义千问)' },
]

// 预设模型 - 按Provider分组
export const ADMIN_PRESET_MODELS: PresetModel[] = [
  // ===== Ark (字节火山引擎) =====
  // 文本模型
  { modelId: 'doubao-seed-1-8-251228', name: 'Doubao Seed 1.8', type: 'llm', provider: 'ark' },
  { modelId: 'doubao-seed-2-0-pro-260215', name: 'Doubao Seed 2.0 Pro', type: 'llm', provider: 'ark' },
  { modelId: 'doubao-seed-2-0-lite-260215', name: 'Doubao Seed 2.0 Lite', type: 'llm', provider: 'ark' },
  { modelId: 'doubao-seed-2-0-mini-260215', name: 'Doubao Seed 2.0 Mini', type: 'llm', provider: 'ark' },
  { modelId: 'doubao-seed-1-6-251015', name: 'Doubao Seed 1.6', type: 'llm', provider: 'ark' },
  { modelId: 'doubao-seed-1-6-lite-251015', name: 'Doubao Seed 1.6 Lite', type: 'llm', provider: 'ark' },
  // 图像模型
  { modelId: 'doubao-seedream-4-5-251128', name: 'Seedream 4.5', type: 'image', provider: 'ark' },
  { modelId: 'doubao-seedream-4-0-250828', name: 'Seedream 4.0', type: 'image', provider: 'ark' },
  { modelId: 'doubao-seedream-5-0-260128', name: 'Seedream 5.0 Lite', type: 'image', provider: 'ark' },
  // 视频模型
  { modelId: 'doubao-seedance-1-0-pro-fast-251015', name: 'Seedance 1.0 Pro Fast', type: 'video', provider: 'ark' },
  { modelId: 'doubao-seedance-1-0-lite-i2v-250428', name: 'Seedance 1.0 Lite', type: 'video', provider: 'ark' },
  { modelId: 'doubao-seedance-1-5-pro-251215', name: 'Seedance 1.5 Pro', type: 'video', provider: 'ark' },
  { modelId: 'doubao-seedance-2-0-260128', name: 'Seedance 2.0', type: 'video', provider: 'ark' },
  { modelId: 'doubao-seedance-2-0-fast-260128', name: 'Seedance 2.0 Fast', type: 'video', provider: 'ark' },
  { modelId: 'doubao-seedance-1-0-pro-250528', name: 'Seedance 1.0 Pro', type: 'video', provider: 'ark' },

  // ===== FAL.ai =====
  // 图像模型
  { modelId: 'banana', name: 'Banana Pro', type: 'image', provider: 'fal' },
  { modelId: 'banana-2', name: 'Banana 2', type: 'image', provider: 'fal' },
  // 视频模型
  { modelId: 'fal-wan25', name: 'Wan 2.6', type: 'video', provider: 'fal' },
  { modelId: 'fal-veo31', name: 'Veo 3.1', type: 'video', provider: 'fal' },
  { modelId: 'fal-sora2', name: 'Sora 2', type: 'video', provider: 'fal' },
  { modelId: 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video', name: 'Kling 2.5 Turbo Pro', type: 'video', provider: 'fal' },
  { modelId: 'fal-ai/kling-video/v3/standard/image-to-video', name: 'Kling 3 Standard', type: 'video', provider: 'fal' },
  { modelId: 'fal-ai/kling-video/v3/pro/image-to-video', name: 'Kling 3 Pro', type: 'video', provider: 'fal' },
  // 音频模型
  { modelId: 'fal-ai/index-tts-2/text-to-speech', name: 'IndexTTS 2', type: 'audio', provider: 'fal' },
  // 唇形同步
  { modelId: 'fal-ai/kling-video/lipsync/audio-to-video', name: 'Kling Lip Sync', type: 'lipsync', provider: 'fal' },

  // ===== Google AI Studio =====
  // 文本模型
  { modelId: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', type: 'llm', provider: 'google_ai' },
  { modelId: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', type: 'llm', provider: 'google_ai' },
  { modelId: 'gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash-Lite', type: 'llm', provider: 'google_ai' },
  // 图像模型
  { modelId: 'gemini-3-pro-image-preview', name: 'Gemini 3 Pro Image', type: 'image', provider: 'google_ai' },
  { modelId: 'gemini-3.1-flash-image-preview', name: 'Gemini 3.1 Flash Image', type: 'image', provider: 'google_ai' },
  // 视频模型
  { modelId: 'veo-3.1-generate-preview', name: 'Veo 3.1', type: 'video', provider: 'google_ai' },
  { modelId: 'veo-3.1-fast-generate-preview', name: 'Veo 3.1 Fast', type: 'video', provider: 'google_ai' },
  { modelId: 'veo-3.0-generate-001', name: 'Veo 3.0', type: 'video', provider: 'google_ai' },
  { modelId: 'veo-3.0-fast-generate-001', name: 'Veo 3.0 Fast', type: 'video', provider: 'google_ai' },

  // ===== Qwen (通义千问) =====
  // 文本模型
  { modelId: 'qwen3.5-plus', name: 'Qwen 3.5 Plus', type: 'llm', provider: 'qwen' },
  { modelId: 'qwen3.5-flash', name: 'Qwen 3.5 Flash', type: 'llm', provider: 'qwen' },
  // 音频模型
  { modelId: 'qwen3-tts-vd-2026-01-26', name: 'Qwen3 TTS', type: 'audio', provider: 'qwen' },
  { modelId: 'qwen-voice-design', name: 'Qwen Voice Design', type: 'voicedesign', provider: 'qwen' },
  // 视频模型 (Wan系列)
  { modelId: 'wan2.6-i2v-flash', name: 'Wan2.6 I2V Flash', type: 'video', provider: 'qwen' },
  { modelId: 'wan2.6-i2v', name: 'Wan2.6 I2V', type: 'video', provider: 'qwen' },
  { modelId: 'wan2.5-i2v-preview', name: 'Wan2.5 I2V Preview', type: 'video', provider: 'qwen' },
]

// Provider类型到测试API类型的映射
export const PROVIDER_TO_TEST_TYPE: Record<string, string> = {
  'ark': 'ark',
  'fal': 'fal',
  'google_ai': 'google',
  'qwen': 'bailian',
}

// 获取Provider的预设模型
export function getPresetModelsForProvider(providerId: string): PresetModel[] {
  return ADMIN_PRESET_MODELS.filter(m => m.provider === providerId)
}

// 获取所有预设模型按类型分组
export function getPresetModelsByType(type: PresetModel['type']): PresetModel[] {
  return ADMIN_PRESET_MODELS.filter(m => m.type === type)
}

// 编码模型Key
export function encodeAdminModelKey(provider: string, modelId: string): string {
  return `${provider}::${modelId}`
}

// 解析模型Key
export function parseAdminModelKey(key: string): { provider: string; modelId: string } | null {
  const parts = key.split('::')
  if (parts.length !== 2) return null
  return { provider: parts[0], modelId: parts[1] }
}
