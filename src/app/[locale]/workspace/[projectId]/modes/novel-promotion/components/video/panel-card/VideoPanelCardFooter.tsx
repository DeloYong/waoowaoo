import TaskStatusInline from '@/components/task/TaskStatusInline'
import type { VideoPanelRuntime } from './hooks/useVideoPanelActions'

interface VideoPanelCardFooterProps {
  runtime: VideoPanelRuntime
}

export default function VideoPanelCardFooter({ runtime }: VideoPanelCardFooterProps) {
  const { t, lipSync, taskStatus, voiceManager } = runtime

  if (!lipSync.showLipSyncPanel) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => !lipSync.executingLipSync && lipSync.closeLipSyncPanel()}>
      <div className="bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_50px_rgba(167,87,255,0.3)] rounded-xl p-6 max-w-md w-full mx-4" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[white]">{t('panelCard.lipSyncTitle')}</h3>
          {!lipSync.executingLipSync && (
            <button onClick={lipSync.closeLipSyncPanel} className="text-[rgba(255,255,255,0.5)] hover:text-[rgba(255,255,255,0.7)]">×</button>
          )}
        </div>

        {lipSync.lipSyncError && (
          <div className="mb-4 p-3 bg-[rgba(255, 100, 200, 0.1)] border border-[var(--wuhu-neon-pink)] rounded-lg text-[var(--wuhu-neon-pink)] text-sm">
            {lipSync.lipSyncError}
          </div>
        )}

        {lipSync.executingLipSync && (
          <div className="flex flex-col items-center py-8">
            <TaskStatusInline state={taskStatus.lipSyncInlineState} className="text-[rgba(255,255,255,0.7)] [&>span]:text-[rgba(255,255,255,0.7)] [&_svg]:text-[var(--wuhu-neon-cyan)]" />
            <p className="text-xs text-[rgba(255,255,255,0.5)] mt-2">{t('panelCard.lipSyncMayTakeMinutes')}</p>
          </div>
        )}

        {!lipSync.executingLipSync && (
          <div>
            <p className="text-sm text-[rgba(255,255,255,0.7)] mb-3">{t('panelCard.selectVoice')}</p>
            <div className="space-y-2">
              {voiceManager.localVoiceLines
                .filter((voiceLine) => voiceLine.audioUrl)
                .map((voiceLine) => (
                  <button
                    key={voiceLine.id}
                    onClick={() => void lipSync.executeLipSync(voiceLine)}
                    className="w-full text-left p-3 border border-[rgba(167, 87, 255, 0.2)] rounded-lg hover:border-[var(--wuhu-neon-cyan)] hover:bg-[rgba(0, 255, 255, 0.1)] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[rgba(255,255,255,0.5)]">{voiceLine.speaker}</span>
                      {voiceLine.audioDuration && <span className="text-xs text-[rgba(255,255,255,0.5)]">{(voiceLine.audioDuration / 1000).toFixed(1)}s</span>}
                    </div>
                    <div className="text-sm text-[white]">&ldquo;{voiceLine.content}&rdquo;</div>
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
