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

  // 情况1: HTTP 错误对象带有 status: 402
  if (error && typeof error === 'object') {
    if ('status' in error) {
      const httpError = error as { status?: number }
      if (httpError.status === 402) {
        globalOpen()
        return true
      }
    }
    // 情况2: ApiError 带有 code: 'INSUFFICIENT_BALANCE'
    if ('code' in error) {
      const codedError = error as { code?: string }
      if (codedError.code === 'INSUFFICIENT_BALANCE') {
        globalOpen()
        return true
      }
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
      globalOpen()
      return true
    }
  }

  return false
}
