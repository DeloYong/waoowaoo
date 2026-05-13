'use client'

import { AppIcon } from '@/components/ui/icons'

interface StoryboardGroupFailedAlertProps {
  failedError: string
  title: string
  closeTitle: string
  onClose: () => void
}

export default function StoryboardGroupFailedAlert({
  failedError,
  title,
  closeTitle,
  onClose,
}: StoryboardGroupFailedAlertProps) {
  return (
    <div className="mb-4 rounded-lg border border-[var(--wuhu-neon-pink)] bg-[rgba(255, 100, 200, 0.2)] p-3">
      <div className="flex items-start gap-3">
        <AppIcon name="alert" className="mt-0.5 h-5 w-5 shrink-0 text-[var(--wuhu-neon-pink)]" />
        <div className="flex-1">
          <h4 className="text-sm font-bold text-[var(--wuhu-neon-pink)]">{title}</h4>
          <p className="mt-1 text-sm text-[var(--wuhu-neon-pink)]">{failedError}</p>
        </div>
        <button
          onClick={onClose}
          className="bg-[var(--wuhu-neon-pink)]/20 text-[var(--wuhu-neon-pink)] hover:bg-[var(--wuhu-neon-pink)]/30 rounded-lg transition-all rounded p-1"
          title={closeTitle}
        >
          <AppIcon name="close" className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
