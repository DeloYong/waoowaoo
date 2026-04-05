import { NextRequest, NextResponse } from 'next/server'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { requireAdmin } from '@/lib/admin/auth'
import {
  getAllConfigsForAdmin,
  setConfigRaw,
  setPlatformApiKey,
  type ConfigKey,
} from '@/lib/platform-config'

export const GET = apiHandler(async () => {
  const adminId = await requireAdmin()
  const configs = await getAllConfigsForAdmin()

  return NextResponse.json({ configs })
})

export const POST = apiHandler(async (request: NextRequest) => {
  const adminId = await requireAdmin()
  const body = await request.json()
  const { key, value } = body as { key: string; value?: string }

  if (!key) {
    throw new ApiError('INVALID_PARAMS')
  }

  const configKey = key as ConfigKey

  // 处理 API Key（自动加密）
  const providerKeyMap: Record<string, 'llm' | 'fal' | 'ark' | 'google_ai' | 'qwen'> = {
    'platform.llm_api_key': 'llm',
    'platform.fal_api_key': 'fal',
    'platform.ark_api_key': 'ark',
    'platform.google_ai_key': 'google_ai',
    'platform.qwen_api_key': 'qwen',
  }

  if (providerKeyMap[configKey] && value) {
    await setPlatformApiKey(providerKeyMap[configKey], value, { updatedBy: adminId })
  } else if (value !== undefined) {
    await setConfigRaw(configKey, value, { updatedBy: adminId })
  }

  return NextResponse.json({ success: true })
})
