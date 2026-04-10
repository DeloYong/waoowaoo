# WaoWaoOo - SaaS 积分计费系统与管理后台模型配置迁移

## 项目概览

**项目名称**: WaoWaoOo - AI 小说推广视频生成平台
**技术栈**: Next.js 15.5.7 + TypeScript + Prisma ORM + MySQL + NextAuth v4
**分支**: `feature/saas-credits`
**当前版本**: v0.5.0
**部署地址**: http://54.206.102.49:13000

---

## 已完成任务总结

### Phase 1: SaaS 积分计费系统核心实现 (提交: 0b0b2e1, 247ec0d)

#### 1.1 平台 API Key 统一管理
- **数据库设计**: `SystemConfig` 表存储平台级配置
- **加密存储**: API Key 使用 `encryptApiKey`/`decryptApiKey` 加密
- **支持的 Provider**: ark, fal, google_ai, qwen
- **配置文件**: `src/lib/platform-config.ts`

#### 1.2 积分计费核心模块
- **积分冻结/扣除/回滚机制**: 任务开始时冻结积分，成功扣除，失败回滚
- **计费模型**: 按模型类型和使用量计费
- **并发控制**: 分析/图片/视频任务独立并发限制

#### 1.3 订阅管理系统
- **套餐配置**: Free, Starter, Pro, Enterprise 四档套餐
- **计费周期**: 月付/年付切换
- **积分额度**: 各套餐不同积分和视频秒数配额
- **管理 API**: `/api/admin/plans` 套餐 CRUD

#### 1.4 邀请分销系统
- **邀请码生成**: 用户注册时自动生成唯一邀请码
- **激活流程**: 新用户通过邀请链接注册自动绑定关系
- **迁移脚本**: `scripts/migrations/backfill-invite-codes.ts` 为已有用户补全邀请码

#### 1.5 前端实现
- **Pricing 页面**: `/zh/pricing` 套餐展示和订阅入口
- **Profile 页面**: 用户个人信息、积分余额、邀请码展示
- **导航栏集成**: 显示当前套餐信息和积分余额

---

### Phase 2: 部署与运维优化 (提交: af4394e ~ 6ca3df7)

#### 2.1 部署脚本完善
- **deploy.sh**: 基础部署脚本，兼容 Amazon Linux
- **deploy-full.sh**: 完整部署脚本，含数据库迁移执行
- **force-rebuild.sh**: 强制重建 Docker 镜像
- **诊断脚本**: 部署问题诊断工具

#### 2.2 管理员鉴权
- **真实管理员鉴权**: 基于 NextAuth session 的 admin 权限验证
- **设置脚本**: `scripts/set-admin.sh` 通过 Docker MySQL 容器设置管理员
- **Admin Layout**: 使用 NextAuth session 而非 header 验证身份

#### 2.3 修复的问题
| 提交 | 修复内容 |
|------|---------|
| 9061c92 | Admin layout 使用 NextAuth session 验证 |
| 472a79c | 修正 getServerSession 导入路径 |
| 3a411c9 | force-rebuild.sh 错误检测逻辑 |
| eaca76b | 移除 set -e 防止构建中断 |
| 6f70161 | Admin API 和 Subscription API 认证问题 |
| 3972c43 | Docker 构建输出捕获问题 |

---

### Phase 3: 平台配置与 Bug 修复 (提交: 055639d)

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

### Phase 4: 模型配置集中化管理 (提交: a317ab2, b1076fe, 24a0378)

#### 4.1 集中化管理模型配置 (a317ab2)
- **目标**: 将模型配置从用户端移至管理员后台统一管理
- **实现**:
  - 移除用户端模型选择功能
  - 模型配置改为平台级统一配置
  - 用户侧自动使用管理员配置的模型

#### 4.2 流程模型配置优化 (b1076fe)
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

#### 4.3 分阶段迁移 main 分支模型配置到管理员后台 (24a0378) - Phase 1 完成

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

**Phase 2 待补充** (推迟到下次会话):
- 能力参数配置 (capabilities)
- 拖拽排序模型
- 自定义 Provider 支持
- 模型定价配置

---

## 数据库结构

### 核心表

| 表名 | 用途 |
|------|------|
| `SystemConfig` | 平台级配置存储 (API Keys, 模型配置) |
| `UserPreference` | 用户偏好设置 (并发数等) |
| `NovelPromotionProject` | 小说推广项目 |
| `InviteCode` | 邀请码和分销关系 |
| `Subscription` | 订阅记录 |
| `CreditTransaction` | 积分交易记录 |

### 系统配置 Key 规范

```
platform.ark_api_key        # Ark API Key (加密)
platform.fal_api_key        # FAL API Key (加密)
platform.google_ai_key      # Google AI API Key (加密)
platform.qwen_api_key       # 通义千问 API Key (加密)
platform.model_config       # 平台模型配置 (JSON)
platform.pipeline_models    # 流程模型分配 (JSON)
```

---

## API 路由

### 管理员 API

| 路由 | 方法 | 功能 |
|------|------|------|
| `/api/admin/platform-keys` | GET/POST | 平台 API Key 管理 |
| `/api/admin/platform-keys/test` | POST | 测试 Provider 连接 |
| `/api/admin/platform-keys/models` | GET | 获取所有 Provider 可用模型 |
| `/api/admin/platform-keys/pipeline-models` | GET/POST | 流程模型配置 |
| `/api/admin/model-config` | GET/POST | 平台模型配置管理 |
| `/api/admin/plans` | GET/POST | 套餐管理 |
| `/api/admin/plans/[id]` | GET/PUT/DELETE | 单个套餐操作 |

