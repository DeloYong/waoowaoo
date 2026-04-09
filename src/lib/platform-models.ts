/**
 * 获取各Provider的可用模型列表
 * 用于管理后台配置流程模型时展示可选模型
 */
import { getPlatformApiKey } from './platform-config'
import { setProxy } from '../../lib/prompts/proxy'
import { LRUCache } from 'lru-cache'

export interface ProviderModel {
  id: string
  name?: string
  provider: string
}

export interface ProviderModelsResult {
  provider: string
  models: ProviderModel[]
  success: boolean
  error?: string
}

// 模型列表缓存 5 分钟
const modelsCache = new LRUCache<string, ProviderModelsResult>({
  max: 10,
  ttl: 5 * 60 * 1000, // 5分钟
})

/**
 * 获取Ark(字节火山引擎)的可用模型
 */
async function getArkModels(apiKey: string): Promise<ProviderModelsResult> {
  try {
    // Ark没有公开的模型列表API，使用已知模型列表
    const knownModels = [
      'doubao-seed-2-0-lite-260215',
      'doubao-seed-2-0-code-preview',
      'doubao-seed-1-6-large-250715',
      'doubao-seed-1-6-flash-250715',
    ]

    // 测试连接
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: knownModels[0],
        input: [{ role: 'user', content: [{ type: 'input_text', text: 'hi' }] }],
        max_tokens: 10,
      }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      return {
        provider: 'ark',
        models: [],
        success: false,
        error: `API连接失败 (${response.status})`,
      }
    }

    return {
      provider: 'ark',
      models: knownModels.map(id => ({ id, provider: 'ark' })),
      success: true,
    }
  } catch (error) {
    return {
      provider: 'ark',
      models: [],
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    }
  }
}

/**
 * 获取FAL.ai的可用模型
 */
async function getFalModels(apiKey: string): Promise<ProviderModelsResult> {
  try {
    await setProxy()
    const response = await fetch('https://api.fal.ai/v1/models?limit=100', {
      headers: {
        'Authorization': `Key ${apiKey}`,
      },
      signal: AbortSignal.timeout(15_000),
    })

    if (!response.ok) {
      return {
        provider: 'fal',
        models: [],
        success: false,
        error: `API连接失败 (${response.status})`,
      }
    }

    const data = await response.json() as { models?: Array<{ endpoint_id?: string; name?: string }> }
    const models: ProviderModel[] = (data.models || [])
      .filter(m => m.endpoint_id)
      .map(m => ({
        id: m.endpoint_id!,
        name: m.name,
        provider: 'fal',
      }))

    return {
      provider: 'fal',
      models,
      success: true,
    }
  } catch (error) {
    return {
      provider: 'fal',
      models: [],
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    }
  }
}

/**
 * 获取Google AI的可用模型
 */
async function getGoogleAiModels(apiKey: string): Promise<ProviderModelsResult> {
  try {
    await setProxy()
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
      headers: {
        'x-goog-api-key': apiKey,
      },
      signal: AbortSignal.timeout(15_000),
    })

    if (!response.ok) {
      return {
        provider: 'google_ai',
        models: [],
        success: false,
        error: `API连接失败 (${response.status})`,
      }
    }

    const data = await response.json() as { models?: Array<{ name?: string; supportedGenerationMethods?: string[] }> }
    const models: ProviderModel[] = (data.models || [])
      .filter(m => m.name && m.name.startsWith('models/'))
      .map(m => ({
        id: m.name!.replace('models/', ''),
        name: m.name,
        provider: 'google_ai',
      }))

    return {
      provider: 'google_ai',
      models,
      success: true,
    }
  } catch (error) {
    return {
      provider: 'google_ai',
      models: [],
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    }
  }
}

/**
 * 获取通义千问(Qwen)的可用模型
 */
async function getQwenModels(apiKey: string): Promise<ProviderModelsResult> {
  try {
    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(15_000),
    })

    if (!response.ok) {
      return {
        provider: 'qwen',
        models: [],
        success: false,
        error: `API连接失败 (${response.status})`,
      }
    }

    const data = await response.json() as { data?: Array<{ id?: string }> }
    const models: ProviderModel[] = (data.data || [])
      .filter(m => m.id)
      .map(m => ({
        id: m.id!,
        provider: 'qwen',
      }))

    return {
      provider: 'qwen',
      models,
      success: true,
    }
  } catch (error) {
    return {
      provider: 'qwen',
      models: [],
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    }
  }
}

/**
 * 获取所有Provider的可用模型
 * 并行请求所有已配置API Key的Provider
 */
export async function getAllProviderModels(): Promise<ProviderModelsResult[]> {
  const [arkKey, falKey, googleAiKey, qwenKey] = await Promise.all([
    getPlatformApiKey('ark'),
    getPlatformApiKey('fal'),
    getPlatformApiKey('google_ai'),
    getPlatformApiKey('qwen'),
  ])

  const promises: Promise<ProviderModelsResult>[] = []

  if (arkKey) {
    promises.push(getArkModels(arkKey))
  }

  if (falKey) {
    promises.push(getFalModels(falKey))
  }

  if (googleAiKey) {
    promises.push(getGoogleAiModels(googleAiKey))
  }

  if (qwenKey) {
    promises.push(getQwenModels(qwenKey))
  }

  if (promises.length === 0) {
    return []
  }

  return Promise.all(promises)
}

/**
 * 获取指定Provider的可用模型
 */
export async function getProviderModels(provider: 'ark' | 'fal' | 'google_ai' | 'qwen'): Promise<ProviderModelsResult> {
  const apiKey = await getPlatformApiKey(provider)

  if (!apiKey) {
    return {
      provider,
      models: [],
      success: false,
      error: '未配置API Key',
    }
  }

  switch (provider) {
    case 'ark':
      return getArkModels(apiKey)
    case 'fal':
      return getFalModels(apiKey)
    case 'google_ai':
      return getGoogleAiModels(apiKey)
    case 'qwen':
      return getQwenModels(apiKey)
    default:
      return {
        provider,
        models: [],
        success: false,
        error: '不支持的Provider',
      }
  }
}

/**
 * 清除所有模型缓存（用于强制刷新）
 */
export function clearModelsCache(): void {
  modelsCache.clear()
}
