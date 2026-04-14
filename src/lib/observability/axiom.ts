/**
 * Axiom 客户端 - 日志和事件发送到 Axiom
 * 
 * 设计原则：
 * 1. 非阻塞 - 所有发送操作都是异步的，不会阻塞主流程
 * 2. 容错 - 发送失败不影响业务逻辑
 * 3. 缓冲 - 高频事件批量发送，减少 API 调用
 * 4. 双写 - 同时写入 Axiom 和本地结构化日志
 */

import { createScopedLogger } from '@/lib/logging/core'
import type { ObservabilityEvent } from './types'

// ============================================================
// 配置
// ============================================================

const AXIOM_API_TOKEN = process.env.AXIOM_API_TOKEN || ''
const AXIOM_DATASET = process.env.AXIOM_DATASET || 'waoowaoo-events'
const AXIOM_API_URL = process.env.AXIOM_API_URL || 'https://api.axiom.co/v1/datasets'
const FLUSH_INTERVAL_MS = 5000  // 5 秒批量发送一次
const MAX_BUFFER_SIZE = 100     // 缓冲区最大事件数

// ============================================================
// 缓冲区
// ============================================================

const buffer: Array<Record<string, unknown>> = []
let flushTimer: ReturnType<typeof setInterval> | null = null
let isInitialized = false

// ============================================================
// 本地日志
// ============================================================

const logger = createScopedLogger({ module: 'observability' })

// ============================================================
// 初始化
// ============================================================

function ensureInitialized(): void {
  if (isInitialized) return
  isInitialized = true

  if (!AXIOM_API_TOKEN) {
    logger.info({
      action: 'observability.init',
      message: 'AXIOM_API_TOKEN not set, events will be logged locally only',
    })
    return
  }

  logger.info({
    action: 'observability.init',
    message: 'Axiom client initialized',
    details: { dataset: AXIOM_DATASET },
  })

  // 启动定时刷新
  flushTimer = setInterval(() => {
    void flush().catch(() => undefined)
  }, FLUSH_INTERVAL_MS)

  // 防止定时器阻止进程退出
  if (flushTimer && typeof flushTimer === 'object' && 'unref' in flushTimer) {
    flushTimer.unref()
  }
}

// ============================================================
// 发送到 Axiom
// ============================================================

async function sendToAxiom(events: Array<Record<string, unknown>>): Promise<void> {
  if (!AXIOM_API_TOKEN || events.length === 0) return

  try {
    const url = `${AXIOM_API_URL}/${AXIOM_DATASET}/ingest`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AXIOM_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(events),
      signal: AbortSignal.timeout(5000), // 5 秒超时
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      logger.warn({
        action: 'observability.axiom.error',
        message: `Axiom ingest failed: ${response.status}`,
        details: { status: response.status, body: text.slice(0, 200) },
      })
    }
  } catch (error) {
    // 网络错误、超时等 - 不影响业务
    logger.debug({
      action: 'observability.axiom.network_error',
      message: error instanceof Error ? error.message : String(error),
    })
  }
}

// ============================================================
// 刷新缓冲区
// ============================================================

async function flush(): Promise<void> {
  if (buffer.length === 0) return

  const events = buffer.splice(0, buffer.length)
  await sendToAxiom(events)
}

// ============================================================
// 公共 API
// ============================================================

/**
 * 追踪业务事件
 * - 写入 Axiom（如果配置了 token）
 * - 同时写入本地结构化日志
 */
export function trackEvent(event: ObservabilityEvent, extra?: Record<string, unknown>): void {
  ensureInitialized()

  const timestamp = new Date().toISOString()
  const eventRecord: Record<string, unknown> = {
    _time: timestamp,
    ...event,
    ...extra,
  }

  // 写入缓冲区（Axiom）
  buffer.push(eventRecord)

  // 缓冲区满时立即刷新
  if (buffer.length >= MAX_BUFFER_SIZE) {
    void flush().catch(() => undefined)
  }

  // 同时写入本地结构化日志（确保日志文件中也有记录）
  logger.info({
    action: `track.${event.event}`,
    message: event.event,
    userId: 'userId' in event ? event.userId : undefined,
    taskId: 'taskId' in event ? event.taskId : undefined,
    projectId: 'projectId' in event ? event.projectId : undefined,
    details: eventRecord,
  })
}

/**
 * 优雅关闭 - 刷新剩余事件
 */
export async function shutdown(): Promise<void> {
  if (flushTimer) {
    clearInterval(flushTimer)
    flushTimer = null
  }
  await flush()
}

// ============================================================
// 进程退出时刷新
// ============================================================

if (typeof process !== 'undefined' && typeof process.on === 'function') {
  const handleExit = () => {
    void flush().catch(() => undefined)
  }
  process.on('beforeExit', handleExit)
  process.on('SIGINT', handleExit)
  process.on('SIGTERM', handleExit)
}
