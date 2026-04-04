# SaaS 订阅 + 积分计费 + 邀请分销 设计规格文档

**项目**：waoowaoo  
**版本**：Step 1 — 平台 Key 管理 + 积分体系基础设施  
**日期**：2026-04-03  
**状态**：已确认，待实现

---

## 一、背景与目标

### 现状

当前项目以"开源工具模式"运行：用户在设置页面配置自己的 FAL_API_KEY、ARK_API_KEY 等第三方密钥，系统用这些 Key 调用 AI 服务。计费模块（billing/）已存在但处于 BILLING_MODE=OFF 关闭状态。

### 目标（第一步范围）

1. **平台化 API Key**：由后台 SystemConfig 统一管理 Key，彻底移除用户侧 Key 配置入口。
2. **积分计费体系**：把现有余额字段语义重定义为"积分"，建立积分扣费、冻结、流水链路。
3. **订阅套餐数据模型**：定义套餐表、用户订阅状态表，支持管理员手动分配。
4. **邀请分销基础设施**：记录邀请关系，注册时原子发放双边奖励积分。
5. **管理员后台**：提供 Key 配置、积分定价、用户管理、邀请看板四个后台页面。

**不包含（留到后续步骤）**：
- 微信 / 支付宝支付集成
- 公开的套餐购买页面（本步骤只做数据模型，购买按钮显示"即将开放"）

---

## 二、数据模型

### 2.1 新增表

#### SystemConfig — 平台配置中心

```prisma
model SystemConfig {
  id          String   @id @default(uuid())
  key         String   @unique
  value       String   @db.Text
  description String?  @db.VarChar(256)
  updatedAt   DateTime @updatedAt
  updatedBy   String?

  @@map("system_configs")
}
```

**键命名约定**：

| 键名 | 说明 | 格式 |
|---|---|---|
| platform.llm_api_key | LLM 服务 API Key | 加密字符串 |
| platform.llm_base_url | LLM API Base URL | 明文 URL |
| platform.fal_api_key | FAL（图片+视频+语音） | 加密字符串 |
| platform.ark_api_key | 火山引擎（Seedream/Seedance） | 加密字符串 |
| platform.google_ai_key | Google AI（Gemini 图片） | 加密字符串 |
| platform.qwen_api_key | 阿里百炼（声音设计） | 加密字符串 |
| billing.credit_pricing | 积分定价目录 | JSON |
| billing.model_tier_map | 模型档次映射 | JSON |
| invite.welcome_credits | 新用户注册礼积分 | 整数字符串 |
| invite.referral_credits | 邀请人拉新奖励积分 | 整数字符串 |
| invite.rebate_rate | 充值返佣比例（如 "0.10"） | 小数字符串 |
| invite.daily_referral_cap | 每日拉新上限 | 整数字符串 |

---

#### SubscriptionPlan — 套餐定义表

```prisma
model SubscriptionPlan {
  id              String   @id
  name            String
  monthlyPrice    Decimal  @db.Decimal(10, 2)
  yearlyPrice     Decimal? @db.Decimal(10, 2)
  trialDays       Int      @default(0)
  monthlyCredits  Int
  maxVideoSeconds Int
  maxConcurrency  Int
  features        Json
  isActive        Boolean  @default(true)
  sortOrder       Int      @default(0)

  @@map("subscription_plans")
}
```

**初始数据**：

| id | name | monthlyPrice | yearlyPrice | trialDays | monthlyCredits | maxVideoSeconds | maxConcurrency |
|---|---|---|---|---|---|---|---|
| starter | 新手试用 | 9.9 | - | 7 | 300 | 60 | 1 |
| basic | 基础版 | 89.9 | 899 | 0 | 2000 | 400 | 1 |
| pro | 专业版 | 199.9 | 1999 | 0 | 5000 | 1000 | 2 |
| flagship | 旗舰版 | 499.9 | 4999 | 0 | 15000 | 3000 | 5 |
| enterprise | 企业版 | -1 | -1 | 0 | 0 | 999999 | 99 |

---

#### UserSubscription — 用户订阅状态

```prisma
model UserSubscription {
  id                 String    @id @default(uuid())
  userId             String    @unique
  planId             String
  billingCycle       String
  status             String
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime
  creditsGranted     Int       @default(0)
  videoSecondsUsed   Int       @default(0)
  cancelledAt        DateTime?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  user               User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([status])
  @@index([currentPeriodEnd])
  @@map("user_subscriptions")
}
```

---

#### InviteRecord — 邀请关系记录

