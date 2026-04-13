# WaoWaoOo - SaaS 积分计费系统与管理后台完整实现

## 项目概览

**项目名称**: WaoWaoOo - AI 小说推广视频生成平台
**技术栈**: Next.js 15.5.7 + TypeScript + Prisma ORM + MySQL + NextAuth v4
**分支**: `feature/saas-credits`
**当前版本**: v0.5.0
**部署地址**: http://54.206.102.49:13000
**对比基准**: `main` 分支 (v0.4.0)

---

## 与 main 分支功能对比

### main 分支 (v0.4.0) 功能
- 基础视频生成流水线 (分析 → 分镜 → 图片 → 视频)
- 用户认证和项目管理
- 基础模型配置 (硬编码在代码中)
- 简单的用户偏好设置

### feature/saas-credits 分支新增功能
- **SaaS 积分计费系统** - 完整的积分冻结/扣除/回滚机制
- **订阅管理系统** - 四档套餐 (Free/Starter/Pro/Enterprise)
- **邀请分销系统** - 邀请码生成、激活、返利追踪
- **平台级配置管理** - 管理员统一管理 API Key 和模型池
- **集中化模型配置** - 25+ 预设模型，4 个 Provider 支持
- **管理后台增强** - 用户管理、套餐管理、积分授予、邀请排行榜
- **部署运维工具** - 完整部署脚本、诊断工具、管理员设置脚本

---

## 已完成任务总结

### Phase 1: SaaS 积分计费系统核心实现

**提交**: `0b0b2e1`, `247ec0d`, `801d69b`

#### 1.1 平台 API Key 统一管理
- **数据库设计**: `SystemConfig` 表存储平台级配置
- **加密存储**: API Key 使用 `encryptApiKey`/`decryptApiKey` 加密
- **支持的 Provider**: ark, fal, google_ai, qwen
- **配置文件**: `src/lib/platform-config.ts`

#### 1.2 积分计费核心模块
- **积分冻结/扣除/回滚机制**: 任务开始时冻结积分，成功扣除，失败回滚
- **计费模型**: 按模型类型和使用量计费
- **并发控制**: 分析/图片/视频任务独立并发限制
- **数据库表**: `CreditTransaction` 记录所有积分交易

#### 1.3 订阅管理系统
- **套餐配置**: Free, Starter, Pro, Enterprise 四档套餐
- **计费周期**: 月付/年付切换
- **积分额度**: 各套餐不同积分和视频秒数配额
- **管理 API**: `/api/admin/plans` 套餐 CRUD
- **数据库表**: `SubscriptionPlan`, `UserSubscription`

#### 1.4 邀请分销系统
- **邀请码生成**: 用户注册时自动生成唯一邀请码
- **激活流程**: 新用户通过邀请链接注册自动绑定关系
- **返利机制**: 邀请人获得积分奖励
- **数据库表**: `InviteRecord`, `InviteCode`, `InviteRebateLog`
- **迁移脚本**: `scripts/migrations/backfill-invite-codes.ts` 为已有用户补全邀请码

#### 1.5 前端实现
- **Pricing 页面**: `/zh/pricing` 套餐展示和订阅入口
- **Profile 页面**: 用户个人信息、积分余额、邀请码展示
- **导航栏集成**: 显示当前套餐信息和积分余额
- **注册页面**: 添加邀请码输入框，支持 URL `?invite=` 参数

---

### Phase 2: 部署与运维优化

**提交**: `af4394e` ~ `6ca3df7`

#### 2.1 部署脚本完善
- **deploy.sh**: 基础部署脚本，兼容 Amazon Linux
- **deploy-full.sh**: 完整部署脚本，含数据库迁移执行
- **force-rebuild.sh**: 强制重建 Docker 镜像
- **诊断脚本**: 部署问题诊断工具
- **set-admin.sh**: 通过 Docker MySQL 容器设置管理员

#### 2.2 管理员鉴权
- **真实管理员鉴权**: 基于 NextAuth session 的 admin 权限验证
- **Admin Layout**: 使用 NextAuth session 而非 header 验证身份
- **requireAdmin()**: 统一的管理员权限验证函数

