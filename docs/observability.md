# 可观测性系统 — Axiom 日志分析 + 数据统计

## 架构概览

```
业务代码 → trackEvent() → 双写:
  1. Axiom (缓冲 5s 批量发送)  → APL 查询 / Dashboard
  2. 本地结构化日志 (createScopedLogger) → 文件 / stdout
```

### 设计原则
- **非阻塞**: 所有 Axiom 发送异步执行，不阻塞主流程
- **容错**: Axiom 发送失败不影响业务
- **缓冲**: 5 秒批量发送，100 条上限触发即时刷新
- **双写**: 本地日志 + Axiom，确保数据不丢失

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `AXIOM_API_TOKEN` | Axiom API Token | 空（不发送） |
| `AXIOM_DATASET` | Axiom Dataset 名称 | `waoowaoo-events` |
| `AXIOM_API_URL` | Axiom API 地址 | `https://api.axiom.co/v1/datasets` |

## 事件分类 (6 大域)

### 1. 用户事件 (`user.*`)

| 事件 | 说明 | 关键字段 |
|------|------|----------|
| `user.register` | 用户注册 | userId, name, inviteCode, success, error |
| `user.login` | 用户登录 | userId, username, success, error |
| `user.logout` | 用户登出 | userId |

### 2. 项目事件 (`project.*`)

| 事件 | 说明 | 关键字段 |
|------|------|----------|
| `project.create` | 创建项目 | userId, projectId, projectName |
| `project.update` | 更新项目 | userId, projectId, projectName, changes |
| `project.delete` | 删除项目 | userId, projectId, projectName, cosFilesDeleted, cosFilesFailed |

### 3. 计费事件 (`billing.*`)

| 事件 | 说明 | 关键字段 |
|------|------|----------|
| `billing.quote` | 积分报价 | mediaType, model, tier, quantity, unitPrice, totalCredits |
| `billing.freeze` | 积分冻结 | userId, credits, freezeId, balanceBefore, balanceAfter |
| `billing.confirm` | 确认扣除 | userId, freezeId, frozenCredits, chargedCredits, refundCredits |
| `billing.unfreeze` | 解冻回滚 | userId, freezeId, credits, subscriptionRefund, permanentRefund |
| `billing.prepare` | 任务计费准备 | taskId, mode, apiType, model, quotedCost, freezeId, skipReason |
| `billing.settle` | 任务计费结算 | taskId, mode, chargedCredits, freezeId |
| `billing.grant` | 积分发放 | userId, credits, source, isPermanent, reason |

### 4. 任务事件 (`task.*`)

| 事件 | 说明 | 关键字段 |
|------|------|----------|
| `task.submit` | 任务提交 | taskId, userId, taskType, billingCredits, deduped |
| `task.start` | 任务开始执行 | taskId, userId, taskType, queue |
| `task.complete` | 任务完成 | taskId, userId, taskType, durationMs, chargedCredits |
| `task.fail` | 任务失败 | taskId, userId, taskType, errorCode, retryable, durationMs |
| `task.enqueue_failed` | 入队失败 | taskId, userId, taskType, errorCode, compensationFailed |

### 5. 订阅事件 (`subscription.*`)

| 事件 | 说明 | 关键字段 |
|------|------|----------|
| `subscription.assign` | 分配套餐 | userId, planId, billingCycle, monthlyCredits |
| `subscription.expired` | 订阅过期 | userId, planId, subscriptionCreditsCleared |

### 6. 错误事件 (`api.error`)

| 事件 | 说明 | 关键字段 |
|------|------|----------|
| `api.error` | API 错误 | method, path, errorCode, status, retryable, durationMs |

---

## APL 查询参考

### 用户分析

