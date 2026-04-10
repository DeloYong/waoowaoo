import { prisma } from '@/lib/prisma'
import { composeModelKey, parseModelKeyStrict } from '@/lib/model-config-contract'
import { getPipelineModelKey } from '@/lib/platform-config'

type ResolveAnalysisModelInput = {
  userId: string
  inputModel?: unknown
  projectAnalysisModel?: unknown
}

function normalizeModelKey(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = parseModelKeyStrict(trimmed)
  if (!parsed) return null
  return composeModelKey(parsed.provider, parsed.modelId)
}

export async function resolveAnalysisModel(input: ResolveAnalysisModelInput): Promise<string> {
  const modelFromInput = normalizeModelKey(input.inputModel)
  if (modelFromInput) return modelFromInput

  const modelFromProject = normalizeModelKey(input.projectAnalysisModel)
  if (modelFromProject) return modelFromProject

  const userPreference = await prisma.userPreference.findUnique({
    where: { userId: input.userId },
    select: { analysisModel: true },
  })
  const modelFromUserPreference = normalizeModelKey(userPreference?.analysisModel)
  if (modelFromUserPreference) return modelFromUserPreference

  // 4. 【核心修复】新版平台配置 PlatformConfig.analysisModel（管理员后台写这里）
  const platformConfig = await prisma.platformConfig.findUnique({
    where: { configKey: 'api_config' },
    select: { analysisModel: true },
  })
  const modelFromPlatformConfig = normalizeModelKey(platformConfig?.analysisModel)
  if (modelFromPlatformConfig) return modelFromPlatformConfig

  // 5. 兼容旧版：SystemConfig.pipeline.model_assignments
  const systemModel = await getPipelineModelKey('analysis')
  if (systemModel) return systemModel

  throw new Error('ANALYSIS_MODEL_NOT_CONFIGURED: 请先在管理员后台配置分析模型')
}
