'use client'
import { useTranslations } from 'next-intl'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import { resolveTaskPresentationState } from '@/lib/task/presentation'
import { MediaImageWithLoading } from '@/components/media/MediaImageWithLoading'
import { AppIcon } from '@/components/ui/icons'

/**
 * InsertPanelModal - 插入分镜模态框
 * 使用 Portal 渲染到 document.body，确保在用户屏幕中央显示
 */

interface PanelInfo {
    id: string
    panelNumber: number | null
    description: string | null
    imageUrl: string | null
}

interface InsertPanelModalProps {
    isOpen: boolean
    onClose: () => void
    prevPanel: PanelInfo
    nextPanel: PanelInfo | null
    onInsert: (userInput: string) => Promise<void>
    isInserting: boolean
}

export default function InsertPanelModal({
    isOpen,
    onClose,
    prevPanel,
    nextPanel,
    onInsert,
    isInserting
}: InsertPanelModalProps) {
    const t = useTranslations('storyboard')
    const [userInput, setUserInput] = useState('')
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const analyzingState = isInserting
        ? resolveTaskPresentationState({
            phase: 'processing',
            intent: 'analyze',
            resource: 'text',
            hasOutput: true,
        })
        : null
    const insertingState = isInserting
        ? resolveTaskPresentationState({
            phase: 'processing',
            intent: 'build',
            resource: 'text',
            hasOutput: true,
        })
        : null

    if (!isOpen || !mounted) return null

    const handleInsert = async () => {
        await onInsert(userInput)
        setUserInput('')
    }

    const handleAutoAnalyze = async () => {
        await onInsert('')
        setUserInput('')
    }

    const handleClose = () => {
        if (!isInserting) {
            setUserInput('')
            onClose()
        }
    }

    const modalContent = (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            style={{ zIndex: 9999 }}
            onClick={handleClose}
        >
            <div
                className="bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_50px_rgba(167,87,255,0.3)] rounded-2xl w-full max-w-lg"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 标题 */}
                <div className="px-5 py-3 border-b border-[var(--wuhu-neon-purple)]/20 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-bold text-white flex items-center gap-2">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--wuhu-neon-purple)]/20 text-[var(--wuhu-neon-purple)] text-sm font-bold">+</span>
                            {t('insertModal.insertBetween', { before: prevPanel.panelNumber ?? 0, after: nextPanel?.panelNumber ?? '' })}
                        </h2>
                        <button
                            onClick={handleClose}
                            disabled={isInserting}
                            className="text-white/50 hover:text-white disabled:opacity-50 transition-colors"
                        >
                            <AppIcon name="close" className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* 内容 */}
                <div className="p-5 space-y-4">
                    {/* 前后镜头预览 - 更紧凑 */}
                    <div className="flex gap-3 items-center">
                        {/* 前一个镜头 */}
                        <div className="flex-1 bg-[var(--wuhu-bg-surface)] border border-white/10 rounded-lg p-2 text-center">
                            {prevPanel.imageUrl ? (
                                <MediaImageWithLoading
                                    src={prevPanel.imageUrl}
                                    alt={`${t('insertModal.panel')} ${prevPanel.panelNumber}`}
                                    containerClassName="w-full aspect-[9/16] rounded-md"
                                    className="w-full aspect-[9/16] object-cover rounded-md"
                                />
                            ) : (
                                <div className="w-full aspect-[9/16] bg-[var(--wuhu-bg-surface)] rounded-md flex items-center justify-center text-white/50 text-xs">
                                    {t('insertModal.noImage')}
                                </div>
                            )}
                            <div className="text-xs text-white/50 mt-1">#{prevPanel.panelNumber}</div>
                        </div>

                        {/* 插入指示 */}
                        <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-[var(--wuhu-neon-purple)]/20 text-[var(--wuhu-neon-purple)] flex items-center justify-center text-xl font-bold">
                                +
                            </div>
                        </div>

                        {/* 后一个镜头 */}
                        <div className="flex-1 bg-[var(--wuhu-bg-surface)] border border-white/10 rounded-lg p-2 text-center">
                            {nextPanel ? (
                                <>
                                    {nextPanel.imageUrl ? (
                                        <MediaImageWithLoading
                                            src={nextPanel.imageUrl}
                                            alt={`${t('insertModal.panel')} ${nextPanel.panelNumber}`}
                                            containerClassName="w-full aspect-[9/16] rounded-md"
                                            className="w-full aspect-[9/16] object-cover rounded-md"
                                        />
                                    ) : (
                                        <div className="w-full aspect-[9/16] bg-[var(--wuhu-bg-surface)] rounded-md flex items-center justify-center text-white/50 text-xs">
                                            {t('insertModal.noImage')}
                                        </div>
                                    )}
                                    <div className="text-xs text-white/50 mt-1">#{nextPanel.panelNumber}</div>
                                </>
                            ) : (
                                <>
                                    <div className="w-full aspect-[9/16] bg-[var(--wuhu-bg-surface)] rounded-md flex items-center justify-center text-white/50 text-xs">
                                        {t('insertModal.insertAtEnd')}
                                    </div>
                                    <div className="text-xs text-white/50 mt-1">{t('insertModal.insert')}</div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* 用户输入 */}
                    <div>
                        <textarea
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder={t('insertModal.placeholder')}
                            className="w-full h-16 px-3 py-2 border border-white/20 rounded-lg resize-none focus:outline-none focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_15px_rgba(255,100,200,0.3)] text-sm bg-[var(--wuhu-bg-surface)] text-white placeholder:text-white/30"
                            disabled={isInserting}
                        />
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex gap-3">
                        <button
                            onClick={handleAutoAnalyze}
                            disabled={isInserting}
                            className={`flex-1 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all
                                ${isInserting ? 'bg-[var(--wuhu-bg-surface)] text-white/30' : 'border border-white/20 text-white/70 hover:border-[var(--wuhu-neon-pink)] hover:text-white hover:bg-white/10'}`}
                        >
                            {isInserting && !userInput ? (
                                <TaskStatusInline state={analyzingState} />
                            ) : (
                                <>{t('insertModal.aiAnalyze')}</>
                            )}
                        </button>

                        <button
                            onClick={handleInsert}
                            disabled={isInserting || !userInput.trim()}
                            className={`flex-1 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all
                                ${isInserting || !userInput.trim() ? 'bg-[var(--wuhu-bg-surface)] text-white/30' : 'bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_15px_rgba(167,87,255,0.4)] hover:shadow-[0_0_25px_rgba(167,87,255,0.6)]'}`}
                        >
                            {isInserting && userInput ? (
                                <TaskStatusInline state={insertingState} />
                            ) : (
                                <>{t('insertModal.insert')}</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )

    // 使用 Portal 渲染到 document.body
    return createPortal(modalContent, document.body)
}