```apl
# 每日注册量
['waoowaoo-events']
| where event == "user.register"
| summarize count() by bin(_time, 1d)

# 注册来源分析（邀请码使用率）
['waoowaoo-events']
| where event == "user.register" and success == true
| extend hasInvite = isnotempty(inviteCode)
| summarize count() by hasInvite

# 登录失败率
['waoowaoo-events']
| where event == "user.login"
| summarize total=count(), failed=countif(success == false) by bin(_time, 1d)
| extend failRate = todouble(failed) / todouble(total) * 100.0
| project _time, total, failed, failRate

# 活跃用户 (DAU)
['waoowaoo-events']
| where event == "user.login" and success == true
| summarize dcount(userId) by bin(_time, 1d)
```

### 积分/计费分析

```apl
# 积分冻结失败排查
['waoowaoo-events']
| where event == "billing.prepare" and isnotempty(skipReason)
| summarize count() by skipReason, bin(_time, 1h)

# 冻结→确认→结算全链路追踪
['waoowaoo-events']
| where event in ("billing.freeze", "billing.confirm", "billing.settle")
| where isnotempty(freezeId)
| project _time, event, freezeId, userId, credits, chargedCredits, refundCredits

# 积分消耗按类型分布
['waoowaoo-events']
| where event == "billing.confirm"
| summarize totalCharged=sum(chargedCredits), count() by tostring(apiType)
| order by totalCharged desc

# 退款分析
['waoowaoo-events']
| where event == "billing.confirm" and refundCredits > 0
| summarize totalRefund=sum(refundCredits), count() by bin(_time, 1d)

# 各媒体类型定价消耗
['waoowaoo-events']
| where event == "billing.quote"
| summarize avg(unitPrice), sum(totalCredits), count() by mediaType, tier

# 积分发放统计
['waoowaoo-events']
| where event == "billing.grant"
| summarize totalGranted=sum(credits), count() by source
| order by totalGranted desc

# 积分余额不足频率
['waoowaoo-events']
| where event == "billing.prepare" and skipReason == "insufficient_balance"
| summarize count() by userId, bin(_time, 1d)
| order by count_ desc
```

### 任务生成分析

```apl
# 任务成功率
['waoowaoo-events']
| where event in ("task.complete", "task.fail")
| summarize total=count(), success=countif(event == "task.complete") by bin(_time, 1d)
| extend successRate = todouble(success) / todouble(total) * 100.0

# 任务平均耗时
['waoowaoo-events']
| where event == "task.complete"
| summarize avg(durationMs), percentile(durationMs, 50), percentile(durationMs, 95) by taskType

# 任务失败原因分布
['waoowaoo-events']
| where event == "task.fail"
| summarize count() by errorCode
| order by count_ desc

# 任务类型分布
['waoowaoo-events']
| where event == "task.submit"
| summarize count() by taskType
| order by count_ desc

# 任务入队失败
['waoowaoo-events']
| where event == "task.enqueue_failed"
| summarize count() by errorCode, compensationFailed

# 每日生成量趋势
['waoowaoo-events']
| where event == "task.complete"
| summarize count() by taskType, bin(_time, 1d)
| render linechart
```

### 订阅分析

```apl
# 套餐分配统计
['waoowaoo-events']
| where event == "subscription.assign"
| summarize count(), sum(monthlyCredits) by planId, billingCycle

# 订阅过期清零统计
['waoowaoo-events']
| where event == "subscription.expired"
| summarize totalCleared=sum(subscriptionCreditsCleared), count() by planId
```

### 项目分析

```apl
# 项目创建趋势
['waoowaoo-events']
| where event == "project.create"
| summarize count() by bin(_time, 1d)

# 项目删除原因（COS文件清理情况）
['waoowaoo-events']
| where event == "project.delete"
| summarize avg(cosFilesDeleted), avg(cosFilesFailed), count() by bin(_time, 1w)
```

### 错误监控

