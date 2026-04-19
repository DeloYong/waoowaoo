'use client'

import EditorStage from './EditorStage'
import { useWorkspaceStageRuntime } from '../WorkspaceStageRuntimeContext'
import { useWorkspaceEpisodeStageData } from '../hooks/useWorkspaceEpisodeStageData'
import { useWorkspaceProvider } from '../WorkspaceProvider'

export default function EditorStageRoute() {
  const runtime = useWorkspaceStageRuntime()
  const { projectId, episodeId } = useWorkspaceProvider()
  const { clips } = useWorkspaceEpisodeStageData()

  const videoClips = clips
    .filter(clip =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (clip as any).lipSyncVideoUrl || (clip as any).videoUrl
    )
    .map(clip => ({
      id: clip.id,
      name: clip.summary || `Clip ${clip.id.slice(0, 8)}`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      thumbnailUrl: (clip as any).frameUrl || '',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      videoUrl: (clip as any).lipSyncVideoUrl || (clip as any).videoUrl || '',
      duration: (clip.end || 0) - (clip.start || 0),
    }))

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
