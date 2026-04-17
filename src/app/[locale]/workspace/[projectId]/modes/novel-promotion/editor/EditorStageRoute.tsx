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
    .filter(clip => clip.generatedVideoUrl)
    .map(clip => ({
      id: clip.id,
      name: clip.summary || `Clip ${clip.id.slice(0, 8)}`,
      thumbnailUrl: clip.generatedVideoThumbnailUrl || '',
      videoUrl: clip.generatedVideoUrl || '',
      duration: clip.end - clip.start,
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