#### 2.3 修复的问题
| 提交 | 修复内容 |
|------|---------|
| `9061c92` | Admin layout 使用 NextAuth session 验证 |
| `472a79c` | 修正 getServerSession 导入路径 |
| `3a411c9` | force-rebuild.sh 错误检测逻辑 |
| `eaca76b` | 移除 set -e 防止构建中断 |
| `6f70161` | Admin API 和 Subscription API 认证问题 |
| `3972c43` | Docker 构建输出捕获问题 |
| `84cc9a7` | 退出登录跳转、admin导航路由重复 |

---

### Phase 3: 平台配置与 Bug 修复

**提交**: `055639d`, `e1927cf`

#### 3.1 平台 API Key 配置优化
- **问题**: Admin 后台无法显示未配置的 API Key 项
- **解决**: `getAllConfigsForAdmin` 返回所有已知配置项占位条目

#### 3.2 Pricing 页面修复
- 导航栏显示 plan ID 而非名称 → 显示 plan 名称
- 按钮状态文案优化 → "立即订阅"
- 价格格式化 → 保留两位小数
- 企业版价格显示修复

#### 3.3 用户邀请码补全
- 创建迁移脚本 `backfill-invite-codes.ts`
- 部署脚本自动执行迁移

#### 3.4 退出登录跳转修复
- 修复为相对路径 `/`
- 添加 NextAuth redirect callback 支持同源重定向
- `docker-compose.yml` 支持环境变量覆盖 `NEXTAUTH_URL`

#### 3.5 注册流程邀请码
- 添加邀请码输入框
- 自动从 URL `?invite=` 参数读取邀请码

---

### Phase 4: 模型配置集中化管理

**提交**: `a317ab2`, `b1076fe`, `24a0378`

#### 4.1 集中化管理模型配置 (`a317ab2`)
- **目标**: 将模型配置从用户端移至管理员后台统一管理
- **实现**:
  - 移除用户端模型选择功能
  - 模型配置改为平台级统一配置
  - 用户侧自动使用管理员配置的模型

#### 4.2 流程模型配置优化 (`b1076fe`)
- **新增文件**:
  - `src/lib/platform-models.ts` - Provider 模型获取辅助函数
  - `src/app/api/admin/platform-keys/models/route.ts` - 聚合所有 Provider 模型列表 API
- **重写组件**: `PipelineModelSection.tsx` - 从手动输入改为下拉选择
- **缓存机制**: 5 分钟 LRU 缓存，支持强制刷新
- **模型分组**: 按 Provider 分组展示 (ark/fal/google_ai/qwen)

**支持的 Provider 模型获取**:
```
Ark (字节火山引擎) → 已知模型列表 + 连接测试
FAL.ai → API 动态获取 (代理支持)
Google AI Studio → API 动态获取 (代理支持)
Alibaba Bailian (通义千问) → API 动态获取
```

#### 4.3 分阶段迁移 main 分支模型配置到管理员后台 (`24a0378`)

**核心架构**: 从 main 分支迁移完整的 Provider + Model 配置模式

**配置模式**:
```
Provider 列表 (ark/fal/google_ai/qwen)
  ↓
输入 API Key → 测试连接
  ↓
展示预设模型列表
  ↓
启用/禁用单个模型
  ↓
保存配置到 system_config 表
```

**新增文件**:

| 文件 | 说明 | 行数 |
|------|------|------|
| `src/app/api/admin/platform-keys/test/route.ts` | 测试 Provider 连接 API | 86 |
| `src/lib/admin-model-config.ts` | 管理员模型配置类型和预设数据 | 123 |
| `src/lib/admin-model-presets.ts` | 预设模型配置文件 | 125 |
| `src/app/api/admin/model-config/route.ts` | 平台模型配置 CRUD API | 81 |
| `src/app/[locale]/admin/platform-keys/AdminModelConfig.tsx` | 核心配置组件 | 374 |

**预设 Provider** (4个):
- `ark` - Volcengine Ark (字节火山引擎)
- `fal` - FAL.ai
- `google_ai` - Google AI Studio
- `qwen` - Alibaba Bailian (通义千问)

