'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { MouseEvent } from 'react'
import type { Character, CharacterAppearance, Location } from '@/types/project'
import { MediaImageWithLoading } from '@/components/media/MediaImageWithLoading'
import { AppIcon } from '@/components/ui/icons'
import ImagePreviewModal from '@/components/ui/ImagePreviewModal'


type SpotlightCharCardProps = {
  char: Character
  appearance?: CharacterAppearance
  isActive: boolean
  onClick: () => void
  onOpenAssetLibrary?: () => void
  onRemove?: () => void
}

export function SpotlightCharCard({
  char,
  appearance,
  isActive,
  onClick,
  onOpenAssetLibrary,
  onRemove,
}: SpotlightCharCardProps) {
  const tScript = useTranslations('scriptView')
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const selectedIdx = appearance?.selectedIndex ?? null
  const imageUrl = appearance?.imageUrl ||
    (selectedIdx !== null ? appearance?.imageUrls?.[selectedIdx] : null) ||
    (appearance?.imageUrls?.[0])

  const hasVoice = !!char.customVoiceUrl

  const handlePlayVoice = (e: MouseEvent) => {
    e.stopPropagation()
    if (!char.customVoiceUrl) return

    if (isPlaying && audioRef) {
      audioRef.pause()
      audioRef.currentTime = 0
      setIsPlaying(false)
      return
    }

    const audio = new Audio(char.customVoiceUrl)
    setAudioRef(audio)

    audio.onended = () => {
      setIsPlaying(false)
      setAudioRef(null)
    }

    audio.onerror = () => {
      setIsPlaying(false)
      setAudioRef(null)
    }

    audio.play()
    setIsPlaying(true)
  }

  useEffect(() => {
    return () => {
      if (audioRef) {
        audioRef.pause()
        audioRef.currentTime = 0
      }
    }
  }, [audioRef])

  return (
    <div
      onClick={onClick}
      className={`
        group relative min-w-0 rounded-xl cursor-pointer transition-all duration-500 ease-out
        ${isActive
          ? 'opacity-100 scale-100 ring-2 ring-[var(--wuhu-neon-purple)] shadow-[0_0_20px_rgba(168,85,247,0.25)] bg-[var(--wuhu-bg-card)]'
          : 'opacity-50 scale-95 grayscale hover:grayscale-0 hover:opacity-100 hover:scale-95 bg-white/5'
        }
      `}
    >
      {isActive && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (confirm(tScript('confirm.removeCharacter'))) {
              onRemove()
            }
          }}
          className="absolute right-2 top-2 h-5 w-5 rounded-full bg-[var(--wuhu-neon-pink)] text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-[0_0_10px_rgba(255,100,200,0.5)] hover:scale-110 z-20"
          title={tScript('asset.removeFromClip')}
        >
          <AppIcon name="closeSm" className="h-3 w-3" />
        </button>
      )}
      <div className="aspect-square relative rounded-t-xl overflow-hidden bg-white/5">
        {imageUrl ? (
          <MediaImageWithLoading
            src={imageUrl}
            alt={char.name}
            containerClassName="w-full h-full"
            className="w-full h-full object-cover cursor-zoom-in"
            onClick={(e) => { e.stopPropagation(); setPreviewImage(imageUrl) }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-white/5 p-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-2">
              <AppIcon name="userCircle" className="w-5 h-5 text-white/50" />
            </div>
            {onOpenAssetLibrary && (
              <button
                onClick={(e) => { e.stopPropagation(); onOpenAssetLibrary() }}
                className="text-[11px] text-white/70 font-medium hover:text-[var(--wuhu-neon-purple)] transition-colors text-center leading-tight"
              >
                {tScript('asset.generateCharacter')}
              </button>
            )}
          </div>
        )}
        {isActive && (
          <div className="absolute top-2 right-2 w-2 h-2 bg-[var(--wuhu-neon-pink)] rounded-full shadow-[0_0_10px_rgba(255,100,200,0.8)] border border-white" />
        )}
      </div>
      <div className="p-2 text-center">
        <div className={`text-sm font-bold truncate ${isActive ? 'text-white' : 'text-white/50'}`}>
          {char.name}
        </div>
        {appearance?.changeReason && (
          <div className="text-xs text-white/50 truncate">{appearance.changeReason}</div>
        )}
        <button
          onClick={hasVoice ? handlePlayVoice : undefined}
          disabled={!hasVoice}
          className={`mt-1.5 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${!hasVoice
            ? 'bg-white/5 text-white/40 cursor-not-allowed border border-dashed border-white/20'
            : isPlaying
              ? 'bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]'
              : 'bg-white/5 text-white/70 hover:bg-[var(--wuhu-neon-purple)]/20 hover:text-white'
            }`}
        >
          {!hasVoice ? (
            <>
              <AppIcon name="volumeOff" className="w-3 h-3" />
              <span>{tScript('asset.noAudio')}</span>
            </>
          ) : isPlaying ? (
            <>
              <span className="flex gap-0.5">
                <span className="w-0.5 h-3 bg-[var(--wuhu-bg-surface)] rounded-full animate-pulse" />
                <span className="w-0.5 h-3 bg-[var(--wuhu-bg-surface)] rounded-full animate-pulse" style={{ animationDelay: '0.1s' }} />
                <span className="w-0.5 h-3 bg-[var(--wuhu-bg-surface)] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
              </span>
              <span>{tScript('asset.playing')}</span>
            </>
          ) : (
            <>
              <AppIcon name="play" className="w-3 h-3" />
              <span>{tScript('asset.listen')}</span>
            </>
          )}
        </button>
      </div>
      {previewImage && typeof document !== 'undefined' && createPortal(
        <ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />,
        document.body
      )}
    </div>
  )
}

