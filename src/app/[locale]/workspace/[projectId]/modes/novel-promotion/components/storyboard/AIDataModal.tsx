'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { createPortal } from 'react-dom'
import { AppIcon } from '@/components/ui/icons'
import GlassButton from '@/components/ui/primitives/GlassButton'
import type { AIDataModalProps } from './AIDataModal.types'
import { useAIDataModalState } from './hooks/useAIDataModalState'
import AIDataModalFormPane from './AIDataModalFormPane'
import AIDataModalPreviewPane from './AIDataModalPreviewPane'
import { lockModalPageScroll } from './modal-scroll-lock'

export type {
  AIDataModalProps,
  AIDataSavePayload,
  PhotographyRules,
  ActingCharacter,
  ActingNotes,
  AIDataCharacter,
} from './AIDataModal.types'

export default function AIDataModal({
  isOpen,
  onClose,
  syncKey,
  panelNumber,
  shotType: initialShotType,
  cameraMove: initialCameraMove,
  description: initialDescription,
  location,
  characters,
  videoPrompt: initialVideoPrompt,
  photographyRules: initialPhotographyRules,
  actingNotes: initialActingNotes,
  videoRatio,
  onSave,
}: AIDataModalProps) {
  const t = useTranslations('storyboard')
  const [activeCharIdx, setActiveCharIdx] = useState(0)

  const {
    shotType,
    setShotType,
    cameraMove,
    setCameraMove,
    description,
    setDescription,
    videoPrompt,
    setVideoPrompt,
    photographyRules,
    actingNotes,
    updatePhotographyField,
    updatePhotographyCharacter,
    updateActingCharacter,
    savePayload,
  } = useAIDataModalState({
    isOpen,
    syncKey,
    initialShotType,
    initialCameraMove,
    initialDescription,
    initialVideoPrompt,
    initialPhotographyRules,
    initialActingNotes,
  })

  const handleSave = () => {
    onSave(savePayload)
    onClose()
  }

  const previewJson = {
    aspect_ratio: videoRatio,
    shot: {
      shot_type: shotType,
      camera_move: cameraMove,
      description,
      location,
      characters,
      prompt_text: `A ${videoRatio} shot: ${description}. ${videoPrompt}`,
    },
    ...(photographyRules ? { photography_rules: photographyRules } : {}),
    ...(actingNotes.length > 0 ? { acting_notes: actingNotes } : {}),
  }

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined
    return lockModalPageScroll(document)
  }, [isOpen])

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="bg-black/60 backdrop-blur-sm animate-fadeIn absolute inset-0" onClick={onClose} />

      <div
        className="relative z-10 bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_50px_rgba(167,87,255,0.3)] rounded-2xl w-full max-w-[920px] flex flex-col overflow-hidden"
        style={{ maxHeight: '92vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--wuhu-neon-purple)]/20 flex-shrink-0">
              <AppIcon name="clapperboard" className="h-3.5 w-3.5 text-[var(--wuhu-neon-purple)]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white leading-none">
                {t('aiData.title')}
              </h2>
              <p className="text-[11px] text-white/50 mt-0.5">
                {t('aiData.subtitle', { number: panelNumber })} · {videoRatio}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white hover:bg-white/10 h-7 w-7 flex-shrink-0 rounded-lg"
            aria-label={t('common.cancel')}
          >
            <AppIcon name="close" className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <AIDataModalFormPane
            t={t}
            shotType={shotType}
            cameraMove={cameraMove}
            description={description}
            location={location}
            characters={characters}
            videoPrompt={videoPrompt}
            photographyRules={photographyRules}
            actingNotes={actingNotes}
            activeCharIdx={activeCharIdx}
            onActiveCharIdxChange={setActiveCharIdx}
            onShotTypeChange={setShotType}
            onCameraMoveChange={setCameraMove}
            onDescriptionChange={setDescription}
            onVideoPromptChange={setVideoPrompt}
            onPhotographyFieldChange={updatePhotographyField}
            onPhotographyCharacterChange={updatePhotographyCharacter}
            onActingCharacterChange={updateActingCharacter}
          />
          <AIDataModalPreviewPane
            t={t}
            previewJson={previewJson}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/10 px-5 py-3 flex-shrink-0">
          <p className="text-[11px] text-white/50">
            {characters.map(c => c.name).join('、')}
            {location ? ` · ${location}` : ''}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="border border-white/20 text-white/70 hover:border-[var(--wuhu-neon-pink)] hover:text-white hover:bg-white/10 px-4 py-2 text-sm rounded-xl"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSave}
              className="bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_15px_rgba(167,87,255,0.4)] hover:shadow-[0_0_25px_rgba(255,100,200,0.5)] px-4 py-2 text-sm rounded-xl flex items-center gap-2"
            >
              <AppIcon name="check" className="h-3.5 w-3.5" />
              {t('aiData.save')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