**预设模型** (25+个):
| Provider | 类型 | 模型数量 | 示例 |
|----------|------|----------|------|
| Ark | LLM | 3 | Doubao Seed 2.0 Pro, Lite, Seed 1.6 |
| Ark | Image | 2 | Seedream 4.5, 5.0 Lite |
| Ark | Video | 3 | Seedance 2.0, 2.0 Fast, 1.5 Pro |
| FAL | Image | 2 | Banana Pro, Banana 2 |
| FAL | Video | 3 | Wan 2.6, Veo 3.1, Sora 2 |
| FAL | Audio | 1 | IndexTTS 2 |
| FAL | Lipsync | 1 | Kling Lip Sync |
| Google AI | LLM | 2 | Gemini 3.1 Pro, 3 Flash |
| Google AI | Image | 1 | Gemini 3 Pro Image |
| Google AI | Video | 2 | Veo 3.1, 3.1 Fast |
| Qwen | LLM | 2 | Qwen 3.5 Plus, Flash |
| Qwen | Audio | 2 | Qwen3 TTS, Voice Design |
| Qwen | Video | 2 | Wan2.6 I2V Flash, I2V |

**核心功能**:
- ✅ Provider API Key 配置
- ✅ 测试 Provider 连接
- ✅ 预设模型列表展示
- ✅ 启用/禁用模型
- ✅ 批量启用/禁用所有模型
- ✅ 保存配置到 system_config
- ✅ 展开/折叠 Provider 列表
- ✅ 测试连接状态显示

**保留兼容**:
- 旧版 API Key 配置保留并标记为"旧版"
- 确保平滑过渡

---

### Phase 5: 平台级 API 配置系统 (最新)

**提交**: `9bd0c5f`, `118b5df`

#### 5.1 平台级配置数据库设计
- **新增表**: `PlatformConfig` 存储平台级默认配置
- **配置层级**: 用户配置 > 平台配置 > 系统默认
- **加密存储**: 所有 API Key 加密存储

**PlatformConfig 表结构**:
```prisma
model PlatformConfig {
  id                  String   @id @default(uuid())
  configKey           String   @unique @default("api_config")
  analysisModel       String?  // 平台默认分析模型
  characterModel      String?  // 平台默认角色图片模型
  locationModel       String?  // 平台默认场景图片模型
  storyboardModel     String?  // 平台默认分镜图片模型
  editModel           String?  // 平台默认修图模型
  videoModel          String?  // 平台默认视频模型
  audioModel          String?  // 平台默认语音模型
  lipSyncModel        String?  // 平台默认口型同步模型
  voiceDesignModel    String?  // 平台默认音色设计模型
  analysisConcurrency Int?     // 平台默认分析流程并发上限
  imageConcurrency    Int?     // 平台默认图像流程并发上限
  videoConcurrency    Int?     // 平台默认视频流程并发上限
  capabilityDefaults  String?  @db.Text  // 平台默认能力配置 (JSON)
  llmBaseUrl          String?  @default("https://openrouter.ai/api/v1")
  llmApiKey           String?  @db.Text
  falApiKey           String?  @db.Text
  googleAiKey         String?  @db.Text
  arkApiKey           String?  @db.Text
  qwenApiKey          String?  @db.Text
  customModels        String?  @db.Text  // 平台默认模型池 (JSON)
  customProviders     String?  @db.Text  // 平台默认提供商列表 (JSON)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @default(now()) @updatedAt
}
```

#### 5.2 新增 API 路由
- **`/api/admin/platform-config`**: 管理员读写平台配置
  - GET: 读取当前平台配置
  - PUT: 创建/更新平台配置 (加密 API Key)

#### 5.3 新增 Hooks 和组件
- **`usePlatformProviders`**: 平台级配置 hook (调用 `/api/admin/platform-config`)
- **`ApiConfigTabContainer`**: 支持外部传入配置数据，实现组件复用
  - 参数类型: `Partial<UseProvidersReturn>`
  - 支持用户级和平台级配置页面复用同一组件

