# 商业化闭环：支付签名验证 + 真实退款流程

**日期**: 2026-06-16
**作者**: yong.pan01
**状态**: 待审批
**作用域**: `src/lib/payment/` + `src/app/api/payment/` + `src/lib/credit-billing/`（只读复用）+ 扩展测试

## 背景与动机

`TASK_COMPLETION_REPORT.md` 第五部分指出支付模块存在 5 项"后续优化项"。其中两项阻塞生产环境上线：

1. **签名验证缺失** — `src/app/api/payment/callback/route.ts:27` 仅注释 `// TODO: 根据不同支付渠道验证签名和解析数据`，任何能访问回调 URL 的人都能伪造支付成功通知，导致**白送积分**。
2. **退款流程不完整** — `src/lib/payment/service.ts:389,402` 标注 `TODO: 调用支付提供商退款接口` 与 `TODO: 扣除用户积分?`，当前退款只更新本地状态、不调渠道、不扣积分，对账必出问题。

`PaymentProvider` 接口已在 `src/lib/payment/types.ts:55-90` 定义了 `verifySignature` 和 `refund` 方法签名，但**当前无任何实现**。本设计填补这两个空缺。

## 范围

### 包含（本 sprint）
- 支付回调签名验证（Alipay 优先，其他渠道留 stub）
- 真实退款流程（含渠道调用 + 积分回收）
- 防重放保护
- 用户自助退款 API
- 配套测试与文档

### 不包含
- 微信支付 / Stripe 实现（接口预留，本 sprint 只做 stub）
- 管理员后台退款 UI（API 已有 `operatorId` 字段，UI 后续 sprint）
- 退款邮件通知
- 部分退款的复杂分摊（仅支持"按比例"简化模型）

## 架构

```
src/lib/payment/
├── types.ts                 (已有 PaymentProvider 接口,不变)
├── service.ts               (保留作为门面;新增退款入口)
├── signature.ts             [新增] 通用验签 + 渠道分发 + 防重放
├── refund.ts                [新增] 退款编排(渠道优先,本地后置)
├── providers/               [新增]
│   ├── base.ts              抽象基类(共享订单加载/幂等)
│   ├── alipay.ts            支付宝验签 + 退款
│   ├── wechat.ts            Stub(抛 NotImplemented)
│   ├── stripe.ts            Stub(抛 NotImplemented)
│   └── mock.ts              开发环境(沿用现有行为)

src/app/api/payment/
├── callback/route.ts        (改造:验签失败返 401,不再进业务流)
├── refund/route.ts          [新增] POST /api/payment/refund

src/lib/credit-billing/service.ts
└── 复用现有 unfreezeCredits / refundCredits 计算路径(只读)
```

## 关键设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 渠道代码组织 | 按渠道分文件 | 避免单文件 switch 膨胀;后续接入微信/Stripe 互不污染 |
| 退款原子性 | 先调渠道,后改本地 | 渠道失败时本地订单保持 `paid`,可重试;反过来会丢钱 |
| 签名失败响应 | 401 + 不进业务流 | 防止伪造回调触发积分发放 |
| 重放保护 | Redis 缓存 sign 5 分钟 | 防同签名的合法请求被多次处理 |
| Sprint 范围 | 只做 Alipay | 沙箱最成熟,生产 80%+ 渠道 |
| 积分回收 | 按金额比例 | 简单可解释;不退部分已用积分允许负余额+标记 |

## 模块 1: 签名验证

### 接口（`signature.ts`）

```typescript
export type SignatureFailureReason =
  | 'MISSING_SIGN'
  | 'INVALID_SIGN'
  | 'EXPIRED'
  | 'CHANNEL_MISMATCH'
  | 'REPLAYED'

export interface VerifyResult {
  valid: boolean
  reason?: SignatureFailureReason
  channel?: PaymentMethod
}

// 分发器:异步(包含 Redis 重放检查 + 路由到具体 provider 的同步验签)
export function verifyCallbackSignature(
  method: PaymentMethod,
  rawData: Record<string, string>
): Promise<VerifyResult>

// 各 provider 内部实现:同步纯函数
// PaymentProvider.verifySignature(rawData: Record<string, unknown>): boolean
//   - 已在 types.ts:89 定义,各 provider 实现
```

