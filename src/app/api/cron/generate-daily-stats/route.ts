import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { startOfYesterday, endOfYesterday, startOfDay, formatISO } from 'date-fns'
import { apiHandler } from '@/lib/api-errors'

// Cron API 密钥（复用现有CRON_SECRET环境变量）
const CRON_API_SECRET = process.env.CRON_SECRET

export const POST = apiHandler(async (request: Request) => {
  try {
    // 验证请求权限
    const authHeader = request.headers.get('authorization')
    if (!CRON_API_SECRET || authHeader !== `Bearer ${CRON_API_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 计算要统计的日期（昨天）
    const statsDate = startOfDay(startOfYesterday())
    const startOfStatsDate = startOfYesterday()
    const endOfStatsDate = endOfYesterday()

    // 幂等性检查：如果当天统计已存在，直接返回
    const existingStats = await prisma.dailyStats.findUnique({
      where: { date: statsDate }
    })

    if (existingStats) {
      return NextResponse.json({
        success: true,
        message: 'Stats already exist for this date',
        data: existingStats
      })
    }

    // ==================== 统计计算 ====================

    // 1. 新增用户数
    const newUserCount = await prisma.user.count({
      where: {
        createdAt: {
          gte: startOfStatsDate,
          lt: endOfStatsDate
        }
      }
    })

    // 2. 活跃用户数（当日有任务/消费/订阅操作的用户）
    const [activeUsersFromTasks, activeUsersFromCosts, activeUsersFromSubscriptions] = await Promise.all([
      prisma.task.findMany({
        where: { createdAt: { gte: startOfStatsDate, lt: endOfStatsDate } },
        select: { userId: true },
        distinct: ['userId']
      }),
      prisma.usageCost.findMany({
        where: { createdAt: { gte: startOfStatsDate, lt: endOfStatsDate } },
        select: { userId: true },
        distinct: ['userId']
      }),
      prisma.userSubscription.findMany({
        where: { createdAt: { gte: startOfStatsDate, lt: endOfStatsDate } },
        select: { userId: true },
        distinct: ['userId']
      })
    ])

    const activeUserIds = new Set([
      ...activeUsersFromTasks.map(u => u.userId),
      ...activeUsersFromCosts.map(u => u.userId),
      ...activeUsersFromSubscriptions.map(u => u.userId)
    ])
    const activeUserCount = activeUserIds.size

    // 3. 任务统计
    const totalTasks = await prisma.task.count({
      where: { createdAt: { gte: startOfStatsDate, lt: endOfStatsDate } }
    })

    const successfulTasks = await prisma.task.count({
      where: {
        createdAt: { gte: startOfStatsDate, lt: endOfStatsDate },
        status: 'completed'
      }
    })

    // 4. 各类型任务统计
    const tasks = await prisma.task.findMany({
      where: {
        createdAt: {
          gte: startOfStatsDate,
          lt: endOfStatsDate
        }
      },
      select: { type: true, status: true }
    })

    const taskTypeStats: Record<string, { count: number; success: number }> = {}
    tasks.forEach(task => {
      if (!taskTypeStats[task.type]) {
        taskTypeStats[task.type] = { count: 0, success: 0 }
      }
      taskTypeStats[task.type].count += 1
      if (task.status === 'completed') {
        taskTypeStats[task.type].success += 1
      }
    })

    // 5. 积分总消耗 + 模型使用统计
    const usageCosts = await prisma.usageCost.findMany({
      where: { createdAt: { gte: startOfStatsDate, lt: endOfStatsDate } },
      select: { cost: true, model: true, quantity: true }
    })

    const totalCreditsConsumed = usageCosts.reduce((sum, cost) => sum + cost.cost.toNumber(), 0)

    const modelUsageStats = usageCosts.reduce((acc, cost) => {
      const model = cost.model || 'unknown'
      if (!acc[model]) {
        acc[model] = { count: 0, credits: 0 }
      }
      acc[model].count += 1
      acc[model].credits += cost.cost.toNumber()
      return acc
    }, {} as Record<string, { count: number; credits: number }>)

    // 6. 订阅收入 + 套餐订阅统计
    const subscriptionTransactions = await prisma.balanceTransaction.findMany({
      where: {
        createdAt: { gte: startOfStatsDate, lt: endOfStatsDate },
        type: 'subscription_payment'
      },
      select: { amount: true, relatedId: true } // relatedId 为 subscriptionId
    })

    const subscriptionRevenue = subscriptionTransactions.reduce((sum, tx) => sum + tx.amount.toNumber(), 0)

    // 当日新增订阅
    const newSubscriptions = await prisma.userSubscription.findMany({
      where: {
        createdAt: { gte: startOfStatsDate, lt: endOfStatsDate },
        status: 'active'
      },
      select: { planId: true }
    })

    // 当前活跃订阅
    const activeSubscriptions = await prisma.userSubscription.findMany({
      where: { status: 'active' },
      select: { planId: true }
    })

    // 套餐统计
    const planStats: Record<string, { newCount: number; activeCount: number; revenue: number }> = {}

    // 新增订阅统计
    newSubscriptions.forEach(sub => {
      if (!planStats[sub.planId]) {
        planStats[sub.planId] = { newCount: 0, activeCount: 0, revenue: 0 }
      }
      planStats[sub.planId].newCount += 1
    })

    // 活跃订阅统计
    activeSubscriptions.forEach(sub => {
      if (!planStats[sub.planId]) {
        planStats[sub.planId] = { newCount: 0, activeCount: 0, revenue: 0 }
      }
      planStats[sub.planId].activeCount += 1
    })

    // 订阅收入统计
    const subscriptionIds = subscriptionTransactions.map(tx => tx.relatedId).filter(Boolean) as string[]
    const subscriptions = await prisma.userSubscription.findMany({
      where: { id: { in: subscriptionIds } },
      select: { id: true, planId: true }
    })

    const subIdToPlanId = subscriptions.reduce((acc, sub) => {
      acc[sub.id] = sub.planId
      return acc
    }, {} as Record<string, string>)

    subscriptionTransactions.forEach(tx => {
      const planId = tx.relatedId ? subIdToPlanId[tx.relatedId] : null
      if (planId) {
        if (!planStats[planId]) {
          planStats[planId] = { newCount: 0, activeCount: 0, revenue: 0 }
        }
        planStats[planId].revenue += tx.amount.toNumber()
      }
    })

    // 7. 充值收入
    const rechargeRevenue = await prisma.balanceTransaction.aggregate({
      where: {
        createdAt: { gte: startOfStatsDate, lt: endOfStatsDate },
        type: 'recharge'
      },
      _sum: { amount: true }
    })

    // ==================== 保存统计数据 ====================
    const dailyStats = await prisma.dailyStats.create({
      data: {
        date: statsDate,
        newUserCount,
        activeUserCount,
        totalTasks,
        successfulTasks,
        totalCreditsConsumed,
        subscriptionRevenue,
        rechargeRevenue: rechargeRevenue._sum.amount?.toNumber() || 0,
        taskTypeStats,
        modelUsageStats,
        planSubscriptionStats: planStats
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Daily stats generated successfully',
      data: dailyStats
    })
  } catch (error) {
    console.error('Error generating daily stats:', error)
    return NextResponse.json(
      { error: 'Failed to generate daily stats', details: (error as Error).message },
      { status: 500 }
    )
  }
})
