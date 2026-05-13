'use client'

import type { DragEvent, RefObject } from 'react'
import { useTranslations } from 'next-intl'
import { ART_STYLES } from '@/lib/constants'
import CharacterCreationPreview from './CharacterCreationPreview'
import { AppIcon } from '@/components/ui/icons'
import { SegmentedControl } from '@/components/ui/SegmentedControl'

type Mode = 'asset-hub' | 'project'

interface AvailableCharacter {
  id: string
  name: string
  appearances: unknown[]
}

interface CharacterCreationFormProps {
  mode: Mode
  createMode: 'reference' | 'description'
  setCreateMode: (mode: 'reference' | 'description') => void
  name: string
  setName: (value: string) => void
  description: string
  setDescription: (value: string) => void
  aiInstruction: string
  setAiInstruction: (value: string) => void
  artStyle: string
  setArtStyle: (value: string) => void
  referenceImagesBase64: string[]
  referenceSubMode: 'direct' | 'extract'
  setReferenceSubMode: (mode: 'direct' | 'extract') => void
  isSubAppearance: boolean
  setIsSubAppearance: (value: boolean) => void
  selectedCharacterId: string
  setSelectedCharacterId: (value: string) => void
  changeReason: string
  setChangeReason: (value: string) => void
  availableCharacters: AvailableCharacter[]
  fileInputRef: RefObject<HTMLInputElement | null>
  handleDrop: (event: DragEvent<HTMLDivElement>) => void
  handleFileSelect: (files: FileList) => void
  handleClearReference: (index?: number) => void
  handleExtractDescription: () => void
  handleAiDesign: () => void
  isSubmitting: boolean
  isAiDesigning: boolean
  isExtracting: boolean
}

const SparklesIcon = ({ className }: { className?: string }) => (
  <AppIcon name="sparklesAlt" className={className} />
)

const PhotoIcon = ({ className }: { className?: string }) => (
  <AppIcon name="image" className={className} />
)

