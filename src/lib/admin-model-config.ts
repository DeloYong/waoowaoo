/**
 * 管理员模型配置类型定义
 * 从main分支迁移并简化
 */
import type { ModelCapabilities } from '@/lib/model-config-contract'

export interface AdminProvider {
  id: string
  name: string
  baseUrl?: string
  apiKey: string
  hasApiKey: boolean
  models: AdminModel[]
}

export interface AdminModel {
  modelId: string
  modelKey: string  // provider::modelId
  name: string
  type: 'llm' | 'image' | 'video' | 'audio' | 'lipsync' | 'voicedesign'
  provider: string
  enabled: boolean
  capabilities?: ModelCapabilities
}

export interface AdminModelConfigData {
  providers: Array<{
    id: string
    name: string
    apiKey: string  // 加密存储
    models: Array<{
      modelId: string
      enabled: boolean
    }>
  }>
  updatedAt?: string
}

// 预设模型（简化版，仅包含核心字段）
export interface PresetModel {
  modelId: string
  name: string
  type: AdminModel['type']
  provider: string
}

// 预设Provider
export const ADMIN_PRESET_PROVIDERS = [
  { id: 'ark', name: 'Volcengine Ark (字节火山引擎)' },
  { id: 'fal', name: 'FAL.ai' },
  { id: 'google_ai', name: 'Google AI Studio' },
  { id: 'qwen', name: 'Alibaba Bailian (通义千问)' },
] as const

// 预设模型列表
export const ADMIN_PRESET_MODELS: PresetModel[] = [
  // Ark - LLM
  { modelId: 'doubao-seed-2-0-pro-260215', name: 'Doubao Seed 2.0 Pro', type: 'llm', provider: 'ark' },
  { modelId: 'doubao-seed-2-0-lite-260215', name: 'Doubao Seed 2.0 Lite', type: 'llm', provider: 'ark' },
  { modelId: 'doubao-seed-1-6-251015', name: 'Doubao Seed 1.6', type: 'llm', provider: 'ark' },
  // Ark - Image
  { modelId: 'doubao-seedream-4-5-251128', name: 'Seedream 4.5', type: 'image', provider: 'ark' },
  { modelId: 'doubao-seedream-5-0-260128', name: 'Seedream 5.0 Lite', type: 'image', provider: 'ark' },
  // Ark - Video
  { modelId: 'doubao-seedance-2-0-260128', name: 'Seedance 2.0', type: 'video', provider: 'ark' },
  { modelId: 'doubao-seedance-2-0-fast-260128', name: 'Seedance 2.0 Fast', type: 'video', provider: 'ark' },
  { modelId: 'doubao-seedance-1-5-pro-251215', name: 'Seedance 1.5 Pro', type: 'video', provider: 'ark' },
  // Ark - Audio
  { modelId: 'doubao-voice-design-v1', name: 'Doubao Voice Design', type: 'voicedesign', provider: 'ark' },
  // FAL - Image
  { modelId: 'banana', name: 'Banana Pro', type: 'image', provider: 'fal' },
  { modelId: 'banana-2', name: 'Banana 2', type: 'image', provider: 'fal' },
  // FAL - Video
  { modelId: 'fal-wan25', name: 'Wan 2.6', type: 'video', provider: 'fal' },
  { modelId: 'fal-veo31', name: 'Veo 3.1', type: 'video', provider: 'fal' },
  { modelId: 'fal-sora2', name: 'Sora 2', type: 'video', provider: 'fal' },
  // FAL - Audio
  { modelId: 'fal-ai/index-tts-2/text-to-speech', name: 'IndexTTS 2', type: 'audio', provider: 'fal' },
  // FAL - Lipsync
  { modelId: 'fal-ai/kling-video/lipsync/audio-to-video', name: 'Kling Lip Sync', type: 'lipsync', provider: 'fal' },
  // Google AI - LLM
  { modelId: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', type: 'llm', provider: 'google_ai' },
  { modelId: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', type: 'llm', provider: 'google_ai' },
  // Google AI - Image
  { modelId: 'gemini-3-pro-image-preview', name: 'Gemini 3 Pro Image', type: 'image', provider: 'google_ai' },
  // Google AI - Video
  { modelId: 'veo-3.1-generate-preview', name: 'Veo 3.1', type: 'video', provider: 'google_ai' },
  { modelId: 'veo-3.1-fast-generate-preview', name: 'Veo 3.1 Fast', type: 'video', provider: 'google_ai' },
  // Qwen - LLM
  { modelId: 'qwen3.5-plus', name: 'Qwen 3.5 Plus', type: 'llm', provider: 'qwen' },
  { modelId: 'qwen3.5-flash', name: 'Qwen 3.5 Flash', type: 'llm', provider: 'qwen' },
  // Qwen - Audio
  { modelId: 'qwen3-tts-vd-2026-01-26', name: 'Qwen3 TTS', type: 'audio', provider: 'qwen' },
  { modelId: 'qwen-voice-design', name: 'Qwen Voice Design', type: 'voicedesign', provider: 'qwen' },
  // Qwen - Video (Wan)
  { modelId: 'wan2.6-i2v-flash', name: 'Wan2.6 I2V Flash', type: 'video', provider: 'qwen' },
  { modelId: 'wan2.6-i2v', name: 'Wan2.6 I2V', type: 'video', provider: 'qwen' },
  // 火山引擎-语音合成
  { modelId: 'doubao-tts-v1', name: '豆包TTS标准版', type: 'audio', provider: 'ark' },
  { modelId: 'doubao-tts-premium-v1', name: '豆包TTS精品版', type: 'audio', provider: 'ark' },
  { modelId: 'doubao-tts-long-v1', name: '豆包长文本TTS', type: 'audio', provider: 'ark' },
  // 火山引擎-音色设计
  { modelId: 'doubao-voice-clone-v1', name: '豆包音色克隆', type: 'voicedesign', provider: 'ark' },
  // 火山引擎-口型同步
  { modelId: 'doubao-lipsync-v1', name: '豆包口型同步', type: 'lipsync', provider: 'ark' },
]

// Provider到测试类型的映射
export const PROVIDER_TEST_TYPE_MAP: Record<string, string> = {
  'ark': 'ark',
  'fal': 'fal',
  'google_ai': 'google',
  'qwen': 'bailian',
}

// 工具函数
export function encodeModelKey(provider: string, modelId: string): string {
  return `${provider}::${modelId}`
}

export function parseModelKey(key: string): { provider: string; modelId: string } | null {
  const parts = key.split('::')
  if (parts.length !== 2) return null
  return { provider: parts[0], modelId: parts[1] }
}

export function getPresetModelsForProvider(providerId: string): PresetModel[] {
  return ADMIN_PRESET_MODELS.filter(m => m.provider === providerId)
}

export function getPresetModelsByType(type: AdminModel['type']): PresetModel[] {
  return ADMIN_PRESET_MODELS.filter(m => m.type === type)
}
