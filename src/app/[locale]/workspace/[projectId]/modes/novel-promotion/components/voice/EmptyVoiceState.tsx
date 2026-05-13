'use client'
import { useTranslations } from 'next-intl'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import { resolveTaskPresentationState } from '@/lib/task/presentation'
import { AppIcon } from '@/components/ui/icons'

interface EmptyVoiceStateProps {
    onAnalyze: () => void
    analyzing: boolean
}

export default function EmptyVoiceState({
    onAnalyze,
    analyzing
}: EmptyVoiceStateProps) {
    const t = useTranslations('voice')
    const analyzingState = analyzing
        ? resolveTaskPresentationState({
            phase: 'processing',
            intent: 'analyze',
            resource: 'text',
            hasOutput: false,
        })
        : null

    return (
        <div className="bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_50px_rgba(167,87,255,0.3)] rounded-xl p-10 text-center">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--wuhu-neon-purple)]/15 text-[var(--wuhu-neon-purple)]">
                <AppIcon name="micOutline" className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold text-white/70 mb-2">{t("empty.title")}</h3>
            <p className="text-white/50 mb-6">{t("empty.description")}</p>
            <button
                onClick={onAnalyze}
                disabled={analyzing}
                className="bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_15px_rgba(167,87,255,0.4)] inline-flex items-center gap-2 px-6 py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
            >
                {analyzing ? (
                    <TaskStatusInline state={analyzingState} className="text-white [&>span]:text-white [&_svg]:text-white" />
                ) : (
                    <>
                        <AppIcon name="clipboardCheck" className="w-5 h-5" />
                        {t("empty.analyzeButton")}
                    </>
                )}
            </button>
            <p className="text-sm text-white/50 mt-6">
                {t("empty.hint")}
            </p>
        </div>
    )
}