### Alipay 验签步骤

1. 取出 `sign` 字段，剩余字段按 key 字母序排序
2. 用 `&key1=value1&key2=value2` 拼成待签字符串
3. 用配置的 **RSA2 公钥** 验签（`ALIPAY_PUBLIC_KEY` env）
4. 校验 `app_id` 与配置一致（防跨应用伪造）
5. 检查 `timestamp` 与当前时间差 ≤ 5 分钟
6. Redis 检查 `sign:${sign}` 是否已存在（防重放）

### 配置（env 变量）

```
ALIPAY_APP_ID=2021000000000000
ALIPAY_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n..."
ALIPAY_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."  # 仅创建订单时用
ALIPAY_GATEWAY=https://openapi.alipaydev.com/gateway.do  # 沙箱
ALIPAY_NOTIFY_URL=https://your-domain.com/api/payment/callback
```

公钥缺失时启动 fail-fast,禁止回调处理。

### callback 路由改造

```typescript
export const POST = apiHandler(async (request) => {
  const method = (searchParams.get('method') || 'alipay') as PaymentMethod
  const rawData = parseFormData(await request.formData())
  
  const verify = await verifyCallbackSignature(method, rawData)
  if (!verify.valid) {
    logger.warn('[Payment] signature rejected', { method, reason: verify.reason, outTradeNo: rawData.out_trade_no })
    return new NextResponse('FAIL', { status: 401 })
  }
  
  // 原有 handlePaymentSuccess/Failure 逻辑
})
```

## 模块 2: 退款流程

### 接口（`refund.ts`）

```typescript
export interface RefundRequest {
  orderId: string
  reason?: string
  amount?: number          // 不传 = 全额
  operatorId?: string      // 管理员操作时记录
}

export type RefundError =
  | 'ORDER_NOT_FOUND'
  | 'ORDER_NOT_PAID'
  | 'AMOUNT_EXCEEDS'
  | 'CHANNEL_REFUND_FAILED'
  | 'CHANNEL_NOT_SUPPORTED'

export interface RefundResult {
  ok: boolean
  refundId?: string        // 渠道方退款单号
  creditsDeducted?: number // 本次实际扣回积分
  error?: RefundError
  errorDetail?: string
}

export async function refundOrder(req: RefundRequest): Promise<RefundResult>
```

### 流程

1. 加载订单;非 `paid` 状态 → 返 `ORDER_NOT_PAID`
2. 计算 `refundAmount = req.amount ?? order.amount`
3. **先调渠道** `provider.refund({ orderNo, refundAmount, reason })`
   - 失败 → 返 `CHANNEL_REFUND_FAILED`,本地状态不变,可重试
4. 事务内:
   - 更新订单 `status = 'refunded'`,记录 `refundAmount`、`refundedAt`、`refundReason`
   - 调用 `credit-billing` 的 `refundCredits(userId, proportionalCredits, ...)`
5. 记录 `operatorId`(如有)

### 积分回收策略

```typescript
// 比例扣回
const proportion = refundAmount / order.amount
const creditsToRevoke = Math.floor(order.credits * proportion)
```

- 调用现有 `refundCredits(userId, creditsToRevoke, { reason: 'refund', orderId })`
- 现有逻辑（`service.ts:295-381`）已处理"积分已使用"的负余额情况,无需新增代码
- 标记 `refund-pending-credit-debt` 给后续业务清算

### API 路由（`POST /api/payment/refund`）

| Header / Body | 必填 | 说明 |
|---------------|------|------|
| `orderId` (body) | 是 | 订单 ID |
| `reason` (body) | 否 | 退款原因,默认 `'user_request'` |
| `amount` (body) | 否 | 部分退款金额;不传 = 全额 |
| `operatorId` (admin only) | 否 | 管理员操作时记录 |

权限:
- 普通用户: `order.userId === currentUserId`
- 管理员: 任意订单

