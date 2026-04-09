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
            className="fixed inset-0 z-[100] flex items-center justify-center glass-overlay animate-fadeIn"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
        >
            <div className="glass-surface-modal p-7 w-full max-w-3xl transform transition-all scale-100 max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-2xl font-bold text-[var(--glass-text-primary)]">{t('title')}</h2>
                    <div className="flex items-center gap-3">
                        <div className={`glass-chip text-xs transition-all duration-300 ${saveStatus === 'saved'
                            ? 'glass-chip-success'
                            : 'glass-chip-neutral'
                            }`}>
                            {saveStatus === 'saved' ? (
                                <>
                                    <AppIcon name="check" className="w-3.5 h-3.5" />
                                    {t('saved')}
                                </>
                            ) : (
                                <>
                                    <span className="w-1.5 h-1.5 bg-[var(--glass-tone-success-fg)] rounded-full"></span>
                                    {t('autoSave')}
                                </>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="glass-btn-base glass-btn-soft rounded-full p-2 text-[var(--glass-text-tertiary)] hover:text-[var(--glass-text-secondary)]"
                        >
                            <AppIcon name="close" className="w-6 h-6" />
                        </button>
                    </div>
                </div>
                <p className="text-[12px] text-[var(--glass-text-tertiary)] mb-6">{t('subtitle')}</p>
                <div className="space-y-5 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                    <div className="glass-surface-soft p-5 sm:p-6 space-y-4">
                        <h3 className="text-sm font-semibold text-[var(--glass-text-tertiary)]">{t('visualSettings')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--glass-text-secondary)]">{t('visualStyle')}</label>
                                <StyleSelector
                                    value={artStyle}
                                    onChange={(value) => handleChange(onArtStyleChange)(value)}
                                    options={ART_STYLES}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--glass-text-secondary)]">{t('aspectRatio')}</label>
                                <RatioSelector
                                    value={videoRatio}
                                    onChange={(value) => { handleChange(onVideoRatioChange)(value) }}
                                    options={VIDEO_RATIOS}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="glass-surface-soft p-5 sm:p-6">
                        <p className="text-sm text-[var(--glass-text-tertiary)]">
                            模型配置已由管理员统一管理，无需个人设置
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export { SettingsModal as ConfigEditModal }
export { WorldContextModal } from './WorldContextModal'
