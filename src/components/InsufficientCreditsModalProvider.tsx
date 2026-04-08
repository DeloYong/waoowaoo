'use client'

import { useInsufficientCreditsModal } from '@/lib/insufficient-credits-modal'
import InsufficientCreditsModal from '@/components/InsufficientCreditsModal'

export function InsufficientCreditsModalProvider() {
  const { isOpen, estimatedCost, currentBalance, close } = useInsufficientCreditsModal()

  return (
    <InsufficientCreditsModal
      isOpen={isOpen}
      onClose={close}
      estimatedCost={estimatedCost}
      currentBalance={currentBalance}
    />
  )
}
