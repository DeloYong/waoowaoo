import { useTranslations } from 'next-intl'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import { AppIcon } from '@/components/ui/icons'
import type { PromptStageRuntime } from './hooks/usePromptStageActions'
import PromptListCardView from './PromptListCardView'
import PromptListTableView from './PromptListTableView'

interface PromptListPanelProps {
  runtime: PromptStageRuntime
}

export default function PromptListPanel({ runtime }: PromptListPanelProps) {
  const t = useTranslations('storyboard')
  const tCommon = useTranslations('common')

  const {
    viewMode,
    onViewModeChange,
    onGenerateAllImages,
    isAnyTaskRunning,
    runningCount,
    batchTaskRunningState,
    onBack,
    shots,
  } = runtime

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {onBack && (
            <button
              onClick={onBack}
              disabled={isAnyTaskRunning}
              className="bg-[var(--wuhu-bg-surface)] border border-white/20 hover:bg-white/5 rounded-lg transition-all px-4 py-2 bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.7)] hover:bg-[rgba(255,255,255,0.05)] text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <AppIcon name="chevronLeft" className="w-4 h-4" />
              <span>{tCommon('back')}</span>
            </button>
          )}
          <span className="text-sm text-[rgba(255,255,255,0.7)]">
            {t('header.panels')}: {shots.length}
            {runningCount > 0 && (
              <span className="ml-2 text-[var(--wuhu-neon-cyan)] font-medium">
                ({runningCount} {t('group.generating')})
              </span>
            )}
          </span>
          <button
            onClick={onGenerateAllImages}
            disabled={isAnyTaskRunning}
            className="bg-[var(--wuhu-bg-surface)] border border-white/20 hover:bg-white/5 rounded-lg transition-all px-4 py-2 bg-[var(--wuhu-neon-purple)] text-white hover:bg-[var(--wuhu-neon-purple)] text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isAnyTaskRunning ? (
              <TaskStatusInline state={batchTaskRunningState} className="text-white [&>span]:text-white [&_svg]:text-white" />
            ) : (
              t('group.generateAll')
            )}
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onViewModeChange('card')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'card' ? 'bg-[var(--wuhu-neon-purple)] text-white' : 'bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.7)] hover:bg-[rgba(255,255,255,0.05)]'}`}
          >
            {tCommon('preview')}
          </button>
          <button
            onClick={() => onViewModeChange('table')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'table' ? 'bg-[var(--wuhu-neon-purple)] text-white' : 'bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.7)] hover:bg-[rgba(255,255,255,0.05)]'}`}
          >
            {t('common.status')}
          </button>
        </div>
      </div>

      {viewMode === 'card' ? (
        <PromptListCardView runtime={runtime} />
      ) : (
        <PromptListTableView runtime={runtime} />
      )}
    </>
  )
}