```apl
# API 错误率 Top N
['waoowaoo-events']
| where event == "api.error"
| summarize count() by path, errorCode
| order by count_ desc
| limit 20

# 5xx 错误告警
['waoowaoo-events']
| where event == "api.error" and status >= 500
| summarize count() by path, errorCode, bin(_time, 5m)

# 慢请求 P95
['waoowaoo-events']
| where event == "api.error"
| summarize percentile(durationMs, 95) by path
| order by percentile_durationMs_95 desc

# 可重试错误分析
['waoowaoo-events']
| where event == "api.error" and retryable == true
| summarize count() by errorCode, path
```

### 综合查询

```apl
# 用户全链路行为追踪
['waoowaoo-events']
| where userId == "TARGET_USER_ID"
| sort by _time asc
| project _time, event, taskId, projectId, credits, errorCode

# 积分冻结→确认完整链路
['waoowaoo-events']
| where freezeId == "TARGET_FREEZE_ID"
| sort by _time asc
| project _time, event, credits, chargedCredits, refundCredits, subscriptionRefund, permanentRefund

# 单个任务完整生命周期
['waoowaoo-events']
| where taskId == "TARGET_TASK_ID"
| sort by _time asc
| project _time, event, durationMs, errorCode, chargedCredits
```

---

## Dashboard 建议配置

### 1. 业务健康 Dashboard
- **面板 1**: 每日注册量 (折线图)
- **面板 2**: DAU/MAU (折线图)
- **面板 3**: 任务成功率 (折线图)
- **面板 4**: API 5xx 错误率 (折线图)

### 2. 积分运营 Dashboard
- **面板 1**: 每日积分消耗总量 (柱状图, 按 mediaType 分组)
- **面板 2**: 积分发放来源分布 (饼图, 按 source 分组)
- **面板 3**: 冻结→确认→退款链路统计 (数字卡片)
- **面板 4**: 余额不足频率 (折线图)

### 3. 生成质量 Dashboard
- **面板 1**: 各任务类型 P50/P95 耗时 (表格)
- **面板 2**: 任务失败原因分布 (饼图, 按 errorCode)
- **面板 3**: 每日各类型生成量 (堆叠柱状图)
- **面板 4**: 入队失败 + 补偿失败告警 (数字卡片)

---

## 代码埋点位置

| 模块 | 文件 | 事件 |
|------|------|------|
| 积分报价 | `src/lib/credit-billing/catalog.ts` | `billing.quote` |
| 积分冻结 | `src/lib/credit-billing/service.ts` | `billing.freeze` |
| 确认扣除 | `src/lib/credit-billing/service.ts` | `billing.confirm` |
| 解冻回滚 | `src/lib/credit-billing/service.ts` | `billing.unfreeze` |
| 积分发放 | `src/lib/credit-billing/service.ts` | `billing.grant` |
| 任务计费准备 | `src/lib/billing/service.ts` | `billing.prepare` |
| 任务计费结算 | `src/lib/billing/service.ts` | `billing.settle` |
| 用户注册 | `src/app/api/auth/register/route.ts` | `user.register` |
| 用户登录 | `src/lib/auth.ts` | `user.login` |
| 项目创建 | `src/app/api/projects/route.ts` | `project.create` |
| 项目更新 | `src/app/api/projects/[projectId]/route.ts` | `project.update` |
| 项目删除 | `src/app/api/projects/[projectId]/route.ts` | `project.delete` |
| 套餐分配 | `src/lib/subscription/service.ts` | `subscription.assign` |
| 订阅过期 | `src/lib/subscription/service.ts` | `subscription.expired` |
| 任务提交 | `src/lib/task/submitter.ts` | `task.submit` |
| 入队失败 | `src/lib/task/submitter.ts` | `task.enqueue_failed` |
| 任务开始 | `src/lib/workers/shared.ts` | `task.start` |
| 任务完成 | `src/lib/workers/shared.ts` | `task.complete` |
| 任务失败 | `src/lib/workers/shared.ts` | `task.fail` |
| API 错误 | `src/lib/api-errors.ts` | `api.error` |
