'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
    ART_STYLES,
    VIDEO_RATIOS,
} from '@/lib/constants'
import { RatioSelector, StyleSelector } from './config-modal-selectors'
import { AppIcon } from '@/components/ui/icons'

interface SettingsModalProps {
    isOpen: boolean
    onClose: () => void
    artStyle?: string
    videoRatio?: string
    onArtStyleChange?: (value: string) => void
    onVideoRatioChange?: (value: string) => void
}

export function SettingsModal({
    isOpen,
    onClose,
    artStyle = 'american-comic',
    videoRatio = '9:16',
    onArtStyleChange,
    onVideoRatioChange,
}: SettingsModalProps) {
    const t = useTranslations('configModal')
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle')

    useEffect(() => {
        if (!isOpen) return
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onClose])

    const showSaved = () => {
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
    }

    const handleChange = (callback?: (value: string) => void) => (value: string) => {
        callback?.(value)
        showSaved()
    }

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
        >
            <div className="bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_50px_rgba(167,87,255,0.3)] rounded-2xl p-7 w-full max-w-3xl transform transition-all scale-100 max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-2xl font-bold text-white">{t('title')}</h2>
                    <div className="flex items-center gap-3">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--wuhu-bg-surface)] border transition-all duration-200 ${saveStatus === 'saved'
                            ? 'text-[var(--wuhu-neon-cyan)] border-[var(--wuhu-neon-cyan)]/40'
                            : 'text-white/70 border-white/20'
                            }`}>
                            {saveStatus === 'saved' ? (
                                <>
                                    <AppIcon name="check" className="w-3.5 h-3.5" />
                                    {t('saved')}
                                </>
                            ) : (
                                <>
                                    <span className="w-1.5 h-1.5 bg-[var(--wuhu-neon-cyan)] rounded-full"></span>
                                    {t('autoSave')}
                                </>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="inline-flex items-center justify-center rounded-full p-2 text-white/50 hover:text-white hover:bg-white/10 transition-all duration-200"
                        >
                            <AppIcon name="close" className="w-6 h-6" />
                        </button>
                    </div>
                </div>
                <p className="text-[12px] text-white/50 mb-6">{t('subtitle')}</p>
                <div className="space-y-5 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                    <div className="bg-[var(--wuhu-bg-surface)]/50 border border-white/5 rounded-2xl p-5 sm:p-6 space-y-4">
                        <h3 className="text-sm font-semibold text-white/70">{t('visualSettings')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white/70">{t('visualStyle')}</label>
                                <StyleSelector
                                    value={artStyle}
                                    onChange={(value) => handleChange(onArtStyleChange)(value)}
                                    options={ART_STYLES}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white/70">{t('aspectRatio')}</label>
                                <RatioSelector
                                    value={videoRatio}
                                    onChange={(value) => { handleChange(onVideoRatioChange)(value) }}
                                    options={VIDEO_RATIOS}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export { SettingsModal as ConfigEditModal }
export { WorldContextModal } from './WorldContextModal'