```prisma
model InviteRecord {
  id              String    @id @default(uuid())
  inviterId       String
  inviteeId       String    @unique
  inviteCode      String
  registeredAt    DateTime  @default(now())
  activatedAt     DateTime?
  rebateEndsAt    DateTime
  welcomeCredits  Int       @default(0)
  referralCredits Int       @default(0)
  welcomeTxId     String?
  referralTxId    String?
  createdAt       DateTime  @default(now())

  @@index([inviterId])
  @@index([inviteCode])
  @@map("invite_records")
}
```

---

#### InviteRebateLog — 充值返佣日志

```prisma
model InviteRebateLog {
  id             String   @id @default(uuid())
  inviterId      String
  inviteeId      String
  triggerType    String
  sourceAmount   Decimal? @db.Decimal(10, 2)
  creditsAwarded Int
  idempotencyKey String   @unique
  createdAt      DateTime @default(now())

  @@index([inviterId])
  @@index([inviteeId])
  @@map("invite_rebate_logs")
}
```

---

### 2.2 修改现有表

#### User 新增字段

```prisma
inviteCode String?  @unique    // 用户专属邀请码（6位大写字母+数字，注册时自动生成）
invitedBy  String?             // 邀请人 userId（注册时写入，不可更改）
isAdmin    Boolean  @default(false)
```

#### UserBalance 新增字段（保留旧字段，不删除）

```prisma
subscriptionCredits Int @default(0)  // 套餐赠送积分（随周期结束清零）
permanentCredits    Int @default(0)  // 充值/奖励积分（永久有效）
frozenCredits       Int @default(0)  // 当前冻结中的积分
```

可用积分 = subscriptionCredits + permanentCredits - frozenCredits
扣费顺序：优先消耗 subscriptionCredits，耗尽后消耗 permanentCredits

#### BalanceTransaction type 新增约定

| type | 说明 |
|---|---|
| subscription_grant | 套餐积分发放 |
| subscription_expired_clear | 套餐到期积分清零 |
| admin_grant | 管理员手动充值 |
| package_purchase | 加油包购买（永久积分） |
| invite_welcome_gift | 受邀注册奖励（新用户） |
| invite_referral_reward | 邀请新人奖励（邀请人） |
| invite_rebate | 充值返佣积分 |
| credit_freeze | 积分冻结（生成前） |
| credit_deduct | 积分扣除（生成后确认） |
| credit_unfreeze | 积分解冻（生成失败回滚） |

### 2.3 废弃（隐藏，不删除）字段

UserPreference 以下字段保留 Schema 结构，前端停止读写：
- llmBaseUrl / llmApiKey
- falApiKey / googleAiKey / arkApiKey / qwenApiKey
- customModels / customProviders

---

## 三、积分定价目录

存储于 SystemConfig.key = 'billing.credit_pricing'，管理员后台实时修改：

```json
{
  "image": { "basic": 1, "advanced": 3 },
  "video": { "basic_per_sec": 5, "advanced_per_sec": 20 },
  "text": { "per_1000_chars": 2 },
  "audio": { "per_10_sec": 2 },
  "voiceDesign": { "per_call": 5 },
  "lipSync": { "per_call": 10 }
}
```

模型档次映射，存储于 SystemConfig.key = 'billing.model_tier_map'：

```json
{
  "fal::fal-ai/flux/schnell": "basic",
  "fal::fal-ai/flux-pro": "advanced",
  "ark::seedance-1-0-lite-t2v-250428": "basic",
  "ark::seedance-2-0-t2v": "advanced"
}
```

---

## 四、核心代码模块

### 4.1 新建 src/lib/platform-config.ts

- getPlatformApiKey(provider) — 读 SystemConfig，带 60s 内存缓存，返回解密后 Key
- resolvePlatformModelSelection(modelKey, mediaType) — 无需 userId，从平台配置解析

### 4.2 新建 src/lib/credit-billing/

```
src/lib/credit-billing/
├── catalog.ts   # 积分定价查询（读 SystemConfig JSON）
├── tier.ts      # modelKey → basic/advanced 档次解析
├── service.ts   # 包装 ledger.ts，以积分整数执行冻结/扣除/回滚
└── guard.ts     # 请求前门卫校验
```

guard.ts 校验矩阵：

| 校验项 | 失败 HTTP | 错误码 |
|---|---|---|
| 有效订阅（status=active） | 402 | NO_SUBSCRIPTION |
| 积分余额 >= 预估消耗 | 402 | INSUFFICIENT_CREDITS |
| 并发任务 < 套餐上限 | 429 | CONCURRENCY_LIMIT |
| 套餐权益包含所选模型档次 | 403 | PLAN_UPGRADE_REQUIRED |
| 本周期视频秒数未超上限 | 402 | VIDEO_QUOTA_EXCEEDED |

