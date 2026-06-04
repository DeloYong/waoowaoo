# 新增 AI 模型支持指南

## 概述

本文档记录了在 waoowaoo 项目中新增 AI 模型支持的标准流程。无论是新增视频、图像、音频还是 LLM 模型，都遵循相同的架构模式。

## 架构概览

```
standards/capabilities/
└── image-video.catalog.json    # 模型能力定义（前端 UI 选项）

src/lib/providers/
├── official/
│   └── model-registry.ts       # 模型注册中心（所有模型必须在此注册）
├── {provider}/
│   ├── catalog.ts              # 模型目录（列出该 provider 的所有模型）
│   ├── video.ts                # 视频生成实现
│   ├── image.ts                # 图像生成实现
│   ├── audio.ts                # 音频生成实现  
│   ├── llm.ts                  # LLM 实现
│   ├── types.ts                # 类型定义
│   └── index.ts                # 导出入口
```

## 新增模型的 4 个标准步骤

### 步骤 1: 在 `catalog.ts` 中注册模型 ID

在对应 provider 的 `catalog.ts` 文件中添加新的模型 ID。

**文件位置**: `src/lib/providers/{provider}/catalog.ts`

**示例** (bailian/catalog.ts):
```typescript
const BAILIAN_CATALOG: Readonly<Record<OfficialModelModality, readonly string[]>> = {
  llm: ['qwen3.5-plus', 'qwen3.5-flash'],
  image: [],
  video: [
    'wan2.7-i2v',  // 新增的模型
    'wan2.6-i2v-flash',
    'wan2.6-i2v',
  ],
  audio: ['qwen3-tts-vd-2026-01-26'],
}
```

**规则**:
- 模型 ID 必须与 API 要求的完全一致
- 按 modality 分类（llm / image / video / audio）
- 数组保持字母顺序或版本倒序

### 步骤 2: 在能力目录中定义模型能力

在 `standards/capabilities/image-video.catalog.json` 中定义模型的具体能力。

**文件位置**: `standards/capabilities/image-video.catalog.json`

**视频模型示例** (Wan 2.7):
```json
{
  "modelType": "video",
  "provider": "bailian",
  "modelId": "wan2.7-i2v",
  "capabilities": {
    "video": {
      "generationModeOptions": ["normal", "firstlastframe"],
      "durationOptions": [5, 10],
      "resolutionOptions": ["480p", "720p"],
      "firstlastframe": true,
      "supportGenerateAudio": false
    }
  }
}
```

**能力字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| `generationModeOptions` | Array | 支持的生成模式：`"normal"`（单图生成）/ `"firstlastframe"`（首末帧生成） |
| `durationOptions` | Array | 支持的视频时长选项（秒） |
| `resolutionOptions` | Array | 支持的分辨率选项 |
| `firstlastframe` | Boolean | 是否支持首末帧控制 |
| `supportGenerateAudio` | Boolean | 是否支持生成音频 |

**图像模型示例**:
```json
{
  "modelType": "image",
  "provider": "fal",
  "modelId": "banana-2",
  "capabilities": {
    "image": {
      "resolutionOptions": ["1K", "2K", "4K"]
    }
  }
}
```

**LLM 模型示例**:
```json
{
  "modelType": "llm",
  "provider": "google",
  "modelId": "gemini-3.1-pro-preview",
  "capabilities": {
    "llm": {
      "reasoningEffortOptions": ["minimal", "low", "medium", "high"]
    }
  }
}
```

**规则**:
- 即使能力为空对象 `{}` 也必须定义（表示使用默认值）
- 不支持的能力不要列出，或设为 `false`
- 数组按从小到大排序

### 步骤 3: 在 provider 实现中添加模型特性支持

如果新模型有特殊能力（如支持首末帧），需要在对应的实现文件中更新逻辑。

**文件位置**: `src/lib/providers/{provider}/video.ts` (或 image.ts, audio.ts)

**关键实现模式 - 能力集合**:

```typescript
// 1. 定义仅支持首末帧的模型集合
const BAILIAN_FIRST_LAST_FRAME_ONLY_MODELS = new Set([
  'wan2.2-kf2v-flash',
  'wanx2.1-kf2v-plus',
])

// 2. 定义支持首末帧（但也支持普通模式）的模型集合
const BAILIAN_FIRST_LAST_FRAME_CAPABLE_MODELS = new Set([
  ...BAILIAN_FIRST_LAST_FRAME_ONLY_MODELS,
  'wan2.7-i2v',  // 新增模型
])

// 3. 能力检测函数
function supportsFirstLastFrame(modelId: string): boolean {
  return BAILIAN_FIRST_LAST_FRAME_CAPABLE_MODELS.has(modelId)
}

function isFirstLastFrameOnlyModel(modelId: string): boolean {
  return BAILIAN_FIRST_LAST_FRAME_ONLY_MODELS.has(modelId)
}
```