#### 5.4 用户配置回退逻辑
- **修改**: `/api/user/api-config` GET 端点
- **逻辑**: 当用户没有个人配置时，自动回退到平台配置
- **合并策略**: 用户配置优先，平台配置作为默认值

```typescript
// 配置合并示例
const mergedConfig = {
  customModels: pref?.customModels || platformConfig?.customModels,
  analysisModel: pref?.analysisModel || platformConfig?.analysisModel,
  analysisConcurrency: pref?.analysisConcurrency ?? platformConfig?.analysisConcurrency,
  // ... 其他字段
}
```

#### 5.5 管理后台页面
- **路径**: `/admin/platform-keys`
- **功能**: 配置平台级 API Key、模型池、默认模型、并发限制
- **UI**: 复用 `ApiConfigTabContainer` 组件
- **权限**: 仅管理员可访问

---

## 数据库结构

### 新增数据表 (相比 main 分支)

| 表名 | 用途 | 新增/修改 |
|------|------|----------|
| `SystemConfig` | 平台级配置存储 (API Keys, 模型配置) | 修改 |
| `PlatformConfig` | 平台默认配置 (所有用户共享) | **新增** |
| `SubscriptionPlan` | 订阅套餐配置 | **新增** |
| `UserSubscription` | 用户订阅记录 | **新增** |
| `InviteRecord` | 邀请记录 | **新增** |
| `InviteRebateLog` | 邀请返利日志 | **新增** |
| `UserPreference` | 用户偏好设置 (并发数等) | 修改 |
| `User` | 添加 isAdmin, inviteCode 等字段 | 修改 |

### 系统配置 Key 规范

```
# 旧版配置 (保留兼容)
platform.ark_api_key        # Ark API Key (加密)
platform.fal_api_key        # FAL API Key (加密)
platform.google_ai_key      # Google AI API Key (加密)
platform.qwen_api_key       # 通义千问 API Key (加密)
platform.model_config       # 平台模型配置 (JSON)
platform.pipeline_models    # 流程模型分配 (JSON)

# 新版配置 (PlatformConfig 表)
api_config                  # 固定配置键，包含所有平台默认值
```

---

## API 路由

### 管理员 API (新增)

| 路由 | 方法 | 功能 |
|------|------|------|
| `/api/admin/platform-keys` | GET/POST | 平台 API Key 管理 (旧版) |
| `/api/admin/platform-keys/test` | POST | 测试 Provider 连接 |
| `/api/admin/platform-keys/models` | GET | 获取所有 Provider 可用模型 |
| `/api/admin/platform-keys/pipeline-models` | GET/POST | 流程模型配置 |
| `/api/admin/platform-config` | GET/PUT | **平台级配置管理 (新版)** |
| `/api/admin/model-config` | GET/POST | 平台模型配置管理 |
| `/api/admin/plans` | GET/POST | 套餐管理 |
| `/api/admin/plans/[id]` | GET/PUT/DELETE | 单个套餐操作 |
| `/api/admin/users` | GET | 用户列表 |
| `/api/admin/users/[id]/assign-plan` | POST | 为用户分配套餐 |
| `/api/admin/users/[id]/grant-credits` | POST | 为用户授予积分 |
| `/api/admin/credit-pricing` | GET/PUT | 积分定价配置 |
| `/api/admin/invite-leaderboard` | GET | 邀请排行榜 |

### 用户 API (新增)

| 路由 | 方法 | 功能 |
|------|------|------|
| `/api/user/subscription` | GET/POST | 用户订阅管理 |
| `/api/user/invite` | GET | 用户邀请码信息 |
| `/api/user/invite/activate` | POST | 激活邀请码 |
| `/api/user/api-config` | GET/PUT | 用户 API 配置 (支持平台配置回退) |
| `/api/user/api-config/test-provider` | POST | 测试 Provider 连接 |
| `/api/auth/register` | POST | 用户注册 (支持邀请码) |

### 定时任务

| 路由 | 方法 | 功能 |
|------|------|------|
| `/api/cron/subscription-cycle` | GET | 订阅周期自动处理 |

---

## 管理后台页面

