import { useState, useEffect } from 'react'
import TaskStatusOverlay from '@/components/task/TaskStatusOverlay'
import { MediaImageWithLoading } from '@/components/media/MediaImageWithLoading'

import type { VideoPanelRuntime } from './hooks/useVideoPanelActions'
import { AppIcon } from '@/components/ui/icons'

interface VideoPanelCardHeaderProps {
  runtime: VideoPanelRuntime
}

export default function VideoPanelCardHeader({ runtime }: VideoPanelCardHeaderProps) {
  const {
    t,
    panel,
    panelIndex,
    panelKey,
    layout,
    media,
    taskStatus,
    videoModel,
    player,
    actions,
  } = runtime

  const [errorDismissed, setErrorDismissed] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    setErrorDismissed(false)
  }, [taskStatus.panelErrorDisplay?.message])

  const hasVisibleBaseVideo = !!media.baseVideoUrl
  const showFirstLastFrameSwitch = layout.hasNext

  return (
    <div className="bg-[var(--wuhu-bg-surface)] flex items-center justify-center relative" style={{ aspectRatio: player.cssAspectRatio }}>
      {hasVisibleBaseVideo && player.isPlaying ? (
        <video
          ref={player.videoRef}
          key={`video-${panel.storyboardId}-${panel.panelIndex}-${media.currentVideoUrl}`}
          src={media.currentVideoUrl}
          controls
          playsInline
          className="w-full h-full object-contain bg-black"
          onEnded={() => player.setIsPlaying(false)}
        />
      ) : hasVisibleBaseVideo ? (
        <div
          className="relative w-full h-full group cursor-pointer"
          onClick={() => void player.handlePlayClick()}
        >
          <MediaImageWithLoading
            src={panel.imageUrl || ''}
            alt={t('panelCard.shot', { number: panelIndex + 1 })}
            containerClassName="w-full h-full bg-black"
            className="w-full h-full object-contain bg-black"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm group-hover:bg-black/50 backdrop-blur-sm transition-colors pointer-events-none">
            <div className="w-16 h-16 bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <AppIcon name="play" className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
      ) : panel.imageUrl ? (
        <MediaImageWithLoading
          src={panel.imageUrl}
          alt={t('panelCard.shot', { number: panelIndex + 1 })}
          containerClassName="w-full h-full bg-[var(--wuhu-bg-surface)]"
          className={`w-full h-full object-contain bg-[var(--wuhu-bg-surface)] ${media.onPreviewImage ? 'cursor-zoom-in' : ''}`}
          onClick={media.onPreviewImage ? player.handlePreviewImage : undefined}
        />
      ) : (
        <AppIcon name="playCircle" className="w-16 h-16 text-white/30" />
      )}

      {/* 镜头编号 */}
      <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm text-white px-2 py-0.5 rounded text-xs font-medium">
        {panelIndex + 1}
      </div>

      {/* 两卡片中间唯一的链接/断开按钮 */}

      {showFirstLastFrameSwitch && (
        <div className="absolute -right-6 top-1/2 -translate-y-1/2 z-30">
          <div className="relative">
            <button
              onClick={(event) => {
                event.stopPropagation()
                actions.onToggleLink(panelKey, panel.storyboardId, panel.panelIndex)
              }}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className={`h-8 w-8 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(167,87,255,0.2)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wuhu-neon-purple)] ${layout.isLinked
                ? 'bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_12px_rgba(99,102,241,0.5)]'
                : 'bg-[var(--wuhu-bg-card)] text-white/70 hover:bg-[var(--wuhu-neon-purple)]/20 hover:text-[var(--wuhu-neon-purple)]'
                }`}
            >
              <AppIcon name="unplug" size={16} />
            </button>

            {/* 自定义 Tooltip */}
            {showTooltip && (
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 pointer-events-none">
                <div className="bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white text-xs rounded-lg px-3 py-1.5 shadow-[0_0_20px_rgba(167,87,255,0.3)] whitespace-nowrap border border-[var(--wuhu-neon-purple)]/30">
                  {layout.isLinked ? t('firstLastFrame.unlinkAction') : t('firstLastFrame.linkToNext')}
                  <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-[var(--glass-bg-surface-strong)]" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 口型同步切换 */}
      {panel.lipSyncVideoUrl && hasVisibleBaseVideo ? (
        <div
          className="absolute top-2 right-2 flex items-center bg-black/50 backdrop-blur-sm rounded-full p-0.5 cursor-pointer"
          onClick={(event) => {
            event.stopPropagation()
            media.onToggleLipSyncVideo(panelKey, !media.showLipSyncVideo)
            player.setIsPlaying(false)
          }}
        >
          <div className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${!media.showLipSyncVideo ? 'bg-[var(--wuhu-neon-cyan)] text-white' : 'text-white/30 hover:text-white'}`}>
            {t('panelCard.original')}
          </div>
          <div className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${media.showLipSyncVideo ? 'bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white' : 'text-white/30 hover:text-white'}`}>
            {t('panelCard.synced')}
          </div>
        </div>
      ) : null}

      {/* 重新生成按钮 */}
      {!layout.isLinked && !layout.isLastFrame && (hasVisibleBaseVideo || taskStatus.isVideoTaskRunning) && (
        <button
          onClick={() =>
            actions.onGenerateVideo(
              panel.storyboardId,
              panel.panelIndex,
              videoModel.selectedModel,
              undefined,
              videoModel.generationOptions,
              panel.panelId,
            )}
          disabled={
            taskStatus.isVideoTaskRunning
            || !videoModel.selectedModel
            || videoModel.missingCapabilityFields.length > 0
          }
          className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-sm hover:bg-black/70 text-white p-2 rounded-full transition-all z-20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <AppIcon name="refresh" className="w-4 h-4" />
        </button>
      )}

      {/* 任务进度遮罩 */}
      {(taskStatus.isVideoTaskRunning || taskStatus.isLipSyncTaskRunning) && (
        <TaskStatusOverlay state={taskStatus.overlayPresentation} className="z-10" />
      )}

      {/* 错误提示 */}
      {taskStatus.panelErrorDisplay && !taskStatus.isVideoTaskRunning && !taskStatus.isLipSyncTaskRunning && !errorDismissed && (
        <div className="absolute inset-0 bg-red-500/20 flex flex-col items-center justify-center z-10 p-4">
          <button
            onClick={(e) => { e.stopPropagation(); setErrorDismissed(true) }}
            className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full bg-black/30 hover:bg-black/50 text-white text-xs transition-colors"
          >
            <AppIcon name="close" className="w-3 h-3" />
          </button>
          <span className="text-white text-xs text-center break-all">{taskStatus.panelErrorDisplay.message}</span>
        </div>
      )}
    </div>
  )
}
