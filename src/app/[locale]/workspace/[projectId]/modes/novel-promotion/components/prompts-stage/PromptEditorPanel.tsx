import TaskStatusInline from '@/components/task/TaskStatusInline'
import { useTranslations } from 'next-intl'
import type { PromptStageRuntime } from './hooks/usePromptStageActions'

interface PromptEditorPanelProps {
  runtime: PromptStageRuntime
}

export default function PromptEditorPanel({ runtime }: PromptEditorPanelProps) {
  const tStoryboard = useTranslations('storyboard')
  const tNovelPromotion = useTranslations('novelPromotion')
  const {
    onAppendContent,
    appendContent,
    setAppendContent,
    isAppending,
    appendTaskRunningState,
    handleAppendSubmit,
    isAnyTaskRunning,
    onNext,
  } = runtime

  return (
    <>
      {onAppendContent && (
        <div className="mt-8 p-6 bg-[rgba(255,255,255,0.05)] rounded-lg border-2 border-dashed border-[rgba(167, 87, 255, 0.4)]">
          <h3 className="text-lg font-semibold text-[white] mb-3">{tStoryboard('prompts.appendTitle')}</h3>
          <p className="text-sm text-[rgba(255,255,255,0.7)] mb-4">
            {tStoryboard('prompts.appendDescription')}
          </p>
          <textarea
            value={appendContent}
            onChange={(e) => setAppendContent(e.target.value)}
            placeholder={tStoryboard('panelActions.pasteSrtPlaceholder')}
            disabled={isAppending}
            className="w-full h-48 p-4 border border-[rgba(167, 87, 255, 0.4)] rounded-lg resize-none focus:ring-2 focus:ring-[var(--wuhu-neon-cyan)] focus:border-[var(--wuhu-neon-cyan)] disabled:bg-[rgba(255,255,255,0.05)] disabled:cursor-not-allowed font-mono text-sm"
          />
          <div className="flex justify-end mt-4">
            <button
              onClick={handleAppendSubmit}
              disabled={isAppending || !appendContent.trim()}
              className="bg-[var(--wuhu-bg-surface)] border border-white/20 hover:bg-white/5 rounded-lg transition-all px-6 py-3 bg-[var(--wuhu-neon-purple)] text-white hover:bg-[var(--wuhu-neon-purple)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isAppending ? (
                <TaskStatusInline state={appendTaskRunningState} className="text-white [&>span]:text-white [&_svg]:text-white" />
              ) : (
                tStoryboard('prompts.appendSubmit')
              )}
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-end items-center pt-4">
        <button
          onClick={onNext}
          disabled={isAnyTaskRunning}
          className="bg-[var(--wuhu-bg-surface)] border border-white/20 hover:bg-white/5 rounded-lg transition-all px-6 py-2 bg-[var(--wuhu-neon-purple)] text-white hover:bg-[var(--wuhu-neon-pink)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {tNovelPromotion('buttons.enterVideoGeneration')}
        </button>
      </div>
    </>
  )
}
