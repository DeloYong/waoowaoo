import { useTranslations } from 'next-intl'
import VoiceStage from '../VoiceStage'
import { AppIcon } from '@/components/ui/icons'

interface VoiceLineSummary {
  audioUrl: string | null
}

interface VideoTimelinePanelProps {
  projectId: string
  episodeId: string
  allVoiceLines: VoiceLineSummary[]
  expanded: boolean
  onToggleExpanded: () => void
  onReloadVoiceLines: () => Promise<void>
  onLocateVoiceLine: (storyboardId: string, panelIndex: number) => void
  onOpenAssetLibraryForCharacter?: (characterId?: string | null) => void
}

export default function VideoTimelinePanel({
  projectId,
  episodeId,
  allVoiceLines,
  expanded,
  onToggleExpanded,
  onReloadVoiceLines,
  onLocateVoiceLine,
  onOpenAssetLibraryForCharacter,
}: VideoTimelinePanelProps) {
  const tVoice = useTranslations('voice')

  return (
    <div className="bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_40px_rgba(167,87,255,0.2)] rounded-xl overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        onClick={onToggleExpanded}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onToggleExpanded()
          }
        }}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(167,87,255,0.3)]">
            <AppIcon name="micOutline" className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-white">{tVoice('title')}</h3>
            <p className="text-sm text-white/50">
              {tVoice('linesCount', { count: allVoiceLines.length })}
              {tVoice('audioGeneratedCount', { count: allVoiceLines.filter((line) => line.audioUrl).length })}
            </p>
          </div>
        </div>
        <AppIcon name="chevronDown" className={`w-5 h-5 text-white/50 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </div>

      {expanded && (
        <div className="py-4">
          <VoiceStage
            projectId={projectId}
            episodeId={episodeId}
            embedded={true}
            onVoiceLinesChanged={onReloadVoiceLines}
            onVoiceLineClick={onLocateVoiceLine}
            onOpenAssetLibraryForCharacter={onOpenAssetLibraryForCharacter}
          />
        </div>
      )}
    </div>
  )
}
