# 火山引擎语音能力全量接入 - 详细设计文档

> 分支：`feature/saas-credits` | 日期：2026-04-14 | 方案：B（完整语音能力接入）

---

## 1. 现状概览

### 1.1 代码架构

| 层级 | 百炼（已实现） | 火山引擎/Ark（部分实现） |
|---|---|---|
| **音色设计** (文本→音色) | `providers/bailian/voice-design.ts` → `createVoiceDesign()` | ❌ 无实现 |
| **音色克隆** (音频→音色) | 无 | `generators/ark-speech-voice-design.ts` → `ArkVoiceDesignGenerator.cloneVoice()` |
| **TTS 标准版** | `providers/bailian/tts.ts` → `synthesizeWithBailianTTS()` | `generators/ark-speech-tts.ts` → `arkTTSGeneration()` (doubao-tts-v1) |
| **TTS 精品版** | 无 | ❌ 模型已声明，无 Generator |
| **长文本 TTS** | bailian 内部分段 | ❌ 模型已声明，无 Generator |

### 1.2 关键阻塞

1. **Worker 硬编码百炼**：`workers/handlers/voice-design.ts:49` 只调 `getProviderConfig(userId, 'bailian')`
2. **API Route 无 modelKey**：`voice-design/route.ts` payload 不含模型选择字段
3. **前端无模型选择**：`VoiceDesignMutationPayload` 不含 `modelKey` 字段
4. **计费硬编码**：`billing/task-policy.ts:226` 硬编码 `model: 'bailian-voice-design'`

### 1.3 火山引擎 API 体系

| 能力 | API 端点 | 鉴权 | 请求模型 |
|---|---|---|---|
| **音色设计** | `ark.cn-beijing.volces.com/api/v3/audio/voices/design` | Bearer Token | `doubao-voice-design-v1` |
| **音色克隆** | `ark.cn-beijing.volces.com/api/v3/audio/voices/clone` | Bearer Token | - |
| **TTS 标准/精品** | `ark.cn-beijing.volces.com/api/v3/audio/speech` | Bearer Token | `doubao-tts-v1` / `doubao-tts-premium-v1` |
| **长文本 TTS** | `openspeech.bytedance.com/api/v1/tts_async/submit` | X-Api-App-Id + X-Api-Access-Key | `doubao-tts-long-v1` |

> **鉴权差异**：音色设计/克隆和 TTS 标准/精品走 **Ark API**（Bearer Token），长文本 TTS 走 **openspeech API**（AppId + AccessKey），需两种凭证。

---

## 2. 分阶段设计

### Phase 1：音色设计 + 音色克隆 (Ark API)

**目标**：用户可在音色设计界面选择百炼或火山引擎，两个 provider 各自走各自 API。

#### 2.1 新建 `src/lib/providers/ark/voice-design.ts`

```typescript
// Ark 音色设计 - 文本→音色
// 端点: POST https://ark.cn-beijing.volces.com/api/v3/audio/voices/design
// 鉴权: Bearer Token (ark provider API Key)
// 请求体:
// {
//   "model": "doubao-voice-design-v1",
//   "voice_prompt": "温柔女声，语速适中",
//   "preview_text": "你好，很高兴认识你",
//   "preferred_name": "custom_voice",  // 可选
//   "language": "zh"                    // zh | en
// }
// 响应体:
// {
//   "id": "voice_xxx",           // 音色ID (对应 voiceId)
//   "preview_audio": "base64...", // 预览音频 (WAV)
//   "status": "available"
// }
```

关键实现：
- 接口签名：`createArkVoiceDesign(input: ArkVoiceDesignInput, apiKey: string): Promise<ArkVoiceDesignResult>`
- `ArkVoiceDesignInput`：`{ voicePrompt, previewText, preferredName?, language? }`
- `ArkVoiceDesignResult`：`{ success, voiceId?, audioBase64?, sampleRate?, responseFormat?, error? }`
- 使用 `ark-api.ts` 中的 `fetchWithRetry` 实现超时+重试
- 验证逻辑复用 `bailian/voice-design.ts` 的 `validateVoicePrompt` / `validatePreviewText`（提取为共享）

