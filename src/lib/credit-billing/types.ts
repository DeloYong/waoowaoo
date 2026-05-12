/**
 * 积分计费类型定义
 */
import type { CreditPricing, ModelTierMap } from '@/lib/platform-config'

export type MediaType = 'image' | 'video' | 'text' | 'audio' | 'voiceDesign' | 'lipSync'
export type ModelTier = 'basic' | 'advanced'

export interface CreditQuote {
  totalCredits: number
  breakdown: {
    tier: ModelTier
    quantity: number
    unitPrice: number
  }
  mediaType: MediaType
  modelKey: string
}

export interface CreditBalance {
  subscriptionCredits: number
  permanentCredits: number
  frozenCredits: number
  availableCredits: number
}

export interface CreditFreeze {
  id: string
  userId: string
  credits: number
  status: 'pending' | 'confirmed' | 'rolled_back'
  taskId?: string
  requestId?: string
  idempotencyKey?: string
}

export type CreditTransactionType =
  | 'subscription_grant'
  | 'subscription_expired_clear'
  | 'admin_grant'
  | 'package_purchase'
  | 'invite_welcome_gift'
  | 'invite_referral_reward'
  | 'invite_rebate'
  | 'credit_freeze'
  | 'credit_deduct'
  | 'credit_unfreeze'
  | 'recharge'

export type GuardCheckResult =
  | {
      passed: true
    }
  | {
      passed: false
      httpStatus: 402 | 403 | 429
      errorCode:
        | 'NO_SUBSCRIPTION'
        | 'INSUFFICIENT_CREDITS'
        | 'CONCURRENCY_LIMIT'
        | 'PLAN_UPGRADE_REQUIRED'
        | 'VIDEO_QUOTA_EXCEEDED'
      message: string
    }

export interface UserSubscriptionState {
  userId: string
  planId: string
  status: 'active' | 'expired' | 'cancelled'
  maxConcurrency: number
  monthlyCredits: number
  maxVideoSeconds: number
  videoSecondsUsed: number
  currentPeriodEnd: Date
}
