/**
 * 积分服务 - 包装 ledger.ts，以积分整数执行冻结/扣除/回滚
 */
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import type { CreditBalance, CreditTransactionType } from './types'

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

  return {
    subscriptionCredits: balance.subscriptionCredits,
    permanentCredits: balance.permanentCredits,
    frozenCredits: balance.frozenCredits,
    availableCredits:
      balance.subscriptionCredits + balance.permanentCredits - balance.frozenCredits,
  }
}

/**
 * 冻结积分
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

      // 获取当前余额
      const balance = await tx.userBalance.findUnique({
        where: { userId },
      })
      if (!balance) {
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
      }

      // 检查可用积分
      const available =
        (balance?.subscriptionCredits ?? 0) +
        (balance?.permanentCredits ?? 0) -
        (balance?.frozenCredits ?? 0)

      if (available < credits) {
        return null
      }

      // 冻结积分（先扣 subscription，再扣 permanent）
      let remainingToFreeze = credits
      let subscriptionToFreeze = 0
      let permanentToFreeze = 0

      const currentSub = balance?.subscriptionCredits ?? 0
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
          metadata: options?.metadata ? JSON.stringify(options.metadata) : null,
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

      return freezeId
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
    return null
  }
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

      // 更新冻结状态
      await tx.balanceFreeze.update({
        where: { id: freezeId },
        data: { status: 'confirmed' },
      })

      // 减少冻结积分
      const updateData: Prisma.UserBalanceUpdateInput = {
        frozenCredits: { decrement: frozenCredits },
      }

      // 退还多余积分（先退 permanent，再退 subscription）
      if (refundCredits > 0) {
        updateData.permanentCredits = { increment: refundCredits }
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

      await tx.balanceFreeze.update({
        where: { id: freezeId },
        data: { status: 'rolled_back' },
      })

      // 解冻（全部退还 permanent，简化处理）
      await tx.userBalance.update({
        where: { userId: freeze.userId },
        data: {
          frozenCredits: { decrement: credits },
          permanentCredits: { increment: credits },
        },
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
    })
    return true
  } catch {
    return false
  }
}