| 页面路径 | 功能 | 新增 |
|---------|------|------|
| `/admin/platform-keys` | 平台 API Key 和模型配置 | ✅ 新增 |
| `/admin/plans` | 订阅套餐管理 | ✅ 新增 |
| `/admin/users` | 用户管理 | ✅ 新增 |
| `/admin/credit-pricing` | 积分定价配置 | ✅ 新增 |
| `/admin/invite-leaderboard` | 邀请排行榜 | ✅ 新增 |

---

## 用户端页面

| 页面路径 | 功能 | 修改 |
|---------|------|------|
| `/pricing` | 套餐展示和订阅入口 | ✅ 新增 |
| `/profile` | 用户个人中心 (积分、邀请码) | ✅ 增强 |
| `/auth/signup` | 注册页 (含邀请码) | ✅ 增强 |
| `/invite` | 邀请详情和返利记录 | ✅ 新增 |

---

## 核心文件结构

```
src/
├── app/
│   ├── [locale]/
│   │   ├── admin/
│   │   │   ├── platform-keys/
│   │   │   │   ├── page.tsx                    # 平台 API 配置页
│   │   │   │   ├── hooks.ts                    # usePlatformProviders
│   │   │   │   ├── AdminModelConfig.tsx        # 模型配置组件
│   │   │   │   └── PipelineModelSection.tsx    # 流程模型配置
│   │   │   ├── plans/
│   │   │   │   └── page.tsx                    # 套餐管理
│   │   │   ├── users/
│   │   │   │   └── page.tsx                    # 用户管理
│   │   │   ├── credit-pricing/
│   │   │   │   └── page.tsx                    # 积分定价
│   │   │   └── invite-leaderboard/
│   │   │       └── page.tsx                    # 邀请排行榜
│   │   ├── pricing/
│   │   │   └── page.tsx                        # 套餐定价页
│   │   ├── profile/
│   │   │   └── page.tsx                        # 用户个人中心
│   │   ├── invite/
│   │   │   └── page.tsx                        # 邀请详情
│   │   └── auth/signup/
│   │       └── page.tsx                        # 注册页 (含邀请码)
│   └── api/
│       ├── admin/
│       │   ├── platform-config/                # 平台级配置 (新增)
│       │   │   └── route.ts
│       │   ├── platform-keys/
│       │   │   ├── route.ts
│       │   │   ├── test/route.ts
│       │   │   ├── models/route.ts
│       │   │   └── pipeline-models/route.ts
│       │   ├── model-config/
│       │   │   └── route.ts
│       │   ├── plans/
│       │   │   ├── route.ts
│       │   │   └── [id]/route.ts
│       │   ├── users/
│       │   │   ├── route.ts
│       │   │   └── [id]/
│       │   │       ├── assign-plan/route.ts
│       │   │       └── grant-credits/route.ts
│       │   ├── credit-pricing/
│       │   │   └── route.ts
│       │   └── invite-leaderboard/
│       │       └── route.ts
│       └── user/
│           ├── subscription/route.ts
│           ├── invite/
│           │   ├── route.ts
│           │   └── activate/route.ts
│           └── api-config/
│               ├── route.ts                    # 支持平台配置回退
│               └── test-provider/route.ts
├── lib/
│   ├── admin-model-config.ts                   # 管理员模型配置
│   ├── admin-model-presets.ts                  # 预设模型
│   ├── platform-models.ts                      # Provider模型获取
│   ├── platform-config.ts                      # 平台配置管理 (旧版)
│   ├── config-service.ts                       # 统一配置服务
│   ├── billing/                                # 积分计费模块
│   └── auth.ts                                 # 认证配置
└── components/
    └── Navbar.tsx                              # 导航栏 (显示套餐信息)

scripts/
├── deploy-full.sh                              # 完整部署脚本
├── deploy.sh                                   # 基础部署脚本
├── force-rebuild.sh                            # 强制重建镜像
├── set-admin.sh                                # 设置管理员
├── diagnose.sh                                 # 部署诊断
└── migrations/
    └── backfill-invite-codes.ts                # 邀请码补全迁移
```

---

## 统计信息 (相比 main 分支)