**请求构建中的能力检查**:
```typescript
function buildSubmitRequest(params: BailianVideoGenerateParams) {
  const lastFrameImageUrl = readTrimmedString(params.options.lastFrameImageUrl)
  const firstLastFrame = !!lastFrameImageUrl

  // 检查：仅支持首末帧的模型必须提供末帧
  if (isFirstLastFrameOnlyModel(modelId) && !firstLastFrame) {
    throw new Error('BAILIAN_VIDEO_LAST_FRAME_IMAGE_URL_REQUIRED')
  }

  // 检查：不支持首末帧的模型不能使用该功能
  if (firstLastFrame && !supportsFirstLastFrame(modelId)) {
    throw new Error(`BAILIAN_VIDEO_LAST_FRAME_UNSUPPORTED_FOR_MODEL: ${modelId}`)
  }

  // 根据能力选择不同的 API endpoint
  return {
    endpoint: firstLastFrame ? BAILIAN_KF2V_ENDPOINT : BAILIAN_VIDEO_ENDPOINT,
    body: submitBody,
  }
}
```

**重要原则**:
- **使用集合进行能力检测**，而不是硬编码的 if-else
- **前向兼容设计**：新模型默认继承现有逻辑，只需要添加到对应集合
- **严格的参数验证**：不支持的选项抛出明确错误
- **所有选项白名单验证**：见 `assertNoUnsupportedOptions` 函数

### 步骤 4: 确保索引导出

确认 provider 的 `index.ts` 正确导出了所有函数。

**文件位置**: `src/lib/providers/{provider}/index.ts`

通常不需要修改，除非新增了新的 modality。

---

## 完整示例：新增 Wan 2.7 视频模型

### 1. `src/lib/providers/bailian/catalog.ts`
```diff
  video: [
+   'wan2.7-i2v',
    'wan2.6-i2v-flash',
    'wan2.6-i2v',
```

### 2. `standards/capabilities/image-video.catalog.json`
```json
{
  "modelType": "video",
  "provider": "bailian",
  "modelId": "wan2.7-i2v",
  "capabilities": {
    "video": {
      "generationModeOptions": ["normal", "firstlastframe"],
      "firstlastframe": true,
      "supportGenerateAudio": false
    }
  }
}
```

### 3. `src/lib/providers/bailian/video.ts`
```diff
  const BAILIAN_FIRST_LAST_FRAME_CAPABLE_MODELS = new Set([
    ...BAILIAN_FIRST_LAST_FRAME_ONLY_MODELS,
+   'wan2.7-i2v',
  ])
```

---

## 新增 Provider（新的云厂商）

如果需要新增一个全新的 provider（如 `openai`），需要：

1. 创建目录结构:
   ```
   src/lib/providers/openai/
   ├── catalog.ts
   ├── video.ts
   ├── image.ts
   ├── types.ts
   └── index.ts
   ```

2. 在 `model-registry.ts` 中更新 `OfficialProviderKey` 类型

3. 在 `src/lib/generators/` 中添加对应的 generator

4. 在 API handler 中添加路由支持

---

## 验证清单

新增模型后，执行以下验证：

- [ ] 构建通过：`npm run build`
- [ ] 类型检查通过：`npx tsc --noEmit`
- [ ] 模型在 UI 下拉列表中可见
- [ ] 各能力选项正确显示（如不支持音频则隐藏音频选项）
- [ ] 实际生成测试通过

---

## 常见问题

### Q: 为什么我的模型在 UI 中不显示？
A: 检查两处：
1. `catalog.ts` 中是否正确注册
2. `image-video.catalog.json` 中是否有对应的能力定义

### Q: 模型 ID 在哪里查找？
A: 在对应云厂商的 API 文档中，通常在 "模型列表" 或 "请求参数" 部分。

### Q: 如何处理同一个模型有多个 endpoint？
A: 参考 bailian 的实现，通过能力检测函数动态选择 endpoint。

### Q: 新增模型后需要重新构建吗？
A: 是的，因为 `standards/` 下的文件在构建时会被打包。
