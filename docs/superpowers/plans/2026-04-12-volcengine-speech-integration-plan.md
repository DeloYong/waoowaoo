# 火山引擎语音能力接入实现计划
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
**Goal:** 完整接入火山引擎三类语音能力（TTS/音色设计/口型同步），支持双提供商切换，原有阿里云功能完全保留
**Architecture:** 新增火山语音生成器实现，完全适配现有统一接口，后台新增对应模型预设，前台新增提供商切换选项，不修改原有阿里云相关逻辑
**Tech Stack:** Next.js 15, TypeScript, 火山引擎ARK API, 现有生成器架构
---
## 文件映射
| 操作 | 文件路径 | 说明 |
|------|---------|------|
| 修改 | `src/lib/admin-model-config.ts` | 新增火山语音相关预设模型 |
| 新建 | `src/lib/generators/ark-speech-tts.ts` | 火山TTS生成器实现 |
| 新建 | `src/lib/generators/ark-speech-voice-design.ts` | 火山音色设计生成器实现 |
| 新建 | `src/lib/generators/ark-speech-lipsync.ts` | 火山口型同步生成器实现 |
| 修改 | `src/lib/generators/factory.ts` | 注册新增的火山语音生成器 |
| 修改 | `src/app/[locale]/admin/platform-keys/PlatformConfigPage.tsx` | 新增火山语音相关全局配置选项 |
| 新建 | `src/components/voice/ProviderSelector.tsx` | 语音提供商切换下拉组件 |
| 修改 | `src/lib/credit-billing/catalog.ts` | 新增火山语音模型计费配置 |
| 测试 | `tests/unit/generators/ark-speech.test.ts` | 单元测试 |
---
## 任务分解
### Task 1: 新增火山语音预设模型
**Files:**
- Modify: `src/lib/admin-model-config.ts`
**Steps:**
- [ ] **Step 1: 添加火山语音模型到预设列表**
在`ADMIN_PRESET_MODELS`数组最后添加：
```typescript
// 火山引擎-语音合成
{ modelId: 'doubao-tts-v1', name: '豆包TTS标准版', type: 'audio', provider: 'ark' },
{ modelId: 'doubao-tts-premium-v1', name: '豆包TTS精品版', type: 'audio', provider: 'ark' },
{ modelId: 'doubao-tts-long-v1', name: '豆包长文本TTS', type: 'audio', provider: 'ark' },
// 火山引擎-音色设计
{ modelId: 'doubao-voice-clone-v1', name: '豆包音色克隆', type: 'voice-design', provider: 'ark' },
// 火山引擎-口型同步
{ modelId: 'doubao-lipsync-v1', name: '豆包口型同步', type: 'lipsync', provider: 'ark' },
```
- [ ] **Step 2: 运行类型检查确认无错误**
Run: `npm run typecheck`
Expected: 0 errors
- [ ] **Step 3: 提交代码**
```bash
git add src/lib/admin-model-config.ts
git commit -m "feat: 新增火山语音预设模型"
```
---
### Task 2: 实现火山TTS生成器
**Files:**
- Create: `src/lib/generators/ark-speech-tts.ts`
**Steps:**
- [ ] **Step 1: 编写TTS生成器类**
```typescript
import { BaseAudioGenerator, type AudioGenerateParams, type GenerateResult } from './base'
import { getProviderConfig } from '@/lib/api-config'
import { arkTTSGeneration } from '@/lib/ark-api'
import { createStorageProvider } from '@/lib/storage/factory'
export class ArkTTSGenerator extends BaseAudioGenerator {
  protected async doGenerate(params: AudioGenerateParams): Promise<GenerateResult> {
    const { userId, text, voice = 'zh_female_shuangyueqingxin', rate = 1.0, options = {} } = params
    const { apiKey } = await getProviderConfig(userId, 'ark')
    const { format = 'mp3', pitch = 1.0, volume = 1.0 } = options as Record<string, any>
    // 校验参数
    if (rate < 0.5 || rate > 2.0) throw new Error('语速范围0.5-2.0')
    if (pitch < 0.5 || pitch > 2.0) throw new Error('音调范围0.5-2.0')
    if (volume < 0 || volume > 2.0) throw new Error('音量范围0-2.0')
    // 调用火山API
    const result = await arkTTSGeneration({
      model: options.modelId || 'doubao-tts-v1',
      input: text,
      voice,
      format,
      speed: rate,
      pitch,
      volume
    }, { apiKey })
    if (!result.audio) throw new Error('TTS生成失败，无返回音频')
    // 上传到对象存储
    const storage = createStorageProvider()
    const fileKey = storage.generateUniqueKey({ prefix: 'audio/tts', ext: format })
    await storage.uploadObject({
      key: fileKey,
      body: Buffer.from(await result.audio.arrayBuffer()),
      contentType: result.contentType
    })
    const audioUrl = storage.toFetchableUrl(fileKey)
    return {
      success: true,
      audioUrl,
      metadata: {
        voice,
        rate,
        format,
        provider: 'ark'
      }
    }
  }
  /**
   * 获取支持的音色列表
   */
  async getVoiceList(userId: string): Promise<Array<{ id: string; name: string; gender: 'male' | 'female' | 'neutral'; language: string }>> {
    const { apiKey } = await getProviderConfig(userId, 'ark')
    // 调用火山音色列表接口
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/audio/voices', {
      headers: { Authorization: `Bearer ${apiKey}` }
    })
    if (!response.ok) throw new Error('获取音色列表失败')
    const data = await response.json()
    return data.voices.map((v: any) => ({
      id: v.id,
      name: v.name,
      gender: v.gender,
      language: v.language
    }))
  }
}
```
- [ ] **Step 2: 运行类型检查确认无错误**
Run: `npm run typecheck`
Expected: 0 errors
- [ ] **Step 3: 提交代码**
```bash
git add src/lib/generators/ark-speech-tts.ts
git commit -m "feat: 实现火山TTS生成器"
```
---
### Task 3: 实现火山音色设计生成器
**Files:**
- Create: `src/lib/generators/ark-speech-voice-design.ts`
**Steps:**
- [ ] **Step 1: 编写音色设计生成器类**
```typescript
import { BaseGenerator, type GenerateResult } from './base'
import { getProviderConfig } from '@/lib/api-config'
import { createStorageProvider } from '@/lib/storage/factory'
interface VoiceCloneParams {
  userId: string
  name: string
  audioUrl: string
  audioText?: string
  language?: string
  gender?: 'male' | 'female' | 'neutral'
}
interface VoiceManageParams {
  userId: string
  voiceId: string
  action: 'delete' | 'preview' | 'list'
}
export class ArkVoiceDesignGenerator extends BaseGenerator {
  /**
   * 克隆自定义音色
   */
  async cloneVoice(params: VoiceCloneParams): Promise<GenerateResult> {
    const { userId, name, audioUrl, audioText, language = 'zh', gender = 'neutral' } = params
    const { apiKey } = await getProviderConfig(userId, 'ark')
    // 下载音频
    const audioResponse = await fetch(audioUrl)
    if (!audioResponse.ok) throw new Error('音频下载失败')
    const formData = new FormData()
    formData.append('name', name)
    formData.append('audio', new Blob([await audioResponse.arrayBuffer()]), 'audio.mp3')
    if (audioText) formData.append('text', audioText)
    formData.append('language', language)
    formData.append('gender', gender)
    // 调用克隆接口
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/audio/voices/clone', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`音色克隆失败: ${error.message || response.statusText}`)
    }
    const data = await response.json()
    return {
      success: true,
      metadata: {
        voiceId: data.id,
        name,
        status: data.status,
        provider: 'ark'
      }
    }
  }
  /**
   * 删除自定义音色
   */
  async deleteVoice(params: VoiceManageParams): Promise<GenerateResult> {
    const { userId, voiceId } = params
    const { apiKey } = await getProviderConfig(userId, 'ark')
    const response = await fetch(`https://ark.cn-beijing.volces.com/api/v3/audio/voices/${voiceId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${apiKey}` }
    })
    if (!response.ok) throw new Error('删除音色失败')
    return { success: true }
  }
  /**
   * 获取用户自定义音色列表
   */
  async getUserVoices(userId: string): Promise<Array<any>> {
    const { apiKey } = await getProviderConfig(userId, 'ark')
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/audio/voices?type=custom', {
      headers: { Authorization: `Bearer ${apiKey}` }
    })
    if (!response.ok) throw new Error('获取音色列表失败')
    const data = await response.json()
    return data.voices || []
  }
}
```
- [ ] **Step 2: 运行类型检查确认无错误**
Run: `npm run typecheck`
Expected: 0 errors
- [ ] **Step 3: 提交代码**
```bash
git add src/lib/generators/ark-speech-voice-design.ts
git commit -m "feat: 实现火山音色设计生成器"
```
---
### Task 4: 实现火山口型同步生成器
**Files:**
- Create: `src/lib/generators/ark-speech-lipsync.ts`
**Steps:**
- [ ] **Step 1: 编写口型同步生成器类**
```typescript
import { BaseVideoGenerator, type VideoGenerateParams, type GenerateResult } from './base'
import { getProviderConfig } from '@/lib/api-config'
import { createStorageProvider } from '@/lib/storage/factory'
import { pollAsyncTask } from '@/lib/async-poll'
export class ArkLipSyncGenerator extends BaseVideoGenerator {
  protected async doGenerate(params: VideoGenerateParams): Promise<GenerateResult> {
    const { userId, imageUrl, audioUrl, options = {} } = params
    const { apiKey } = await getProviderConfig(userId, 'ark')
    const { resolution = '720p', fps = 24 } = options as Record<string, any>
    // 准备请求参数
    const formData = new FormData()
    // 下载并添加图片
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) throw new Error('图片下载失败')
    formData.append('image', new Blob([await imageResponse.arrayBuffer()]), 'image.png')
    // 下载并添加音频
    const audioResponse = await fetch(audioUrl)
    if (!audioResponse.ok) throw new Error('音频下载失败')
    formData.append('audio', new Blob([await audioResponse.arrayBuffer()]), 'audio.mp3')
    formData.append('resolution', resolution)
    formData.append('fps', String(fps))
    formData.append('model', options.modelId || 'doubao-lipsync-v1')
    // 创建口型同步任务
    const createResponse = await fetch('https://ark.cn-beijing.volces.com/api/v3/audio/lipsync', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData
    })
    if (!createResponse.ok) {
      const error = await createResponse.json()
      throw new Error(`口型同步任务创建失败: ${error.message || createResponse.statusText}`)
    }
    const taskData = await createResponse.json()
    const taskId = taskData.id
    // 轮询任务状态
    const result = await pollAsyncTask({
      taskId,
      provider: 'ark',
      pollUrl: `https://ark.cn-beijing.volces.com/api/v3/audio/lipsync/${taskId}`,
      headers: { Authorization: `Bearer ${apiKey}` },
      checkInterval: 3000,
      timeout: 300000, // 5分钟超时
      onProgress: (progress) => this.emit('progress', progress)
    })
    if (!result.success || !result.videoUrl) throw new Error(result.error || '口型同步生成失败')
    // 上传到对象存储
    const videoResponse = await fetch(result.videoUrl)
    if (!videoResponse.ok) throw new Error('视频下载失败')
    const storage = createStorageProvider()
    const fileKey = storage.generateUniqueKey({ prefix: 'video/lipsync', ext: 'mp4' })
    await storage.uploadObject({
      key: fileKey,
      body: Buffer.from(await videoResponse.arrayBuffer()),
      contentType: 'video/mp4'
    })
    const videoUrl = storage.toFetchableUrl(fileKey)
    return {
      success: true,
      videoUrl,
      async: false,
      metadata: {
        resolution,
        fps,
        provider: 'ark'
      }
    }
  }
}
```
- [ ] **Step 2: 运行类型检查确认无错误**
Run: `npm run typecheck`
Expected: 0 errors
- [ ] **Step 3: 提交代码**
```bash
git add src/lib/generators/ark-speech-lipsync.ts
git commit -m "feat: 实现火山口型同步生成器"
```
---
### Task 5: 注册生成器到工厂
**Files:**
- Modify: `src/lib/generators/factory.ts`
**Steps:**
- [ ] **Step 1: 导入新增的生成器**
在文件头部导入：
```typescript
import { ArkTTSGenerator } from './ark-speech-tts'
import { ArkVoiceDesignGenerator } from './ark-speech-voice-design'
import { ArkLipSyncGenerator } from './ark-speech-lipsync'
```
- [ ] **Step 2: 在createAudioGenerator中添加火山支持**
在`switch`语句中添加：
```typescript
case 'ark':
  return new ArkTTSGenerator()
