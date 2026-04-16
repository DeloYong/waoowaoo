'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { subDays, startOfDay, endOfDay, format } from 'date-fns'

interface ReportData {
  userStats: {
    totalUsers: number
    newUsers: number
    activeUsers: number
    retentionRate: number
    trend: { date: string; value: number }[]
    table: { date: string; newUsers: number; activeUsers: number; retentionRate: number }[]
  }
  taskStats: {
    totalTasks: number
    completedTasks: number
    failedTasks: number
    avgDuration: number
    trend: { date: string; value: number }[]
    table: { date: string; totalTasks: number; completedTasks: number; failedTasks: number; successRate: number }[]
  }
  financeStats: {
    totalRevenue: number
    creditConsumed: number
    avgOrderValue: number
    refundAmount: number
    trend: { date: string; value: number }[]
    table: { date: string; revenue: number; creditConsumed: number; orderCount: number; refundAmount: number }[]
  }
  subscriptionStats: {
    totalSubscriptions: number
    newSubscriptions: number
    churnRate: number
    mrr: number
    trend: { date: string; value: number }[]
    table: { date: string; newSubscriptions: number; churned: number; mrr: number; churnRate: number }[]
  }
}

// 后端返回数据类型
interface UserTrendItem {
  date: string
  newUsers: number
  activeUsers: number
}

interface TaskTrendItem {
  date: string
  totalTasks: number
  successfulTasks: number
  successRate: number
}

interface ConsumptionTrendItem {
  date: string
  creditsConsumed: number
  rechargeRevenue?: number
}

interface SubscriptionTrendItem {
  date: string
  revenue: number
}

