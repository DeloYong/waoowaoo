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
    const [userBalance, userSubscription] = await Promise.all([
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
    ])

    // 2. 获取消耗趋势数据 - 从 balanceTransaction 表读取
    let trendData: Array<{
      date: string
      totalCredits: number
      taskCount: number
    }> = []

    // 需要查询所有记录来手动聚合（因为 credit_deduct 的 amount 为 0，实际消耗在 billingMeta 中）
    const allTransactions = await prisma.balanceTransaction.findMany({
      where: {
        userId: session.user.id,
        type: { in: ['consume', 'credit_deduct'] },
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        type: true,
        amount: true,
        billingMeta: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    // 按天聚合
    const trendMap = new Map<string, { totalCredits: number; taskCount: number }>()
    allTransactions.forEach(record => {
      const dateStr = record.createdAt.toISOString().split('T')[0]
      const existing = trendMap.get(dateStr) || { totalCredits: 0, taskCount: 0 }

      // 计算消耗量：credit_deduct 从 billingMeta 取 chargedCredits，consume 用 amount
      const billingMeta = record.billingMeta ? JSON.parse(record.billingMeta) : {}
      let usage = 0
      if (record.type === 'credit_deduct') {
        usage = billingMeta.chargedCredits || billingMeta.credits || 0
      } else {
        // 防止 Decimal 精度问题导致超大数字
        const rawAmount = Math.abs(record.amount.toNumber())
        usage = rawAmount > 100000 ? Math.round(rawAmount / 1000000) : rawAmount
      }

      trendMap.set(dateStr, {
        totalCredits: existing.totalCredits + Math.round(usage),
        taskCount: existing.taskCount + 1,
      })
    })

    trendData = Array.from(trendMap.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // 3. 获取消耗明细（分页）- 从 balanceTransaction 表读取，因为它包含所有消费记录
    const skip = (page - 1) * pageSize
    const [usageRecords, totalRecords] = await Promise.all([
      prisma.balanceTransaction.findMany({
        where: {
          userId: session.user.id,
          type: { in: ['consume', 'credit_deduct'] },
          createdAt: { gte: startDate, lte: endDate },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.balanceTransaction.count({
        where: {
          userId: session.user.id,
          type: { in: ['consume', 'credit_deduct'] },
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
    ])

    // 查询相关的 freeze 元数据（用于 credit_deduct 记录）
    const freezeIds = usageRecords.filter(r => r.freezeId).map(r => r.freezeId!)
    const freezes = freezeIds.length > 0
      ? await prisma.balanceFreeze.findMany({
        where: { id: { in: freezeIds } },
        select: { id: true, metadata: true, source: true },
      })
      : []
    const freezeMap = new Map(freezes.map(f => [f.id, f]))

    // 格式化明细数据 - 同时处理现金消费和积分消费两种类型
    const formattedRecords = usageRecords.map(record => {
      const billingMeta = record.billingMeta ? JSON.parse(record.billingMeta) : {}
      const freeze = record.freezeId ? freezeMap.get(record.freezeId) : null
      const freezeMeta = freeze?.metadata ? JSON.parse(freeze.metadata) : {}

      // credit_deduct 类型从 freeze 中获取详细信息，amount 用 chargedCredits
      // consume 类型用 Math.abs(record.amount.toNumber())，但需要处理 Decimal 精度
      const isCreditType = record.type === 'credit_deduct'
      let cost = 0

      if (isCreditType) {
        cost = billingMeta.chargedCredits || billingMeta.credits || freezeMeta.chargedCredits || 0
      } else {
        // 防止 Decimal 精度问题导致超大数字（如 7938000 实际上是 7.938）
        const rawAmount = Math.abs(record.amount.toNumber())
        // 如果数值超过 100000，可能是精度问题，除以 1000000
        cost = rawAmount > 100000 ? Math.round(rawAmount / 1000000) : rawAmount
      }

      // 从 freeze 元数据或 billingMeta 获取详情
      const detailMeta = { ...freezeMeta, ...billingMeta }

      return {
        id: record.id,
        projectId: record.projectId,
        projectName: record.projectId,
        apiType: detailMeta.apiType || detailMeta.source || 'unknown',
        model: detailMeta.model || 'unknown',
        action: record.taskType || detailMeta.action || record.type || record.description,
        quantity: detailMeta.quantity || 1,
        unit: detailMeta.unit || (isCreditType ? 'credit' : 'call'),
        cost: Math.round(cost), // 确保是整数
        isCredit: isCreditType,
        metadata: detailMeta,
        createdAt: record.createdAt.toISOString(),
      }
    })

    // 计算周期内总使用量
    const periodUsage = allTransactions.reduce((sum, record) => {
      if (record.type === 'credit_deduct') {
        const billingMeta = record.billingMeta ? JSON.parse(record.billingMeta) : {}
        return sum + (billingMeta.chargedCredits || billingMeta.credits || 0)
      }
      // 防止 Decimal 精度问题导致超大数字
      const rawAmount = Math.abs(record.amount.toNumber())
      const cost = rawAmount > 100000 ? Math.round(rawAmount / 1000000) : rawAmount
      return sum + Math.round(cost)
    }, 0)

    // 4. 构造返回结果
    const overview = {
      totalCredits: (userBalance?.subscriptionCredits || 0) + (userBalance?.permanentCredits || 0),
      availableCredits: (userBalance?.subscriptionCredits || 0) + (userBalance?.permanentCredits || 0) - (userBalance?.frozenCredits || 0),
      frozenCredits: userBalance?.frozenCredits || 0,
      totalSpent: userBalance?.totalSpent?.toNumber() || 0,
      periodUsage,
      periodTaskCount: allTransactions.length,
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
