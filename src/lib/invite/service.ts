/**
 * 邀请分销服务
 */
import { prisma } from '@/lib/prisma'
import { getInviteConfig } from '@/lib/platform-config'
import { grantCredits } from '@/lib/credit-billing/service'
import type { PrismaClient, User } from '@prisma/client'

/**
 * 处理带邀请的用户注册（在事务中调用）
 */
export async function processInviteOnRegistration(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$transaction' | '$on' | '$use' | '$extends'>,
  newUser: User,
  inviterId: string,
  inviteCode: string
): Promise<void> {
  const config = await getInviteConfig()
  const now = new Date()
  const rebateEndsAt = new Date(now)
  rebateEndsAt.setFullYear(rebateEndsAt.getFullYear() + 1)

  // 检查当天邀请上限
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const todayCount = await tx.inviteRebateLog.count({
    where: {
      inviterId,
      triggerType: 'activation',
      createdAt: { gte: todayStart },
    },
  })

  const shouldAwardInviter = todayCount < config.dailyReferralCap

  // 创建邀请记录
  const inviteRecord = await tx.inviteRecord.create({
    data: {
      inviterId,
      inviteeId: newUser.id,
      inviteCode,
      rebateEndsAt,
      welcomeCredits: config.welcomeCredits,
      referralCredits: shouldAwardInviter ? config.referralCredits : 0,
    },
  })

  // 给新用户发放欢迎积分
  if (config.welcomeCredits > 0) {
    await grantCredits(newUser.id, config.welcomeCredits, 'invite_welcome_gift', {
      reason: '新用户注册欢迎礼',
      isPermanent: false,
      idempotencyKey: `invite_${newUser.id}_welcome`,
    })
  }

  // 给邀请人发放奖励积分
  if (shouldAwardInviter && config.referralCredits > 0) {
    await grantCredits(inviterId, config.referralCredits, 'invite_referral_reward', {
      reason: '邀请新人奖励',
      isPermanent: true,
      idempotencyKey: `invite_${newUser.id}_referral`,
    })
  }

  // 更新邀请记录的交易 ID
  await tx.inviteRecord.update({
    where: { id: inviteRecord.id },
    data: {
      welcomeTxId: config.welcomeCredits > 0 ? `invite_${newUser.id}_welcome` : null,
      referralTxId: shouldAwardInviter && config.referralCredits > 0 ? `invite_${newUser.id}_referral` : null,
    },
  })
}

/**
 * 获取用户邀请列表
 */
export async function getUserInvites(userId: string) {
  const invites = await prisma.inviteRecord.findMany({
    where: { inviterId: userId },
    orderBy: { createdAt: 'desc' },
  })
  return invites
}

/**
 * 获取用户邀请统计
 */
export async function getUserInviteStats(userId: string) {
  const [totalInvites, totalRebates] = await Promise.all([
    prisma.inviteRecord.count({ where: { inviterId: userId } }),
    prisma.inviteRebateLog.aggregate({
      where: { inviterId: userId },
      _sum: { creditsAwarded: true },
    }),
  ])

  return {
    totalInvites,
    totalCreditsEarned: totalRebates._sum.creditsAwarded ?? 0,
  }
}