export function getSelectedLocationImage(location: Location) {
  const byId = location.selectedImageId
    ? location.images?.find(img => img.id === location.selectedImageId)
    : undefined
  const byFlag = location.images?.find(img => img.isSelected)
  const withUrl = location.images?.find(img => img.imageUrl)
  return byId || byFlag || withUrl || location.images?.[0]
}

type SpotlightLocationCardProps = {
  location: Location
  isActive: boolean
  onClick: () => void
  onOpenAssetLibrary?: () => void
  onRemove?: () => void
}

export function SpotlightLocationCard({
  location,
  isActive,
  onClick,
  onOpenAssetLibrary,
  onRemove,
}: SpotlightLocationCardProps) {
  const tScript = useTranslations('scriptView')
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const image = getSelectedLocationImage(location)
  const imageUrl = image?.imageUrl

  return (
    <div
      onClick={onClick}
      className={`
        group relative min-w-0 rounded-xl cursor-pointer transition-all duration-500 ease-out
        ${isActive
          ? 'opacity-100 scale-100 ring-2 ring-[var(--wuhu-neon-purple)] shadow-[0_0_20px_rgba(168,85,247,0.25)] bg-[var(--wuhu-bg-card)]'
          : 'opacity-50 scale-95 grayscale hover:grayscale-0 hover:opacity-100 hover:scale-95 bg-white/5'
        }
      `}
    >
      {isActive && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (confirm(tScript('confirm.removeLocation'))) {
              onRemove()
            }
          }}
          className="absolute right-2 top-2 h-5 w-5 rounded-full bg-[var(--wuhu-neon-pink)] text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-[0_0_10px_rgba(255,100,200,0.5)] hover:scale-110 z-20"
          title={tScript('asset.removeFromClip')}
        >
          <AppIcon name="closeSm" className="h-3 w-3" />
        </button>
      )}
      <div className="aspect-video relative rounded-t-xl overflow-hidden bg-white/5">
        {imageUrl ? (
          <MediaImageWithLoading
            src={imageUrl}
            alt={location.name}
            containerClassName="w-full h-full"
            className="w-full h-full object-cover cursor-zoom-in"
            onClick={(e) => { e.stopPropagation(); setPreviewImage(imageUrl) }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-white/5 p-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-2">
              <AppIcon name="imagePreview" className="w-5 h-5 text-white/50" />
            </div>
            {onOpenAssetLibrary && (
              <button
                onClick={(e) => { e.stopPropagation(); onOpenAssetLibrary() }}
                className="text-[11px] text-white/70 font-medium hover:text-[var(--wuhu-neon-purple)] transition-colors text-center leading-tight"
              >
                {tScript('asset.generateLocation')}
              </button>
            )}
          </div>
        )}
        {isActive && (
          <div className="absolute top-2 right-2 w-2 h-2 bg-[var(--wuhu-neon-pink)] rounded-full shadow-[0_0_10px_rgba(255,100,200,0.8)] border border-white" />
        )}
      </div>
      <div className="p-2 text-center">
        <div className={`text-sm font-bold truncate ${isActive ? 'text-white' : 'text-white/50'}`}>
          {location.name}
        </div>
      </div>
      {previewImage && typeof document !== 'undefined' && createPortal(
        <ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />,
        document.body
      )}
    </div>
  )
}
