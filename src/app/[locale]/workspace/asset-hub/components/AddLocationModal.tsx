'use client'
import { logError as _ulogError } from '@/lib/logging/core'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ART_STYLES } from '@/lib/constants'
import { useAiDesignLocation, useCreateAssetHubLocation } from '@/lib/query/hooks'
import { useImageGenerationCount } from '@/lib/image-generation/use-image-generation-count'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import { resolveTaskPresentationState } from '@/lib/task/presentation'
import { AppIcon } from '@/components/ui/icons'
import type { LocationAvailableSlot } from '@/lib/location-available-slots'

interface AddLocationModalProps {
    folderId: string | null
    onClose: () => void
    onSuccess: () => void
}

// 内联 SVG 图标
const XMarkIcon = ({ className }: { className?: string }) => (
    <AppIcon name="close" className={className} />
)

const SparklesIcon = ({ className }: { className?: string }) => (
    <AppIcon name="sparklesAlt" className={className} />
)

export function AddLocationModal({ folderId, onClose, onSuccess }: AddLocationModalProps) {
    const t = useTranslations('assetHub')

    // 表单字段
    const [name, setName] = useState('')
    const [summary, setSummary] = useState('')
    const [aiInstruction, setAiInstruction] = useState('')
    const [artStyle, setArtStyle] = useState('american-comic')
    const [availableSlots, setAvailableSlots] = useState<LocationAvailableSlot[]>([])

    const aiDesignMutation = useAiDesignLocation()
    const createLocationMutation = useCreateAssetHubLocation()
    const { count: locationGenerationCount } = useImageGenerationCount('location')
    const isSubmitting = createLocationMutation.isPending
    const isAiDesigning = aiDesignMutation.isPending
    const aiDesigningState = isAiDesigning
        ? resolveTaskPresentationState({
            phase: 'processing',
            intent: 'generate',
            resource: 'image',
            hasOutput: false,
        })
        : null
    const submittingState = isSubmitting
        ? resolveTaskPresentationState({
            phase: 'processing',
            intent: 'generate',
            resource: 'image',
            hasOutput: false,
        })
        : null

    // AI 设计描述
    const handleAiDesign = async () => {
        if (!aiInstruction.trim()) return

        try {
            const data = await aiDesignMutation.mutateAsync(aiInstruction.trim())
            setSummary(data.prompt || '')
            setAvailableSlots(Array.isArray(data.availableSlots) ? data.availableSlots : [])
            setAiInstruction('')
        } catch (error) {
            _ulogError('AI设计失败:', error)
        }
    }

    // 提交
    const handleSubmit = async () => {
        if (!name.trim() || !summary.trim()) return

        try {
            await createLocationMutation.mutateAsync({
                name: name.trim(),
                summary: summary.trim(),
                folderId,
                artStyle,
                count: locationGenerationCount,
                availableSlots,
            })
            onSuccess()
        } catch (error) {
            _ulogError('创建场景失败:', error)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_40px_rgba(167,87,255,0.2)] rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
                <div className="p-6">
                    {/* 标题 */}
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-white">
                            {t('modal.newLocation')}
                        </h3>
                        <button
                            onClick={onClose}
                            className="h-8 w-8 rounded-full flex items-center justify-center text-white/50 hover:text-white/70 transition-all"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-5">
                        {/* AI 设计区域 */}
                        <div className="bg-[var(--wuhu-bg-surface)] border border-white/20 rounded-xl p-4 space-y-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-white">
                                <SparklesIcon className="w-4 h-4" />
                                <span>{t('modal.aiDesign')}</span>
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={aiInstruction}
                                    onChange={(e) => setAiInstruction(e.target.value)}
                                    placeholder={t('modal.aiDesignLocationPlaceholder')}
                                    className="bg-[var(--wuhu-bg-surface)] border border-white/20 rounded-lg flex-1 px-3 py-2 text-sm text-white focus:border-[var(--wuhu-neon-pink)] focus:outline-none transition-all"
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
                                    className="bg-[var(--wuhu-neon-purple)]/20 text-[var(--wuhu-neon-purple)] hover:bg-[var(--wuhu-neon-purple)]/30 px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {isAiDesigning ? (
                                        <TaskStatusInline state={aiDesigningState} className="text-white [&>span]:text-white [&_svg]:text-white" />
                                    ) : (
                                        <>
                                            <SparklesIcon className="w-4 h-4" />
                                            <span>{t('modal.generate')}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                            <p className="text-xs text-white/50">
                                {t('modal.aiDesignLocationTip')}
                            </p>
                        </div>

                        {/* 场景名称 */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-white/70">
                                {t('modal.locationNameLabel')}
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t('modal.locationNamePlaceholder')}
                                className="bg-[var(--wuhu-bg-surface)] border border-white/20 rounded-lg w-full px-3 py-2 text-sm text-white focus:border-[var(--wuhu-neon-pink)] focus:outline-none transition-all"
                            />
                        </div>

                        {/* 风格选择 */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-white/70">
                                画面风格
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {ART_STYLES.map((style) => (
                                    <button
                                        key={style.value}
                                        type="button"
                                        onClick={() => setArtStyle(style.value)}
                                        className={`px-3 py-2 rounded-lg text-sm border flex items-center justify-start transition-all ${artStyle === style.value
                                            ? 'bg-[var(--wuhu-neon-purple)]/20 text-[var(--wuhu-neon-purple)] border-[var(--wuhu-neon-purple)]'
                                            : 'bg-transparent border-white/20 text-white/70 hover:border-white/40'
                                            }`}
                                    >
                                        <span>{style.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 场景描述 */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-white/70">
                                {t('modal.locationSummaryLabel')}
                            </label>
                            <textarea
                                value={summary}
                                onChange={(e) => setSummary(e.target.value)}
                                placeholder={t('modal.locationSummaryPlaceholder')}
                                className="bg-[var(--wuhu-bg-surface)] border border-white/20 rounded-lg w-full h-40 px-3 py-2 text-sm text-white focus:border-[var(--wuhu-neon-pink)] focus:outline-none transition-all resize-none"
                            />
                        </div>
                    </div>

                    {/* 按钮区 */}
                    <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-white/20">
                        <button
                            onClick={onClose}
                            className="bg-[var(--wuhu-bg-surface)] border border-white/20 hover:bg-white/5 text-white/70 hover:text-white px-4 py-2 rounded-lg text-sm transition-all"
                            disabled={isSubmitting}
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !name.trim() || !summary.trim()}
                            className="bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] shadow-[0_0_20px_rgba(167,87,255,0.3)] hover:shadow-[0_0_30px_rgba(167,87,255,0.4)] text-white px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {isSubmitting ? (
                                <TaskStatusInline state={submittingState} className="text-white [&>span]:text-white [&_svg]:text-white" />
                            ) : (
                                <span>{t('modal.addLocation')}</span>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
