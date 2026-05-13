import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import { MediaImageWithLoading } from '@/components/media/MediaImageWithLoading'
import {
  parseImagePrompt,
  type PromptStageRuntime,
} from './hooks/usePromptStageActions'

interface PromptListTableViewProps {
  runtime: PromptStageRuntime
}

export default function PromptListTableView({ runtime }: PromptListTableViewProps) {
  const t = useTranslations('storyboard')

  const {
    shots,
    onGenerateImage,
    isBatchSubmitting,
    shotExtraAssets,
    getGenerateButtonToneClass,
    getShotRunningState,
    isShotTaskRunning,
    handleStartEdit,
    setPreviewImage,
  } = runtime

  return (
    <div className="card-base overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[rgba(167, 87, 255, 0.2)]">
          <thead className="bg-[rgba(255,255,255,0.05)]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-[rgba(255,255,255,0.5)] uppercase tracking-wider">{t('panel.shot')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[rgba(255,255,255,0.5)] uppercase tracking-wider">{t('common.preview')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[rgba(255,255,255,0.5)] uppercase tracking-wider">SRT</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[rgba(255,255,255,0.5)] uppercase tracking-wider">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="bg-[var(--wuhu-bg-surface)] divide-y divide-[rgba(167, 87, 255, 0.2)]">
            {shots.map((shot) => {
              const { content } = parseImagePrompt(shot.imagePrompt)
              const shotRunningState = getShotRunningState(shot)

              return (
                <tr key={shot.id} className="hover:bg-[rgba(255,255,255,0.05)]">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-[white]">#{shot.shotId}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="w-20 h-12 bg-[rgba(255,255,255,0.05)] rounded overflow-hidden">
                      {shot.imageUrl && (
                        <MediaImageWithLoading
                          src={shot.imageUrl}
                          alt={`${t('panel.shot')}${shot.shotId}`}
                          containerClassName="w-full h-full"
                          className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setPreviewImage(shot.imageUrl)}
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-[rgba(255,255,255,0.7)]">
                    {shot.srtStart}-{shot.srtEnd}
                    <div className="text-xs text-[rgba(255,255,255,0.5)]">{shot.srtDuration?.toFixed(1)}s</div>
                    <div className="text-xs mt-1 line-clamp-2">{content}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onGenerateImage(shot.id, shotExtraAssets[shot.id])}
                        disabled={isShotTaskRunning(shot) || isBatchSubmitting}
                        className={`bg-[var(--wuhu-bg-surface)] border border-white/20 hover:bg-white/5 rounded-lg transition-all px-3 py-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 ${getGenerateButtonToneClass(shot)}`}
                      >
                        {isShotTaskRunning(shot) ? <TaskStatusInline state={shotRunningState} /> : <span>{t('common.generate')}</span>}
                      </button>
                      <button
                        onClick={() => handleStartEdit(shot.id, 'imagePrompt', shot.imagePrompt || '')}
                        className="text-[var(--wuhu-neon-cyan)] hover:text-[white] p-1"
                        title={t('prompts.imagePrompt')}
                      >
                        <AppIcon name="edit" className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
