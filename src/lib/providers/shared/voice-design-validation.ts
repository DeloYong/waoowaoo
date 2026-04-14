/**
 * 音色设计共享验证模块
 * 供 bailian 和 ark provider 共同使用
 */

export function validateVoicePrompt(voicePrompt: string): { valid: boolean; error?: string } {
  if (!voicePrompt || voicePrompt.trim().length === 0) {
    return { valid: false, error: '声音提示词不能为空' }
  }
  if (voicePrompt.length > 500) {
    return { valid: false, error: '声音提示词不能超过500个字符' }
  }
  return { valid: true }
}

export function validatePreviewText(previewText: string): { valid: boolean; error?: string } {
  if (!previewText || previewText.trim().length === 0) {
    return { valid: false, error: '预览文本不能为空' }
  }
  if (previewText.length < 5) {
    return { valid: false, error: '预览文本至少需要5个字符' }
  }
  if (previewText.length > 200) {
    return { valid: false, error: '预览文本不能超过200个字符' }
  }
  return { valid: true }
}
