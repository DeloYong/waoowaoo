/**
 * Observability 事件类型定义
 * 统一管理所有业务事件的名称和字段结构
 */

// ============================================================
// 事件分类
// ============================================================

export type EventDomain =
  | 'user'
  | 'project'
  | 'billing'
  | 'task'
  | 'subscription'
  | 'error'
  | 'system'

// ============================================================
// 用户事件
// ============================================================

export type UserEvent =
  | { event: 'user.register'; userId: string; name: string; inviteCode?: string; success: boolean; error?: string }
  | { event: 'user.login'; userId?: string; username: string; success: boolean; error?: string }
  | { event: 'user.logout'; userId: string }

// ============================================================
// 项目事件
// ============================================================

export type ProjectEvent =
  | { event: 'project.create'; userId: string; projectId: string; projectName: string }
  | { event: 'project.update'; userId: string; projectId: string; projectName: string; changes: Record<string, unknown> }
  | { event: 'project.delete'; userId: string; projectId: string; projectName: string; cosFilesDeleted: number; cosFilesFailed: number }

// ============================================================
// 计费/积分事件
// ============================================================

export type BillingEvent =
  | {
      event: 'billing.quote'
      mediaType: string
      model: string
      tier: string
      quantity: number
      unitPrice: number
      totalCredits: number
      userId?: string
      taskId?: string
    }
  | {
      event: 'billing.freeze'
      userId: string
      credits: number
      subscriptionToFreeze: number
      permanentToFreeze: number
      balanceBefore: { subscription: number; permanent: number; frozen: number; available: number }
      balanceAfter: { subscription: number; permanent: number; frozen: number; available: number }
      freezeId: string
      taskId?: string
    }
  | {
      event: 'billing.confirm'
      userId: string
      freezeId: string
      frozenCredits: number
      chargedCredits: number
      refundCredits: number
      subscriptionRefund: number
      permanentRefund: number
      taskId?: string
    }
  | {
      event: 'billing.unfreeze'
      userId: string
      freezeId: string
      credits: number
      subscriptionRefund: number
      permanentRefund: number
      reason?: string
      taskId?: string
    }
  | {
      event: 'billing.prepare'
      taskId: string
      userId: string
      mode: string
      apiType: string
      model: string
      quantity: number
      quotedCost: number
      freezeId?: string
      skipReason?: string
    }
  | {
      event: 'billing.settle'
      taskId: string
      userId: string
      mode: string
      chargedCredits: number
      freezeId?: string
      skipReason?: string
    }
  | {
      event: 'billing.grant'
      userId: string
      credits: number
      source: string
      isPermanent: boolean
      reason?: string
    }

// ============================================================
// 生成任务事件
// ============================================================

export type TaskEvent =
  | {
      event: 'task.submit'
      taskId: string
      userId: string
      projectId: string
      taskType: string
      targetType: string
      targetId: string
      billingCredits?: number
      deduped: boolean
    }
  | {
      event: 'task.start'
      taskId: string
      userId: string
      projectId: string
      taskType: string
      queue: string
    }
  | {
      event: 'task.complete'
      taskId: string
      userId: string
      projectId: string
      taskType: string
      durationMs: number
      chargedCredits?: number
    }
  | {
      event: 'task.fail'
      taskId: string
      userId: string
      projectId: string
      taskType: string
      errorCode: string
      retryable: boolean
      provider?: string
      durationMs: number
      failedAttempt?: number
      maxAttempts?: number
    }
  | {
      event: 'task.cancel'
      taskId: string
      userId: string
      taskType: string
      billingRolledBack: boolean
    }
  | {
      event: 'task.enqueue_failed'
      taskId: string
      userId: string
      taskType: string
      errorCode: string
      compensationFailed: boolean
    }

// ============================================================
// 订阅事件
// ============================================================

export type SubscriptionEvent =
  | {
      event: 'subscription.assign'
      userId: string
      planId: string
      billingCycle: string
      operatorId?: string
      monthlyCredits: number
    }
  | {
      event: 'subscription.expired'
      userId: string
      planId: string
      subscriptionCreditsCleared: number
    }

// ============================================================
// 错误事件
// ============================================================

export type ErrorEvent = {
  event: 'api.error'
  method: string
  path: string
  errorCode: string
  status: number
  retryable: boolean
  category: string
  durationMs: number
  requestId?: string
  userId?: string
  projectId?: string
}

// ============================================================
// 联合类型
// ============================================================

export type ObservabilityEvent =
  | UserEvent
  | ProjectEvent
  | BillingEvent
  | TaskEvent
  | SubscriptionEvent
  | ErrorEvent

export function getEventDomain(event: ObservabilityEvent): EventDomain {
  const name = event.event
  if (name.startsWith('user.')) return 'user'
  if (name.startsWith('project.')) return 'project'
  if (name.startsWith('billing.')) return 'billing'
  if (name.startsWith('task.')) return 'task'
  if (name.startsWith('subscription.')) return 'subscription'
  if (name.startsWith('api.')) return 'error'
  return 'system'
}
