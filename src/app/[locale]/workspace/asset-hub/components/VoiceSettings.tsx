'use client'

/**
 * 音色设置组件 - 从 CharacterCard 提取
 * 支持上传自定义音频和 AI 声音设计
 */

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { shouldShowError } from '@/lib/error-utils'
import { useUploadCharacterVoice } from '@/lib/query/mutations'
import { AppIcon } from '@/components/ui/icons'

interface VoiceSettingsProps {
    characterId: string
    characterName: string
    customVoiceUrl: string | null | undefined
    projectId?: string  // 可选，Asset Hub 不需要
    onVoiceChange?: (characterId: string, customVoiceUrl?: string) => void
    onVoiceDesign?: (characterId: string, characterName: string) => void
    onVoiceSelect?: (characterId: string) => void  // 从音色库选择
    compact?: boolean  // 紧凑模式（单图卡片用）
}

export default function VoiceSettings({
    characterId,
    characterName,
    customVoiceUrl,
    projectId,
    onVoiceChange,
    onVoiceDesign,
    onVoiceSelect,
    compact = false
}: VoiceSettingsProps) {
    const t = useTranslations('assetHub')
    // 🔥 使用 mutation hook
    const uploadVoice = useUploadCharacterVoice()
    void projectId
    const voiceFileInputRef = useRef<HTMLInputElement>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const [isPreviewingVoice, setIsPreviewingVoice] = useState(false)
    type UploadedVoiceResult = { audioUrl?: string }

    const hasCustomVoice = !!customVoiceUrl

    // 预览音色（播放/暂停自定义音频）
    const handlePreviewVoice = async () => {
        if (!customVoiceUrl) return

        // 如果正在播放，点击则暂停
        if (isPreviewingVoice && audioRef.current) {
            audioRef.current.pause()
            setIsPreviewingVoice(false)
            return
        }

        try {
            if (audioRef.current) {
                audioRef.current.pause()
            }
            const audio = new Audio(customVoiceUrl)
            audioRef.current = audio
            audio.play()
            audio.onended = () => setIsPreviewingVoice(false)
            audio.onerror = () => setIsPreviewingVoice(false)
            setIsPreviewingVoice(true)
        } catch (error: unknown) {
            if (shouldShowError(error)) {
                const message = error instanceof Error ? error.message : String(error)
                alert(t('voiceSettings.previewFailed', { error: message }))
            }
            setIsPreviewingVoice(false)
        }
    }

    // 上传自定义音频
    const handleUploadVoice = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        uploadVoice.mutate(
            { file, characterId },
            {
                onSuccess: (data) => {
                    const result = (data || {}) as UploadedVoiceResult
                    onVoiceChange?.(characterId, result.audioUrl)
                },
                onError: (error) => {
                    if (shouldShowError(error)) {
                        alert(t('voiceSettings.uploadFailed', { error: error.message }))
                    }
                },
                onSettled: () => {
                    if (voiceFileInputRef.current) {
                        voiceFileInputRef.current.value = ''
                    }
                }
            }
        )
    }

    // 紧凑模式样式
    const containerClass = compact
        ? 'bg-[var(--wuhu-bg-surface)] border border-white/20 rounded-xl p-3'
        : 'mt-4 bg-[var(--wuhu-bg-surface)] border border-white/20 rounded-xl p-4'

    const headerClass = compact
        ? 'flex items-center gap-2 mb-2 pb-2 border-b'
        : 'flex items-center gap-2 mb-3 pb-2 border-b'

    const iconSize = compact ? 'w-5 h-5' : 'w-6 h-6'
    const innerIconSize = compact ? 'w-3 h-3' : 'w-3.5 h-3.5'

    return (
        <div className={containerClass}>
            <div className={`${headerClass} ${hasCustomVoice ? 'border-white/20' : 'border-[var(--wuhu-neon-pink)]'}`}>
                <div className={`${iconSize} rounded-full flex items-center justify-center ${hasCustomVoice ? 'bg-white/10 text-white/70' : 'bg-[var(--wuhu-neon-pink)]/20 text-[var(--wuhu-neon-pink)]'} p-0`}>
                    <AppIcon name="mic" className={`${innerIconSize}`} />
                </div>
                <span className={`text-${compact ? 'xs' : 'sm'} font-medium ${hasCustomVoice ? 'text-white/70' : 'text-[var(--wuhu-neon-pink)]'}`}>
                    {t('voiceSettings.title')}{!hasCustomVoice && <span className="text-[var(--wuhu-neon-pink)]">({t('voiceSettings.noVoice')})</span>}
                </span>
            </div>

            {/* 隐藏的音频文件输入 */}
            <input
                ref={voiceFileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleUploadVoice}
                className="hidden"
            />

            <div className="flex gap-2 w-full justify-center flex-wrap">
                <button
                    onClick={() => voiceFileInputRef.current?.click()}
                    disabled={uploadVoice.isPending}
                    className="border border-white/20 text-white/70 hover:border-[var(--wuhu-neon-pink)] hover:text-white hover:bg-white/10 flex-1 min-w-[70px] px-2 py-1.5 rounded-lg text-xs font-medium transition-all relative group whitespace-nowrap"
                >
                    <div className="flex items-center justify-center gap-1">
                        {hasCustomVoice && <div className="w-1.5 h-1.5 bg-[var(--wuhu-neon-cyan)] rounded-full flex-shrink-0"></div>}
                        <span>{uploadVoice.isPending ? t('voiceSettings.uploading') : hasCustomVoice ? t('voiceSettings.uploaded') : t('voiceSettings.uploadAudio')}</span>
                    </div>
                </button>

                {onVoiceDesign && (
                    <button
                        onClick={() => onVoiceDesign(characterId, characterName)}
                        className="bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_15px_rgba(167,87,255,0.4)] hover:shadow-[0_0_25px_rgba(255,100,200,0.5)] flex-1 min-w-[70px] px-2 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap"
                    >
                        <div className="flex items-center justify-center gap-1">
                            <AppIcon name="bolt" className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{t('voiceSettings.aiDesign')}</span>
                        </div>
                    </button>
                )}

                {onVoiceSelect && (
                    <button
                        onClick={() => onVoiceSelect(characterId)}
                        className="border border-white/20 text-[var(--wuhu-neon-purple)] hover:border-[var(--wuhu-neon-pink)] hover:text-white hover:bg-white/10 flex-1 min-w-[70px] px-2 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap"
                    >
                        <div className="flex items-center justify-center gap-1">
                            <AppIcon name="folderCards" className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{t('voiceSettings.voiceLibrary')}</span>
                        </div>
                    </button>
                )}
            </div>

            {/* 试听按钮 - 仅在有音频时显示 */}
            {hasCustomVoice && (
                <button
                    onClick={handlePreviewVoice}
                    className={`w-full mt-2 px-3 py-2 border rounded-lg text-sm font-medium transition-all ${isPreviewingVoice
                        ? 'bg-[var(--wuhu-neon-purple)] text-white border-[var(--wuhu-neon-pink)] shadow-[0_0_15px_rgba(167,87,255,0.4)]'
                        : 'border-white/20 text-[var(--wuhu-neon-purple)] hover:border-[var(--wuhu-neon-pink)] hover:text-white hover:bg-white/10'
                        }`}
                >
                    <div className="flex items-center justify-center gap-2">
                        {isPreviewingVoice ? (
                            <AppIcon name="pause" className="w-4 h-4" />
                        ) : (
                            <AppIcon name="play" className="w-4 h-4" />
                        )}
                        {isPreviewingVoice ? t('voiceSettings.pause') : t('voiceSettings.preview')}
                    </div>
                </button>
            )}
        </div>
    )
}