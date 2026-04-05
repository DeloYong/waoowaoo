/**
 * 请求前门卫校验
 */
import { prisma } from '@/lib/prisma'
import { getCreditBalance } from './service'
import type { GuardCheckResult, UserSubscriptionState, CreditQuote } from './types'

/**
 * 获取用户订阅状态
 */
export async function getUserSubscriptionState(
  userId: string
): Promise<UserSubscriptionState | null> {
  const subscription = await prisma.userSubscription.findUnique({
    where: { userId },
    include: { plan: true },
  })

  if (!subscription || subscription.status !== 'active') {
    return null
  }

  return {
    userId,
    planId: subscription.planId,
    status: subscription.status as 'active' | 'expired' | 'cancelled',
    maxConcurrency: subscription.plan.maxConcurrency,
    monthlyCredits: subscription.plan.monthlyCredits,
    maxVideoSeconds: subscription.plan.maxVideoSeconds,
    videoSecondsUsed: subscription.videoSecondsUsed,
    currentPeriodEnd: subscription.currentPeriodEnd,
  }
}

/**
 * 获取当前运行任务数（用于并发校验）
 */
async function getActiveTaskCount(userId: string): Promise<number> {
  return await prisma.task.count({
    where: {
      userId,
      status: { in: ['queued', 'processing'] },
    },
  })
}

/**
 * 执行门卫校验
 */
export async function guardCheck(
  userId: string,
  creditQuote: CreditQuote,
  options?: { skipConcurrency?: boolean }
): Promise<GuardCheckResult> {
  // 1. 检查有效订阅
  const subscription = await getUserSubscriptionState(userId)
  if (!subscription) {
    return {
      passed: false,
      httpStatus: 402,
      errorCode: 'NO_SUBSCRIPTION',
      message: '需要有效的订阅才能使用此功能',
    }
  }

  // 2. 检查积分余额
  const balance = await getCreditBalance(userId)
  if (balance.availableCredits < creditQuote.totalCredits) {
    return {
      passed: false,
      httpStatus: 402,
      errorCode: 'INSUFFICIENT_CREDITS',
      message: `积分不足，需要 ${creditQuote.totalCredits} 积分，当前可用 ${balance.availableCredits} 积分`,
    }
  }

  // 3. 检查并发限制
  if (!options?.skipConcurrency) {
    const activeCount = await getActiveTaskCount(userId)
    if (activeCount >= subscription.maxConcurrency) {
      return {
        passed: false,
        httpStatus: 429,
        errorCode: 'CONCURRENCY_LIMIT',
        message: `已达到并发上限 ${subscription.maxConcurrency}`,
      }
    }
  }

  // 4. 检查视频配额
  if (creditQuote.mediaType === 'video') {
    if (subscription.videoSecondsUsed >= subscription.maxVideoSeconds) {
      return {
        passed: false,
        httpStatus: 402,
        errorCode: 'VIDEO_QUOTA_EXCEEDED',
        message: '本月视频配额已用完',
      }
    }
  }

  return { passed: true }
}
