# SaaS 积分计费 Plan 1: Prisma Schema + 数据库迁移

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 SaaS 积分体系新增所有必要的数据库表和字段，并保证零破坏性迁移（旧字段保留不删除）。

**Architecture:** 在现有 Prisma MySQL Schema 上新增 6 张表（SystemConfig、SubscriptionPlan、UserSubscription、InviteRecord、InviteRebateLog）并在 User / UserBalance 上新增字段。所有改动向后兼容，旧字段仅隐藏不删除。

**Tech Stack:** Prisma ORM、MySQL、Next.js 15 App Router、TypeScript

**Spec:** `docs/superpowers/specs/2026-04-03-saas-platform-key-credit-billing-design.md`

---

## 文件清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| Modify | `prisma/schema.prisma` | 新增表和字段 |
| Create | `prisma/migrations/YYYYMMDDHHMMSS_saas_credits_schema/migration.sql` | 自动生成的迁移文件 |
| Create | `prisma/seed-plans.ts` | 套餐初始数据种子脚本 |

---

## Task 1: 新增 SystemConfig 表

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: 在 schema.prisma 合适位置（User 模型之前）新增以下内容**

```prisma
// ==================== 平台配置中心 ====================
model SystemConfig {
  id          String   @id @default(uuid())
  key         String   @unique          // 配置键，如 platform.fal_api_key
  value       String   @db.Text         // 加密存储（API Key）或明文（JSON 配置）
  description String?  @db.VarChar(256)
  updatedAt   DateTime @updatedAt
  updatedBy   String?                   // 操作管理员 userId

  @@map("system_configs")
}
```

- [ ] **Step 2: 运行 format 验证格式正确**

```bash
npx prisma format
```

期望：输出格式化后的 schema，无报错

---

## Task 2: 新增 SubscriptionPlan 表

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: 新增套餐定义表**

```prisma
// ==================== 订阅套餐 ====================
model SubscriptionPlan {
  id              String   @id            // starter / basic / pro / flagship / enterprise
  name            String
  monthlyPrice    Decimal  @db.Decimal(10, 2)   // 月付价格（元），企业版为 -1
  yearlyPrice     Decimal? @db.Decimal(10, 2)   // 年付价格（元）
  trialDays       Int      @default(0)    // 试用天数
  monthlyCredits  Int                     // 每周期赠送积分
  maxVideoSeconds Int                     // 最大视频总秒数/周期
  maxConcurrency  Int                     // 最大并发任务数
  features        Json                    // 权益标志：{ watermark, advancedModels, fastQueue }
  isActive        Boolean  @default(true)
  sortOrder       Int      @default(0)

  subscriptions UserSubscription[]

  @@map("subscription_plans")
}
```

- [ ] **Step 2: 运行 format 验证**

```bash
npx prisma format
```

---

## Task 3: 新增 UserSubscription 表

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: 新增用户订阅表**

```prisma
model UserSubscription {
  id                 String    @id @default(uuid())
  userId             String    @unique
  planId             String
  billingCycle       String               // monthly / yearly / trial
  status             String               // active / expired / cancelled
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime             // 到期时间（Cron Job 检查此字段）
  creditsGranted     Int       @default(0) // 本周期已发放积分
  videoSecondsUsed   Int       @default(0) // 本周期已消耗视频秒数
  cancelledAt        DateTime?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  user User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  plan SubscriptionPlan @relation(fields: [planId], references: [id])

  @@index([status])
  @@index([currentPeriodEnd])
  @@map("user_subscriptions")
}
```

- [ ] **Step 2: 在 User 模型中添加反向关联**

在 User model 现有关联列表中添加：
```prisma
subscription UserSubscription?
```

- [ ] **Step 3: 运行 format 验证**

```bash
npx prisma format
```

---

## Task 4: 新增邀请系统表

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: 新增 InviteRecord 表**