```
- [ ] **Step 3: 新增createVoiceDesignGenerator方法**
```typescript
export function createVoiceDesignGenerator(provider: string) {
  const providerKey = getProviderKey(provider).toLowerCase()
  switch (providerKey) {
    case 'ark':
      return new ArkVoiceDesignGenerator()
    case 'bailian':
      // 原有阿里云实现
      return new (require('./bailian-voice-design').BailianVoiceDesignGenerator)()
    default:
      throw new Error(`Unsupported voice design provider: ${provider}`)
  }
}
```
- [ ] **Step 4: 新增createLipSyncGenerator方法**
```typescript
export function createLipSyncGenerator(provider: string) {
  const providerKey = getProviderKey(provider).toLowerCase()
  switch (providerKey) {
    case 'ark':
      return new ArkLipSyncGenerator()
    case 'bailian':
      // 原有阿里云实现
      return new (require('./bailian-lipsync').BailianLipSyncGenerator)()
    default:
      throw new Error(`Unsupported lipsync provider: ${provider}`)
  }
}
```
- [ ] **Step 5: 运行类型检查确认无错误**
Run: `npm run typecheck`
Expected: 0 errors
- [ ] **Step 6: 提交代码**
```bash
git add src/lib/generators/factory.ts
git commit -m "feat: 注册火山语音生成器到工厂"
```
---
### Task 6: 新增计费配置
**Files:**
- Modify: `src/lib/credit-billing/catalog.ts`
**Steps:**
- [ ] **Step 1: 添加火山语音模型计费规则**
在`modelTierMap`中添加：
```typescript
// 火山语音
'doubao-tts-v1': 'audio-basic',
'doubao-tts-premium-v1': 'audio-premium',
'doubao-tts-long-v1': 'audio-basic',
'doubao-voice-clone-v1': 'voice-design',
'doubao-lipsync-v1': 'lipsync',
```
在`creditPricing`中添加对应定价：
```typescript
'audio-basic': {
  perThousandChars: 1, // 每千字1积分
  unit: 'chars'
},
'audio-premium': {
  perThousandChars: 3, // 每千字3积分
  unit: 'chars'
},
'voice-design': {
  perCall: 100, // 每次100积分
  unit: 'call'
},
'lipsync': {
  perMinute: 50, // 每分钟50积分
  unit: 'minute'
},
```
- [ ] **Step 2: 运行类型检查确认无错误**
Run: `npm run typecheck`
Expected: 0 errors
- [ ] **Step 3: 提交代码**
```bash
git add src/lib/credit-billing/catalog.ts
git commit -m "feat: 新增火山语音计费配置"
```
---
### Task 7: 后台全局配置适配
**Files:**
- Modify: `src/app/[locale]/admin/platform-keys/PlatformConfigPage.tsx`
**Steps:**
- [ ] **Step 1: 新增火山语音相关下拉选项**
找到扩展功能的三个下拉配置，分别添加：
- 口型同步下拉：新增选项`{ value: 'ark', label: 'Doubao Lip Sync (火山引擎)' }`
- 语音合成下拉：新增选项`{ value: 'ark', label: 'Doubao TTS (火山引擎)' }`
- 音色设计下拉：新增选项`{ value: 'ark', label: 'Doubao Voice Design (火山引擎)' }`
- [ ] **Step 2: 运行类型检查确认无错误**
Run: `npm run typecheck`
Expected: 0 errors
- [ ] **Step 3: 提交代码**
```bash
git add src/app/[locale]/admin/platform-keys/PlatformConfigPage.tsx
git commit -m "feat: 后台新增火山语音全局配置选项"
```
---
### Task 8: 前台提供商切换组件
**Files:**
- Create: `src/components/voice/ProviderSelector.tsx`
**Steps:**
- [ ] **Step 1: 编写提供商选择下拉组件**
```tsx
'use client'
import { useState, useEffect } from 'react'
import { useConfig } from '@/hooks/useConfig'
interface ProviderSelectorProps {
  type: 'tts' | 'voice-design' | 'lipsync'
  value: string
  onChange: (provider: string) => void
  className?: string
}
const providerLabels = {
  ark: '火山引擎',
  bailian: '阿里云百炼'
} as const
export function ProviderSelector({ type, value, onChange, className = '' }: ProviderSelectorProps) {
  const { config } = useConfig()
  const [availableProviders, setAvailableProviders] = useState<string[]>([])
  useEffect(() => {
    // 获取当前类型支持的已启用提供商
    const providers: string[] = []
    // 检查火山是否配置了API Key并且对应模型已启用
    if (config?.platform?.arkApiKey && config?.models?.some((m: any) => 
      m.provider === 'ark' && m.type === getModelType(type) && m.enabled
    )) {
      providers.push('ark')
    }
    // 检查阿里云是否配置
    if (config?.platform?.bailianApiKey && config?.models?.some((m: any) => 
      m.provider === 'bailian' && m.type === getModelType(type) && m.enabled
    )) {
      providers.push('bailian')
    }
    setAvailableProviders(providers)
    // 如果当前值不在可用列表，自动切换到第一个
    if (value && !providers.includes(value) && providers.length > 0) {
      onChange(providers[0])
    }
  }, [config, type, value, onChange])
  function getModelType(type: string): string {
    switch (type) {
      case 'tts': return 'audio'
      case 'voice-design': return 'voice-design'
      case 'lipsync': return 'lipsync'
      default: return ''
    }
  }
  if (availableProviders.length <= 1) return null // 只有一个提供商时隐藏选择
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-2">语音提供商</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {availableProviders.map((p) => (
          <option key={p} value={p}>{providerLabels[p as keyof typeof providerLabels]}</option>
        ))}
      </select>
    </div>
  )
}
```
- [ ] **Step 2: 运行类型检查确认无错误**
Run: `npm run typecheck`
Expected: 0 errors
- [ ] **Step 3: 提交代码**
```bash
git add src/components/voice/ProviderSelector.tsx
git commit -m "feat: 新增语音提供商选择组件"
```
---
### Task 9: 编写单元测试
**Files:**
- Create: `tests/unit/generators/ark-speech.test.ts`
**Steps:**
- [ ] **Step 1: 编写单元测试**
```typescript
import { describe, expect, test, vi } from 'vitest'
import { ArkTTSGenerator } from '@/lib/generators/ark-speech-tts'
import { ArkVoiceDesignGenerator } from '@/lib/generators/ark-speech-voice-design'
import { ArkLipSyncGenerator } from '@/lib/generators/ark-speech-lipsync'
vi.mock('@/lib/api-config', () => ({
  getProviderConfig: vi.fn().mockResolvedValue({ apiKey: 'test-key' })
}))
vi.mock('@/lib/ark-api', () => ({
  arkTTSGeneration: vi.fn().mockResolvedValue({
    audio: new Blob(['test-audio']),
    contentType: 'audio/mpeg'
  })
}))
vi.mock('@/lib/storage/factory', () => ({
  createStorageProvider: vi.fn().mockReturnValue({
    generateUniqueKey: vi.fn().mockReturnValue('test/audio.mp3'),
    uploadObject: vi.fn().mockResolvedValue({ key: 'test/audio.mp3' }),
    toFetchableUrl: vi.fn().mockReturnValue('https://example.com/test/audio.mp3')
  })
}))
describe('ArkSpeechGenerators', () => {
  test('TTS生成器正常工作', async () => {
    const generator = new ArkTTSGenerator()
    const result = await generator.generate({
      userId: 'test-user',
      text: '测试文本',
      voice: 'test-voice'
    })
    expect(result.success).toBe(true)
    expect(result.audioUrl).toBe('https://example.com/test/audio.mp3')
  })
  test('TTS参数校验正常', async () => {
    const generator = new ArkTTSGenerator()
    await expect(generator.generate({
      userId: 'test-user',
      text: '测试文本',
      rate: 3.0 // 超出范围
    })).rejects.toThrow('语速范围0.5-2.0')
  })
  test('音色设计生成器初始化正常', () => {
    const generator = new ArkVoiceDesignGenerator()
    expect(generator).toBeDefined()
  })
  test('口型同步生成器初始化正常', () => {
    const generator = new ArkLipSyncGenerator()
    expect(generator).toBeDefined()
  })
})
```
- [ ] **Step 2: 运行测试确认通过**
Run: `npm run test:unit tests/unit/generators/ark-speech.test.ts`
Expected: All tests pass
- [ ] **Step 3: 提交代码**
```bash
git add tests/unit/generators/ark-speech.test.ts
git commit -m "test: 新增火山语音单元测试"
```
---
## 自审核查
1. ✅ **Spec覆盖**：所有设计文档中的需求都有对应任务实现
2. ✅ **无占位符**：所有步骤都有完整代码和命令，没有TBD内容
3. ✅ **类型一致**：所有接口、方法名、参数名和现有架构保持一致
4. ✅ **无侵入**：没有修改原有阿里云相关代码，完全新增实现
---
Plan complete and saved to `docs/superpowers/plans/2026-04-12-volcengine-speech-integration-plan.md`. Two execution options:
**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration
**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints
**Which approach?**