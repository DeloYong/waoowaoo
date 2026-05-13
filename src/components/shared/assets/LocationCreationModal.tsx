'use client'
import { logError as _ulogError } from '@/lib/logging/core'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'
import { ART_STYLES } from '@/lib/constants'
import { shouldShowError } from '@/lib/error-utils'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import { resolveTaskPresentationState } from '@/lib/task/presentation'
import {
    useAiCreateProjectLocation,
    useAiDesignLocation,
    useCreateAssetHubLocation,
    useGenerateLocationImage,
    useCreateProjectLocation,
    useGenerateProjectLocationImage,
} from '@/lib/query/hooks'
import { useImageGenerationCount } from '@/lib/image-generation/use-image-generation-count'
import ImageGenerationInlineCountButton from '@/components/image-generation/ImageGenerationInlineCountButton'
import { getImageGenerationCountOptions } from '@/lib/image-generation/count'
import type { LocationAvailableSlot } from '@/lib/location-available-slots'

export interface LocationCreationModalProps {
    mode: 'asset-hub' | 'project'
    // Asset Hub 模式使用
    folderId?: string | null
    // 项目模式使用
    projectId?: string
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

export function LocationCreationModal({
    mode,
    folderId,
    projectId,
    onClose,
    onSuccess
}: LocationCreationModalProps) {
    const t = useTranslations('assetModal')
    const aiDesignAssetHubLocation = useAiDesignLocation()
    const createAssetHubLocation = useCreateAssetHubLocation()
    const generateAssetHubLocation = useGenerateLocationImage()
    const aiCreateProjectLocation = useAiCreateProjectLocation(projectId || '')
    const createProjectLocation = useCreateProjectLocation(projectId || '')
    const generateProjectLocation = useGenerateProjectLocationImage(projectId || '')
    const {
        count: locationGenerationCount,
        setCount: setLocationGenerationCount,
    } = useImageGenerationCount('location')

    // 表单字段
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [aiInstruction, setAiInstruction] = useState('')
    const [artStyle, setArtStyle] = useState('american-comic')
    const [availableSlots, setAvailableSlots] = useState<LocationAvailableSlot[]>([])

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isAiDesigning, setIsAiDesigning] = useState(false)
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

    const getErrorMessage = (error: unknown, fallback: string) => {
        if (error instanceof Error && error.message) {
            return error.message
        }
        return fallback
    }

    const getErrorStatus = (error: unknown): number | null => {
        if (typeof error === 'object' && error !== null) {
            const status = (error as { status?: unknown }).status
            if (typeof status === 'number') return status
        }
        return null
    }

