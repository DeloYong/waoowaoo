import { createContext, useContext, useState, ReactNode } from 'react'

interface InsufficientCreditsContextType {
  isOpen: boolean
  estimatedCost?: number
  currentBalance?: number
  open: (options?: { estimatedCost?: number; currentBalance?: number }) => void
  close: () => void
}

const InsufficientCreditsContext = createContext<InsufficientCreditsContextType | null>(null)

let globalOpen: ((options?: { estimatedCost?: number; currentBalance?: number }) => void) | null = null

export function InsufficientCreditsProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [estimatedCost, setEstimatedCost] = useState<number | undefined>()
  const [currentBalance, setCurrentBalance] = useState<number | undefined>()

  const open = (options?: { estimatedCost?: number; currentBalance?: number }) => {
    setEstimatedCost(options?.estimatedCost)
    setCurrentBalance(options?.currentBalance)
    setIsOpen(true)
  }

  const close = () => {
    setIsOpen(false)
    setEstimatedCost(undefined)
    setCurrentBalance(undefined)
  }

  // 暴露全局 open 函数
  if (!globalOpen) {
    globalOpen = open
  }

  return (
    <InsufficientCreditsContext.Provider value={{ isOpen, estimatedCost, currentBalance, open, close }}>
      {children}
    </InsufficientCreditsContext.Provider>
  )
}

export function useInsufficientCreditsModal() {
  const context = useContext(InsufficientCreditsContext)
  if (!context) {
    throw new Error('useInsufficientCreditsModal must be used within InsufficientCreditsProvider')
  }
  return context
}

/**
 * 检查响应错误，如果是 402 积分不足，则打开弹窗
 */
export function handleInsufficientCredits(error: unknown) {
  if (!globalOpen) return false

  let required: number | undefined
  let available: number | undefined

  // 情况1: HTTP 错误对象带有 status: 402
  if (error && typeof error === 'object') {
    if ('status' in error && error.status === 402) {
      // 从错误响应体中提取 required 和 available
      if ('data' in error && typeof error.data === 'object' && error.data) {
        if ('required' in error.data && typeof error.data.required === 'number') {
          required = error.data.required
        }
        if ('available' in error.data && typeof error.data.available === 'number') {
          available = error.data.available
        }
      }
      globalOpen({ estimatedCost: required, currentBalance: available })
      return true
    }
    // 情况2: ApiError 带有 code: 'INSUFFICIENT_BALANCE'
    if ('code' in error && error.code === 'INSUFFICIENT_BALANCE') {
      // 从错误对象中提取 required 和 available
      if ('required' in error && typeof error.required === 'number') {
        required = error.required
      }
      if ('available' in error && typeof error.available === 'number') {
        available = error.available
      }
      globalOpen({ estimatedCost: required, currentBalance: available })
      return true
    }
  }

  // 情况3: Error('INSUFFICIENT_BALANCE') 或包含余额不足提示的消息
  if (error instanceof Error) {
    const msg = error.message
    if (
      msg === 'INSUFFICIENT_BALANCE' ||
      msg.includes('余额不足') ||
      msg.includes('insufficient balance') ||
      msg.includes('INSUFFICIENT') ||
      msg === '402'
    ) {
      // 尝试从错误消息中提取金额（如果有的话）
      const requiredMatch = msg.match(/需要(\d+)积分/)
      const availableMatch = msg.match(/可用(\d+)积分/)
      if (requiredMatch) required = parseInt(requiredMatch[1], 10)
      if (availableMatch) available = parseInt(availableMatch[1], 10)

      globalOpen({ estimatedCost: required, currentBalance: available })
      return true
    }
  }

  return false
}