#### 2.2 重构验证函数为共享模块

**新建** `src/lib/providers/shared/voice-design-validation.ts`

```typescript
export function validateVoicePrompt(voicePrompt: string): { valid: boolean; error?: string }
export function validatePreviewText(previewText: string): { valid: boolean; error?: string }
```

从 `providers/bailian/voice-design.ts` 中移除验证函数，改为从此模块导入。

#### 2.3 改造 Worker Handler

**文件**：`src/lib/workers/handlers/voice-design.ts`

```typescript
// 核心改动：根据 payload.modelKey 选择 provider
export async function handleVoiceDesignTask(job: Job<TaskJobData>) {
  const payload = (job.data.payload || {}) as Record<string, unknown>
  // ... 读取 voicePrompt, previewText, preferredName, language ...

  // 新增：读取 modelKey（格式 "ark::doubao-voice-design-v1" 或 "qwen::qwen-voice-design"）
  const modelKey = typeof payload.modelKey === 'string' ? payload.modelKey.trim() : ''
  const provider = modelKey.startsWith('ark') ? 'ark' : 'bailian'

  if (provider === 'ark') {
    const { apiKey } = await getProviderConfig(job.data.userId, 'ark')
    const designed = await createArkVoiceDesign(input, apiKey)
    // ... 处理结果 ...
  } else {
    // 原有百炼逻辑
    const { apiKey } = await getProviderConfig(job.data.userId, 'bailian')
    const designed = await createVoiceDesign(input, apiKey)
  }
}
```

#### 2.4 API Route 增加 modelKey

**文件**：`src/app/api/asset-hub/voice-design/route.ts` 和 `src/app/api/novel-promotion/[projectId]/voice-design/route.ts`

```typescript
// 新增读取 modelKey
const modelKey = typeof body.modelKey === 'string' ? body.modelKey.trim() : ''

const payload = {
  voicePrompt,
  previewText,
  preferredName,
  language,
  modelKey,  // 新增
  displayMode: 'detail' as const,
}
```

#### 2.5 前端类型 + 组件改造

**文件**：`src/components/voice/voice-design-shared.ts`

```typescript
export type VoiceDesignMutationPayload = {
  voicePrompt: string
  previewText: string
  preferredName: string
  language: 'zh' | 'en'
  modelKey?: string  // 新增
}
```

**文件**：`src/components/voice/VoiceDesignDialogBase.tsx`

- 新增 modelKey 选择（从用户已启用的 voicedesign 模型列表中选择）
- 默认值：用户配置的第一个可用 voicedesign 模型

#### 2.6 计费路由

**文件**：`src/lib/billing/task-policy.ts`

```typescript
function buildVoiceDesignTaskInfo(taskType: TaskType, payload: AnyPayload): TaskBillingInfo {
  const modelKey = readString(payload?.modelKey)
  const model = modelKey || 'bailian-voice-design'  // 兼容旧任务
  return {
    billable: true,
    source: 'task',
    taskType,
    apiType: 'voice-design',
    model,
    quantity: 1,
    unit: 'call',
    totalCredits: calcVoiceDesign(model),
    pricingVersion: BUILTIN_PRICING_VERSION,
    action: String(taskType),
    status: 'quoted',
  }
}
```

**文件**：`src/lib/credit-billing/catalog.ts`

```typescript
export const modelTierMap: Record<string, string> = {
  // ... 现有 ...
  'doubao-voice-design-v1': 'voice-design',  // 新增
  'ark::doubao-voice-design-v1': 'voice-design',  // 新增
}
```

#### 2.7 重构 ArkVoiceDesignGenerator

**文件**：`src/lib/generators/ark-speech-voice-design.ts`

