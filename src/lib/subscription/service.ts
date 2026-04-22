/**
 * 订阅管理服务
 */
import { prisma } from '@/lib/prisma'
import { grantCredits } from '@/lib/credit-billing/service'
import { trackEvent } from '@/lib/observability'

/**
 * 为用户分配套餐
 */
export async function assignPlan(
  userId: string,
  planId: string,
  options?: {
    operatorId?: string
    billingCycle?: 'monthly' | 'yearly' | 'trial'
  }
): Promise<void> {
  const billingCycle = options?.billingCycle ?? 'monthly'

  await prisma.$transaction(async (tx) => {
    const plan = await tx.subscriptionPlan.findUniqueOrThrow({
      where: { id: planId },
    })

    const now = new Date()
    const currentPeriodEnd = new Date(now)
    if (billingCycle === 'yearly') {
      currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1)
    } else if (billingCycle === 'trial') {
      currentPeriodEnd.setDate(currentPeriodEnd.getDate() + plan.trialDays)
    } else {
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1)
    }

    // 取消旧订阅
    await tx.userSubscription.updateMany({
      where: { userId, status: 'active' },
      data: { status: 'cancelled', cancelledAt: now },
    })

    // 创建新订阅
    const subscription = await tx.userSubscription.create({
      data: {
        userId,
        planId,
        billingCycle,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd,
        creditsGranted: 0,
        videoSecondsUsed: 0,
      },
    })

    // 发放套餐积分
    if (plan.monthlyCredits > 0) {
      await grantCredits(userId, plan.monthlyCredits, 'subscription_grant', {
        reason: `${plan.name} 套餐积分`,
        isPermanent: false,
      })
      await tx.userSubscription.update({
        where: { id: subscription.id },
        data: { creditsGranted: plan.monthlyCredits },
      })
    }
  })

  // Need to fetch plan info for tracking (plan was inside tx scope)
  const plan = await prisma.subscriptionPlan.findUniqueOrThrow({ where: { id: planId } })

  trackEvent({
    event: 'subscription.assign',
    userId,
    planId,
    billingCycle,
    operatorId: options?.operatorId,
    monthlyCredits: plan.monthlyCredits,
  })
}

/**
 * 处理订阅周期到期（Cron Job 调用）
 */
export async function processExpiredSubscriptions(): Promise<{
  processed: number
  errors: number
}> {
  const now = new Date()
  let processed = 0
  let errors = 0

  const expiredSubscriptions = await prisma.userSubscription.findMany({
    where: {
      status: 'active',
      currentPeriodEnd: { lt: now },
    },
  })

  for (const subscription of expiredSubscriptions) {
    let creditsCleared = 0
    try {
      await prisma.$transaction(async (tx) => {
        // 标记为过期
        await tx.userSubscription.update({
          where: { id: subscription.id },
          data: { status: 'expired' },
        })

        // 使用 FOR UPDATE 行锁清零套餐积分，防止并发修改
        const balance = await tx.$queryRaw<Array<{
          subscriptionCredits: bigint
          permanentCredits: bigint
          frozenCredits: bigint
        }>>`
          SELECT subscriptionCredits, permanentCredits, frozenCredits
          FROM "UserBalance"
          WHERE userId = ${subscription.userId}
          FOR UPDATE
        `.then(rows => rows[0] ?? null)

        if (balance && balance.subscriptionCredits > BigInt(0)) {
          creditsCleared = Number(balance.subscriptionCredits)
          await tx.userBalance.update({
            where: { userId: subscription.userId },
            data: { subscriptionCredits: 0 },
          })

          // 记录流水
          await tx.balanceTransaction.create({
            data: {
              userId: subscription.userId,
              type: 'subscription_expired_clear',
              amount: 0,
              balanceAfter: 0,
              description: `套餐过期，清零 ${creditsCleared} 套餐积分`,
            },
          })
        }
      })
      processed++

      trackEvent({
        event: 'subscription.expired',
        userId: subscription.userId,
        planId: subscription.planId,
        subscriptionCreditsCleared: creditsCleared,
      })
    } catch {
      errors++
    }
  }

  return { processed, errors }
}

/**
 * 获取套餐列表
 */
export async function getActivePlans() {
  return await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  })
}
