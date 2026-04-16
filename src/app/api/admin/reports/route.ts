import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { prisma } from '@/lib/prisma'
import { startOfDay, subDays, parseISO } from 'date-fns'

export async function GET(request: Request) {
  try {
    await requireAdmin()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unauthorized'
    return NextResponse.json(
      { success: false, error: message },
      { status: message.includes('Admin') ? 403 : 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '30')
  const startDateParam = searchParams.get('startDate')
  const endDateParam = searchParams.get('endDate')
  const include = searchParams.get('include')?.split(',') || ['users', 'tasks', 'consumption', 'subscriptions']

  // 验证参数
  if (days < 1 || days > 365) {
    return NextResponse.json(
      { success: false, error: 'days must be between 1 and 365' },
      { status: 400 }
    )
  }

  // 计算日期范围
  let startDate: Date, endDate: Date = new Date()

  if (startDateParam && endDateParam) {
    startDate = parseISO(startDateParam)
    endDate = parseISO(endDateParam)
  } else {
    startDate = subDays(startOfDay(new Date()), days)
  }

  const sevenDaysAgo = subDays(new Date(), 7)

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: Record<string, any> = {
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    }

    // 混合查询逻辑：7天内实时查询，7天以上从统计表查询
    const useStatsTable = startDate < sevenDaysAgo

    // 1. 用户统计
    if (include.includes('users')) {
      if (useStatsTable) {
        // 从统计表查询
        const userStats = await prisma.dailyStats.aggregate({
          where: { date: { gte: startDate, lte: endDate } },
          _sum: {
            newUserCount: true,
            activeUserCount: true,
          },
        })

        // 获取当前总用户数
        const totalUsers = await prisma.user.count()

        result.users = {
          totalUsers,
          newUsers: userStats._sum.newUserCount || 0,
          activeUsers: userStats._sum.activeUserCount || 0,
        }

        // 按日趋势
        const dailyUserTrend = await prisma.dailyStats.findMany({
          where: { date: { gte: startDate, lte: endDate } },
          select: {
            date: true,
            newUserCount: true,
            activeUserCount: true,
          },
          orderBy: { date: 'asc' },
        })

        result.users.trend = dailyUserTrend.map(item => ({
          date: item.date.toISOString().split('T')[0],
          newUsers: item.newUserCount,
          activeUsers: item.activeUserCount,
        }))
      } else {
        // 7天内实时查询
        const newUsers = await prisma.user.count({
          where: { createdAt: { gte: startDate, lte: endDate } },
        })

        const activeUsers = await prisma.task.findMany({
          where: { createdAt: { gte: startDate, lte: endDate } },
          distinct: ['userId'],
        }).then(tasks => tasks.length)

        const totalUsers = await prisma.user.count()

        result.users = {
          totalUsers,
          newUsers,
          activeUsers,
        }

        // 按日趋势
        const dailyNewUsers = await prisma.user.groupBy({
          by: ['createdAt'],
          where: { createdAt: { gte: startDate, lte: endDate } },
          _count: { id: true },
          orderBy: { createdAt: 'asc' },
        })

        const dailyActiveUsers = await prisma.task.groupBy({
          by: ['createdAt', 'userId'],
          where: { createdAt: { gte: startDate, lte: endDate } },
          _count: { id: true },
          orderBy: { createdAt: 'asc' },
        })

        // 聚合按天
        const trendMap = new Map<string, { newUsers: number; activeUsers: number }>()

        dailyNewUsers.forEach(item => {
          const date = item.createdAt.toISOString().split('T')[0]
          const existing = trendMap.get(date) || { newUsers: 0, activeUsers: 0 }
          trendMap.set(date, { ...existing, newUsers: existing.newUsers + item._count.id })
        })

        // 统计每日活跃用户（去重）
        const activeUserMap = new Map<string, Set<string>>()
        dailyActiveUsers.forEach(item => {
          const date = item.createdAt.toISOString().split('T')[0]
          if (!activeUserMap.has(date)) {
            activeUserMap.set(date, new Set())
          }
          activeUserMap.get(date)?.add(item.userId)
        })

        activeUserMap.forEach((userSet, date) => {
          const existing = trendMap.get(date) || { newUsers: 0, activeUsers: 0 }
          trendMap.set(date, { ...existing, activeUsers: userSet.size })
        })

        result.users.trend = Array.from(trendMap.entries())
          .map(([date, stats]) => ({ date, ...stats }))
          .sort((a, b) => a.date.localeCompare(b.date))
      }
    }

    // 2. 任务统计
    if (include.includes('tasks')) {
      if (useStatsTable) {
        // 从统计表查询
        const taskStats = await prisma.dailyStats.aggregate({
          where: { date: { gte: startDate, lte: endDate } },
          _sum: {
            totalTasks: true,
            successfulTasks: true,
          },
        })

        result.tasks = {
          totalTasks: taskStats._sum.totalTasks || 0,
          successfulTasks: taskStats._sum.successfulTasks || 0,
          successRate: taskStats._sum.totalTasks
            ? Math.round((taskStats._sum.successfulTasks / taskStats._sum.totalTasks) * 10000) / 100
            : 0,
        }

        // 任务类型统计
        const taskTypeStats = await prisma.dailyStats.findMany({
          where: { date: { gte: startDate, lte: endDate } },
          select: { taskTypeStats: true },
        })

        // 合并各天的任务类型统计
        const mergedTaskTypes: Record<string, { count: number; success: number }> = {}
        taskTypeStats.forEach(dayStats => {
          const dayData = dayStats.taskTypeStats as Record<string, { count: number; success: number }>
          Object.entries(dayData).forEach(([type, stats]) => {
            if (!mergedTaskTypes[type]) {
              mergedTaskTypes[type] = { count: 0, success: 0 }
            }
            mergedTaskTypes[type].count += stats.count
            mergedTaskTypes[type].success += stats.success
          })
        })

        result.tasks.byType = Object.entries(mergedTaskTypes).map(([type, stats]) => ({
          type,
          count: stats.count,
          success: stats.success,
          successRate: Math.round((stats.success / stats.count) * 10000) / 100,
        }))

        // 按日趋势
        const dailyTaskTrend = await prisma.dailyStats.findMany({
          where: { date: { gte: startDate, lte: endDate } },
          select: {
            date: true,
            totalTasks: true,
            successfulTasks: true,
          },
          orderBy: { date: 'asc' },
        })

        result.tasks.trend = dailyTaskTrend.map(item => ({
          date: item.date.toISOString().split('T')[0],
          totalTasks: item.totalTasks,
          successfulTasks: item.successfulTasks,
          successRate: Math.round((item.successfulTasks / item.totalTasks) * 10000) / 100,
        }))
      } else {
        // 7天内实时查询
        const taskStats = await prisma.task.aggregate({
          where: { createdAt: { gte: startDate, lte: endDate } },
          _count: { id: true },
        })

        const successfulTasks = await prisma.task.count({
          where: {
            createdAt: { gte: startDate, lte: endDate },
            status: 'completed',
          },
        })

        result.tasks = {
          totalTasks: taskStats._count.id,
          successfulTasks,
          successRate: Math.round((successfulTasks / taskStats._count.id) * 10000) / 100,
        }

        // 按类型统计
        const taskByType = await prisma.task.groupBy({
          by: ['type', 'status'],
          where: { createdAt: { gte: startDate, lte: endDate } },
          _count: { id: true },
        })

        const typeMap = new Map<string, { count: number; success: number }>()
        taskByType.forEach(item => {
          if (!typeMap.has(item.type)) {
            typeMap.set(item.type, { count: 0, success: 0 })
          }
          const typeStats = typeMap.get(item.type)!
          typeStats.count += item._count.id
          if (item.status === 'completed') {
            typeStats.success += item._count.id
          }
        })

        result.tasks.byType = Array.from(typeMap.entries()).map(([type, stats]) => ({
          type,
          count: stats.count,
          success: stats.success,
          successRate: Math.round((stats.success / stats.count) * 10000) / 100,
        }))

        // 按日趋势
        const dailyTasks = await prisma.task.groupBy({
          by: ['createdAt', 'status'],
          where: { createdAt: { gte: startDate, lte: endDate } },
          _count: { id: true },
          orderBy: { createdAt: 'asc' },
        })

        const trendMap = new Map<string, { totalTasks: number; successfulTasks: number }>()
        dailyTasks.forEach(item => {
          const date = item.createdAt.toISOString().split('T')[0]
          const existing = trendMap.get(date) || { totalTasks: 0, successfulTasks: 0 }
          existing.totalTasks += item._count.id
          if (item.status === 'completed') {
            existing.successfulTasks += item._count.id
          }
          trendMap.set(date, existing)
        })

        result.tasks.trend = Array.from(trendMap.entries())
          .map(([date, stats]) => ({
            date,
            totalTasks: stats.totalTasks,
            successfulTasks: stats.successfulTasks,
            successRate: Math.round((stats.successfulTasks / stats.totalTasks) * 10000) / 100,
          }))
          .sort((a, b) => a.date.localeCompare(b.date))
      }
    }

    // 3. 消费统计
    if (include.includes('consumption')) {
      if (useStatsTable) {
        // 从统计表查询
        const consumptionStats = await prisma.dailyStats.aggregate({
          where: { date: { gte: startDate, lte: endDate } },
          _sum: {
            totalCreditsConsumed: true,
            rechargeRevenue: true,
          },
        })

        result.consumption = {
          totalCreditsConsumed: consumptionStats._sum.totalCreditsConsumed || 0,
          totalRechargeRevenue: consumptionStats._sum.rechargeRevenue?.toNumber() || 0,
        }

        // 按模型统计
        const modelStats = await prisma.dailyStats.findMany({
          where: { date: { gte: startDate, lte: endDate } },
          select: { modelUsageStats: true },
        })

        const mergedModelStats: Record<string, { count: number; credits: number }> = {}
        modelStats.forEach(dayStats => {
          const dayData = dayStats.modelUsageStats as Record<string, { count: number; credits: number }>
          Object.entries(dayData).forEach(([model, stats]) => {
            if (!mergedModelStats[model]) {
              mergedModelStats[model] = { count: 0, credits: 0 }
            }
            mergedModelStats[model].count += stats.count
            mergedModelStats[model].credits += stats.credits
          })
        })

        result.consumption.byModel = Object.entries(mergedModelStats).map(([model, stats]) => ({
          model,
          count: stats.count,
          credits: stats.credits,
        }))

        // 按日趋势
        const dailyConsumptionTrend = await prisma.dailyStats.findMany({
          where: { date: { gte: startDate, lte: endDate } },
          select: {
            date: true,
            totalCreditsConsumed: true,
            rechargeRevenue: true,
          },
          orderBy: { date: 'asc' },
        })

        result.consumption.trend = dailyConsumptionTrend.map(item => ({
          date: item.date.toISOString().split('T')[0],
          creditsConsumed: item.totalCreditsConsumed,
          rechargeRevenue: item.rechargeRevenue.toNumber(),
        }))
      } else {
        // 7天内实时查询
        const consumptionStats = await prisma.usageCost.aggregate({
          where: { createdAt: { gte: startDate, lte: endDate } },
          _sum: { cost: true },
        })

        const rechargeStats = await prisma.balanceTransaction.aggregate({
          where: {
            createdAt: { gte: startDate, lte: endDate },
            type: 'recharge',
          },
          _sum: { amount: true },
        })

        result.consumption = {
          totalCreditsConsumed: consumptionStats._sum.cost?.toNumber() || 0,
          totalRechargeRevenue: rechargeStats._sum.amount?.toNumber() || 0,
        }

        // 按模型统计
        const modelStats = await prisma.usageCost.groupBy({
          by: ['model'],
          where: { createdAt: { gte: startDate, lte: endDate } },
          _sum: { cost: true, quantity: true },
        })

        result.consumption.byModel = modelStats.map(item => ({
          model: item.model,
          count: item._sum.quantity || 0,
          credits: item._sum.cost?.toNumber() || 0,
        }))

        // 按日趋势
        const dailyConsumption = await prisma.usageCost.groupBy({
          by: ['createdAt'],
          where: { createdAt: { gte: startDate, lte: endDate } },
          _sum: { cost: true },
          orderBy: { createdAt: 'asc' },
        })

        const dailyRecharge = await prisma.balanceTransaction.groupBy({
          by: ['createdAt'],
          where: {
            createdAt: { gte: startDate, lte: endDate },
            type: 'recharge',
          },
          _sum: { amount: true },
          orderBy: { createdAt: 'asc' },
        })

        const trendMap = new Map<string, { creditsConsumed: number; rechargeRevenue: number }>()

        dailyConsumption.forEach(item => {
          const date = item.createdAt.toISOString().split('T')[0]
          const existing = trendMap.get(date) || { creditsConsumed: 0, rechargeRevenue: 0 }
          trendMap.set(date, {
            ...existing,
            creditsConsumed: existing.creditsConsumed + (item._sum.cost?.toNumber() || 0),
          })
        })

        dailyRecharge.forEach(item => {
          const date = item.createdAt.toISOString().split('T')[0]
          const existing = trendMap.get(date) || { creditsConsumed: 0, rechargeRevenue: 0 }
          trendMap.set(date, {
            ...existing,
            rechargeRevenue: existing.rechargeRevenue + (item._sum.amount?.toNumber() || 0),
          })
        })

        result.consumption.trend = Array.from(trendMap.entries())
          .map(([date, stats]) => ({ date, ...stats }))
          .sort((a, b) => a.date.localeCompare(b.date))
      }
    }

    // 4. 订阅统计
    if (include.includes('subscriptions')) {
      if (useStatsTable) {
        // 从统计表查询
        const subscriptionStats = await prisma.dailyStats.aggregate({
          where: { date: { gte: startDate, lte: endDate } },
          _sum: {
            subscriptionRevenue: true,
          },
        })

        // 当前订阅统计
        const currentSubscriptions = await prisma.userSubscription.groupBy({
          by: ['status', 'planId'],
          _count: { id: true },
          include: { plan: true },
        })

        result.subscriptions = {
          totalRevenue: subscriptionStats._sum.subscriptionRevenue?.toNumber() || 0,
          currentSubscriptions: currentSubscriptions.map(item => ({
            planId: item.planId,
            planName: item.plan?.name,
            status: item.status,
            count: item._count.id,
          })),
        }

        // 按套餐统计
        const planStats = await prisma.dailyStats.findMany({
          where: { date: { gte: startDate, lte: endDate } },
          select: { planSubscriptionStats: true },
        })

        const mergedPlanStats: Record<string, { newCount: number; activeCount: number; revenue: number }> = {}
        planStats.forEach(dayStats => {
          const dayData = dayStats.planSubscriptionStats as Record<string, { newCount: number; activeCount: number; revenue: number }>
          Object.entries(dayData).forEach(([planId, stats]) => {
            if (!mergedPlanStats[planId]) {
              mergedPlanStats[planId] = { newCount: 0, activeCount: 0, revenue: 0 }
            }
            mergedPlanStats[planId].newCount += stats.newCount
            mergedPlanStats[planId].activeCount += stats.activeCount
            mergedPlanStats[planId].revenue += stats.revenue
          })
        })

        // 获取套餐名称
        const plans = await prisma.subscriptionPlan.findMany({
          select: { id: true, name: true },
        })
        const planNameMap = new Map(plans.map(p => [p.id, p.name]))

        result.subscriptions.byPlan = Object.entries(mergedPlanStats).map(([planId, stats]) => ({
          planId,
          planName: planNameMap.get(planId) || planId,
          newCount: stats.newCount,
          activeCount: stats.activeCount,
          revenue: stats.revenue,
        }))

        // 按日趋势
        const dailySubscriptionTrend = await prisma.dailyStats.findMany({
          where: { date: { gte: startDate, lte: endDate } },
          select: {
            date: true,
            subscriptionRevenue: true,
          },
          orderBy: { date: 'asc' },
        })

        result.subscriptions.trend = dailySubscriptionTrend.map(item => ({
          date: item.date.toISOString().split('T')[0],
          revenue: item.subscriptionRevenue.toNumber(),
        }))
      } else {
        // 7天内实时查询
        const subscriptionRevenue = await prisma.balanceTransaction.aggregate({
          where: {
            createdAt: { gte: startDate, lte: endDate },
            type: 'subscription_charge',
          },
          _sum: { amount: true },
        })

        const newSubscriptions = await prisma.userSubscription.count({
          where: { createdAt: { gte: startDate, lte: endDate } },
        })

        const currentSubscriptions = await prisma.userSubscription.groupBy({
          by: ['status', 'planId'],
          _count: { id: true },
          include: { plan: true },
        })

        result.subscriptions = {
          totalRevenue: subscriptionRevenue._sum.amount?.toNumber() || 0,
          newSubscriptions,
          currentSubscriptions: currentSubscriptions.map(item => ({
            planId: item.planId,
            planName: item.plan?.name,
            status: item.status,
            count: item._count.id,
          })),
        }

        // 按套餐统计
        const planStats = await prisma.userSubscription.groupBy({
          by: ['planId', 'status'],
          where: { createdAt: { gte: startDate, lte: endDate } },
          _count: { id: true },
          include: { plan: true },
        })

        const planMap = new Map<string, { newCount: number; activeCount: number; revenue: number }>()
        planStats.forEach(item => {
          if (!planMap.has(item.planId)) {
            planMap.set(item.planId, { newCount: 0, activeCount: 0, revenue: 0 })
          }
          const planData = planMap.get(item.planId)!
          planData.newCount += item._count.id
          if (item.status === 'active') {
            planData.activeCount += item._count.id
          }
        })

        result.subscriptions.byPlan = Array.from(planMap.entries()).map(([planId, stats]) => ({
          planId,
          planName: currentSubscriptions.find(s => s.planId === planId)?.plan?.name || planId,
          newCount: stats.newCount,
          activeCount: stats.activeCount,
          revenue: 0, // 实时查询暂时不统计按套餐的收入
        }))

        // 按日趋势
        const dailySubscriptionRevenue = await prisma.balanceTransaction.groupBy({
          by: ['createdAt'],
          where: {
            createdAt: { gte: startDate, lte: endDate },
            type: 'subscription_charge',
          },
          _sum: { amount: true },
          orderBy: { createdAt: 'asc' },
        })

        const trendMap = new Map<string, { revenue: number }>()
        dailySubscriptionRevenue.forEach(item => {
          const date = item.createdAt.toISOString().split('T')[0]
          const existing = trendMap.get(date) || { revenue: 0 }
          trendMap.set(date, {
            revenue: existing.revenue + (item._sum.amount?.toNumber() || 0),
          })
        })

        result.subscriptions.trend = Array.from(trendMap.entries())
          .map(([date, stats]) => ({ date, ...stats }))
          .sort((a, b) => a.date.localeCompare(b.date))
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Failed to fetch admin reports:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch admin reports' },
      { status: 500 }
    )
  }
}
