/**
 * 管理员API：测试Provider连接
 * POST /api/admin/platform-keys/test
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { testProviderConnection } from '@/lib/user-api/provider-test'
import { getPlatformApiKey } from '@/lib/platform-config'

export async function POST(request: NextRequest) {
  try {
    const adminId = await requireAdmin()
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { provider } = body as { provider: string }

    if (!provider) {
      return NextResponse.json(
        { error: 'Missing provider parameter' },
        { status: 400 }
      )
    }

    // 获取该provider的API Key
    const providerKeyMap: Record<string, 'llm' | 'fal' | 'ark' | 'google_ai' | 'qwen'> = {
      'llm': 'llm',
      'fal': 'fal',
      'ark': 'ark',
      'google_ai': 'google_ai',
      'qwen': 'qwen',
    }

    const configKey = providerKeyMap[provider]
    if (!configKey) {
      return NextResponse.json(
        { error: `Unknown provider: ${provider}` },
        { status: 400 }
      )
    }

    const apiKey = await getPlatformApiKey(configKey)
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API Key not configured' },
        { status: 400 }
      )
    }

    // 映射到测试函数支持的apiType
    const apiTypeMap: Record<string, 'openrouter' | 'fal' | 'ark' | 'google' | 'bailian'> = {
      'llm': 'openrouter',
      'fal': 'fal',
      'ark': 'ark',
      'google_ai': 'google',
      'qwen': 'bailian',
    }

    const apiType = apiTypeMap[provider]
    if (!apiType) {
      return NextResponse.json(
        { error: `Unsupported provider: ${provider}` },
        { status: 400 }
      )
    }

    // 调用测试函数
    const result = await testProviderConnection({
      apiType,
      apiKey,
    })

    return NextResponse.json({
      success: result.success,
      steps: result.steps,
    })
  } catch (error) {
    console.error('[admin/platform-keys/test] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
