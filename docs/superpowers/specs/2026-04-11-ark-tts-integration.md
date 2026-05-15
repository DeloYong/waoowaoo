# 火山引擎豆包TTS接入设计文档
**项目**：waoowaoo
**版本**：v1.0
**日期**：2026-04-11
**状态**：已实现

## 一、概述
本方案实现了火山引擎豆包TTS（doubao-tts-v1）的接入，支持文本转语音、音色选择、语速调整等基础功能。

## 二、实现结构
### 1. 代码位置
- **API封装**：`src/lib/ark-api.ts` 新增 `arkTTSGeneration` 函数
- **生成器实现**：`src/lib/generators/ark.ts` 新增 `ArkTTSGenerator` 类
- **工厂注册**：`src/lib/generators/factory.ts` 新增ARK音频生成器注册

### 2. 类结构
```typescript
ArkTTSGenerator extends BaseAudioGenerator
  └── doGenerate(params: AudioGenerateParams): Promise<GenerateResult>
```

## 三、接口说明
### 1. 请求参数
```typescript
interface AudioGenerateParams {
  userId: string
  text: string              // 要合成的文本
  voice?: string            // 音色，默认：zh_female_shuangyueqingxin
  rate?: number             // 语速，范围0.5-2.0，默认1.0
  options?: {
    responseFormat?: 'mp3' | 'wav' | 'pcm' // 音频格式，默认mp3
  }
}
```

### 2. 响应格式
```typescript
interface GenerateResult {
  success: boolean
  audioUrl?: string         // 音频URL（当前为base64格式，后续可替换为对象存储URL）
  error?: string
}
```

## 四、功能特性
1. **自动重试**：复用ARK API的3次自动重试机制，指数退避策略
2. **超时控制**：180秒超时配置，适配长文本合成场景
3. **参数校验**：自动校验语速范围、不支持的参数等
4. **统一鉴权**：复用现有的provider配置体系，与其他ARK模型共享API Key

## 五、使用方式
```typescript
import { createAudioGenerator } from '@/lib/generators/factory'

const generator = createAudioGenerator('ark')
const result = await generator.generate({
  userId: 'user123',
  text: '你好，欢迎使用豆包语音合成',
  voice: 'zh_female_shuangyueqingxin',
  rate: 1.0
})

if (result.success) {
  // 使用 result.audioUrl 播放音频
}
```

## 六、后续优化点
1. **对象存储集成**：将生成的音频上传到对象存储，替换当前的base64返回方式
2. **音色列表接口**：添加获取支持的音色列表的接口
3. **长文本分段合成**：支持超过长度限制的文本自动分段合成
4. **异步合成支持**：对于特别长的文本，支持异步任务模式