### 用户 API

| 路由 | 方法 | 功能 |
|------|------|------|
| `/api/user/subscription` | GET/POST | 用户订阅管理 |
| `/api/user/invite` | GET | 用户邀请码信息 |
| `/api/user/invite/activate` | POST | 激活邀请码 |

---

## 核心文件结构

```
src/
├── app/
│   ├── [locale]/
│   │   ├── admin/
│   │   │   └── platform-keys/
│   │   │       ├── page.tsx                    # 管理后台主页
│   │   │       ├── AdminModelConfig.tsx        # 模型配置组件 (新增)
│   │   │       └── PipelineModelSection.tsx    # 流程模型配置 (重写)
│   │   ├── pricing/
│   │   │   └── page.tsx                        # 套餐定价页
│   │   ├── profile/
│   │   │   └── page.tsx                        # 用户个人中心
│   │   └── auth/signup/
│   │       └── page.tsx                        # 注册页 (含邀请码)
│   └── api/
│       ├── admin/
│       │   ├── platform-keys/
│       │   │   ├── route.ts
│       │   │   ├── test/route.ts               # 新增
│       │   │   ├── models/route.ts             # 新增
│       │   │   └── pipeline-models/route.ts
│       │   ├── model-config/
│       │   │   └── route.ts                    # 新增
│       │   └── plans/
│       │       ├── route.ts
│       │       └── [id]/route.ts
│       └── user/
│           ├── subscription/route.ts
│           └── invite/
│               ├── route.ts
│               └── activate/route.ts
├── lib/
│   ├── admin-model-config.ts                   # 新增: 管理员模型配置
│   ├── admin-model-presets.ts                  # 新增: 预设模型
│   ├── platform-models.ts                      # 新增: Provider模型获取
│   ├── platform-config.ts                      # 平台配置管理
│   ├── config-service.ts                       # 统一配置服务
│   └── auth.ts                                 # 认证配置
└── components/
    └── Navbar.tsx                              # 导航栏 (显示套餐信息)

scripts/
├── deploy-full.sh                              # 完整部署脚本
├── set-admin.sh                                # 设置管理员
└── migrations/
    └── backfill-invite-codes.ts                # 邀请码补全迁移
```

---

## 统计信息

| 指标 | 数值 |
|------|------|
| 分支新增提交数 | 35 个 |
| 新增/修改文件 | 38 个 |
| 新增代码行数 | +2,192 |
| 删除代码行数 | -633 |
| 新增 API 路由 | 5 个 |
| 新增组件 | 2 个核心组件 |
| 新增配置文件 | 3 个 |
| 预设模型数量 | 25+ 个 |
| 支持 Provider 数量 | 4 个 |

---

## 已知限制与待办事项

### 已完成
- ✅ 平台 API Key 统一管理
- ✅ 积分计费核心模块
- ✅ 订阅管理系统
- ✅ 邀请分销系统
- ✅ 管理员 API 接口
- ✅ 用户侧 API 接口
- ✅ 部署脚本和运维工具
- ✅ 管理员模型配置 Phase 1 (Provider + 模型列表)
- ✅ 流程模型配置优化 (自动获取可用模型)
- ✅ Pricing 页面基础功能

### 待完成 (Phase 2+)
- [ ] 管理员模型配置 Phase 2:
  - 能力参数配置 (capabilities)
  - 拖拽排序模型
  - 自定义 Provider 支持
  - 模型定价配置
- [ ] Pricing 页面深度优化 (参考 oiioii.ai/asset 设计)
- [ ] 支付网关集成
- [ ] 积分充值功能
- [ ] 订阅升级/降级逻辑
- [ ] 用量统计和报表

---

## 部署信息

### 环境要求
- **服务器**: AWS EC2 (Amazon Linux)
- **Docker**: Compose 部署
- **数据库**: MySQL 8.0+
- **端口**: 13000

### 部署步骤
```bash
# 1. 拉取代码
git pull origin feature/saas-credits

# 2. 完整部署 (含数据库迁移)
./scripts/deploy-full.sh

# 3. 设置管理员 (首次部署)
./scripts/set-admin.sh <email>
```

### 环境变量
```env
NEXTAUTH_URL=http://54.206.102.49:13000
DATABASE_URL=mysql://root:password@db:3306/waoowaoo
```

---

## 下一步建议

1. **继续模型配置迁移**: 完成 Phase 2 的能力参数、拖拽排序等功能
2. **Pricing 页面优化**: 参考 oiioii.ai 改进视觉设计和交互
3. **支付集成**: 接入 Stripe 或其他支付网关
4. **测试覆盖**: 补充单元测试和集成测试
5. **性能优化**: 模型列表缓存优化、API 响应优化

---

## 重要提示

1. **模型 Key 格式**: 统一使用 `provider::modelId` 格式 (如 `ark::doubao-seed-2-0-pro-260215`)
2. **API Key 加密**: 所有 API Key 存储在 system_config 表时都经过加密
3. **管理员权限**: 通过 NextAuth session 验证，使用 `requireAdmin()` 函数
4. **配置存储**: 平台配置存储在 `system_config` 表，key 格式为 `platform.xxx`
5. **缓存策略**: 模型列表使用 5 分钟 LRU 缓存

---

**文档生成时间**: 2026-04-10
**文档版本**: v1.0
**分支**: feature/saas-credits
**最新提交**: 24a0378