type TimeRange = 'day' | 'week' | 'month' | 'custom'

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'users' | 'tasks' | 'finance' | 'subscription'>('users')
  const [timeRange, setTimeRange] = useState<TimeRange>('day')
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [reportData, setReportData] = useState<ReportData | null>(null)

  useEffect(() => {
    fetchReportData()
  }, [timeRange, startDate, endDate])

  const fetchReportData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        timeRange,
        startDate,
        endDate,
      })

      const res = await fetch(`/api/admin/reports?days=${timeRange === 'day' ? 7 : timeRange === 'week' ? 30 : 90}&startDate=${startDate}&endDate=${endDate}`)
      if (!res.ok) throw new Error('获取报表数据失败')
      const result = await res.json()
      const data = result.data

      // 适配后端返回结构
      setReportData({
        userStats: {
          totalUsers: data.users.totalUsers,
          newUsers: data.users.newUsers,
          activeUsers: data.users.activeUsers,
          retentionRate: 0, // 暂未实现
          trend: data.users.trend.map((item: UserTrendItem) => ({ date: item.date, value: item.newUsers })),
          table: data.users.trend.map((item: UserTrendItem) => ({
            date: item.date,
            newUsers: item.newUsers,
            activeUsers: item.activeUsers,
            retentionRate: 0
          }))
        },
        taskStats: {
          totalTasks: data.tasks.totalTasks,
          completedTasks: data.tasks.successfulTasks,
          failedTasks: data.tasks.totalTasks - data.tasks.successfulTasks,
          avgDuration: 0, // 暂未实现
          trend: data.tasks.trend.map((item: TaskTrendItem) => ({ date: item.date, value: item.totalTasks })),
          table: data.tasks.trend.map((item: TaskTrendItem) => ({
            date: item.date,
            totalTasks: item.totalTasks,
            completedTasks: item.successfulTasks,
            failedTasks: item.totalTasks - item.successfulTasks,
            successRate: item.successRate
          }))
        },
        financeStats: {
          totalRevenue: (data.consumption.totalRechargeRevenue || 0) + (data.subscriptions.totalRevenue || 0),
          creditConsumed: data.consumption.totalCreditsConsumed,
          avgOrderValue: 0, // 暂未实现
          refundAmount: 0, // 暂未实现
          trend: data.consumption.trend.map((item: ConsumptionTrendItem) => ({ date: item.date, value: item.creditsConsumed })),
          table: data.consumption.trend.map((item: ConsumptionTrendItem) => ({
            date: item.date,
            revenue: item.rechargeRevenue || 0,
            creditConsumed: item.creditsConsumed,
            orderCount: 0, // 暂未实现
            refundAmount: 0 // 暂未实现
          }))
        },
        subscriptionStats: {
          totalSubscriptions: data.subscriptions.currentSubscriptions.reduce((sum: number, item: { count: number }) => sum + item.count, 0),
          newSubscriptions: data.subscriptions.newSubscriptions || 0,
          churnRate: 0, // 暂未实现
          mrr: data.subscriptions.totalRevenue,
          trend: data.subscriptions.trend.map((item: SubscriptionTrendItem) => ({ date: item.date, value: item.revenue })),
          table: data.subscriptions.trend.map((item: SubscriptionTrendItem) => ({
            date: item.date,
            newSubscriptions: 0, // 暂未实现按日统计
            churned: 0, // 暂未实现
            mrr: item.revenue,
            churnRate: 0 // 暂未实现
          }))
        }
      })
    } catch (error) {
      toast.error('获取报表数据失败')
    } finally {
      setLoading(false)
    }
  }

  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range)
    const now = new Date()
    if (range === 'day') {
      setStartDate(format(subDays(now, 7), 'yyyy-MM-dd'))
      setEndDate(format(now, 'yyyy-MM-dd'))
    } else if (range === 'week') {
      setStartDate(format(subDays(now, 30), 'yyyy-MM-dd'))
      setEndDate(format(now, 'yyyy-MM-dd'))
    } else if (range === 'month') {
      setStartDate(format(subDays(now, 90), 'yyyy-MM-dd'))
      setEndDate(format(now, 'yyyy-MM-dd'))
    }
  }

  const exportCSV = (type: 'users' | 'tasks' | 'finance' | 'subscription') => {
    if (!reportData) return

    let csvContent = ''
    let data: (string | number)[][] = []
    let headers: string[] = []

    switch (type) {
      case 'users':
        headers = ['日期', '新增用户', '活跃用户', '留存率']
        data = reportData.userStats.table.map(item => [
          item.date,
          item.newUsers,
          item.activeUsers,
          `${item.retentionRate}%`
        ])
        break
      case 'tasks':
        headers = ['日期', '总任务数', '完成任务', '失败任务', '成功率']
        data = reportData.taskStats.table.map(item => [
          item.date,
          item.totalTasks,
          item.completedTasks,
          item.failedTasks,
          `${item.successRate}%`
        ])
        break
      case 'finance':
        headers = ['日期', '收入', '积分消耗', '订单数', '退款金额']
        data = reportData.financeStats.table.map(item => [
          item.date,
          `¥${item.revenue}`,
          item.creditConsumed,
          item.orderCount,
          `¥${item.refundAmount}`
        ])
        break
      case 'subscription':
        headers = ['日期', '新增订阅', '流失订阅', '月收入', '流失率']
        data = reportData.subscriptionStats.table.map(item => [
          item.date,
          item.newSubscriptions,
          item.churned,
          `¥${item.mrr}`,
          `${item.churnRate}%`
        ])
        break
    }

    csvContent = headers.join(',') + '\n'
    data.forEach(row => {
      csvContent += row.join(',') + '\n'
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${type}-report-${format(new Date(), 'yyyy-MM-dd')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // 简单的柱状图渲染函数
  const renderBarChart = (data: { date: string; value: number }[]) => {
    if (!data || data.length === 0) return null

    const maxValue = Math.max(...data.map(d => d.value), 1)
    const height = 200

    return (
      <div className="h-[200px] flex items-end justify-between gap-2 mt-4">
        {data.map((item, index) => (
          <div key={index} className="flex flex-col items-center flex-1">
            <div
              className="w-full bg-blue-500 rounded-t-md transition-all duration-300 hover:bg-blue-600"
              style={{ height: `${(item.value / maxValue) * height}px` }}
            />
            <div className="text-xs text-[var(--glass-text-tertiary)] mt-2 transform -rotate-45 origin-top-left">
              {item.date}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (loading) {
    return <div className="text-[var(--glass-text-secondary)]">加载中...</div>
  }

  if (!reportData) {
    return <div className="text-[var(--glass-text-secondary)]">暂无数据</div>
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-[var(--glass-text-primary)] mb-6">
        数据报表
      </h2>

      {/* 筛选条件 */}
      <div className="bg-[var(--glass-bg-surface)] rounded-lg border border-[var(--glass-stroke-soft)] p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex gap-2">
            <button
              onClick={() => handleTimeRangeChange('day')}
              className={`px-4 py-2 rounded ${timeRange === 'day' ? 'bg-blue-500 text-white' : 'bg-[var(--glass-bg-canvas)] text-[var(--glass-text-secondary)]'}`}
            >
              按日
            </button>
            <button
              onClick={() => handleTimeRangeChange('week')}
              className={`px-4 py-2 rounded ${timeRange === 'week' ? 'bg-blue-500 text-white' : 'bg-[var(--glass-bg-canvas)] text-[var(--glass-text-secondary)]'}`}
            >
              按周
            </button>
            <button
              onClick={() => handleTimeRangeChange('month')}
              className={`px-4 py-2 rounded ${timeRange === 'month' ? 'bg-blue-500 text-white' : 'bg-[var(--glass-bg-canvas)] text-[var(--glass-text-secondary)]'}`}
            >
              按月
            </button>
            <button
              onClick={() => handleTimeRangeChange('custom')}
              className={`px-4 py-2 rounded ${timeRange === 'custom' ? 'bg-blue-500 text-white' : 'bg-[var(--glass-bg-canvas)] text-[var(--glass-text-secondary)]'}`}
            >
              自定义
            </button>
          </div>

          {timeRange === 'custom' && (
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-[var(--glass-stroke-base)] rounded bg-[var(--glass-bg-canvas)]"
              />
              <span className="text-[var(--glass-text-secondary)]">至</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-[var(--glass-stroke-base)] rounded bg-[var(--glass-bg-canvas)]"
              />
              <button
                onClick={fetchReportData}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                查询
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-2 mb-6 border-b border-[var(--glass-stroke-soft)]">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-3 font-medium border-b-2 transition-colors ${activeTab === 'users' ? 'border-blue-500 text-blue-500' : 'border-transparent text-[var(--glass-text-secondary)] hover:text-[var(--glass-text-primary)]'}`}
        >
          用户统计
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-6 py-3 font-medium border-b-2 transition-colors ${activeTab === 'tasks' ? 'border-blue-500 text-blue-500' : 'border-transparent text-[var(--glass-text-secondary)] hover:text-[var(--glass-text-primary)]'}`}
        >
          任务统计
        </button>
        <button
          onClick={() => setActiveTab('finance')}
          className={`px-6 py-3 font-medium border-b-2 transition-colors ${activeTab === 'finance' ? 'border-blue-500 text-blue-500' : 'border-transparent text-[var(--glass-text-secondary)] hover:text-[var(--glass-text-primary)]'}`}
        >
          财务统计
        </button>
        <button
          onClick={() => setActiveTab('subscription')}
          className={`px-6 py-3 font-medium border-b-2 transition-colors ${activeTab === 'subscription' ? 'border-blue-500 text-blue-500' : 'border-transparent text-[var(--glass-text-secondary)] hover:text-[var(--glass-text-primary)]'}`}
        >
          订阅统计
        </button>
      </div>

      {/* 用户统计 */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* 数据卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[var(--glass-bg-surface)] rounded-lg border border-[var(--glass-stroke-soft)] p-6">
              <div className="text-sm text-[var(--glass-text-secondary)] mb-2">总用户数</div>
              <div className="text-3xl font-bold text-[var(--glass-text-primary)]">
                {reportData.userStats.totalUsers.toLocaleString()}
              </div>
            </div>
            <div className="bg-[var(--glass-bg-surface)] rounded-lg border border-[var(--glass-stroke-soft)] p-6">
              <div className="text-sm text-[var(--glass-text-secondary)] mb-2">新增用户</div>
              <div className="text-3xl font-bold text-green-600">
                {reportData.userStats.newUsers.toLocaleString()}
              </div>
            </div>
            <div className="bg-[var(--glass-bg-surface)] rounded-lg border border-[var(--glass-stroke-soft)] p-6">
              <div className="text-sm text-[var(--glass-text-secondary)] mb-2">活跃用户</div>
              <div className="text-3xl font-bold text-blue-600">
                {reportData.userStats.activeUsers.toLocaleString()}
              </div>
            </div>
            <div className="bg-[var(--glass-bg-surface)] rounded-lg border border-[var(--glass-stroke-soft)] p-6">
              <div className="text-sm text-[var(--glass-text-secondary)] mb-2">7日留存率</div>
              <div className="text-3xl font-bold text-purple-600">
                {reportData.userStats.retentionRate}%
              </div>
            </div>
          </div>

          {/* 图表 */}
          <div className="bg-[var(--glass-bg-surface)] rounded-lg border border-[var(--glass-stroke-soft)] p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-[var(--glass-text-primary)]">用户增长趋势</h3>
              <button
                onClick={() => exportCSV('users')}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
              >
                导出CSV
              </button>
            </div>
            {renderBarChart(reportData.userStats.trend)}
          </div>

          {/* 数据表格 */}
          <div className="bg-[var(--glass-bg-surface)] rounded-lg border border-[var(--glass-stroke-soft)] overflow-hidden">
            <table className="w-full">
              <thead className="bg-[var(--glass-bg-canvas)]">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--glass-text-secondary)]">
                    日期
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--glass-text-secondary)]">
                    新增用户
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--glass-text-secondary)]">
                    活跃用户
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--glass-text-secondary)]">
                    留存率
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--glass-stroke-soft)]">
                {reportData.userStats.table.map((item, index) => (
                  <tr key={index} className="hover:bg-[var(--glass-bg-canvas)]">
                    <td className="px-4 py-3 text-[var(--glass-text-primary)]">
                      {item.date}
                    </td>
                    <td className="px-4 py-3 text-green-600">
                      {item.newUsers}
                    </td>
                    <td className="px-4 py-3 text-blue-600">
                      {item.activeUsers}
                    </td>
                    <td className="px-4 py-3 text-purple-600">
                      {item.retentionRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 任务统计 */}
      {activeTab === 'tasks' && (
        <div className="space-y-6">
          {/* 数据卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[var(--glass-bg-surface)] rounded-lg border border-[var(--glass-stroke-soft)] p-6">
              <div className="text-sm text-[var(--glass-text-secondary)] mb-2">总任务数</div>
              <div className="text-3xl font-bold text-[var(--glass-text-primary)]">
                {reportData.taskStats.totalTasks.toLocaleString()}
              </div>
            </div>
            <div className="bg-[var(--glass-bg-surface)] rounded-lg border border-[var(--glass-stroke-soft)] p-6">
              <div className="text-sm text-[var(--glass-text-secondary)] mb-2">完成任务</div>
              <div className="text-3xl font-bold text-green-600">
                {reportData.taskStats.completedTasks.toLocaleString()}
              </div>
            </div>
            <div className="bg-[var(--glass-bg-surface)] rounded-lg border border-[var(--glass-stroke-soft)] p-6">
              <div className="text-sm text-[var(--glass-text-secondary)] mb-2">失败任务</div>
              <div className="text-3xl font-bold text-red-600">
                {reportData.taskStats.failedTasks.toLocaleString()}
              </div>
            </div>
            <div className="bg-[var(--glass-bg-surface)] rounded-lg border border-[var(--glass-stroke-soft)] p-6">
              <div className="text-sm text-[var(--glass-text-secondary)] mb-2">平均耗时</div>
              <div className="text-3xl font-bold text-orange-600">
                {reportData.taskStats.avgDuration}s
              </div>
            </div>
          </div>

          {/* 图表 */}
          <div className="bg-[var(--glass-bg-surface)] rounded-lg border border-[var(--glass-stroke-soft)] p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-[var(--glass-text-primary)]">任务量趋势</h3>
              <button
                onClick={() => exportCSV('tasks')}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
              >
                导出CSV
              </button>
            </div>
            {renderBarChart(reportData.taskStats.trend)}
          </div>

          {/* 数据表格 */}
          <div className="bg-[var(--glass-bg-surface)] rounded-lg border border-[var(--glass-stroke-soft)] overflow-hidden">
            <table className="w-full">
              <thead className="bg-[var(--glass-bg-canvas)]">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--glass-text-secondary)]">
                    日期
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--glass-text-secondary)]">
                    总任务数
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--glass-text-secondary)]">
                    完成任务
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--glass-text-secondary)]">
                    失败任务
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--glass-text-secondary)]">
                    成功率
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--glass-stroke-soft)]">
                {reportData.taskStats.table.map((item, index) => (
                  <tr key={index} className="hover:bg-[var(--glass-bg-canvas)]">
                    <td className="px-4 py-3 text-[var(--glass-text-primary)]">
                      {item.date}
                    </td>
                    <td className="px-4 py-3 text-[var(--glass-text-primary)]">
                      {item.totalTasks}
                    </td>
                    <td className="px-4 py-3 text-green-600">
                      {item.completedTasks}
                    </td>
                    <td className="px-4 py-3 text-red-600">
                      {item.failedTasks}
                    </td>
                    <td className="px-4 py-3 text-blue-600">
                      {item.successRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 财务统计 */}
      {activeTab === 'finance' && (
        <div className="space-y-6">
          {/* 数据卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[var(--glass-bg-surface)] rounded-lg border border-[var(--glass-stroke-soft)] p-6">
              <div className="text-sm text-[var(--glass-text-secondary)] mb-2">总收入</div>
              <div className="text-3xl font-bold text-green-600">
                ¥{reportData.financeStats.totalRevenue.toLocaleString()}
              </div>
            </div>
            <div className="bg-[var(--glass-bg-surface)] rounded-lg border border-[var(--glass-stroke-soft)] p-6">
              <div className="text-sm text-[var(--glass-text-secondary)] mb-2">积分消耗</div>
              <div className="text-3xl font-bold text-blue-600">
                {reportData.financeStats.creditConsumed.toLocaleString()}
              </div>
            </div>
            <div className="bg-[var(--glass-bg-surface)] rounded-lg border border-[var(--glass-stroke-soft)] p-6">
              <div className="text-sm text-[var(--glass-text-secondary)] mb-2">平均客单价</div>
              <div className="text-3xl font-bold text-purple-600">
                ¥{reportData.financeStats.avgOrderValue.toLocaleString()}
              </div>
            </div>
            <div className="bg-[var(--glass-bg-surface)] rounded-lg border border-[var(--glass-stroke-soft)] p-6">
              <div className="text-sm text-[var(--glass-text-secondary)] mb-2">退款金额</div>
              <div className="text-3xl font-bold text-red-600">
                ¥{reportData.financeStats.refundAmount.toLocaleString()}
              </div>
            </div>
          </div>

          {/* 图表 */}
          <div className="bg-[var(--glass-bg-surface)] rounded-lg border border-[var(--glass-stroke-soft)] p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-[var(--glass-text-primary)]">收入趋势</h3>
              <button
                onClick={() => exportCSV('finance')}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
              >
                导出CSV
              </button>
            </div>
            {renderBarChart(reportData.financeStats.trend)}
          </div>

          {/* 数据表格 */}
          <div className="bg-[var(--glass-bg-surface)] rounded-lg border border-[var(--glass-stroke-soft)] overflow-hidden">
            <table className="w-full">
              <thead className="bg-[var(--glass-bg-canvas)]">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--glass-text-secondary)]">
                    日期
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--glass-text-secondary)]">
                    收入
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--glass-text-secondary)]">
                    积分消耗
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--glass-text-secondary)]">
                    订单数
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--glass-text-secondary)]">
                    退款金额
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--glass-stroke-soft)]">
                {reportData.financeStats.table.map((item, index) => (
                  <tr key={index} className="hover:bg-[var(--glass-bg-canvas)]">
                    <td className="px-4 py-3 text-[var(--glass-text-primary)]">
                      {item.date}
                    </td>
                    <td className="px-4 py-3 text-green-600">
                      ¥{item.revenue}
                    </td>
                    <td className="px-4 py-3 text-blue-600">
                      {item.creditConsumed}
                    </td>
                    <td className="px-4 py-3 text-[var(--glass-text-primary)]">
                      {item.orderCount}
                    </td>
                    <td className="px-4 py-3 text-red-600">
                      ¥{item.refundAmount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 订阅统计 */}
      {activeTab === 'subscription' && (
        <div className="space-y-6">
          {/* 数据卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[var(--glass-bg-surface)] rounded-lg border border-[var(--glass-stroke-soft)] p-6">
              <div className="text-sm text-[var(--glass-text-secondary)] mb-2">总订阅数</div>
              <div className="text-3xl font-bold text-[var(--glass-text-primary)]">
                {reportData.subscriptionStats.totalSubscriptions.toLocaleString()}
              </div>
            </div>
            <div className="bg-[var(--glass-bg-surface)] rounded-lg border border-[var(--glass-stroke-soft)] p-6">
              <div className="text-sm text-[var(--glass-text-secondary)] mb-2">新增订阅</div>
              <div className="text-3xl font-bold text-green-600">
                {reportData.subscriptionStats.newSubscriptions.toLocaleString()}
              </div>
            </div>
            <div className="bg-[var(--glass-bg-surface)] rounded-lg border border-[var(--glass-stroke-soft)] p-6">
              <div className="text-sm text-[var(--glass-text-secondary)] mb-2">月收入 (MRR)</div>
              <div className="text-3xl font-bold text-blue-600">
                ¥{reportData.subscriptionStats.mrr.toLocaleString()}
              </div>
            </div>
            <div className="bg-[var(--glass-bg-surface)] rounded-lg border border-[var(--glass-stroke-soft)] p-6">
              <div className="text-sm text-[var(--glass-text-secondary)] mb-2">流失率</div>
              <div className="text-3xl font-bold text-red-600">
                {reportData.subscriptionStats.churnRate}%
              </div>
            </div>
          </div>

          {/* 图表 */}
          <div className="bg-[var(--glass-bg-surface)] rounded-lg border border-[var(--glass-stroke-soft)] p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-[var(--glass-text-primary)]">订阅增长趋势</h3>
              <button
                onClick={() => exportCSV('subscription')}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
              >
                导出CSV
              </button>
            </div>
            {renderBarChart(reportData.subscriptionStats.trend)}
          </div>

          {/* 数据表格 */}
          <div className="bg-[var(--glass-bg-surface)] rounded-lg border border-[var(--glass-stroke-soft)] overflow-hidden">
            <table className="w-full">
              <thead className="bg-[var(--glass-bg-canvas)]">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--glass-text-secondary)]">
                    日期
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--glass-text-secondary)]">
                    新增订阅
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--glass-text-secondary)]">
                    流失订阅
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--glass-text-secondary)]">
                    月收入
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--glass-text-secondary)]">
                    流失率
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--glass-stroke-soft)]">
                {reportData.subscriptionStats.table.map((item, index) => (
                  <tr key={index} className="hover:bg-[var(--glass-bg-canvas)]">
                    <td className="px-4 py-3 text-[var(--glass-text-primary)]">
                      {item.date}
                    </td>
                    <td className="px-4 py-3 text-green-600">
                      {item.newSubscriptions}
                    </td>
                    <td className="px-4 py-3 text-red-600">
                      {item.churned}
                    </td>
                    <td className="px-4 py-3 text-blue-600">
                      ¥{item.mrr}
                    </td>
                    <td className="px-4 py-3 text-red-600">
                      {item.churnRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
