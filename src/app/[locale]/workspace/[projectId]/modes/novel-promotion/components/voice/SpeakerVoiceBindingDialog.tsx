'use client'

import { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'
import VoicePickerDialog from '@/app/[locale]/workspace/asset-hub/components/VoicePickerDialog'
import VoiceCreationModal from '@/app/[locale]/workspace/asset-hub/components/VoiceCreationModal'
import { AppIcon } from '@/components/ui/icons'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import type { InlineSpeakerVoiceBinding } from '@/lib/novel-promotion/stages/voice-stage-runtime/types'

type BindingTab = 'select' | 'upload' | 'design'

interface SpeakerVoiceBindingDialogProps {
    isOpen: boolean
    speaker: string
    projectId: string
    episodeId: string
    onClose: () => void
    onBound: (speaker: string, binding: InlineSpeakerVoiceBinding) => void
}

/**
 * 内联音色绑定弹窗
 * 用于不在资产库中的角色/发言人在配音阶段直接绑定音色
 * 提供三种绑定方式：从音色库选择、上传音频、AI设计音色（Tab 切换）
 */
export default function SpeakerVoiceBindingDialog({
    isOpen,
    speaker,
    onClose,
    onBound,
}: SpeakerVoiceBindingDialogProps) {
    const t = useTranslations('voice.inlineBinding')
    const [activeTab, setActiveTab] = useState<BindingTab>('select')
    // 子弹窗打开标记
    const [subDialogOpen, setSubDialogOpen] = useState(false)

    const handleClose = useCallback(() => {
        setActiveTab('select')
        setSubDialogOpen(false)
        onClose()
    }, [onClose])

    const confirmUploadVoice = useCallback(() => {
        return window.confirm(t('uploadQwenHint'))
    }, [t])

    // 从音色库选择后的回调
    const handleVoiceSelected = useCallback((voice: {
        id: string
        customVoiceUrl: string | null
        voiceId: string | null
        voiceType: string
    }) => {
        if (voice.voiceId) {
            // 根据 voiceId 格式推断 provider：
            // - qwen-tts-vd- 开头 → bailian
            // - S_ 开头（克隆音色）或 _mars_/_moon_/_uranus_/_bigtts_ 格式 → ark
            // - 其他 → bailian（兜底）
            const inferProvider = (vid: string): 'bailian' | 'ark' => {
                if (vid.startsWith('qwen-tts-vd-')) return 'bailian'
                if (vid.startsWith('S_')) return 'ark'
                if (vid.includes('_mars_') || vid.includes('_moon_') || vid.includes('_uranus_') || vid.includes('_bigtts')) return 'ark'
                // Ark 音色设计 API 返回的 voiceId 通常不是 qwen 格式
                // 如果 voiceType 包含 ark 或 doubao 关键字
                if (voice.voiceType?.includes('ark') || voice.voiceType?.includes('doubao')) return 'ark'
                return 'bailian'
            }
            const provider = inferProvider(voice.voiceId)
            onBound(speaker, {
                provider,
                voiceType: voice.voiceType,
                voiceId: voice.voiceId,
                ...(voice.customVoiceUrl ? { previewAudioUrl: voice.customVoiceUrl } : {}),
            })
        } else if (voice.customVoiceUrl) {
            onBound(speaker, {
                provider: 'fal',
                voiceType: voice.voiceType,
                audioUrl: voice.customVoiceUrl,
            })
            alert(t('uploadQwenHint'))
        }
        setSubDialogOpen(false)
        onClose()
    }, [speaker, onBound, onClose, t])

    // AI 设计音色或上传音频后的回调
    const handleCreationSuccess = useCallback((createdVoice?: {
        id: string
        voiceId: string
        voiceType: string
        customVoiceUrl: string | null
    }) => {
        // 如果创建成功并返回了音色信息，直接使用它绑定到角色
        if (createdVoice) {
            // 根据 voiceId 格式推断 provider
            const inferProvider = (vid: string): 'bailian' | 'ark' => {
                if (vid.startsWith('qwen-tts-vd-')) return 'bailian'
                if (vid.startsWith('S_')) return 'ark'
                if (vid.includes('_mars_') || vid.includes('_moon_') || vid.includes('_uranus_') || vid.includes('_bigtts')) return 'ark'
                if (createdVoice.voiceType?.includes('ark') || createdVoice.voiceType?.includes('doubao')) return 'ark'
                return 'bailian'
            }
            const provider = inferProvider(createdVoice.voiceId)
            onBound(speaker, {
                provider,
                voiceType: createdVoice.voiceType,
                voiceId: createdVoice.voiceId,
                ...(createdVoice.customVoiceUrl ? { previewAudioUrl: createdVoice.customVoiceUrl } : {}),
            })
            onClose()
        } else {
            // 如果没有返回音色信息（兼容旧逻辑），切换到选择模式
            setActiveTab('select')
            setSubDialogOpen(true)
        }
    }, [speaker, onBound, onClose])

    const handleTabClick = useCallback((tab: BindingTab) => {
        if (tab === 'upload' && !confirmUploadVoice()) {
            return
        }
        setActiveTab(tab)
        setSubDialogOpen(true)
    }, [confirmUploadVoice])

    if (!isOpen) return null
    if (typeof document === 'undefined') return null

    // 音色库选择 — 直接渲染 VoicePickerDialog
    if (activeTab === 'select' && subDialogOpen) {
        return (
            <VoicePickerDialog
                isOpen
                onClose={handleClose}
                onSelect={handleVoiceSelected}
            />
        )
    }

    // 上传/AI设计 — 渲染 VoiceCreationModal
    if ((activeTab === 'upload' || activeTab === 'design') && subDialogOpen) {
        return (
            <VoiceCreationModal
                isOpen
                folderId={null}
                initialVoiceName={speaker}
                onClose={handleClose}
                onSuccess={handleCreationSuccess}
            />
        )
    }

    // 主弹窗：Tab 切换
    return createPortal(
        <>
            <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm" onClick={handleClose} />
            <div
                className="fixed z-[10000] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_50px_rgba(167,87,255,0.3)] rounded-2xl w-full max-w-md overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 头部 */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/5">
                    <div className="flex items-center gap-2 min-w-0">
                        <AppIcon name="mic" className="w-5 h-5 text-[var(--wuhu-neon-purple)] shrink-0" />
                        <h2 className="font-semibold text-white truncate">
                            {t('title', { speaker })}
                        </h2>
                    </div>
                    <button onClick={handleClose} className="p-1 text-white/40 hover:text-white hover:bg-white/10 rounded-lg shrink-0 transition-colors">
                        <AppIcon name="close" className="w-5 h-5" />
                    </button>
                </div>

                {/* 描述 */}
                <div className="px-5 pt-4 pb-2">
                    <p className="text-sm text-white/70">
                        {t('description')}
                    </p>
                </div>

                <div className="px-5 py-3">
                    <SegmentedControl
                        options={[
                            { value: 'select' as const, label: t('selectFromLibrary') },
                            { value: 'upload' as const, label: t('uploadAudio') },
                            { value: 'design' as const, label: t('aiDesign') },
                        ]}
                        value={activeTab}
                        onChange={(val) => handleTabClick(val as BindingTab)}
                    />
                </div>

                {/* Tab 内容区 — 显示描述和进入按钮 */}
                <div className="p-5">
                    <div className="text-center py-6">
                        <div className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-3 ${activeTab === 'select' ? 'bg-[var(--wuhu-neon-purple)]/15'
                            : activeTab === 'upload' ? 'bg-[var(--wuhu-neon-cyan)]/15'
                                : 'bg-[var(--wuhu-neon-pink)]/15'
                            }`}>
                            <AppIcon
                                name={activeTab === 'select' ? 'mic' : activeTab === 'upload' ? 'cloudUpload' : 'idea'}
                                className={`w-6 h-6 ${activeTab === 'select' ? 'text-[var(--wuhu-neon-purple)]'
                                    : activeTab === 'upload' ? 'text-[var(--wuhu-neon-cyan)]'
                                        : 'text-[var(--wuhu-neon-pink)]'
                                    }`}
                            />
                        </div>
                        <p className="text-sm text-white/70 mb-4">
                            {activeTab === 'select' && t('selectFromLibraryDesc')}
                            {activeTab === 'upload' && t('uploadAudioDesc')}
                            {activeTab === 'design' && t('aiDesignDesc')}
                        </p>
                        <button
                            onClick={() => {
                                if (activeTab === 'upload' && !confirmUploadVoice()) return
                                setSubDialogOpen(true)
                            }}
                            className="bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_15px_rgba(167,87,255,0.4)] px-8 py-2.5 rounded-lg text-sm font-medium hover:shadow-[0_0_25px_rgba(167,87,255,0.6)] transition-all"
                        >
                            {activeTab === 'select' && t('selectFromLibrary')}
                            {activeTab === 'upload' && t('uploadAudio')}
                            {activeTab === 'design' && t('aiDesign')}
                        </button>
                    </div>
                </div>
            </div>
        </>,
        document.body,
    )
}