- `cloneVoice()` 改为调用 `providers/ark/voice-clone.ts`（新建）
- `deleteVoice()` 和 `getUserVoices()` 改为调用 `providers/ark/voice-manage.ts`（新建）
- Generator 变为薄包装层

**新建** `src/lib/providers/ark/voice-clone.ts`

```typescript
// Ark 音色克隆 - 音频→音色
// 端点: POST https://ark.cn-beijing.volces.com/api/v3/audio/voices/clone
// 鉴权: Bearer Token
// Content-Type: multipart/form-data
// 字段: name, audio(file), text?, language, gender?
```

**新建** `src/lib/providers/ark/voice-manage.ts`

```typescript
// Ark 音色管理
// 列表: GET  https://ark.cn-beijing.volces.com/api/v3/audio/voices?type=custom
// 删除: DELETE https://ark.cn-beijing.volces.com/api/v3/audio/voices/{voiceId}
```

**新建** `src/lib/providers/ark/index.ts` — 统一导出

---

### Phase 2：TTS 精品版 (Ark API)

**目标**：`doubao-tts-premium-v1` 可用于 TTS 生成。

#### 2.1 扩展 `arkTTSGeneration()`

**文件**：`src/lib/ark-api.ts`

```typescript
interface ArkTTSRequest {
  model: 'doubao-tts-v1' | 'doubao-tts-premium-v1'  // 扩展模型类型
  input: string
  voice: string
  response_format?: 'mp3' | 'wav' | 'pcm'
  speed?: number
}
```

#### 2.2 扩展 `ArkTTSGenerator`

**文件**：`src/lib/generators/ark-speech-tts.ts`

- `doGenerate()` 中 `modelId` 选项支持 `doubao-tts-premium-v1`
- 已有逻辑 `model: (modelId || 'doubao-tts-v1') as 'doubao-tts-v1'` 需放宽类型

#### 2.3 扩展 Voice Line 路由

**文件**：`src/lib/voice/generate-voice-line.ts`

- `ark` 分支已通过 `audioSelection.modelId` 传递模型 ID
- `ArkTTSGenerator` 接收 `options.modelId`，无需额外改动
- **只需确保 `ArkTTSGenerator` 能传递 modelId 到 `arkTTSGeneration()`**

---

### Phase 3：长文本 TTS (openspeech API)

**目标**：`doubao-tts-long-v1` 通过 openspeech 异步 API 实现长文本语音合成。

#### 3.1 新建 `src/lib/providers/ark/long-tts.ts`

```typescript
// 长文本 TTS - 异步提交+轮询
// 提交端点: POST https://openspeech.bytedance.com/api/v1/tts_async/submit
// 查询端点: GET  https://openspeech.bytedance.com/api/v1/tts_async/query?task_id=xxx
// 鉴权: X-Api-App-Id + X-Api-Access-Key (不同于 Ark Bearer Token)
// 请求体:
// {
//   "appid": "xxx",
//   "text": "长文本内容...",
//   "voice_type": "BVxxx",  // 音色ID
//   "format": "mp3"
// }
```

关键设计：
- 需要新的凭证类型：`openspeech_appid` + `openspeech_access_key`
- 在管理员后台添加 openspeech 凭证配置
- 异步流程：submit → 轮询 query → 下载音频

#### 3.2 Worker 扩展

- 长文本 TTS 可复用现有 `VOICE_LINE` 任务类型
- 在 `generate-voice-line.ts` 的 `ark` 分支中，检测文本长度 + 模型 ID 路由到异步 API
- 阈值：文本 > 1000 字符 且 modelId === `doubao-tts-long-v1` 时走异步

#### 3.3 新增环境变量

```
ARK_OPENSPEECH_APP_ID=xxx
ARK_OPENSPEECH_ACCESS_KEY=xxx
```

---

## 3. 文件改动清单