export default function CharacterCreationForm({
  mode,
  createMode,
  setCreateMode,
  name,
  setName,
  description,
  setDescription,
  aiInstruction,
  setAiInstruction,
  artStyle,
  setArtStyle,
  referenceImagesBase64,
  referenceSubMode,
  setReferenceSubMode,
  isSubAppearance,
  setIsSubAppearance,
  selectedCharacterId,
  setSelectedCharacterId,
  changeReason,
  setChangeReason,
  availableCharacters,
  fileInputRef,
  handleDrop,
  handleFileSelect,
  handleClearReference,
  handleExtractDescription,
  handleAiDesign,
  isSubmitting,
  isAiDesigning,
  isExtracting,
}: CharacterCreationFormProps) {
  const t = useTranslations('assetModal')

  return (
    <div className="space-y-5">
      <div className="mb-5">
        <SegmentedControl
          options={[
            { value: 'description', label: <><SparklesIcon className="w-4 h-4" /><span>{t('character.modeDescription')}</span></> },
            { value: 'reference', label: <><PhotoIcon className="w-4 h-4" /><span>{t('character.modeReference')}</span></> },
          ]}
          value={createMode}
          onChange={(val) => setCreateMode(val as 'reference' | 'description')}
        />
      </div>

      {mode === 'project' && availableCharacters.length > 0 && (
        <div className="flex items-start gap-3 p-3 bg-[var(--wuhu-bg-surface)] rounded-lg border border-white/20">
          <input
            type="checkbox"
            id="isSubAppearance"
            checked={isSubAppearance}
            onChange={(e) => setIsSubAppearance(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-white/20 text-[var(--wuhu-neon-purple)]"
          />
          <label htmlFor="isSubAppearance" className="flex-1 text-sm cursor-pointer">
            <span className="font-medium text-white">{t('character.isSubAppearance')}</span>
            <p className="text-xs text-white/70 mt-0.5">{t('character.isSubAppearanceHint')}</p>
          </label>
        </div>
      )}

      {isSubAppearance && (
        <div className="space-y-2">
          <label className="text-white/70 block">
            {t('character.selectMainCharacter')} <span className="text-red-400">*</span>
          </label>
          <select
            value={selectedCharacterId}
            onChange={(e) => setSelectedCharacterId(e.target.value)}
            className="bg-[var(--wuhu-bg-surface)] border border-white/20 text-white rounded-lg w-full px-3 py-2 text-sm focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_15px_rgba(255,100,200,0.3)]"
          >
            <option value="">{t('character.selectCharacterPlaceholder')}</option>
            {availableCharacters.map((char) => (
              <option key={char.id} value={char.id}>
                {char.name} ({t('character.appearancesCount', { count: char.appearances.length })})
              </option>
            ))}
          </select>
        </div>
      )}

      {isSubAppearance && (
        <div className="space-y-2">
          <label className="text-white/70 block">
            {t('character.changeReason')} <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={changeReason}
            onChange={(e) => setChangeReason(e.target.value)}
            placeholder={t('character.changeReasonPlaceholder')}
            className="bg-[var(--wuhu-bg-surface)] border border-white/20 text-white placeholder:text-white/40 rounded-lg focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_15px_rgba(255,100,200,0.3)] w-full px-3 py-2 text-sm"
          />
        </div>
      )}

      {!isSubAppearance && (
        <div className="space-y-2">
          <label className="text-white/70 block">
            {t('character.name')} <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('character.namePlaceholder')}
            className="bg-[var(--wuhu-bg-surface)] border border-white/20 text-white placeholder:text-white/40 rounded-lg focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_15px_rgba(255,100,200,0.3)] w-full px-3 py-2 text-sm"
          />
        </div>
      )}

      {mode === 'asset-hub' && !isSubAppearance && (
        <div className="space-y-2">
          <label className="text-white/70 block">
            {t('artStyle.title')}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {ART_STYLES.map((style) => (
              <button
                key={style.value}
                type="button"
                onClick={() => setArtStyle(style.value)}
                className={`px-3 py-2 rounded-lg text-sm border transition-all justify-start ${artStyle === style.value
                  ? 'bg-[var(--wuhu-neon-purple)] text-white shadow-[0_0_15px_rgba(167,87,255,0.4)] border-[var(--wuhu-neon-pink)]'
                  : 'border-white/20 text-white/70 hover:border-[var(--wuhu-neon-pink)] hover:text-white hover:bg-white/10'
                  }`}
              >
                <span>{style.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {createMode === 'reference' && (
        <div className="bg-[var(--wuhu-bg-surface)] rounded-xl p-4 space-y-3 border border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--wuhu-neon-purple)]">
              <PhotoIcon className="w-4 h-4" />
              <span>{t('character.uploadReference')}</span>
            </div>
            <span className="text-xs text-white/40">{t('character.pasteHint')}</span>
          </div>

          <div className="bg-[var(--wuhu-bg-surface)] flex items-center gap-2 p-2 rounded-lg">
            <span className="text-xs text-white/70 shrink-0">{t('character.generationMode')}：</span>
            <SegmentedControl
              className="flex-1"
              options={[
                { value: 'direct', label: t('character.directGenerate') },
                { value: 'extract', label: t('character.extractPrompt') },
              ]}
              value={referenceSubMode}
              onChange={(val) => setReferenceSubMode(val as 'direct' | 'extract')}
            />
          </div>

          {referenceSubMode === 'extract' && (
            <button
              onClick={handleExtractDescription}
              disabled={isExtracting || referenceImagesBase64.length === 0}
              className="bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_15px_rgba(167,87,255,0.4)] hover:shadow-[0_0_25px_rgba(255,100,200,0.5)] w-full px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isExtracting ? t('aiDesign.generating') : t('character.extractFirst')}
            </button>
          )}

          <CharacterCreationPreview
            referenceImagesBase64={referenceImagesBase64}
            fileInputRef={fileInputRef}
            onDrop={handleDrop}
            onFileSelect={handleFileSelect}
            onClearReference={handleClearReference}
          />

        </div>
      )}

      {createMode === 'description' && (
        <>
          <div className="space-y-2">
            <label className="text-white/70 block">
              {isSubAppearance ? t('character.modifyDescription') : t('character.description')} <span className="text-red-400">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder={isSubAppearance
                ? t('character.modifyDescriptionPlaceholder')
                : t('character.descPlaceholder')}
              className="bg-[var(--wuhu-bg-surface)] border border-white/20 text-white placeholder:text-white/40 rounded-lg focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_15px_rgba(255,100,200,0.3)] w-full px-3 py-2 text-sm resize-none"
            />
          </div>

          {!isSubAppearance && (
            <div className="bg-[var(--wuhu-bg-surface)] rounded-xl p-4 space-y-3 border border-white/20">
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--wuhu-neon-purple)]">
                <SparklesIcon className="w-4 h-4" />
                <span>{t('aiDesign.title')}</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiInstruction}
                  onChange={(e) => setAiInstruction(e.target.value)}
                  placeholder={t('aiDesign.placeholder')}
                  className="bg-[var(--wuhu-bg-surface)] border border-white/20 text-white placeholder:text-white/40 rounded-lg focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_15px_rgba(255,100,200,0.3)] flex-1 px-3 py-2 text-sm"
                  disabled={isAiDesigning}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleAiDesign()
                    }
                  }}
                />
                <button
                  onClick={handleAiDesign}
                  disabled={isAiDesigning || !aiInstruction.trim()}
                  className="bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_15px_rgba(167,87,255,0.4)] hover:shadow-[0_0_25px_rgba(255,100,200,0.5)] px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap"
                >
                  {isAiDesigning ? t('aiDesign.generating') : t('aiDesign.generate')}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
