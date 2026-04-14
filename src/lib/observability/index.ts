/**
 * Observability 模块入口
 * 
 * 使用方式：
 *   import { trackEvent } from '@/lib/observability'
 *   trackEvent({ event: 'user.login', userId: 'xxx', username: 'test', success: true })
 */

export { trackEvent, shutdown } from './axiom'
export type {
  ObservabilityEvent,
  UserEvent,
  ProjectEvent,
  BillingEvent,
  TaskEvent,
  SubscriptionEvent,
  ErrorEvent,
  EventDomain,
} from './types'
