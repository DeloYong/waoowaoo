'use client'
import { useTranslations } from 'next-intl'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import { resolveTaskPresentationState } from '@/lib/task/presentation'

interface EmbeddedVoiceToolbarProps {
    totalLines: number
    linesWithAudio: number
    analyzing: boolean
    isDownloading: boolean
    isBatchSubmitting: boolean
    runningCount: number
    allSpeakersHaveVoice: boolean
    onAddLine: () => void
    onAnalyze: () => void
    onDownloadAll: () => void
    onGenerateAll: () => void
}

export default function EmbeddedVoiceToolbar({
    totalLines,
    linesWithAudio,
    analyzing,
    isDownloading,
    isBatchSubmitting,
    runningCount,
    allSpeakersHaveVoice,
    onAddLine,
    onAnalyze,
    onDownloadAll,
    onGenerateAll
}: EmbeddedVoiceToolbarProps) {
    const t = useTranslations('voice')
    const voiceTaskRunningState = isBatchSubmitting
        ? resolveTaskPresentationState({
            phase: 'processing',
            intent: 'generate',
            resource: 'audio',
            hasOutput: linesWithAudio > 0,
        })
        : null
    const voiceAnalyzingState = analyzing
        ? resolveTaskPresentationState({
            phase: 'processing',
            intent: 'generate',
            resource: 'text',
            hasOutput: false,
        })
        : null
    const voiceDownloadingState = isDownloading
        ? resolveTaskPresentationState({
            phase: 'processing',
            intent: 'generate',
            resource: 'audio',
            hasOutput: linesWithAudio > 0,
        })
        : null

    const getGenerateButtonTitle = () => {
        if (isBatchSubmitting) return t("embedded.generatingHint")
        if (!allSpeakersHaveVoice) return t("embedded.noVoiceHint")
        if (totalLines === 0) return t("embedded.noLinesHint")
        if (linesWithAudio >= totalLines) return t("embedded.allDoneHint")
        return t("embedded.generateHint", { count: totalLines - linesWithAudio })
    }

    return (
        <div className="flex items-center justify-end mb-3 px-4">
            <div className="flex items-center gap-3">
                <div className="text-xs text-[rgba(255,255,255,0.5)]">
                    {t("embedded.linesStats", { total: totalLines, audio: linesWithAudio })}
                </div>

                {/* 重新分析按钮 */}
                <button
                    onClick={onAnalyze}
                    disabled={analyzing}
                    className="bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_20px_rgba(167,87,255,0.3)] hover:shadow-[0_0_30px_rgba(167,87,255,0.4)] rounded-lg transition-all flex items-center gap-2 px-4 py-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    title={totalLines > 0 ? t("embedded.reanalyzeHint") : t("embedded.analyzeHint")}
                >
                    {analyzing ? (
                        <TaskStatusInline state={voiceAnalyzingState} className="text-white [&>span]:text-white [&_svg]:text-white" />
                    ) : totalLines > 0 ? t("embedded.reanalyze") : t("embedded.analyzeLines")}
                </button>

                <button
                    onClick={onAddLine}
                    className="bg-[var(--wuhu-bg-surface)] border border-white/20 hover:bg-white/5 rounded-lg text-white/70 hover:text-white transition-all flex items-center gap-2 px-4 py-2 font-medium border border-[rgba(167, 87, 255, 0.2)]"
                >
                    {t("embedded.addLine")}
                </button>

                {/* 下载按钮 */}
                <button
                    onClick={onDownloadAll}
                    disabled={linesWithAudio === 0 || isDownloading}
                    className="bg-[var(--wuhu-neon-purple)]/20 text-[var(--wuhu-neon-purple)] hover:bg-[var(--wuhu-neon-purple)]/30 rounded-lg transition-all flex items-center gap-2 px-4 py-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    title={linesWithAudio === 0 ? t("toolbar.noDownload") : t("toolbar.downloadCount", { count: linesWithAudio })}
                >
                    {isDownloading ? (
                        <TaskStatusInline state={voiceDownloadingState} className="text-white [&>span]:text-white [&_svg]:text-white" />
                    ) : (
                        <>{t("embedded.downloadVoice")}</>
                    )}
                </button>

                {/* 生成全部按钮 */}
                <button
                    onClick={onGenerateAll}
                    disabled={isBatchSubmitting || !allSpeakersHaveVoice || totalLines === 0}
                    className="bg-[var(--wuhu-neon-cyan)]/20 text-[var(--wuhu-neon-cyan)] hover:bg-[var(--wuhu-neon-cyan)]/30 rounded-lg transition-all flex items-center gap-2 px-4 py-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    title={getGenerateButtonTitle()}
                >
                    {isBatchSubmitting ? (
                        <>
                            <TaskStatusInline state={voiceTaskRunningState} className="text-white [&>span]:text-white [&_svg]:text-white" />
                            <span className="text-xs text-white/90">{t("embedded.generatingProgress", { current: runningCount, total: totalLines - linesWithAudio })}</span>
                        </>
                    ) : (
                        <>
                            {t("embedded.generateAllVoice")}
                            {linesWithAudio > 0 && (
                                <span className="text-xs opacity-75">{t("embedded.pendingCount", { count: totalLines - linesWithAudio })}</span>
                            )}
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}