响应:
- 200 `{ ok: true, refundId, creditsDeducted }`
- 400 `{ ok: false, error: 'AMOUNT_EXCEEDS' }`
- 403 `{ ok: false, error: 'ORDER_NOT_PAID' }`(实际是越权时返 403)
- 409 `{ ok: false, error: 'CHANNEL_REFUND_FAILED' }`

## 错误处理

| 场景 | 行为 |
|------|------|
| 签名验证失败 | 401,不入业务流,记录到日志 |
| 重放攻击 | 401,`reason: 'REPLAYED'` |
| 订单不存在 | 回调:返 `'FAIL'`;退款:返 `ORDER_NOT_FOUND` |
| 金额不匹配 | 回调:返 `'FAIL'`;退款:返 `AMOUNT_EXCEEDS` |
| 渠道退款失败 | 订单保持 `paid`,返 `CHANNEL_REFUND_FAILED` |
| 沙箱未配置 | fail-fast,启动报错 |
| 用户重复退款 | 第二次返 `ORDER_NOT_PAID`(已变 `refunded`) |

## 测试策略

### 单元测试（`tests/integration/api/contract/payment-routes.test.ts` 扩展）

**签名验证**:
1. ✅ 合法签名 → 通过
2. ✅ 缺失 sign 字段 → 401 `MISSING_SIGN`
3. ✅ 篡改金额 → 401 `INVALID_SIGN`
4. ✅ 时间戳过期(>5min) → 401 `EXPIRED`
5. ✅ 重放(同 sign 第二次) → 401 `REPLAYED`
6. ✅ app_id 不匹配 → 401 `CHANNEL_MISMATCH`

**退款流程**:
1. ✅ 已支付订单全额退款 → 200,积分扣回
2. ✅ 已支付订单部分退款 → 200,按比例扣积分
3. ✅ 未支付订单退款 → 400 `ORDER_NOT_PAID`
4. ✅ 已退款订单二次退款 → 400 `ORDER_NOT_PAID`
5. ✅ 跨用户退款 → 403
6. ✅ 渠道失败回滚 → 409,订单保持 `paid`

### 手动验收（沙箱环境）

1. 用支付宝沙箱下单 → 触发回调 → 订单变 `paid`、积分到账
2. 申请退款 → 订单变 `refunded`、积分扣回
3. 用伪造 `sign` 触发回调 → 401,数据库无变化
4. 同 sign 第二次回调 → 401 `REPLAYED`

### CI 检查

- `npm run build` 通过
- `npm run check:api-handler` 通过
- `vitest run tests/integration/api/contract/payment-routes.test.ts` 全绿

## 风险与回退

| 风险 | 缓解 |
|------|------|
| 公钥配置错误导致合法回调被拒 | 启动 fail-fast 提示明确;沙箱/生产用不同 env |
| 渠道退款接口超时 | 30s 超时后本地状态不变,前端提示"退款处理中,请稍后查看" |
| 部分退款复杂业务 | 本 sprint 不支持多笔部分退款叠加;单笔订单仅可部分退款一次 |
| 沙箱 API 不稳定 | 所有外部调用走 try/catch;提供本地 mock provider 用于测试 |

## 实施步骤（高层）

1. 新增 `src/lib/payment/signature.ts` + Alipay 验签实现
2. 新增 `src/lib/payment/providers/{base,alipay,mock,wechat,stripe}.ts`
3. 改造 `src/app/api/payment/callback/route.ts` 调用验签
4. 新增 `src/lib/payment/refund.ts` 编排
5. 新增 `src/app/api/payment/refund/route.ts`
6. 扩展 `tests/integration/api/contract/payment-routes.test.ts`
7. 更新 `docs/` 相关文档（如有）
8. `npm run build` + 跑测试

## 后续（不在本 sprint）

- 微信支付/Stripe 真实实现
- 管理员后台退款 UI（用现有 admin 框架）
- 退款邮件通知
- 多次部分退款支持
- 对账脚本（每日跑,核对本地订单 vs 渠道账单）