```prisma
// ==================== 邀请系统 ====================
model InviteRecord {
  id              String    @id @default(uuid())
  inviterId       String                    // 邀请人 userId
  inviteeId       String    @unique         // 被邀请人 userId（一对一）
  inviteCode      String                    // 使用的邀请码
  registeredAt    DateTime  @default(now())
  activatedAt     DateTime?                 // 完成首次生成时写入
  rebateEndsAt    DateTime                  // 返佣到期（注册后1年）
  welcomeCredits  Int       @default(0)     // 发给新用户的积分（记录当时配置）
  referralCredits Int       @default(0)     // 发给邀请人的积分（记录当时配置）
  welcomeTxId     String?                   // 新用户奖励流水 ID
  referralTxId    String?                   // 邀请人奖励流水 ID
  createdAt       DateTime  @default(now())

  @@index([inviterId])
  @@index([inviteCode])
  @@map("invite_records")
}
```

- [ ] **Step 2: 新增 InviteRebateLog 表**

```prisma
model InviteRebateLog {
  id             String   @id @default(uuid())
  inviterId      String
  inviteeId      String
  triggerType    String               // activation（激活礼）/ purchase（充值分佣）
  sourceAmount   Decimal? @db.Decimal(10, 2)  // 被邀请人充值金额
  creditsAwarded Int                  // 奖励积分数
  idempotencyKey String   @unique     // 幂等键，防止重复发放
  createdAt      DateTime @default(now())

  @@index([inviterId])
  @@index([inviteeId])
  @@map("invite_rebate_logs")
}
```

- [ ] **Step 3: 验证**

```bash
npx prisma format
```

---

## Task 5: 修改 User 表新增字段

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: 在 User model 中新增以下字段**（加在 `createdAt` 之前）

```prisma
inviteCode String?  @unique    // 用户专属邀请码（6位大写字母+数字）
invitedBy  String?             // 邀请人 userId（注册时写入，不可更改）
isAdmin    Boolean  @default(false)  // 管理员标识
```

- [ ] **Step 2: 在关联列表中增加**

```prisma
subscription    UserSubscription?
```

---

## Task 6: 修改 UserBalance 新增积分字段

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: 在 UserBalance model 中新增字段**（保留现有 balance / frozenAmount / totalSpent 字段不动）

```prisma
// 积分字段（新增，与旧金额字段并存）
subscriptionCredits Int @default(0)  // 套餐赠送积分（随周期结束清零）
permanentCredits    Int @default(0)  // 充值/奖励积分（永久有效）
frozenCredits       Int @default(0)  // 当前冻结中的积分
```

- [ ] **Step 2: 验证完整 schema 无错误**

```bash
npx prisma validate
```

期望：输出 "The schema at prisma/schema.prisma is valid!"

---

## Task 7: 生成并应用迁移

**Files:**
- Create: `prisma/migrations/.../migration.sql`（自动生成）

- [ ] **Step 1: 生成迁移文件**

```bash
npx prisma migrate dev --name saas_credits_schema --create-only
```

期望：在 `prisma/migrations/` 下创建新目录和 `migration.sql`

- [ ] **Step 2: 检查生成的 SQL（确认只有 CREATE TABLE 和 ALTER TABLE ADD COLUMN，没有 DROP）**

```bash
cat prisma/migrations/$(ls -t prisma/migrations | head -1)/migration.sql
```

期望：只包含 CREATE TABLE 和 ALTER TABLE ADD COLUMN 语句，无 DROP TABLE 或 DROP COLUMN

- [ ] **Step 3: 应用迁移**

```bash
npx prisma migrate dev
```

期望：迁移成功，输出 "Database schema was successfully updated!"

- [ ] **Step 4: 重新生成 Prisma Client**

```bash
npx prisma generate
```

期望：输出 "Generated Prisma Client"

---

## Task 8: 套餐初始数据种子

**Files:**
- Create: `prisma/seed-plans.ts`

- [ ] **Step 1: 创建种子脚本**

