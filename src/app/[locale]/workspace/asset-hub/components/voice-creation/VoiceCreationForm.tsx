import type { ReactNode } from 'react'
import type { VoiceCreationRuntime } from './hooks/useVoiceCreation'
import { AppIcon } from '@/components/ui/icons'
import { SegmentedControl } from '@/components/ui/SegmentedControl'

interface VoiceCreationFormProps {
  runtime: VoiceCreationRuntime
  children: ReactNode
}

export default function VoiceCreationForm({ runtime, children }: VoiceCreationFormProps) {
  const {
    mode,
    voiceName,
    tHub,
    tvCreate,
    setVoiceName,
    handleClose,
    handleModeChange,
  } = runtime

  return (
    <div
      className="fixed z-[10000] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_50px_rgba(167,87,255,0.3)] rounded-2xl w-full max-w-xl overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-[var(--wuhu-bg-card)]">
        <div className="flex items-center gap-2">
          <AppIcon name="mic" className="w-5 h-5 text-[var(--wuhu-neon-purple)]" />
          <h2 className="font-semibold text-white">{tHub('addVoice')}</h2>
        </div>
        <button onClick={handleClose} className="p-1 text-white/40 hover:text-white hover:bg-white/10">
          <AppIcon name="close" className="w-5 h-5" />
        </button>
      </div>

      <div className="flex border-b border-white/10">
        <div className="flex-1 px-5 py-2.5">
          <SegmentedControl
            options={[
              { value: 'design' as const, label: tvCreate('aiDesignMode') },
              { value: 'upload' as const, label: tvCreate('uploadMode') },
            ]}
            value={mode}
            onChange={(val) => handleModeChange(val as 'design' | 'upload')}
          />
        </div>
      </div>

      <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
        <div>
          <label className="text-white/70 mb-1 block">{tHub('voiceName')}</label>
          <input
            type="text"
            value={voiceName}
            onChange={(e) => setVoiceName(e.target.value)}
            placeholder={tHub('voiceNamePlaceholder')}
            className="bg-[var(--wuhu-bg-surface)] border border-white/20 text-white placeholder:text-white/40 rounded-lg focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_15px_rgba(255,100,200,0.3)] w-full px-3 py-2 text-sm"
          />
        </div>

        {children}
      </div>
    </div>
  )
}
