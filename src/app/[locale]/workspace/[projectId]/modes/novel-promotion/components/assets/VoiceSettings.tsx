'use client'

/**
 * 音色设置组件 - 从 CharacterCard 提取
 * 支持上传自定义音频和 AI 声音设计
 */

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'react-hot-toast'
import { shouldShowError } from '@/lib/error-utils'
import { useUploadProjectCharacterVoice } from '@/lib/query/mutations'
import { AppIcon } from '@/components/ui/icons'

interface VoiceSettingsProps {
    characterId: string
    characterName: string
    customVoiceUrl: string | null | undefined
    projectId: string
    onVoiceChange?: (characterId: string, customVoiceUrl?: string) => void
    onVoiceDesign?: (characterId: string, characterName: string) => void
    onSelectFromHub?: (characterId: string) => void  // 从资产中心选择音色
    compact?: boolean  // 紧凑模式（单图卡片用）
}

function getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error) return error.message
    if (typeof error === 'object' && error !== null) {
        const message = (error as { message?: unknown }).message
        if (typeof message === 'string') return message
    }
    return fallback
}

export default function VoiceSettings({
    characterId,
    characterName,
    customVoiceUrl,
    projectId,
    onVoiceChange,
    onVoiceDesign,
    onSelectFromHub,
    compact = false
}: VoiceSettingsProps) {
    const t = useTranslations('assets')
    // 🔥 使用 mutation
    const uploadVoice = useUploadProjectCharacterVoice(projectId)
    const voiceFileInputRef = useRef<HTMLInputElement>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const [isPreviewingVoice, setIsPreviewingVoice] = useState(false)

    const hasCustomVoice = !!customVoiceUrl

    const confirmUploadVoice = () => {
        return window.confirm(t('tts.uploadQwenHint'))
    }

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
                toast.error(t('tts.previewFailed', { error: getErrorMessage(error, t('common.unknownError')) }))
            }
            setIsPreviewingVoice(false)
        }
    }

    // 上传自定义音频
    const handleUploadVoice = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !projectId) {
            if (voiceFileInputRef.current) voiceFileInputRef.current.value = ''
            return
        }

        if (!confirmUploadVoice()) {
            if (voiceFileInputRef.current) voiceFileInputRef.current.value = ''
            return
        }

        uploadVoice.mutate(
            { file, characterId },
            {
                onSuccess: (data) => {
                    const result = (data || {}) as UploadedVoiceResult
                    onVoiceChange?.(characterId, result.audioUrl)
                    toast.success(t('tts.uploaded') || 'Uploaded Successfully')
                },
                onError: (error) => {
                    if (shouldShowError(error)) {
                        toast.error(t('tts.uploadFailed', { error: error.message }))
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
        ? 'border border-[rgba(167, 87, 255, 0.2)] rounded-xl p-3 bg-[var(--wuhu-bg-surface)]'
        : 'mt-4 border border-[rgba(167, 87, 255, 0.2)] rounded-xl p-4 bg-[var(--wuhu-bg-surface)]'


    const iconSize = compact ? 'w-5 h-5' : 'w-6 h-6'
    const innerIconSize = compact ? 'w-3 h-3' : 'w-3.5 h-3.5'

    const [isExpanded, setIsExpanded] = useState(false)

    return (
        <div className={containerClass}>
            {/* 折叠标题行 - 点击展开/收起 */}
            <button
                type="button"
                onClick={() => setIsExpanded((v) => !v)}
                className="w-full flex items-center justify-between cursor-pointer"
            >
                <div className="flex items-center gap-2">
                    <div className={`${iconSize} rounded-full flex items-center justify-center ${hasCustomVoice ? 'bg-[rgba(255,255,255,0.05)]' : 'bg-[rgba(255, 100, 200, 0.1)]'}`}>
                        <AppIcon name="mic" className={`${innerIconSize} ${hasCustomVoice ? 'text-[rgba(255,255,255,0.7)]' : 'text-[var(--wuhu-neon-pink)]'}`} />
                    </div>
                    <span className={`text-${compact ? 'xs' : 'sm'} font-medium text-[rgba(255,255,255,0.7)]`}>
                        {t('tts.title')}
                    </span>
                    <span className={`w-2 h-2 rounded-full ${hasCustomVoice ? 'bg-[var(--wuhu-neon-purple)]' : 'bg-[var(--wuhu-neon-pink)]'}`} />
                </div>
                <AppIcon
                    name="chevronDown"
                    className={`w-4 h-4 text-[rgba(255,255,255,0.5)] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                />
            </button>

            {/* 展开内容 */}
            {isExpanded && (
                <div className="mt-3 pt-3 border-t border-[rgba(167, 87, 255, 0.2)]">
                    {/* 隐藏的音频文件输入 */}
                    <input
                        ref={voiceFileInputRef}
                        type="file"
                        accept="audio/*"
                        onChange={handleUploadVoice}
                        className="hidden"
                    />

                    <div className="flex flex-wrap gap-2 w-full justify-center">
                        {/* 上传音频按钮 */}
                        <button
                            onClick={() => {
                                voiceFileInputRef.current?.click()
                            }}
                            disabled={uploadVoice.isPending}
                            className="flex-1 min-w-[80px] px-2 py-1.5 bg-[var(--wuhu-bg-surface)] border border-[rgba(167, 87, 255, 0.2)] rounded-lg text-xs text-[rgba(255,255,255,0.7)] font-medium hover:border-[var(--wuhu-neon-purple)] hover:bg-[rgba(167, 87, 255, 0.2)] hover:text-[var(--wuhu-neon-purple)] transition-all relative group whitespace-nowrap"
                        >
                            <div className="flex items-center justify-center gap-1">
                                {hasCustomVoice && <div className="w-1.5 h-1.5 bg-[var(--wuhu-neon-purple)] rounded-full flex-shrink-0"></div>}
                                <span>{uploadVoice.isPending ? t('tts.uploading') : hasCustomVoice ? t('tts.uploaded') : t('tts.uploadAudio')}</span>
                            </div>
                        </button>

                        {/* 从资产中心选择按钮 */}
                        {onSelectFromHub && (
                            <button
                                onClick={() => onSelectFromHub(characterId)}
                                className="flex-1 min-w-[80px] px-2 py-1.5 bg-[var(--wuhu-bg-surface)] border border-[var(--wuhu-neon-cyan)] rounded-lg text-xs text-[var(--wuhu-neon-cyan)] font-medium hover:border-[var(--wuhu-neon-cyan)] hover:bg-[rgba(0, 255, 255, 0.1)] transition-all whitespace-nowrap"
                            >
                                <div className="flex items-center justify-center gap-1">
                                    <AppIcon name="copy" className="w-3.5 h-3.5 flex-shrink-0" />
                                    <span>{t('assetLibrary.button')}</span>
                                </div>
                            </button>
                        )}

                        {/* AI设计按钮 */}
                        {onVoiceDesign && (
                            <button
                                onClick={() => onVoiceDesign(characterId, characterName)}
                                className="bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_20px_rgba(167,87,255,0.3)] hover:shadow-[0_0_30px_rgba(167,87,255,0.4)] rounded-lg transition-all flex-1 min-w-[80px] px-2 py-1.5 text-xs font-medium whitespace-nowrap"
                            >
                                <div className="flex items-center justify-center gap-1">
                                    <AppIcon name="bolt" className="w-3.5 h-3.5 flex-shrink-0" />
                                    <span>{t('modal.aiDesign')}</span>
                                </div>
                            </button>
                        )}
                    </div>

                    {/* 试听按钮 - 仅在有音频时显示 */}
                    {hasCustomVoice && (
                        <button
                            onClick={handlePreviewVoice}
                            className={`w-full mt-2 px-3 py-2 border rounded-lg text-sm font-medium transition-all ${isPreviewingVoice
                                ? 'bg-[var(--wuhu-neon-purple)] border-[var(--wuhu-neon-cyan)] text-white hover:bg-[var(--wuhu-neon-pink)]'
                                : 'bg-[rgba(0, 255, 255, 0.1)] border-[var(--wuhu-neon-cyan)] text-[var(--wuhu-neon-cyan)] hover:bg-[rgba(0, 255, 255, 0.1)]'
                                }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                {isPreviewingVoice ? (
                                    <AppIcon name="pause" className="w-4 h-4" />
                                ) : (
                                    <AppIcon name="play" className="w-4 h-4" />
                                )}
                                {isPreviewingVoice ? t('tts.pause') : t('tts.preview')}
                            </div>
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
    type UploadedVoiceResult = { audioUrl?: string }