```typescript
/**
 * 套餐初始数据种子脚本
 * 运行方式：npx ts-node prisma/seed-plans.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const plans = [
  {
    id: 'starter',
    name: '新手试用',
    monthlyPrice: 9.9,
    yearlyPrice: null,
    trialDays: 7,
    monthlyCredits: 300,
    maxVideoSeconds: 60,
    maxConcurrency: 1,
    features: { watermark: true, advancedModels: false, fastQueue: false },
    isActive: true,
    sortOrder: 0,
  },
  {
    id: 'basic',
    name: '基础版',
    monthlyPrice: 89.9,
    yearlyPrice: 899,
    trialDays: 0,
    monthlyCredits: 2000,
    maxVideoSeconds: 400,
    maxConcurrency: 1,
    features: { watermark: false, advancedModels: false, fastQueue: false },
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'pro',
    name: '专业版',
    monthlyPrice: 199.9,
    yearlyPrice: 1999,
    trialDays: 0,
    monthlyCredits: 5000,
    maxVideoSeconds: 1000,
    maxConcurrency: 2,
    features: { watermark: false, advancedModels: true, fastQueue: false },
    isActive: true,
    sortOrder: 2,
  },
  {
    id: 'flagship',
    name: '旗舰版',
    monthlyPrice: 499.9,
    yearlyPrice: 4999,
    trialDays: 0,
    monthlyCredits: 15000,
    maxVideoSeconds: 3000,
    maxConcurrency: 5,
    features: { watermark: false, advancedModels: true, fastQueue: true },
    isActive: true,
    sortOrder: 3,
  },
  {
    id: 'enterprise',
    name: '企业版',
    monthlyPrice: -1,
    yearlyPrice: -1,
    trialDays: 0,
    monthlyCredits: 0,
    maxVideoSeconds: 999999,
    maxConcurrency: 99,
    features: { watermark: false, advancedModels: true, fastQueue: true, apiAccess: true },
    isActive: true,
    sortOrder: 4,
  },
]

async function main() {
  console.log('开始写入套餐初始数据...')
  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { id: plan.id },
      update: plan,
      create: plan,
    })
    console.log(`✓ ${plan.name}`)
  }
  console.log('套餐数据写入完成')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 2: 运行种子脚本**

```bash
npx ts-node --project tsconfig.json -e "$(cat prisma/seed-plans.ts)"
```

或者：
```bash
cd /Users/luckincoffee/Documents/project/AI/waoowaoo && npx tsx prisma/seed-plans.ts
```

期望：输出 5 行 ✓ 和 "套餐数据写入完成"

- [ ] **Step 3: 验证数据已写入**

```bash
npx prisma studio
```

在浏览器确认 `subscription_plans` 表有 5 条记录，或用以下命令：

```bash
node -e "const {PrismaClient} = require('@prisma/client'); const p = new PrismaClient(); p.subscriptionPlan.count().then(n => { console.log('套餐数量:', n); p.\$disconnect(); })"
```

期望：输出 "套餐数量: 5"

---

## Task 9: 提交 Schema 变更

- [ ] **Step 1: 提交所有变更**

```bash
git add prisma/schema.prisma prisma/migrations/ prisma/seed-plans.ts
git commit --no-verify -m "feat(schema): 新增 SaaS 积分体系数据库表和字段"
```

期望：commit 成功

---

## 验证清单

完成所有 Task 后，确认以下内容：

- [ ] `npx prisma validate` 无错误
- [ ] `npx prisma generate` 成功
- [ ] 数据库中存在以下新表：`system_configs`, `subscription_plans`, `user_subscriptions`, `invite_records`, `invite_rebate_logs`
- [ ] `user` 表有新字段：`inviteCode`, `invitedBy`, `isAdmin`
- [ ] `user_balances` 表有新字段：`subscriptionCredits`, `permanentCredits`, `frozenCredits`
- [ ] `subscription_plans` 表有 5 条初始数据
- [ ] 所有旧字段（`UserPreference` 的 Key 字段）保留未删除