### Phase 1（音色设计 + 音色克隆）

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新建 | `src/lib/providers/shared/voice-design-validation.ts` | 提取验证函数 |
| 新建 | `src/lib/providers/ark/voice-design.ts` | Ark 音色设计实现 |
| 新建 | `src/lib/providers/ark/voice-clone.ts` | Ark 音色克隆实现 |
| 新建 | `src/lib/providers/ark/voice-manage.ts` | Ark 音色管理实现 |
| 新建 | `src/lib/providers/ark/index.ts` | 统一导出 |
| 修改 | `src/lib/providers/bailian/voice-design.ts` | 删除验证函数，改为导入共享模块 |
| 修改 | `src/lib/workers/handlers/voice-design.ts` | 根据 modelKey 路由到不同 provider |
| 修改 | `src/app/api/asset-hub/voice-design/route.ts` | payload 增加 modelKey |
| 修改 | `src/app/api/novel-promotion/[projectId]/voice-design/route.ts` | payload 增加 modelKey |
| 修改 | `src/components/voice/voice-design-shared.ts` | VoiceDesignMutationPayload 增加 modelKey |
| 修改 | `src/components/voice/VoiceDesignDialogBase.tsx` | 添加模型选择 UI |
| 修改 | `src/lib/generators/ark-speech-voice-design.ts` | 重构为薄包装层 |
| 修改 | `src/lib/billing/task-policy.ts` | buildVoiceDesignTaskInfo 支持 modelKey |
| 修改 | `src/lib/credit-billing/catalog.ts` | modelTierMap 增加 doubao-voice-design-v1 |
| 修改 | `src/app/[locale]/profile/components/api-config/types.ts` | PRESET_MODELS 确保含 doubao-voice-design-v1 |

### Phase 2（TTS 精品版）

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | `src/lib/ark-api.ts` | ArkTTSRequest.model 类型扩展 |
| 修改 | `src/lib/generators/ark-speech-tts.ts` | 支持传递 premium modelId |

### Phase 3（长文本 TTS）

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新建 | `src/lib/providers/ark/long-tts.ts` | 长文本 TTS 异步实现 |
| 修改 | `src/lib/voice/generate-voice-line.ts` | 长文本自动路由到异步 API |
| 修改 | `.env` / `docker-compose.yml` | 新增 ARK_OPENSPEECH_APP_ID / ARK_OPENSPEECH_ACCESS_KEY |

---

## 4. 并行执行策略

Phase 1 的改动可分为 **4 个独立任务**并行执行：

### Agent A：Provider 层（纯新增，无依赖）
- 新建 `providers/shared/voice-design-validation.ts`
- 新建 `providers/ark/voice-design.ts`
- 新建 `providers/ark/voice-clone.ts`
- 新建 `providers/ark/voice-manage.ts`
- 新建 `providers/ark/index.ts`
- 修改 `providers/bailian/voice-design.ts`（删除验证函数）

### Agent B：Worker + 计费层
- 修改 `workers/handlers/voice-design.ts`
- 修改 `billing/task-policy.ts`
- 修改 `credit-billing/catalog.ts`

### Agent C：API Route + 共享类型
- 修改 `voice-design-shared.ts`
- 修改 `asset-hub/voice-design/route.ts`
- 修改 `novel-promotion/[projectId]/voice-design/route.ts`

### Agent D：前端 UI + Generator 重构
- 修改 `VoiceDesignDialogBase.tsx`
- 修改 `ark-speech-voice-design.ts`
- 修改 `api-config/types.ts`（确保 PRESET_MODELS 完整）

> **依赖关系**：A → B（Worker 导入 provider）、C 无强依赖、D 无强依赖。A 和 C/D 可完全并行，B 等待 A 完成后执行。

---

## 5. 兼容性考虑

1. **旧任务兼容**：无 `modelKey` 的任务默认走百炼（`provider === 'bailian'`）
2. **计费兼容**：`buildVoiceDesignTaskInfo` 对无 modelKey 的任务使用旧 model 名
3. **前端兼容**：`modelKey` 为可选字段，不传时使用默认模型
4. **验证函数**：百炼和 Ark 共享同一套验证逻辑（voicePrompt ≤ 500 字符，previewText 5-200 字符）