---

## 五、邀请奖励事务流程

用户通过邀请链接注册时，在同一 Prisma 事务中原子完成：

```
① 创建新用户（写入 invitedBy=inviter.id，生成 inviteCode）
② 创建 InviteRecord（inviterId, inviteeId, inviteCode, rebateEndsAt=+1year）
③ 给新用户赠送新手礼积分（来自 SystemConfig invite.welcome_credits）
   → upsert UserBalance.subscriptionCredits += N
   → 写 BalanceTransaction（type=invite_welcome_gift，idempotencyKey=invite_{inviteeId}_welcome）
④ 给邀请人赠送拉新奖励积分（来自 SystemConfig invite.referral_credits）
   → update UserBalance.permanentCredits += M  ← 永久积分，不随套餐清零
   → 写 BalanceTransaction（type=invite_referral_reward，idempotencyKey=invite_{inviteeId}_referral）
⑤ 更新 InviteRecord.welcomeTxId / referralTxId
事务提交
```

邀请码生成规则：
- 格式：6位大写字母+数字，如 K8X2PQ
- 生成后 DB 查重，冲突则重试（最多5次）
- 注册时服务端自动生成，用户不可自定义

防刷机制：
- 当天 InviteRebateLog 中 inviterId 的 activation 类型记录数达上限时，跳过邀请人奖励（新用户奖励正常发放）

---

## 六、订阅周期管理（Cron Job）

/api/cron/subscription-cycle 每天定时执行：

```
1. 查询所有 status=active AND currentPeriodEnd < now() 的 UserSubscription
2. 对每条记录（事务内）：
   a. status = expired
   b. UserBalance.subscriptionCredits = 0
   c. 写 BalanceTransaction（type=subscription_expired_clear）
```

续费时（管理员手动触发）：
```
1. 更新 UserSubscription（新周期 start/end，status=active）
2. UserBalance.subscriptionCredits = 套餐 monthlyCredits
3. 写 BalanceTransaction（type=subscription_grant）
```

---

## 七、管理员后台页面

| 路由 | 功能 |
|---|---|
| /admin/platform-keys | 平台 API Key 配置（加密存储，显示后4位，测试连接按钮） |
| /admin/credit-pricing | 积分定价配置（结构化表单+模型档次映射+实时预览） |
| /admin/users | 用户管理（搜索、查订阅、手动充值、手动分配套餐、设置管理员） |
| /admin/invite-leaderboard | 邀请榜单（月度排名、手动授予奖励套餐） |

---

## 八、前端用户侧改造

移除：
- 设置页面「API Key 配置」Tab 完全隐藏
- 自定义提供商/模型管理入口移除

新增：
- 顶部导航栏：积分余额 + 套餐名称
- /pricing：套餐展示页（购买按钮显示"即将开放"）
- /invite：邀请页（邀请码、邀请列表、返佣记录）
- 积分不足弹窗 Modal（去充值 / 升级套餐）

---

## 九、新增 API 接口

| Method | Path | 说明 |
|---|---|---|
| GET/POST | /api/admin/platform-keys | 读写平台 Key |
| GET/POST | /api/admin/credit-pricing | 读写积分定价 |
| GET | /api/admin/users | 列举用户 |
| POST | /api/admin/users/[id]/grant-credits | 手动充值积分 |
| POST | /api/admin/users/[id]/assign-plan | 手动分配套餐 |
| GET | /api/user/subscription | 获取当前用户订阅状态+积分余额 |
| GET | /api/user/invite | 邀请码、邀请列表、返佣记录 |
| POST | /api/user/invite/activate | 邀请激活（首次生成后调用） |
| POST | /api/cron/subscription-cycle | 订阅周期到期处理（Cron） |

---

## 十、验证计划

### 自动化测试
- 积分扣费顺序（先扣 subscriptionCredits，后扣 permanentCredits）
- 邀请奖励事务原子性（中间失败验证回滚）
- 幂等性（重复触发邀请奖励，验证不重复）
- 套餐到期清零（subscriptionCredits=0，permanentCredits 保留）

### 手动验证
- 管理员后台配置 Key 后，生成任务正常调用
- 修改积分定价后，下次生成按新标准计费
- 新用户通过邀请码注册，双边均收到正确积分
- 后台手动分配套餐，用户积分余额正确显示
