import { NextResponse } from 'next/server'
import { requireUserAuth, isErrorResponse, badRequest } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { startOfDay, subDays, parseISO } from 'date-fns'
import { apiHandler } from '@/lib/api-errors'

export const GET = apiHandler(async (request: Request) => {
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) {
    return authResult
  }

  const { session } = authResult
  const { searchParams } = new URL(request.url)

  const days = parseInt(searchParams.get('days') || '30')
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')
  const startDateParam = searchParams.get('startDate')
  const endDateParam = searchParams.get('endDate')

  // 验证参数
  if (days < 1 || days > 365) {
    return badRequest('days must be between 1 and 365')
  }
  if (page < 1) {
    return badRequest('page must be greater than 0')
  }
  if (pageSize < 1 || pageSize > 100) {
    return badRequest('pageSize must be between 1 and 100')
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
    // 1. 获取用户概览信息
    const [userBalance, userSubscription, totalUsage] = await Promise.all([
      prisma.userBalance.findUnique({
        where: { userId: session.user.id },
        select: {
          subscriptionCredits: true,
          permanentCredits: true,
          frozenCredits: true,
          totalSpent: true,
        },
      }),
      prisma.userSubscription.findUnique({
        where: { userId: session.user.id },
        include: { plan: true },
      }),
      prisma.usageCost.aggregate({
        where: {
          userId: session.user.id,
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { cost: true, quantity: true },
      }),
    ])

    // 2. 获取消耗趋势数据（混合查询：7天内查实时表，7天以上查统计表）
    let trendData: Array<{
      date: string
      totalCredits: number
      taskCount: number
    }> = []

    if (startDate < sevenDaysAgo) {
      // 需要混合查询
      // 先查7天以上的统计数据
      const dailyStats = await prisma.dailyStats.findMany({
        where: {
          date: { gte: startOfDay(startDate), lt: startOfDay(sevenDaysAgo) },
        },
        select: {
          date: true,
          totalCreditsConsumed: true,
          totalTasks: true,
        },
        orderBy: { date: 'asc' },
      })

      // 再查最近7天的实时数据
      const realtimeStats = await prisma.usageCost.groupBy({
        by: ['createdAt'],
        where: {
          userId: session.user.id,
          createdAt: { gte: sevenDaysAgo, lte: endDate },
        },
        _sum: { cost: true },
        _count: { id: true },
        orderBy: { createdAt: 'asc' },
      })

      // 合并数据
      const trendMap = new Map<string, { totalCredits: number; taskCount: number }>()

      // 处理统计数据
      dailyStats.forEach(stat => {
        const dateStr = stat.date.toISOString().split('T')[0]
        trendMap.set(dateStr, {
          totalCredits: stat.totalCreditsConsumed,
          taskCount: stat.totalTasks,
        })
      })

      // 处理实时数据，按天聚合
      realtimeStats.forEach(stat => {
        const dateStr = stat.createdAt.toISOString().split('T')[0]
        const existing = trendMap.get(dateStr) || { totalCredits: 0, taskCount: 0 }
        trendMap.set(dateStr, {
          totalCredits: existing.totalCredits + (stat._sum.cost?.toNumber() || 0),
          taskCount: existing.taskCount + stat._count.id,
        })
      })

      // 转换为数组并排序
      trendData = Array.from(trendMap.entries())
        .map(([date, stats]) => ({ date, ...stats }))
        .sort((a, b) => a.date.localeCompare(b.date))
    } else {
      // 全部在7天内，直接查实时表
      const realtimeStats = await prisma.usageCost.groupBy({
        by: ['createdAt'],
        where: {
          userId: session.user.id,
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { cost: true },
        _count: { id: true },
        orderBy: { createdAt: 'asc' },
      })

      // 按天聚合
      const trendMap = new Map<string, { totalCredits: number; taskCount: number }>()
      realtimeStats.forEach(stat => {
        const dateStr = stat.createdAt.toISOString().split('T')[0]
        const existing = trendMap.get(dateStr) || { totalCredits: 0, taskCount: 0 }
        trendMap.set(dateStr, {
          totalCredits: existing.totalCredits + (stat._sum.cost?.toNumber() || 0),
          taskCount: existing.taskCount + stat._count.id,
        })
      })

      trendData = Array.from(trendMap.entries())
        .map(([date, stats]) => ({ date, ...stats }))
        .sort((a, b) => a.date.localeCompare(b.date))
    }

    // 3. 获取消耗明细（分页）
    const skip = (page - 1) * pageSize
    const [usageRecords, totalRecords] = await Promise.all([
      prisma.usageCost.findMany({
        where: {
          userId: session.user.id,
          createdAt: { gte: startDate, lte: endDate },
        },
        include: {
          project: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.usageCost.count({
        where: {
          userId: session.user.id,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
    ])

    // 格式化明细数据
    const formattedRecords = usageRecords.map(record => ({
      id: record.id,
      projectId: record.projectId,
      projectName: record.project?.name,
      apiType: record.apiType,
      model: record.model,
      action: record.action,
      quantity: record.quantity,
      unit: record.unit,
      cost: record.cost.toNumber(),
      metadata: record.metadata ? JSON.parse(record.metadata) : null,
      createdAt: record.createdAt.toISOString(),
    }))

    // 4. 构造返回结果
    const overview = {
      totalCredits: (userBalance?.subscriptionCredits || 0) + (userBalance?.permanentCredits || 0),
      availableCredits: (userBalance?.subscriptionCredits || 0) + (userBalance?.permanentCredits || 0) - (userBalance?.frozenCredits || 0),
      frozenCredits: userBalance?.frozenCredits || 0,
      totalSpent: userBalance?.totalSpent?.toNumber() || 0,
      periodUsage: totalUsage._sum.cost?.toNumber() || 0,
      periodTaskCount: totalUsage._sum.quantity || 0,
      subscription: userSubscription ? {
        planId: userSubscription.planId,
        planName: userSubscription.plan.name,
        status: userSubscription.status,
        currentPeriodEnd: userSubscription.currentPeriodEnd.toISOString(),
        monthlyCredits: userSubscription.plan.monthlyCredits,
        creditsUsed: userSubscription.creditsGranted - (userBalance?.subscriptionCredits || 0),
      } : null,
    }

    return NextResponse.json({
      success: true,
      data: {
        overview,
        trend: trendData,
        details: {
          list: formattedRecords,
          pagination: {
            page,
            pageSize,
            total: totalRecords,
            totalPages: Math.ceil(totalRecords / pageSize),
          },
        },
      },
    })
  } catch (error) {
    console.error('Failed to fetch usage data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch usage data' },
      { status: 500 }
    )
  }
})