| 指标 | 数值 |
|------|------|
| 新增提交数 | 44 个 |
| 变更文件数 | 94 个 |
| 新增代码行数 | +9,872 |
| 删除代码行数 | -932 |
| 新增 API 路由 | 18 个 |
| 新增页面 | 7 个 |
| 新增组件 | 6 个核心组件 |
| 新增数据库表 | 4 个 |
| 新增 Hooks | 3 个 |
| 预设模型数量 | 30+ 个 |
| 支持 Provider 数量 | 4 个 |

---

## 已知限制与待办事项

### 已完成
- ✅ 平台 API Key 统一管理 (旧版 SystemConfig)
- ✅ 平台级配置系统 (新版 PlatformConfig)
- ✅ 积分计费核心模块 (冻结/扣除/回滚)
- ✅ 订阅管理系统 (四档套餐)
- ✅ 邀请分销系统 (邀请码/激活/返利)
- ✅ 管理员 API 接口 (完整 CRUD)
- ✅ 用户侧 API 接口 (订阅/邀请/配置)
- ✅ 部署脚本和运维工具
- ✅ 管理员模型配置 Phase 1 (Provider + 模型列表)
- ✅ 流程模型配置优化 (自动获取可用模型)
- ✅ Pricing 页面 (含功能对比表和 FAQ)
- ✅ 管理后台页面 (用户/套餐/积分/邀请)
- ✅ 用户配置回退到平台配置

### 待完成 (Phase 2+)
- [ ] 管理员模型配置 Phase 2:
  - [ ] 能力参数配置 (capabilities)
  - [ ] 拖拽排序模型
  - [ ] 自定义 Provider 支持
  - [ ] 模型定价配置
- [ ] 支付网关集成 (Stripe 等)
- [ ] 积分充值功能
- [ ] 订阅升级/降级逻辑完善
- [ ] 用量统计和报表
- [ ] Pricing 页面深度优化 (参考 oiioii.ai/asset 设计)
- [ ] 单元测试和集成测试补充

---

## 部署信息

### 环境要求
- **服务器**: AWS EC2 (Amazon Linux)
- **Docker**: Compose 部署
- **数据库**: MySQL 8.0+
- **端口**: 13000

### 部署步骤
```bash
# 1. SSH 到服务器
ssh ec2-user@54.206.102.49

# 2. 进入项目目录
cd /path/to/waoowaoo

# 3. 拉取最新代码
git pull origin feature/saas-credits

# 4. 完整部署 (含数据库迁移)
./scripts/deploy-full.sh

# 5. 设置管理员 (首次部署)
./scripts/set-admin.sh <admin-email>
```

### 环境变量
```env
NEXTAUTH_URL=http://54.206.102.49:13000
DATABASE_URL=mysql://root:password@db:3306/waoowaoo
```

### 数据库迁移
部署脚本会自动执行以下迁移：
1. 创建 `PlatformConfig` 表
2. 创建 `SubscriptionPlan`, `UserSubscription` 表
3. 创建 `InviteRecord`, `InviteRebateLog` 表
4. 更新 `User` 表结构 (添加 `isAdmin`, `inviteCode` 等字段)
5. 为已有用户补全邀请码

---

## 重要提示

### 架构设计
1. **配置三层架构**: 用户配置 > 平台配置 > 系统默认
2. **模型 Key 格式**: 统一使用 `provider::modelId` 格式 (如 `ark::doubao-seed-2-0-pro-260215`)
3. **API Key 加密**: 所有 API Key 存储时都经过加密
4. **管理员权限**: 通过 NextAuth session 验证，使用 `requireAdmin()` 函数
5. **缓存策略**: 模型列表使用 5 分钟 LRU 缓存

### 组件复用
1. **ApiConfigTabContainer**: 同时用于用户配置页和管理员平台配置页
2. **UseProvidersReturn**: 统一的配置数据接口类型
3. **Partial<UseProvidersReturn>**: 支持部分配置覆盖

### 安全考虑
1. 所有管理员 API 都需要 `isAdmin` 权限验证
2. API Key 加密存储，解密仅在服务端进行
3. 积分操作使用事务保证一致性
4. 邀请码激活使用事务防止并发问题

---

## 关键提交历史

