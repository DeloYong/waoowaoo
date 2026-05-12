'use client'

import { useState, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useDeleteVoice } from '@/lib/query/mutations'
import { AppIcon } from '@/components/ui/icons'

interface Voice {
    id: string
    name: string
    description: string | null
    voiceId: string | null
    voiceType: string
    customVoiceUrl: string | null
    voicePrompt: string | null
    gender: string | null
    language: string
    folderId: string | null
}

interface VoiceCardProps {
    voice: Voice
    onSelect?: (voice: Voice) => void  // 选择模式时使用
    isSelected?: boolean  // 是否被选中
    selectionMode?: boolean  // 是否在选择模式
}

export function VoiceCard({ voice, onSelect, isSelected = false, selectionMode = false }: VoiceCardProps) {
    // 🔥 使用 mutation hook
    const deleteVoice = useDeleteVoice()
    const t = useTranslations('assetHub')
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [isPlaying, setIsPlaying] = useState(false)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    // 播放预览
    const handlePlay = () => {
        if (!voice.customVoiceUrl) return

        if (isPlaying && audioRef.current) {
            audioRef.current.pause()
            setIsPlaying(false)
            return
        }

        const audio = new Audio(voice.customVoiceUrl)
        audioRef.current = audio
        audio.onended = () => setIsPlaying(false)
        audio.onerror = () => setIsPlaying(false)
        audio.play()
        setIsPlaying(true)
    }

    // 删除音色
    const handleDelete = () => {
        deleteVoice.mutate(voice.id, {
            onSettled: () => setShowDeleteConfirm(false)
        })
    }

    // 选择模式点击
    const handleCardClick = () => {
        if (selectionMode && onSelect) {
            onSelect(voice)
        }
    }

    // 性别图标
    const genderIcon = voice.gender === 'male' ? 'M' : voice.gender === 'female' ? 'F' : ''

    return (
        <div
            onClick={handleCardClick}
            className={`bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/20 rounded-xl hover:border-[var(--wuhu-neon-pink)] hover:shadow-[0_0_25px_rgba(255,100,200,0.3)] transition-all duration-300 overflow-hidden relative group ${selectionMode ? 'cursor-pointer hover:ring-2 hover:ring-[var(--wuhu-neon-pink)]' : ''
                } ${isSelected ? 'ring-2 ring-[var(--wuhu-neon-pink)] shadow-[0_0_25px_rgba(255,100,200,0.3)]' : ''}`}
        >
            {/* 选中标记 */}
            {isSelected && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] rounded-full flex items-center justify-center z-10 p-0">
                    <AppIcon name="checkSolid" className="w-4 h-4 text-white" />
                </div>
            )}

            {/* 音色图标区域 */}
            <div className="relative bg-[var(--wuhu-bg-surface)] p-6 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-[var(--wuhu-neon-purple)]/20 flex items-center justify-center border border-[var(--wuhu-neon-purple)]/30">
                    <AppIcon name="mic" className="w-8 h-8 text-[var(--wuhu-neon-purple)]" />
                </div>

                {/* 性别标签 */}
                {genderIcon && (
                    <div className="absolute top-2 left-2 bg-[var(--wuhu-neon-purple)]/20 text-[var(--wuhu-neon-purple)] text-xs px-2 py-0.5 rounded-full">
                        {genderIcon}
                    </div>
                )}

                {/* 试听按钮 */}
                {voice.customVoiceUrl && (
                    <button
                        onClick={(e) => { e.stopPropagation(); handlePlay() }}
                        className={`absolute bottom-2 right-2 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${isPlaying
                            ? 'bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white animate-pulse'
                            : 'bg-[var(--wuhu-neon-purple)]/20 text-[var(--wuhu-neon-purple)] hover:bg-[var(--wuhu-neon-purple)]/30'
                            }`}
                    >
                        {isPlaying ? (
                            <AppIcon name="pause" className="w-5 h-5" />
                        ) : (
                            <AppIcon name="play" className="w-5 h-5" />
                        )}
                    </button>
                )}
            </div>

            {/* 信息区域 */}
            <div className="p-3">
                <div className="flex items-center justify-between">
                    <h3 className="font-medium text-white text-sm truncate">{voice.name}</h3>
                    {!selectionMode && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true) }}
                            className="h-6 w-6 rounded-md text-[var(--wuhu-neon-pink)] flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-[var(--wuhu-neon-pink)]/20 transition-all"
                        >
                            <AppIcon name="trash" className="w-4 h-4" />
                        </button>
                    )}
                </div>
                {voice.description && (
                    <p className="mt-1 text-xs text-white/70 line-clamp-2">{voice.description}</p>
                )}
                {voice.voicePrompt && !voice.description && (
                    <p className="mt-1 text-xs text-white/50 line-clamp-2 italic">{voice.voicePrompt}</p>
                )}
            </div>

            {/* 删除确认 */}
            {showDeleteConfirm && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20 rounded-xl">
                    <div className="bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 rounded-xl p-4 m-4 shadow-[0_0_50px_rgba(167,87,255,0.35)]" onClick={(e) => e.stopPropagation()}>
                        <p className="mb-4 text-sm text-white">{t('confirmDeleteVoice')}</p>
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setShowDeleteConfirm(false)} className="border border-[var(--wuhu-neon-purple)]/40 text-white/80 hover:bg-[var(--wuhu-neon-purple)]/20 px-3 py-1.5 rounded-lg text-sm transition-all">{t('cancel')}</button>
                            <button onClick={handleDelete} className="bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_15px_rgba(167,87,255,0.4)] px-3 py-1.5 rounded-lg text-sm transition-all">{t('delete')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default VoiceCard
