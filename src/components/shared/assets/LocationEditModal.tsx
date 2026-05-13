'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'
import { shouldShowError } from '@/lib/error-utils'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import { resolveTaskPresentationState } from '@/lib/task/presentation'
import {
    useAiModifyLocationDescription,
    useAiModifyProjectLocationDescription,
    useUpdateLocationName,
    useUpdateLocationSummary,
    useUpdateProjectLocationDescription,
    useUpdateProjectLocationName,
} from '@/lib/query/hooks'
import type { LocationAvailableSlot } from '@/lib/location-available-slots'

export interface LocationEditModalProps {
    mode: 'asset-hub' | 'project'
    locationId: string
    locationName: string
    description: string
    summary?: string
    imageIndex?: number
    projectId?: string
    descriptionIndex?: number
    isTaskRunning?: boolean
    onClose: () => void
    onSave: (locationId: string) => void
    onUpdate?: (newDescription: string) => void
    onNameUpdate?: (newName: string) => void
    onRefresh?: () => void
}

export function LocationEditModal({
    mode,
    locationId,
    locationName,
    description,
    summary,
    imageIndex,
    projectId,
    descriptionIndex,
    isTaskRunning = false,
    onClose,
    onSave,
    onUpdate,
    onNameUpdate,
    onRefresh,
}: LocationEditModalProps) {
    const t = useTranslations('assets')

    const resolvedImageIndex = mode === 'asset-hub'
        ? (imageIndex ?? 0)
        : (descriptionIndex ?? 0)

    const [editingName, setEditingName] = useState(locationName)
    const [editingDescription, setEditingDescription] = useState(description || summary || '')
    const [availableSlots, setAvailableSlots] = useState<LocationAvailableSlot[]>([])
    const [aiModifyInstruction, setAiModifyInstruction] = useState('')
    const [isAiModifying, setIsAiModifying] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const aiModifyingState = isAiModifying
        ? resolveTaskPresentationState({
            phase: 'processing',
            intent: 'modify',
            resource: 'image',
            hasOutput: true,
        })
        : null
    const savingState = isSaving
        ? resolveTaskPresentationState({
            phase: 'processing',
            intent: 'process',
            resource: 'text',
            hasOutput: false,
        })
        : null
    const taskRunningState = isTaskRunning
        ? resolveTaskPresentationState({
            phase: 'processing',
            intent: 'modify',
            resource: 'image',
            hasOutput: true,
        })
        : null

    const updateAssetHubName = useUpdateLocationName()
    const updateProjectName = useUpdateProjectLocationName(projectId ?? '')
    const updateAssetHubSummary = useUpdateLocationSummary()
    const updateProjectDescription = useUpdateProjectLocationDescription(projectId ?? '')
    const aiModifyAssetHub = useAiModifyLocationDescription()
    const aiModifyProject = useAiModifyProjectLocationDescription(projectId ?? '')

    const getErrorMessage = (error: unknown, fallback: string) => {
        if (error instanceof Error && error.message) return error.message
        return fallback
    }

    const persistNameIfNeeded = async () => {
        const nextName = editingName.trim()
        if (!nextName || nextName === locationName) return

        if (mode === 'asset-hub') {
            await updateAssetHubName.mutateAsync({ locationId, name: nextName })
        } else {
            await updateProjectName.mutateAsync({ locationId, name: nextName })
        }
        onNameUpdate?.(nextName)
    }

    const persistDescription = async () => {
        if (mode === 'asset-hub') {
            await updateAssetHubSummary.mutateAsync({
                locationId,
                summary: editingDescription,
                availableSlots,
            })
            return
        }

        await updateProjectDescription.mutateAsync({
            locationId,
            imageIndex: resolvedImageIndex,
            description: editingDescription,
            availableSlots,
        })
    }

    const handleAiModify = async () => {
        if (!aiModifyInstruction.trim()) return

        try {
            setIsAiModifying(true)

            if (mode === 'asset-hub') {
                const data = await aiModifyAssetHub.mutateAsync({
                    locationId,
                    imageIndex: resolvedImageIndex,
                    currentDescription: editingDescription,
                    modifyInstruction: aiModifyInstruction,
                })
                if (data?.modifiedDescription) {
                    setEditingDescription(data.modifiedDescription)
                    setAvailableSlots(Array.isArray(data.availableSlots) ? data.availableSlots : [])
                    onUpdate?.(data.modifiedDescription)
                    setAiModifyInstruction('')
                }
                return
            }

            const data = await aiModifyProject.mutateAsync({
                locationId,
                imageIndex: resolvedImageIndex,
                currentDescription: editingDescription,
                modifyInstruction: aiModifyInstruction,
            })
            const nextDescription = data?.modifiedDescription || data?.prompt || ''
            if (nextDescription) {
                setEditingDescription(nextDescription)
                setAvailableSlots(Array.isArray(data.availableSlots) ? data.availableSlots : [])
                onUpdate?.(nextDescription)
                setAiModifyInstruction('')
            }
        } catch (error: unknown) {
            if (shouldShowError(error)) {
                alert(`${t('modal.modifyFailed')}: ${getErrorMessage(error, t('errors.failed'))}`)
            }
        } finally {
            setIsAiModifying(false)
        }
    }

    const handleSaveName = async () => {
        try {
            await persistNameIfNeeded()
            onRefresh?.()
        } catch (error: unknown) {
            if (shouldShowError(error)) {
                alert(t('modal.saveName') + t('errors.failed'))
            }
        }
    }

    const handleSaveOnly = async () => {
        try {
            setIsSaving(true)
            await persistNameIfNeeded()
            await persistDescription()

            onUpdate?.(editingDescription)
            onRefresh?.()
            onClose()
        } catch (error: unknown) {
            if (shouldShowError(error)) {
                alert(getErrorMessage(error, t('errors.saveFailed')))
            }
        } finally {
            setIsSaving(false)
        }
    }

    const handleSaveAndGenerate = async () => {
        const savedDescription = editingDescription
        onClose()

        ; (async () => {
            try {
                await persistNameIfNeeded()
                await persistDescription()
                onUpdate?.(savedDescription)
                onRefresh?.()
                onSave(locationId)
            } catch (error: unknown) {
                if (shouldShowError(error)) {
                    alert(getErrorMessage(error, t('errors.saveFailed')))
                }
            }
        })()
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_50px_rgba(167,87,255,0.3)] rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">
                            {t('modal.editLocation')} - {locationName}
                        </h3>
                        <button
                            onClick={onClose}
                            className="w-9 h-9 rounded-full text-white/40 hover:text-white hover:bg-white/10"
                        >
                            <AppIcon name="close" className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="space-y-2">
                        <label className="text-white/70 block">
                            {t('location.name')}
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="bg-[var(--wuhu-bg-surface)] border border-white/20 text-white placeholder:text-white/40 rounded-lg focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_15px_rgba(255,100,200,0.3)] flex-1 px-3 py-2"
                                placeholder={t('modal.namePlaceholder')}
                            />
                            {editingName !== locationName && (
                                <button
                                    onClick={handleSaveName}
                                    disabled={updateAssetHubName.isPending || updateProjectName.isPending || !editingName.trim()}
                                    className="bg-[var(--wuhu-neon-cyan)]/20 text-[var(--wuhu-neon-cyan)] border border-[var(--wuhu-neon-cyan)]/30 hover:bg-[var(--wuhu-neon-cyan)]/30 px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap"
                                >
                                    {(updateAssetHubName.isPending || updateProjectName.isPending)
                                        ? t('smartImport.preview.saving')
                                        : t('modal.saveName')}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2 bg-[var(--wuhu-bg-surface)] p-4 rounded-lg border border-white/20">
                        <label className="block text-sm font-medium text-[var(--wuhu-neon-purple)] flex items-center gap-2">
                            <AppIcon name="bolt" className="w-4 h-4" />
                            {t('modal.smartModify')}
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={aiModifyInstruction}
                                onChange={(e) => setAiModifyInstruction(e.target.value)}
                                placeholder={t('modal.modifyPlaceholder')}
                                className="bg-[var(--wuhu-bg-surface)] border border-white/20 text-white placeholder:text-white/40 rounded-lg focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_15px_rgba(255,100,200,0.3)] flex-1 px-3 py-2"
                                disabled={isAiModifying}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault()
                                        handleAiModify()
                                    }
                                }}
                            />
                            <button
                                onClick={handleAiModify}
                                disabled={isAiModifying || !aiModifyInstruction.trim()}
                                className="bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_15px_rgba(167,87,255,0.4)] hover:shadow-[0_0_25px_rgba(255,100,200,0.5)] px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                            >
                                {isAiModifying ? (
                                    <TaskStatusInline state={aiModifyingState} className="text-white [&>span]:text-white [&_svg]:text-white" />
                                ) : (
                                    <>
                                        <AppIcon name="bolt" className="w-4 h-4" />
                                        {t('modal.smartModify')}
                                    </>
                                )}
                            </button>
                        </div>
                        <p className="text-white/40 text-sm">
                            {t('modal.aiLocationTip')}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-white/70 block">
                            {t('location.description')}
                        </label>
                        <textarea
                            value={editingDescription}
                            onChange={(e) => setEditingDescription(e.target.value)}
                            className="bg-[var(--wuhu-bg-surface)] border border-white/20 text-white placeholder:text-white/40 rounded-lg focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_15px_rgba(255,100,200,0.3)] w-full h-48 px-3 py-2 resize-none"
                            placeholder={t('modal.descPlaceholder')}
                            disabled={isAiModifying}
                        />
                    </div>
                </div>

                <div className="flex gap-3 justify-end p-4 border-t border-white/10 bg-[var(--wuhu-bg-card)] rounded-b-2xl flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="border border-white/20 text-white/70 hover:border-[var(--wuhu-neon-pink)] hover:text-white hover:bg-white/10 px-4 py-2 rounded-lg"
                        disabled={isSaving}
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        onClick={handleSaveOnly}
                        disabled={isSaving || !editingDescription.trim()}
                        className="bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_15px_rgba(167,87,255,0.4)] hover:shadow-[0_0_25px_rgba(255,100,200,0.5)] px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSaving ? (
                            <TaskStatusInline state={savingState} className="text-white [&>span]:text-white [&_svg]:text-white" />
                        ) : (
                            t('modal.saveOnly')
                        )}
                    </button>
                    <button
                        onClick={handleSaveAndGenerate}
                        disabled={isSaving || isTaskRunning || !editingDescription.trim()}
                        className="bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_15px_rgba(167,87,255,0.4)] hover:shadow-[0_0_25px_rgba(255,100,200,0.5)] px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isTaskRunning ? (
                            <TaskStatusInline state={taskRunningState} className="text-white [&>span]:text-white [&_svg]:text-white" />
                        ) : (
                            t('modal.saveAndGenerate')
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
