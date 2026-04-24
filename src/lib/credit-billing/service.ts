/**
 * 积分服务 - 包装 ledger.ts，以积分整数执行冻结/扣除/回滚
 */
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import type { CreditBalance, CreditTransactionType } from './types'
import { trackEvent } from '@/lib/observability'

/**
 * 获取用户积分余额
 */
export async function getCreditBalance(userId: string): Promise<CreditBalance> {
  // 使用 upsert 避免外键约束错误
  const balance = await prisma.userBalance.upsert({
    where: { userId },
    create: {
      userId,
      balance: 0,
      frozenAmount: 0,
      totalSpent: 0,
      subscriptionCredits: 0,
      permanentCredits: 0,
      frozenCredits: 0,
    },
    update: {},
    select: {
      subscriptionCredits: true,
      permanentCredits: true,
      frozenCredits: true,
    },
  })

  // 确保积分值非负，避免负数导致的计算错误
  const safeSubscriptionCredits = Math.max(0, Number(balance.subscriptionCredits))
  const safePermanentCredits = Math.max(0, Number(balance.permanentCredits))
  const safeFrozenCredits = Math.max(0, Number(balance.frozenCredits))

  return {
    subscriptionCredits: safeSubscriptionCredits,
    permanentCredits: safePermanentCredits,
    frozenCredits: safeFrozenCredits,
    availableCredits: safeSubscriptionCredits + safePermanentCredits,
  }
}

/**
 * 冻结积分
 * 使用 FOR UPDATE 行锁防止并发竞态条件
 */
export async function freezeCredits(
  userId: string,
  credits: number,
  options?: {
    source?: string
    taskId?: string
    requestId?: string
    idempotencyKey?: string
    metadata?: Record<string, unknown>
  }
): Promise<string | null> {
  if (credits <= 0) return null

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 幂等检查
      if (options?.idempotencyKey) {
        const existing = await tx.balanceFreeze.findFirst({
          where: { idempotencyKey: options.idempotencyKey },
        })
        if (existing) {
          return existing.id
        }
      }

      // 使用 FOR UPDATE 行锁锁定用户余额记录，防止并发读取
      // 这确保了在事务期间其他事务无法读取或修改该行
      const balance = await tx.$queryRaw<Array<{
        subscriptionCredits: bigint
        permanentCredits: bigint
        frozenCredits: bigint
      }>>`
        SELECT subscriptionCredits, permanentCredits, frozenCredits
        FROM "UserBalance"
        WHERE userId = ${userId}
        FOR UPDATE
      `.then(rows => rows[0] ?? null)

      if (!balance) {
        // 用户余额不存在，先创建（此时无锁因为是新记录）
        await tx.userBalance.create({
          data: {
            userId,
            balance: 0,
            frozenAmount: 0,
            totalSpent: 0,
            subscriptionCredits: 0,
            permanentCredits: 0,
            frozenCredits: 0,
          },
        })
        // 创建后再次锁定读取（处理高并发下的 race condition）
        const newBalance = await tx.$queryRaw<Array<{
          subscriptionCredits: bigint
          permanentCredits: bigint
          frozenCredits: bigint
        }>>`
          SELECT subscriptionCredits, permanentCredits, frozenCredits
          FROM "UserBalance"
          WHERE userId = ${userId}
          FOR UPDATE
        `.then(rows => rows[0] ?? null)

        if (!newBalance) {
          return null
        }

        const available =
          Math.max(0, Number(newBalance.subscriptionCredits)) +
          Math.max(0, Number(newBalance.permanentCredits))

        if (available < credits) {
          return null
        }

        return await performFreeze(tx, userId, credits, options, newBalance)
      }

      // 检查可用积分（冻结时已从subscription/permanent中扣减，无需再减frozenCredits）
      const available =
        Math.max(0, Number(balance.subscriptionCredits)) +
        Math.max(0, Number(balance.permanentCredits))

      if (available < credits) {
        return null
      }

      return await performFreeze(tx, userId, credits, options, balance)
    }, {
      // 设置事务超时和最大等待时间，防止死锁
      maxWait: 5000,
      timeout: 10000,
    })

    return result
  } catch (error) {
    if (
      options?.idempotencyKey &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const existing = await prisma.balanceFreeze.findFirst({
        where: { idempotencyKey: options.idempotencyKey },
        select: { id: true },
      })
      if (existing?.id) return existing.id
    }
    console.error('[Billing] freezeCredits failed:', error)
    return null
  }
}

