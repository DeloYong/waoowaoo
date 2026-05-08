'use client'

import EditorStage from './EditorStage'
import { useWorkspaceStageRuntime } from '../WorkspaceStageRuntimeContext'
import { useWorkspaceEpisodeStageData } from '../hooks/useWorkspaceEpisodeStageData'
import { useWorkspaceProvider } from '../WorkspaceProvider'
import type { NovelPromotionStoryboard } from '@/types/project'

export default function EditorStageRoute() {
  const runtime = useWorkspaceStageRuntime()
  const { projectId, episodeId } = useWorkspaceProvider()
  const { storyboards } = useWorkspaceEpisodeStageData()

  // 从 storyboards[].panels[] 中获取有视频的片段
  const videoClips = storyboards
    .flatMap((storyboard: NovelPromotionStoryboard) =>
      (storyboard.panels || [])
        .filter((panel) =>
          !!panel.videoUrl || !!(panel as { lipSyncVideoUrl?: string | null }).lipSyncVideoUrl
        )
        .map((panel, panelIndex) => ({
          id: panel.id || `${storyboard.id}-panel-${panelIndex}`,
          name: panel.panelNumber ? `镜头 ${panel.panelNumber}` : `镜头 ${panelIndex + 1}`,
          thumbnailUrl: panel.imageUrl || '',
          videoUrl: (panel as { lipSyncVideoUrl?: string | null }).lipSyncVideoUrl || panel.videoUrl || '',
          duration: panel.duration || 5,
        }))
    )

  if (!episodeId) return null

  return (
    <EditorStage
      projectId={projectId}
      episodeId={episodeId}
      clips={videoClips}
      onBack={() => runtime.onStageChange('videos')}
    />
  )
}
