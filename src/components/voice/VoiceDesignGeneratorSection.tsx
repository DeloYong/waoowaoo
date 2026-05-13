'use client'

import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import { AppIcon } from '@/components/ui/icons'
import type { TaskPresentationState } from '@/lib/task/presentation'
import {
  MAX_VOICE_SCHEME_COUNT,
  MIN_VOICE_SCHEME_COUNT,
  normalizeVoiceSchemeCount,
  type GeneratedVoice,
} from './voice-design-shared'

const VOICE_PRESET_KEYS = [
  'maleBroadcaster',
  'gentleFemale',
  'matureMale',
  'livelyFemale',
  'intellectualFemale',
  'narrator',
] as const

type VoicePresetKey = (typeof VOICE_PRESET_KEYS)[number]

interface VoiceDesignGeneratorSectionProps {
  voicePrompt: string
  onVoicePromptChange: (value: string) => void
  previewText: string
  onPreviewTextChange: (value: string) => void
  schemeCount: string
  onSchemeCountChange: (value: string) => void
  isSubmitting: boolean
  submittingState: TaskPresentationState | null
  error: string | null
  generatedVoices: GeneratedVoice[]
  selectedIndex: number | null
  onSelectIndex: (index: number) => void
  playingIndex: number | null
  onPlayVoice: (index: number) => void
  onGenerate: () => void
  footer?: ReactNode
}