/**
 * 执行冻结操作（已在事务内持有行锁）
 */
async function performFreeze(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  userId: string,
  credits: number,
  options?: {
    source?: string
    taskId?: string
    requestId?: string
    idempotencyKey?: string
    metadata?: Record<string, unknown>
  },
  balance?: { subscriptionCredits: bigint; permanentCredits: bigint; frozenCredits: bigint } | null
): Promise<string | null> {
  // 冻结积分（先扣 subscription，再扣 permanent）
  let remainingToFreeze = credits
  let subscriptionToFreeze = 0
  let permanentToFreeze = 0

  // 修复：订阅积分如果是负数，当作0处理，避免出现扣减负数违反约束的问题
  const currentSub = balance ? Math.max(0, Number(balance.subscriptionCredits)) : 0
  if (currentSub > 0) {
    subscriptionToFreeze = Math.min(currentSub, remainingToFreeze)
    remainingToFreeze -= subscriptionToFreeze
  }
  if (remainingToFreeze > 0) {
    permanentToFreeze = remainingToFreeze
  }

  await tx.userBalance.update({
    where: { userId },
    data: {
      subscriptionCredits: { decrement: subscriptionToFreeze },
      permanentCredits: { decrement: permanentToFreeze },
      frozenCredits: { increment: credits },
    },
  })

  // 创建冻结记录（复用 BalanceFreeze 表，amount 存积分数）
  const freezeId = `credit_freeze_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  await tx.balanceFreeze.create({
    data: {
      id: freezeId,
      userId,
      amount: new Prisma.Decimal(credits),
      status: 'pending',
      source: options?.source || 'credit',
      taskId: options?.taskId || null,
      requestId: options?.requestId || null,
      idempotencyKey: options?.idempotencyKey || null,
      metadata: JSON.stringify({
        ...(options?.metadata || {}),
        breakdown: { subscriptionToFreeze, permanentToFreeze },
      }),
    },
  })

  // 记录流水
  await tx.balanceTransaction.create({
    data: {
      userId,
      type: 'credit_freeze',
      amount: new Prisma.Decimal(0),
      balanceAfter: new Prisma.Decimal(0),
      description: `积分冻结: ${credits}`,
      freezeId,
      idempotencyKey: options?.idempotencyKey || null,
      billingMeta: JSON.stringify({
        credits,
        source: options?.source,
        breakdown: { subscriptionToFreeze, permanentToFreeze },
      }),
    },
  })

  console.log('[Billing] freezeCredits success', {
    freezeId,
    userId,
    credits,
    subscriptionToFreeze,
    permanentToFreeze,
  })

  trackEvent({
    event: 'billing.freeze',
    userId,
    credits,
    subscriptionToFreeze,
    permanentToFreeze,
    balanceBefore: {
      subscription: currentSub,
      permanent: balance ? Number(balance.permanentCredits) : 0,
      frozen: balance ? Number(balance.frozenCredits) : 0,
      available: balance ? Math.max(0, Number(balance.subscriptionCredits)) + Math.max(0, Number(balance.permanentCredits)) : 0,
    },
    balanceAfter: {
      subscription: currentSub - subscriptionToFreeze,
      permanent: balance ? Number(balance.permanentCredits) - permanentToFreeze : 0,
      frozen: balance ? Number(balance.frozenCredits) + credits : credits,
      available: Math.max(0, currentSub - subscriptionToFreeze) + Math.max(0, (balance ? Number(balance.permanentCredits) : 0) - permanentToFreeze),
    },
    freezeId,
    taskId: options?.taskId,
  })

  return freezeId
}

/**
 * 确认扣除积分
 */
export async function confirmCreditDeduct(
  freezeId: string,
  actualCredits?: number
): Promise<boolean> {
  try {
    await prisma.$transaction(async (tx) => {
      const freeze = await tx.balanceFreeze.findUnique({
        where: { id: freezeId },
      })
      if (!freeze) {
        throw new Error('Invalid freeze record')
      }
      if (freeze.status === 'confirmed') return
      if (freeze.status !== 'pending') {
        throw new Error('Freeze is not pending')
      }

      const frozenCredits = freeze.amount.toNumber()
      const chargedCredits = actualCredits ?? frozenCredits
      const refundCredits = Math.max(0, frozenCredits - chargedCredits)

      // 从 freeze.metadata 读取 breakdown（冻结时从 subscription/permanent 各扣了多少）
      let subscriptionRefund = 0
      let permanentRefund = refundCredits
      try {
        const meta = freeze.metadata ? JSON.parse(freeze.metadata) : {}
        const breakdown = meta.breakdown || {}
        const subFrozen = typeof breakdown.subscriptionToFreeze === 'number' ? breakdown.subscriptionToFreeze : 0
        const permFrozen = typeof breakdown.permanentToFreeze === 'number' ? breakdown.permanentToFreeze : 0
        // 先退 subscription（因为冻结时先从 subscription 扣的），再退 permanent
        subscriptionRefund = Math.min(refundCredits, subFrozen)
        permanentRefund = refundCredits - subscriptionRefund
        // 确保 permanentRefund 不超过 permanentFrozen
        if (permanentRefund > permFrozen) {
          permanentRefund = permFrozen
          subscriptionRefund = refundCredits - permanentRefund
        }
      } catch {
        // 解析失败时退到 permanent（兼容旧记录）
      }

      console.log('[Billing] confirmCreditDeduct', {
        freezeId,
        userId: freeze.userId,
        frozenCredits,
        chargedCredits,
        refundCredits,
        subscriptionRefund,
        permanentRefund,
        freezeStatus: freeze.status,
      })

      trackEvent({
        event: 'billing.confirm',
        userId: freeze.userId,
        freezeId,
        frozenCredits,
        chargedCredits,
        refundCredits,
        subscriptionRefund,
        permanentRefund,
      })

      // 更新冻结状态
      await tx.balanceFreeze.update({
        where: { id: freezeId },
        data: { status: 'confirmed' },
      })

      // 减少冻结积分
      const updateData: Prisma.UserBalanceUpdateInput = {
        frozenCredits: { decrement: frozenCredits },
      }

      // 按原路退还多余积分
      if (refundCredits > 0) {
        if (subscriptionRefund > 0) {
          updateData.subscriptionCredits = { increment: subscriptionRefund }
        }
        if (permanentRefund > 0) {
          updateData.permanentCredits = { increment: permanentRefund }
        }
      }

      await tx.userBalance.update({
        where: { userId: freeze.userId },
        data: updateData,
      })

      // 记录流水
      await tx.balanceTransaction.create({
        data: {
          userId: freeze.userId,
          type: 'credit_deduct',
          amount: new Prisma.Decimal(0),
          balanceAfter: new Prisma.Decimal(0),
          description: `积分扣除: ${chargedCredits}`,
          freezeId,
          billingMeta: JSON.stringify({
            frozenCredits,
            chargedCredits,
            refundCredits,
          }),
        },
      })
    })
    return true
  } catch {
    return false
  }
}

/**
 * 解冻积分（回滚）
 */
export async function unfreezeCredits(freezeId: string): Promise<boolean> {
  try {
    await prisma.$transaction(async (tx) => {
      const freeze = await tx.balanceFreeze.findUnique({
        where: { id: freezeId },
      })
      if (!freeze) {
        throw new Error('Invalid freeze record')
      }
      if (freeze.status === 'rolled_back') return
      if (freeze.status !== 'pending') {
        throw new Error('Freeze is not pending')
      }

      const credits = freeze.amount.toNumber()

      // 从 freeze.metadata 读取 breakdown
      let subscriptionRefund = 0
      let permanentRefund = credits
      try {
        const meta = freeze.metadata ? JSON.parse(freeze.metadata) : {}
        const breakdown = meta.breakdown || {}
        const subFrozen = typeof breakdown.subscriptionToFreeze === 'number' ? breakdown.subscriptionToFreeze : 0
        const permFrozen = typeof breakdown.permanentToFreeze === 'number' ? breakdown.permanentToFreeze : 0
        // 全额退还，按冻结时的比例
        subscriptionRefund = Math.min(credits, subFrozen)
        permanentRefund = credits - subscriptionRefund
        if (permanentRefund > permFrozen) {
          permanentRefund = permFrozen
          subscriptionRefund = credits - permanentRefund
        }
      } catch {
        // 解析失败时退到 permanent（兼容旧记录）
      }

      await tx.balanceFreeze.update({
        where: { id: freezeId },
        data: { status: 'rolled_back' },
      })

      // 按原路解冻
      const updateData: Prisma.UserBalanceUpdateInput = {
        frozenCredits: { decrement: credits },
      }
      if (subscriptionRefund > 0) {
        updateData.subscriptionCredits = { increment: subscriptionRefund }
      }
      if (permanentRefund > 0) {
        updateData.permanentCredits = { increment: permanentRefund }
      }

      await tx.userBalance.update({
        where: { userId: freeze.userId },
        data: updateData,
      })

      // 记录流水
      await tx.balanceTransaction.create({
        data: {
          userId: freeze.userId,
          type: 'credit_unfreeze',
          amount: new Prisma.Decimal(0),
          balanceAfter: new Prisma.Decimal(0),
          description: `积分解冻: ${credits}`,
          freezeId,
        },
      })

      trackEvent({
        event: 'billing.unfreeze',
        userId: freeze.userId,
        freezeId,
        credits,
        subscriptionRefund,
        permanentRefund,
      })
    })
    return true
  } catch {
    return false
  }
}

/**
 * 增加积分（管理员充值/奖励等）
 */
export async function grantCredits(
  userId: string,
  credits: number,
  type: CreditTransactionType,
  options?: {
    reason?: string
    operatorId?: string
    idempotencyKey?: string
    isPermanent?: boolean
  }
): Promise<boolean> {
  if (credits <= 0) return false

  try {
    await prisma.$transaction(async (tx) => {
      // 幂等检查
      if (options?.idempotencyKey) {
        const existing = await tx.balanceTransaction.findFirst({
          where: {
            userId,
            type,
            idempotencyKey: options.idempotencyKey,
          },
        })
        if (existing) return
      }

      const isPermanent = options?.isPermanent ?? true

      await tx.userBalance.upsert({
        where: { userId },
        create: {
          userId,
          balance: 0,
          frozenAmount: 0,
          totalSpent: 0,
          subscriptionCredits: isPermanent ? 0 : credits,
          permanentCredits: isPermanent ? credits : 0,
          frozenCredits: 0,
        },
        update: {
          subscriptionCredits: isPermanent ? undefined : { increment: credits },
          permanentCredits: isPermanent ? { increment: credits } : undefined,
        },
      })

      await tx.balanceTransaction.create({
        data: {
          userId,
          type,
          amount: new Prisma.Decimal(0),
          balanceAfter: new Prisma.Decimal(0),
          description: options?.reason || `积分发放: ${credits}`,
          operatorId: options?.operatorId || null,
          idempotencyKey: options?.idempotencyKey || null,
          billingMeta: JSON.stringify({ credits, isPermanent }),
        },
      })

      trackEvent({
        event: 'billing.grant',
        userId,
        credits,
        source: type,
        isPermanent,
        reason: options?.reason,
      })
    })
    return true
  } catch {
    return false
  }
}
