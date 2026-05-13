'use client'

import TaskStatusInline from '@/components/task/TaskStatusInline'
import type { TaskPresentationState } from '@/lib/task/presentation'
import { AppIcon } from '@/components/ui/icons'

type ToastType = 'success' | 'warning' | 'error'

interface ToastState {
  message: string
  type: ToastType
}

interface AssetsStageStatusOverlaysProps {
  toast: ToastState | null
  onCloseToast: () => void
  isGlobalAnalyzing: boolean
  globalAnalyzingState: TaskPresentationState | null
  globalAnalyzingTitle: string
  globalAnalyzingHint: string
  globalAnalyzingTip: string
}

export default function AssetsStageStatusOverlays({
  toast,
  onCloseToast,
  isGlobalAnalyzing,
  globalAnalyzingState,
  globalAnalyzingTitle,
  globalAnalyzingHint,
  globalAnalyzingTip,
}: AssetsStageStatusOverlaysProps) {
  return (
    <>
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right">
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg ${
              toast.type === 'success'
                ? 'bg-[var(--wuhu-neon-purple)] text-white'
                : toast.type === 'warning'
                  ? 'bg-[var(--wuhu-neon-pink)] text-white'
                  : 'bg-[var(--wuhu-neon-pink)] text-white'
            }`}
          >
            <span className="text-sm font-medium">{toast.message}</span>
            <button onClick={onCloseToast} className="ml-2 hover:opacity-80">
              <AppIcon name="close" className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {isGlobalAnalyzing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_40px_rgba(167,87,255,0.2)] rounded-xl p-8 max-w-md mx-4 animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-full bg-[var(--wuhu-neon-purple)] flex items-center justify-center">
                  <AppIcon name="ideaAlt" className="w-10 h-10 text-white" />
                </div>
              </div>

              <h3 className="text-xl font-bold text-[white] mb-2">
                {globalAnalyzingTitle}
              </h3>
              <p className="text-[rgba(255,255,255,0.5)] text-sm mb-4">{globalAnalyzingHint}</p>
              <TaskStatusInline state={globalAnalyzingState} />

              <div className="w-full h-2 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
                <div className="h-full bg-[var(--wuhu-neon-purple)] rounded-full animate-pulse" style={{ width: '100%' }} />
              </div>
              <p className="text-xs text-[rgba(255,255,255,0.5)] mt-2">{globalAnalyzingTip}</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