    // ESC 键关闭
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isSubmitting && !isAiDesigning) {
                onClose()
            }
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [onClose, isSubmitting, isAiDesigning])

    // AI 设计描述
    const handleAiDesign = async () => {
        if (!aiInstruction.trim()) return

        try {
            setIsAiDesigning(true)
            const data = mode === 'asset-hub'
                ? await aiDesignAssetHubLocation.mutateAsync(aiInstruction)
                : await aiCreateProjectLocation.mutateAsync({ userInstruction: aiInstruction })
            setDescription(data.prompt || '')
            setAvailableSlots(Array.isArray(data.availableSlots) ? data.availableSlots : [])
            setAiInstruction('')
        } catch (error: unknown) {
            if (getErrorStatus(error) === 402) {
                alert(getErrorMessage(error, t('errors.insufficientBalance')))
            } else {
                _ulogError('AI设计失败:', error)
                if (shouldShowError(error)) {
                    alert(getErrorMessage(error, t('errors.aiDesignFailed')))
                }
            }
        } finally {
            setIsAiDesigning(false)
        }
    }

    type CreatedLocationResponse = {
        location?: {
            id: string
        }
    }

    // 提交创建
    const handleSubmit = async () => {
        if (!name.trim() || !description.trim()) return

        try {
            setIsSubmitting(true)

            const body: {
                name: string
                description: string
                artStyle: string
                folderId?: string | null
            } = {
                name: name.trim(),
                description: description.trim(),
                artStyle
            }

            if (mode === 'asset-hub') {
                body.folderId = folderId
            }

            if (mode === 'asset-hub') {
                await createAssetHubLocation.mutateAsync({
                    name: body.name,
                    summary: body.description,
                    artStyle: body.artStyle,
                    folderId: body.folderId ?? null,
                    availableSlots,
                })
            } else {
                await createProjectLocation.mutateAsync({
                    name: body.name,
                    description: body.description,
                    artStyle: body.artStyle,
                    availableSlots,
                })
            }

            onSuccess()
            onClose()
        } catch (error: unknown) {
            if (getErrorStatus(error) === 402) {
                alert(getErrorMessage(error, t('errors.insufficientBalance')))
            } else if (shouldShowError(error)) {
                alert(getErrorMessage(error, t('errors.createFailed')))
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleSubmitAndGenerate = async () => {
        if (!name.trim() || !description.trim()) return

        try {
            setIsSubmitting(true)

            if (mode === 'asset-hub') {
                const result = await createAssetHubLocation.mutateAsync({
                    name: name.trim(),
                    summary: description.trim(),
                    artStyle,
                    folderId: folderId ?? null,
                    count: locationGenerationCount,
                    availableSlots,
                }) as CreatedLocationResponse
                const createdLocationId = result.location?.id
                if (!createdLocationId) {
                    throw new Error(t('errors.createFailed'))
                }
                await generateAssetHubLocation.mutateAsync({
                    locationId: createdLocationId,
                    artStyle,
                    count: locationGenerationCount,
                })
            } else {
                const result = await createProjectLocation.mutateAsync({
                    name: name.trim(),
                    description: description.trim(),
                    artStyle,
                    count: locationGenerationCount,
                    availableSlots,
                }) as CreatedLocationResponse
                const createdLocationId = result.location?.id
                if (!createdLocationId) {
                    throw new Error(t('errors.createFailed'))
                }
                await generateProjectLocation.mutateAsync({
                    locationId: createdLocationId,
                    artStyle,
                    count: locationGenerationCount,
                })
            }

            onSuccess()
            onClose()
        } catch (error: unknown) {
            if (getErrorStatus(error) === 402) {
                alert(getErrorMessage(error, t('errors.insufficientBalance')))
            } else if (shouldShowError(error)) {
                alert(getErrorMessage(error, t('errors.createFailed')))
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    // 处理点击遮罩层关闭
    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget && !isSubmitting && !isAiDesigning) {
            onClose()
        }
    }

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn flex items-center justify-center z-50 p-4"
            onClick={handleBackdropClick}
        >
            <div className="bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_50px_rgba(167,87,255,0.3)] rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col">
                <div className="p-6 overflow-y-auto flex-1">
                    {/* 标题 */}
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-white">
                            {t('location.title')}
                        </h3>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-5">
                        {/* 场景名称 */}
                        <div className="space-y-2">
                            <label className="text-white/70 block">
                                {t('location.name')} <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t('location.namePlaceholder')}
                                className="bg-[var(--wuhu-bg-surface)] border border-white/20 text-white placeholder:text-white/40 rounded-lg focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_15px_rgba(255,100,200,0.3)] w-full px-3 py-2 text-sm"
                            />
                        </div>

                        {mode === 'asset-hub' && (
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

                        {/* AI 设计区域 */}
                        <div className="bg-[var(--wuhu-bg-surface)] rounded-xl p-4 space-y-3 border border-white/20">
                            <div className="flex items-center gap-2 text-sm font-medium text-[var(--wuhu-neon-purple)]">
                                <SparklesIcon className="w-4 h-4" />
                                <span>{t('aiDesign.title')} {t('common.optional')}</span>
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={aiInstruction}
                                    onChange={(e) => setAiInstruction(e.target.value)}
                                    placeholder={t('aiDesign.placeholderLocation')}
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
                                    className="bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_15px_rgba(167,87,255,0.4)] hover:shadow-[0_0_25px_rgba(255,100,200,0.5)] px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm whitespace-nowrap"
                                >
                                    {isAiDesigning ? (
                                        <TaskStatusInline state={aiDesigningState} className="text-white [&>span]:text-white [&_svg]:text-white" />
                                    ) : (
                                        <>
                                            <SparklesIcon className="w-4 h-4" />
                                            <span>{t('aiDesign.generate')}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                            <p className="text-white/40 text-sm">
                                {t('aiDesign.tip')}
                            </p>
                        </div>

                        {/* 场景描述 */}
                        <div className="space-y-2">
                            <label className="text-white/70 block">
                                {t('location.description')} <span className="text-red-400">*</span>
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder={t('location.descPlaceholder')}
                                className="bg-[var(--wuhu-bg-surface)] border border-white/20 text-white placeholder:text-white/40 rounded-lg focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_15px_rgba(255,100,200,0.3)] w-full h-36 px-3 py-2 text-sm resize-none"
                                disabled={isAiDesigning}
                            />
                        </div>
                    </div>
                </div>

                {/* 固定底部按钮区 */}
                <div className="flex gap-3 justify-end p-4 border-t border-white/10 bg-[var(--wuhu-bg-card)] rounded-b-2xl flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="border border-white/20 text-white/70 hover:border-[var(--wuhu-neon-pink)] hover:text-white hover:bg-white/10 px-4 py-2 rounded-lg text-sm"
                        disabled={isSubmitting}
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !name.trim() || !description.trim()}
                        className="border border-white/20 text-white/70 hover:border-[var(--wuhu-neon-pink)] hover:text-white hover:bg-white/10 px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <TaskStatusInline state={submittingState} className="text-white [&>span]:text-white [&_svg]:text-white" />
                        ) : (
                            <span>{mode === 'asset-hub' ? t('common.addOnlyToAssetHubLocation') : t('common.addOnlyLocation')}</span>
                        )}
                    </button>
                    <ImageGenerationInlineCountButton
                        prefix={<span>{t('common.addAndGeneratePrefix')}</span>}
                        suffix={<span>{t('common.generateCountSuffix')}</span>}
                        value={locationGenerationCount}
                        options={getImageGenerationCountOptions('location')}
                        onValueChange={setLocationGenerationCount}
                        onClick={handleSubmitAndGenerate}
                        actionDisabled={!name.trim() || !description.trim()}
                        selectDisabled={isSubmitting}
                        ariaLabel={t('common.selectGenerateCount')}
                        className="bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_15px_rgba(167,87,255,0.4)] hover:shadow-[0_0_25px_rgba(255,100,200,0.5)] flex items-center justify-center gap-1 rounded-lg px-4 py-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                        selectClassName="appearance-none bg-transparent border-0 pl-0 pr-3 text-sm font-semibold text-current outline-none cursor-pointer leading-none transition-colors"
                    />
                </div>
            </div>
        </div>
    )
}
