'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import EmotionSettingsPanel from './EmotionSettingsPanel'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import { resolveTaskPresentationState, type TaskPresentationState } from '@/lib/task/presentation'
import { AppIcon } from '@/components/ui/icons'

interface VoiceLine {
    id: string
    lineIndex: number
    speaker: string
    content: string
    emotionPrompt: string | null
    emotionStrength: number | null
    audioUrl: string | null
    updatedAt: string | null
    lineTaskRunning: boolean
    matchedPanelId?: string | null
    matchedStoryboardId?: string | null
    matchedPanelIndex?: number | null
}

interface VoiceLineCardProps {
    line: VoiceLine
    isVoiceTaskRunning: boolean
    statusState?: TaskPresentationState | null
    isPlaying: boolean
    hasVoice: boolean
    onTogglePlay: (lineId: string, audioUrl: string) => void
    onDownload: (audioUrl: string) => void
    onGenerate: (lineId: string) => void
    onEdit: (line: VoiceLine) => void
    onLocatePanel?: (line: VoiceLine) => void
    onDelete: (lineId: string) => void
    onDeleteAudio: (lineId: string) => void
    onSaveEmotionSettings: (lineId: string, emotionPrompt: string | null, emotionStrength: number) => void
}

export default function VoiceLineCard({
    line,
    isVoiceTaskRunning,
    statusState,
    isPlaying,
    hasVoice,
    onTogglePlay,
    onDownload,
    onGenerate,
    onEdit,
    onLocatePanel,
    onDelete,
    onDeleteAudio,
    onSaveEmotionSettings
}: VoiceLineCardProps) {
    const t = useTranslations('voice')
    const [isEmotionExpanded, setIsEmotionExpanded] = useState(false)
    const hasPanelBinding = !!onLocatePanel && !!line.matchedStoryboardId && line.matchedPanelIndex !== null && line.matchedPanelIndex !== undefined
    const locateTitle = t("lineCard.locateVideo")
    const inlineStatusState = isVoiceTaskRunning
        ? resolveTaskPresentationState({
            phase: 'processing',
            intent: 'generate',
            resource: 'audio',
            hasOutput: !!line.audioUrl,
        })
        : statusState ?? null

    return (
        <div
            className={`relative bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_50px_rgba(167,87,255,0.3)] rounded-xl overflow-hidden transition-all hover:-translate-y-0.5 ${line.audioUrl ? 'ring-1 ring-[var(--wuhu-neon-cyan)]/60' : hasVoice ? '' : 'ring-1 ring-[var(--wuhu-neon-orange)]/60'
                }`}
        >
            {/* 顶部：播放/生成区域 */}
            <div className={`h-14 flex items-center justify-center gap-3 ${line.audioUrl
                ? 'bg-[var(--wuhu-neon-cyan)]/10'
                : 'bg-white/5'
                }`}>
                {line.audioUrl ? (
                    <div className="flex items-center justify-center gap-3">
                        {/* 播放按钮 */}
                        <button
                            onClick={() => onTogglePlay(line.id, line.audioUrl!)}
                            className={`flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-[var(--wuhu-neon-cyan)] to-[var(--wuhu-neon-purple)] text-white shadow-[0_0_15px_rgba(167,87,255,0.4)] hover:scale-110 transition-all ${isPlaying ? 'animate-pulse shadow-[0_0_25px_rgba(0,255,255,0.6)]' : ''}`}
                            title={isPlaying ? t("lineCard.pause") : t("lineCard.play")}
                        >
                            {isPlaying ? (
                                <AppIcon name="pauseSolid" className="w-4 h-4" />
                            ) : (
                                <AppIcon name="play" className="w-4 h-4 ml-0.5" />
                            )}
                        </button>
                        {/* 重新生成按钮 */}
                        <button
                            onClick={() => onGenerate(line.id)}
                            disabled={!hasVoice || isVoiceTaskRunning}
                            className="flex items-center justify-center w-8 h-8 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-all disabled:opacity-50"
                            title={t("common.regenerate")}
                        >
                            {isVoiceTaskRunning ? (
                                <TaskStatusInline state={inlineStatusState} className="[&_span]:sr-only [&_svg]:text-current" />
                            ) : (
                                <AppIcon name="refresh" className="w-3.5 h-3.5" />
                            )}
                        </button>
                        {/* 下载按钮 */}
                        <button
                            onClick={() => onDownload(line.audioUrl!)}
                            className="flex items-center justify-center w-8 h-8 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                            title={t("common.download")}
                        >
                            <AppIcon name="download" className="w-4 h-4" />
                        </button>
                    </div>
                ) : isVoiceTaskRunning ? (
                    /* 生成中状态：显示状态指示器 */
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white rounded-xl text-sm font-medium shadow-[0_0_15px_rgba(167,87,255,0.4)] animate-pulse">
                            <TaskStatusInline state={inlineStatusState} className="text-white [&>span]:text-white [&_svg]:text-white" />
                        </div>
                    </div>
                ) : (
                    /* 生成按钮 */
                    <button
                        onClick={() => onGenerate(line.id)}
                        disabled={!hasVoice}
                        className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white rounded-xl text-sm font-medium shadow-[0_0_15px_rgba(167,87,255,0.4)] hover:shadow-[0_0_25px_rgba(167,87,255,0.6)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <AppIcon name="mic" className="w-4 h-4" />
                        {t("common.generate")}
                    </button>
                )}
            </div>

            {/* 序号标签 */}
            <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm text-white px-2 py-0.5 rounded-lg text-xs font-medium border border-[var(--wuhu-neon-purple)]/30">
                #{line.lineIndex}
            </div>

            {/* 状态标签+删除配音按钮 */}
            {
                line.audioUrl && (
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                        <div className="flex items-center justify-center bg-[var(--wuhu-neon-cyan)]/15 text-[var(--wuhu-neon-cyan)] border border-[var(--wuhu-neon-cyan)]/30 px-2 py-0.5 rounded-lg text-xs font-medium">
                            <AppIcon name="checkXs" className="h-3 w-3" />
                        </div>
                        <button
                            onClick={() => onDeleteAudio(line.id)}
                            className="flex items-center justify-center w-5 h-5 bg-[var(--wuhu-neon-orange)]/20 text-[var(--wuhu-neon-orange)] border border-[var(--wuhu-neon-orange)]/30 rounded-md hover:bg-[var(--wuhu-neon-orange)]/30 transition-colors"
                            title={t("lineCard.deleteAudio")}
                        >
                            <AppIcon name="close" className="w-3 h-3" />
                        </button>
                    </div>
                )
            }

            {/* 中间：台词内容 */}
            <div className="px-4 py-3">
                <div className="group">
                    <p className="text-sm text-white/70 line-clamp-3 leading-relaxed" title={line.content}>
                        {line.content}
                    </p>
                    {/* 操作按钮组 */}
                    <div className="mt-2 flex justify-end gap-0.5">
                        {hasPanelBinding && (
                            <button
                                onClick={() => onLocatePanel?.(line)}
                                className="px-2 py-1 text-[11px] leading-none text-white/40 hover:text-[var(--wuhu-neon-cyan)] hover:bg-[var(--wuhu-neon-cyan)]/10 border border-white/20 hover:border-[var(--wuhu-neon-cyan)]/50 rounded-md transition-colors"
                                title={locateTitle}
                            >
                                <span>{t("lineCard.locateVideo")}</span>
                            </button>
                        )}
                        <button
                            onClick={() => onEdit(line)}
                            className="p-1 text-white/40 hover:text-[var(--wuhu-neon-cyan)] hover:bg-[var(--wuhu-neon-cyan)]/10 rounded transition-colors"
                            title={t("lineCard.editLine")}
                        >
                            <AppIcon name="editSquare" className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => onDelete(line.id)}
                            className="p-1 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                            title={t("lineCard.deleteLine")}
                        >
                            <AppIcon name="trash" className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* 情绪设置面板 */}
            {
                hasVoice && (
                    <>
                        <button
                            onClick={() => setIsEmotionExpanded(!isEmotionExpanded)}
                            className="w-full px-4 py-2 text-xs text-[var(--wuhu-neon-purple)] hover:bg-[var(--wuhu-neon-purple)]/10 flex items-center justify-center gap-1.5 font-medium transition-colors"
                        >
                            <AppIcon name="chevronDown" className={`w-3.5 h-3.5 transition-transform ${isEmotionExpanded ? 'rotate-180' : ''}`} />
                            {line.emotionPrompt || (line.emotionStrength !== null && line.emotionStrength !== 0.4)
                                ? t("lineCard.emotionConfigured")
                                : t("lineCard.emotionSettings")}
                        </button>

                        {isEmotionExpanded && (
                            <EmotionSettingsPanel
                                lineId={line.id}
                                emotionPrompt={line.emotionPrompt}
                                emotionStrength={line.emotionStrength ?? 0.4}
                                onSave={onSaveEmotionSettings}
                                onGenerate={onGenerate}
                                isVoiceGenerationRunning={isVoiceTaskRunning}
                            />
                        )}
                    </>
                )
            }

            {/* 底部：发言人 */}
            <div className="px-4 py-2.5 bg-white/5 border-t border-white/10 flex items-center justify-between gap-2">
                <span className="inline-flex items-center px-2.5 py-1 bg-[var(--wuhu-neon-purple)]/15 text-[var(--wuhu-neon-purple)] border border-[var(--wuhu-neon-purple)]/30 text-xs rounded-lg truncate max-w-[160px] font-medium" title={line.speaker}>
                    {line.speaker}
                </span>
                {hasVoice ? (
                    <span className="text-xs text-[var(--wuhu-neon-cyan)] font-medium">{t("lineCard.voiceConfigured")}</span>
                ) : (
                    <span className="text-xs text-[var(--wuhu-neon-orange)] font-medium">{t("lineCard.needVoice")}</span>
                )}
            </div>
        </div >
    )
}
