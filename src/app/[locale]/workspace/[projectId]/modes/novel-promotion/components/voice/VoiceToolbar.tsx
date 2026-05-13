'use client'
import { useTranslations } from 'next-intl'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import { resolveTaskPresentationState } from '@/lib/task/presentation'

interface VoiceToolbarProps {
    onBack?: () => void
    onAddLine: () => void
    onAnalyze: () => void
    onGenerateAll: () => void
    onDownloadAll: () => void
    analyzing: boolean
    isBatchSubmitting: boolean
    runningCount: number
    isDownloading: boolean
    allSpeakersHaveVoice: boolean
    totalLines: number
    linesWithVoice: number
    linesWithAudio: number
}

export default function VoiceToolbar({
    onBack,
    onAddLine,
    onAnalyze,
    onGenerateAll,
    onDownloadAll,
    analyzing,
    isBatchSubmitting,
    runningCount,
    isDownloading,
    allSpeakersHaveVoice,
    totalLines,
    linesWithVoice,
    linesWithAudio
}: VoiceToolbarProps) {
    const t = useTranslations('voice')
    const voiceTaskRunningState = isBatchSubmitting
        ? resolveTaskPresentationState({
            phase: 'processing',
            intent: 'generate',
            resource: 'audio',
            hasOutput: linesWithAudio > 0,
        })
        : null
    const voiceDownloadRunningState = isDownloading
        ? resolveTaskPresentationState({
            phase: 'processing',
            intent: 'process',
            resource: 'audio',
            hasOutput: linesWithAudio > 0,
        })
        : null

    return (
        <div className="bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_50px_rgba(167,87,255,0.3)] rounded-xl p-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white/5 text-white/70 font-medium rounded-xl border border-white/20 hover:bg-white/10 hover:text-[var(--wuhu-neon-cyan)] hover:border-[var(--wuhu-neon-cyan)]/50 transition-all"
                    >
                        {t("toolbar.back")}
                    </button>
                    <button
                        onClick={onAnalyze}
                        disabled={analyzing}
                        className="bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_15px_rgba(167,87,255,0.4)] flex items-center gap-2 px-5 py-2.5 font-medium disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
                    >
                        {analyzing ? t("assets.stage.analyzing") : t("toolbar.analyzeLines")}
                    </button>
                    <button
                        onClick={onAddLine}
                        className="border border-white/20 text-white/70 hover:border-[var(--wuhu-neon-pink)] hover:text-white flex items-center gap-2 px-5 py-2.5 font-medium rounded-xl transition-colors"
                    >
                        {t("toolbar.addLine")}
                    </button>
                    <button
                        onClick={onGenerateAll}
                        disabled={isBatchSubmitting || !allSpeakersHaveVoice || totalLines === 0}
                        className="bg-gradient-to-r from-[var(--wuhu-neon-cyan)] to-[var(--wuhu-neon-purple)] text-white shadow-[0_0_15px_rgba(0,255,255,0.4)] flex items-center gap-2 px-5 py-2.5 font-medium disabled:opacity-50 disabled:cursor-not-allowed rounded-xl hover:shadow-[0_0_25px_rgba(0,255,255,0.6)] transition-all"
                        title={!allSpeakersHaveVoice ? t("toolbar.uploadReferenceHint") : ''}
                    >
                        {isBatchSubmitting ? (
                            <>
                                <TaskStatusInline state={voiceTaskRunningState} className="text-white [&>span]:text-white [&_svg]:text-white" />
                                <span className="text-xs text-white/90">({runningCount})</span>
                            </>
                        ) : t("toolbar.generateAll")}
                    </button>
                    <button
                        onClick={onDownloadAll}
                        disabled={linesWithAudio === 0 || isDownloading}
                        className="bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_15px_rgba(167,87,255,0.4)] flex items-center gap-2 px-5 py-2.5 font-medium disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
                        title={linesWithAudio === 0 ? t("toolbar.noDownload") : t("toolbar.downloadCount", { count: linesWithAudio })}
                    >
                        {isDownloading ? (
                            <TaskStatusInline state={voiceDownloadRunningState} className="text-white [&>span]:text-white [&_svg]:text-white" />
                        ) : t("toolbar.downloadAll")}
                    </button>
                </div>
                <div className="text-sm text-white/50">
                    {t("toolbar.stats", { total: totalLines, withVoice: linesWithVoice, withAudio: linesWithAudio })}
                </div>
            </div>
        </div>
    )
}