| 提交 | 说明 |
|------|------|
| `118b5df` | 修复 ApiConfigTabContainer 类型错误，支持无参数调用 |
| `9bd0c5f` | **实现平台级 API 配置功能，管理员配置可应用到全部用户** |
| `e1927cf` | 修复注册邀请码事务超时、退出登录 URL 和 admin API 配置页面 |
| `8e9d402` | 优化 pricing 页面 - 添加功能对比表和 FAQ 区域 |
| `24a0378` | **分阶段迁移 main 分支模型配置到管理员后台 (Phase 1)** |
| `b1076fe` | 优化流程模型配置，支持自动获取可用模型列表 |
| `a317ab2` | **集中化管理模型配置，移除用户端模型选择** |
| `055639d` | 修复平台配置、pricing 页面、邀请码、退出登录等 5 个问题 |
| `6f70161` | 修复 Admin API 和 Subscription API 认证问题 |
| `6ca3df7` | 添加完整部署脚本 deploy-full.sh |
| `0cbdcdc` | **实现真实管理员鉴权 + 创建管理员设置脚本** |
| `247ec0d` | **完成 SaaS 平台积分计费系统前端实现** |
| `0b0b2e1` | **完成 SaaS 积分计费系统核心实现** |

---

### Phase 6: Volcengine 语音服务完整集成 (最新)

**提交**: `2170262`, `fd6ca0a`

#### 6.1 火山引擎语音服务集成 (`2170262`)
- **新增功能**:
  - ✅ **TTS (文本转语音)**: 支持多音色、语速调整
  - ✅ **Voice Design (音色克隆)**: 用户上传音频文件生成自定义音色
  - ✅ **Lip Sync (口型同步)**: 音频驱动视频生成口型匹配效果
- **架构实现**:
  - 新增三个 Generator 类: `ArkSpeechTTSGenerator`, `ArkSpeechVoiceDesignGenerator`, `ArkSpeechLipSyncGenerator`
  - 集成到 Generator Factory，支持 provider 动态切换
  - 兼容现有 `BaseAudioGenerator` 接口，保持 100% 向后兼容
  - 完整支持计费规则，与积分系统深度集成
- **计费规则** (添加到 `src/lib/credit-billing/catalog.ts`):
  - TTS 基础版: 1 积分 / 1000 字符
  - TTS 高级版: 3 积分 / 1000 字符
  - 音色克隆: 100 积分 / 次调用
  - 口型同步: 50 积分 / 分钟
- **前端实现**:
  - 新增 `ProviderSelector.tsx` 组件，支持语音服务 provider 切换
  - 自动根据用户可用模型显示可选 provider
  - 当只有一个 provider 时自动隐藏选择器
- **管理后台**:
  - 平台配置页面支持选择火山引擎作为默认语音服务 provider
  - 新增 `lipSyncModel`, `voiceDesignModel` 默认模型配置字段

#### 6.2 平台配置保存失败修复 (`fd6ca0a`)
- **问题**: 管理员后台修改模型配置时提示保存失败
- **原因**: `isUnifiedModelType` 验证函数中缺失 `voicedesign` 模型类型
- **修复**:
  - 在 `src/app/api/admin/platform-config/route.ts` 添加 `voicedesign` 到验证列表
  - 在 `src/app/api/user/api-config/route.ts` 添加 `voicedesign` 到验证列表
  - 验证通过，现在可以正常保存包含语音克隆模型的配置

---

## 下一步建议

1. **支付集成**: 接入 Stripe 或其他支付网关，实现自动订阅
2. **模型配置 Phase 2**: 完成能力参数、拖拽排序、自定义 Provider
3. **测试覆盖**: 补充单元测试和集成测试，特别是计费和订阅逻辑
4. **性能优化**: 模型列表缓存优化、API 响应优化
5. **Pricing 页面**: 参考 oiioii.ai 改进视觉设计和交互
6. **监控告警**: 添加积分消耗监控和告警机制

---

**文档生成时间**: 2026-04-13
**文档版本**: v2.1
**分支**: feature/saas-credits
**最新提交**: fd6ca0a
**对比基准**: main (v0.4.0)