export default function VoiceDesignGeneratorSection({
  voicePrompt,
  onVoicePromptChange,
  previewText,
  onPreviewTextChange,
  schemeCount,
  onSchemeCountChange,
  isSubmitting,
  submittingState,
  error,
  generatedVoices,
  selectedIndex,
  onSelectIndex,
  playingIndex,
  onPlayVoice,
  onGenerate,
  footer = null,
}: VoiceDesignGeneratorSectionProps) {
  const tv = useTranslations('voice.voiceDesign')
  const normalizedSchemeCount = normalizeVoiceSchemeCount(schemeCount)

  return (
    <>
      <div>
        <div className="text-sm text-white/70 mb-2">{tv('selectStyle')}</div>
        <div className="flex flex-wrap gap-1.5">
          {VOICE_PRESET_KEYS.map((presetKey) => {
            const prompt = tv(`presetsPrompts.${presetKey}` as `presetsPrompts.${VoicePresetKey}`)
            return (
              <button
                key={presetKey}
                onClick={() => onVoicePromptChange(prompt)}
                className={`px-2.5 py-1 text-xs rounded-md border transition-all border-white/20 hover:border-[var(--wuhu-neon-pink)] ${
                  voicePrompt === prompt
                    ? 'bg-[var(--wuhu-neon-purple)] text-white shadow-[0_0_15px_rgba(167,87,255,0.4)] border-[var(--wuhu-neon-pink)]'
                    : 'text-white/70 border-white/20 hover:border-[var(--wuhu-neon-pink)]'
                }`}
              >
                {tv(`presets.${presetKey}` as `presets.${VoicePresetKey}`)}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <div className="text-sm text-white/70 mb-1">{tv('orCustomDescription')}</div>
        <textarea
          value={voicePrompt}
          onChange={(event) => onVoicePromptChange(event.target.value)}
          placeholder={tv('describePlaceholder')}
          className="bg-[var(--wuhu-bg-surface)] border border-white/20 text-white placeholder:text-white/40 rounded-lg focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_15px_rgba(255,100,200,0.3)] w-full px-3 py-2 text-sm resize-none"
          rows={2}
        />
      </div>

      <details className="text-sm">
        <summary className="text-white/70 cursor-pointer hover:text-white">
          {tv('editPreviewText')}
        </summary>
        <input
          type="text"
          value={previewText}
          onChange={(event) => onPreviewTextChange(event.target.value)}
          placeholder={tv('defaultPreviewText')}
          className="bg-[var(--wuhu-bg-surface)] border border-white/20 text-white placeholder:text-white/40 rounded-lg focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_15px_rgba(255,100,200,0.3)] w-full mt-2 px-3 py-2 text-sm"
        />
      </details>

      {generatedVoices.length === 0 && !isSubmitting && (
        <div
          role="button"
          tabIndex={!voicePrompt.trim() ? -1 : 0}
          aria-disabled={!voicePrompt.trim()}
          onClick={() => {
            if (!voicePrompt.trim()) return
            onGenerate()
          }}
          onKeyDown={(event) => {
            if (!voicePrompt.trim()) return
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onGenerate()
            }
          }}
          className={`bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_15px_rgba(167,87,255,0.4)] hover:shadow-[0_0_25px_rgba(255,100,200,0.5)] w-full py-2.5 rounded-lg text-sm font-medium transition-opacity ${
            !voicePrompt.trim() ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <span>{tv('generateSchemesPrefix')}</span>
            <div
              className="group relative inline-flex items-center rounded-md px-1.5 py-0.5 transition-colors hover:bg-white/12 focus-within:bg-white/14"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <select
                value={String(normalizedSchemeCount)}
                onChange={(event) => onSchemeCountChange(event.target.value)}
                aria-label={tv('schemeCountAriaLabel')}
                className="appearance-none bg-transparent border-0 pl-0 pr-3 text-sm font-semibold text-white/96 outline-none cursor-pointer leading-none transition-colors group-hover:text-white focus:text-white"
              >
                {Array.from({ length: MAX_VOICE_SCHEME_COUNT - MIN_VOICE_SCHEME_COUNT + 1 }, (_, index) => {
                  const value = String(index + MIN_VOICE_SCHEME_COUNT)
                  return (
                    <option key={value} value={value} className="text-black">
                      {value}
                    </option>
                  )
                })}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-1 flex items-center text-white/82 transition-colors group-hover:text-white group-focus-within:text-white">
                <AppIcon name="chevronDown" className="h-3 w-3" />
              </div>
            </div>
            <span>{tv('generateSchemesSuffix')}</span>
          </div>
        </div>
      )}

      {isSubmitting && submittingState && (
        <div className="py-6">
          <TaskStatusInline
            state={submittingState}
            className="justify-center text-white/70 [&>span]:text-white/70"
          />
        </div>
      )}

      {generatedVoices.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm text-white/70">{tv('selectScheme')}</div>
          <div className="grid grid-cols-3 gap-2">
            {generatedVoices.map((voice, index) => (
              <div
                key={voice.voiceId}
                onClick={() => onSelectIndex(index)}
                className={`relative p-3 rounded-lg border-2 cursor-pointer transition-all text-center ${
                  selectedIndex === index
                    ? 'border-[var(--wuhu-neon-pink)] bg-[var(--wuhu-neon-purple)]/10'
                    : 'border-white/20 hover:border-[var(--wuhu-neon-pink)]'
                }`}
              >
                {selectedIndex === index && (
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[var(--wuhu-neon-purple)]/20 text-[var(--wuhu-neon-purple)] border border-[var(--wuhu-neon-purple)]/30 rounded-full flex items-center justify-center p-0">
                    <AppIcon name="checkSolid" className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className="text-sm font-medium text-white mb-2">{tv('schemeN', { n: index + 1 })}</div>
                <button
                  onClick={(event) => {
                    event.stopPropagation()
                    onPlayVoice(index)
                  }}
                  className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center transition-all ${
                    playingIndex === index
                      ? 'bg-[var(--wuhu-neon-purple)] text-white shadow-[0_0_15px_rgba(167,87,255,0.4)] animate-pulse'
                      : 'border border-white/20 text-white/70 hover:border-[var(--wuhu-neon-pink)] hover:text-white'
                  }`}
                >
                  {playingIndex === index ? (
                    <AppIcon name="pause" className="w-4 h-4" />
                  ) : (
                    <AppIcon name="play" className="w-5 h-5" />
                  )}
                </button>
              </div>
            ))}
          </div>
          {footer}
        </div>
      )}

      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
          {error}
        </div>
      )}
    </>
  )
}
