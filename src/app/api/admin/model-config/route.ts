/**
 * 管理员API：平台模型配置
 * GET  - 获取当前平台模型配置
 * POST - 保存平台模型配置
 * 
 * 配置存储在 system_config 表中，key 为 'platform.model_config'
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { getConfigRaw, setConfigRaw } from '@/lib/platform-config'

export type AdminModelConfig = {
  providers: Array<{
    id: string
    name: string
    apiKeyConfigured: boolean  // 是否已配置API Key
    models: Array<{
      modelId: string
      name: string
      type: string
      enabled: boolean
    }>
  }>
  updatedAt?: string
}

const CONFIG_KEY = 'platform.model_config' as const

export async function GET(request: NextRequest) {
  try {
    const adminId = await requireAdmin()
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 获取保存的配置
    const configRaw = await getConfigRaw(CONFIG_KEY)
    const config: AdminModelConfig = configRaw
      ? JSON.parse(configRaw)
      : { providers: [] }

    return NextResponse.json(config)
  } catch (error) {
    console.error('[admin/model-config] GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminId = await requireAdmin()
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const config: AdminModelConfig = {
      ...body,
      updatedAt: new Date().toISOString(),
    }

    await setConfigRaw(
      CONFIG_KEY,
      JSON.stringify(config),
      { updatedBy: adminId }
    )

    return NextResponse.json({ success: true, config })
  } catch (error) {
    console.error('[admin/model-config] POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
