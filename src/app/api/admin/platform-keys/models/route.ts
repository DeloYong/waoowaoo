/**
 * 管理员API：获取所有Provider的可用模型列表
 * GET /api/admin/platform-keys/models
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { getAllProviderModels, getProviderModels, clearModelsCache, type ProviderModelsResult } from '@/lib/platform-models'
import { apiHandler } from '@/lib/api-errors'

export const GET = apiHandler(async (request: Request) => {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const provider = searchParams.get('provider')
  const refresh = searchParams.get('refresh') === 'true'

  // 如果要求刷新，清除缓存
  if (refresh) {
    clearModelsCache()
  }

  let results: ProviderModelsResult | ProviderModelsResult[]

  if (provider) {
    // 获取单个Provider的模型
    if (!['ark', 'fal', 'google_ai', 'qwen'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider. Must be one of: ark, fal, google_ai, qwen' },
        { status: 400 }
      )
    }
    results = await getProviderModels(provider as 'ark' | 'fal' | 'google_ai' | 'qwen')
  } else {
    // 获取所有Provider的模型
    results = await getAllProviderModels()
  }

  return NextResponse.json({
    success: true,
    providers: results,
    timestamp: new Date().toISOString(),
  })
})
