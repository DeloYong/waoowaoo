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
  if (globalOpen) {
    if (error && typeof error === 'object' && 'status' in error) {
      const httpError = error as { status?: number }
      if (httpError.status === 402) {
        globalOpen()
        return true
      }
    }
  }
  return false
}
