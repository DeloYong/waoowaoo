/**
 * 多 Provider 共享的首末帧控制
 *
 * 解决:不同 provider(bailian/ark/siliconflow)的首末帧 payload 形状不同,
 * 统一通过这个 builder 来构造,避免每个 provider 重复实现校验逻辑
 *
 * 命名约定:
 * - "first-last-frame" = 首末帧都必填(kf2v 类)
 * - "first-frame-only" = 仅首帧(i2v 类)
 * - "first-last-frame-capable" = 支持首末帧但不强制(kf2v + wan2.7)
 */

const FIRST_LAST_FRAME_ONLY_MODELS = new Set<string>([
  'wan2.2-kf2v-flash',
  'wanx2.1-kf2v-plus',
])

const FIRST_LAST_FRAME_CAPABLE_MODELS = new Set<string>([
  ...FIRST_LAST_FRAME_ONLY_MODELS,
  'wan2.7-i2v',
])

export function supportsFirstLastFrame(modelId: string): boolean {
  return FIRST_LAST_FRAME_CAPABLE_MODELS.has(modelId)
}

export function isFirstLastFrameOnlyModel(modelId: string): boolean {
  return FIRST_LAST_FRAME_ONLY_MODELS.has(modelId)
}

export interface FirstLastFrameInput {
  model: string
  firstFrameUrl: string
  lastFrameUrl?: string
  prompt?: string
}

export interface FirstLastFrameOutput {
  /** 字段名:img_url (only-first) 或 first_frame_url + last_frame_url (kf2v) */
  [key: string]: string | undefined
}

/**
 * 构造首末帧请求体
 *
 * - 仅首帧 → { img_url, prompt }
 * - 首末帧 → { first_frame_url, last_frame_url, prompt }
 *
 * 校验:
 * - first-last-frame-only 模型必须有 lastFrameUrl
 * - 不支持首末帧的模型传入 lastFrameUrl 会抛错
 */
export function buildFirstLastFrameRequest(input: FirstLastFrameInput): FirstLastFrameOutput {
  const { model, firstFrameUrl, lastFrameUrl, prompt } = input

  if (!firstFrameUrl) {
    throw new Error('firstFrameUrl is required')
  }

  const hasLastFrame = !!lastFrameUrl

  if (isFirstLastFrameOnlyModel(model) && !hasLastFrame) {
    throw new Error(`lastFrameUrl is required for first-last-frame-only model: ${model}`)
  }

  if (hasLastFrame && !supportsFirstLastFrame(model)) {
    throw new Error(`Model ${model} does not support first-last-frame`)
  }

  if (hasLastFrame) {
    return {
      first_frame_url: firstFrameUrl,
      last_frame_url: lastFrameUrl,
      prompt,
    }
  }

  return {
    img_url: firstFrameUrl,
    prompt,
  }
}
