'use client'
import { useTranslations } from 'next-intl'

interface SpeakerVoiceStatusProps {
    speakers: string[]
    speakerStats: Record<string, number>
    getSpeakerVoiceUrl: (speaker: string) => string | null
    onOpenAssetLibrary: (speaker: string) => void
    /** 内联绑定回调：当发言人不在资产库中时调用 */
    onOpenInlineBinding?: (speaker: string) => void
    /** 判断发言人是否有匹配的项目角色 */
    hasSpeakerCharacter?: (speaker: string) => boolean
    embedded?: boolean
}

export default function SpeakerVoiceStatus({
    speakers,
    speakerStats,
    getSpeakerVoiceUrl,
    onOpenAssetLibrary,
    onOpenInlineBinding,
    hasSpeakerCharacter,
    embedded = false
}: SpeakerVoiceStatusProps) {
    const t = useTranslations('voice')

    if (speakers.length === 0) return null

    /**
     * 点击"音色设置"按钮的处理逻辑：
     * - 有匹配的项目角色 → 跳转资产中心（现有行为）
     * - 无匹配的项目角色 → 打开内联绑定弹窗
     */
    const handleVoiceSettings = (speaker: string) => {
        const hasCharacter = hasSpeakerCharacter ? hasSpeakerCharacter(speaker) : true
        if (hasCharacter || !onOpenInlineBinding) {
            onOpenAssetLibrary(speaker)
        } else {
            onOpenInlineBinding(speaker)
        }
    }

    // 嵌入模式：紧凑布局
    if (embedded) {
        return (
            <div className="bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 rounded-xl px-4 py-3 mb-3 mx-4">
                <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-white">{t("embedded.speakerVoiceStatus")}</h4>
                    <span className="text-xs text-white/50">{t("embedded.speakersCount", { count: speakers.length })}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {speakers.map(speaker => {
                        const hasVoice = !!getSpeakerVoiceUrl(speaker)
                        const count = speakerStats[speaker]
                        const hasCharacter = hasSpeakerCharacter ? hasSpeakerCharacter(speaker) : true
                        return (
                            <div
                                key={speaker}
                                className="w-full sm:w-[280px] max-w-full flex items-center gap-1.5 rounded-xl border border-[var(--wuhu-neon-purple)]/30 bg-[var(--wuhu-bg-card)] px-3 py-2 hover:border-[var(--wuhu-neon-pink)]/50 transition-colors"
                            >
                                <div className="min-w-0">
                                    <div className="text-sm font-semibold text-white truncate">{speaker}</div>
                                    <div className="text-xs text-white/50">{t("speakerVoice.linesCount", { count })}</div>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full ${hasVoice
                                    ? 'bg-[var(--wuhu-neon-cyan)]/15 text-[var(--wuhu-neon-cyan)] border border-[var(--wuhu-neon-cyan)]/30'
                                    : 'bg-[var(--wuhu-neon-orange)]/15 text-[var(--wuhu-neon-orange)] border border-[var(--wuhu-neon-orange)]/30'
                                    }`}>
                                    {hasVoice ? t("speakerVoice.configuredStatus") : t("speakerVoice.pendingStatus")}
                                </span>
                                {/* 无匹配角色时显示内联标记 */}
                                {!hasCharacter && !hasVoice && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--wuhu-neon-purple)]/15 text-[var(--wuhu-neon-purple)] border border-[var(--wuhu-neon-purple)]/30">
                                        {t("speakerVoice.inlineLabel")}
                                    </span>
                                )}
                                <button
                                    onClick={() => handleVoiceSettings(speaker)}
                                    className="border border-white/20 text-white/70 hover:border-[var(--wuhu-neon-pink)] hover:text-white text-xs px-2.5 py-1.5 font-medium whitespace-nowrap shrink-0 rounded-lg transition-colors"
                                >
                                    {t("speakerVoice.voiceSettings")}
                                </button>
                            </div>
                        )
                    })}
                </div>
            </div>
        )
    }

    // 标准模式：完整布局
    return (
        <div className="bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_50px_rgba(167,87,255,0.2)] rounded-xl p-5">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-1.5 h-5 bg-gradient-to-b from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] rounded-full" />
                {t("speakerVoice.title")}
                <span className="text-sm font-normal text-white/50 ml-2">
                    （{t("speakerVoice.hint")}）
                </span>
            </h3>
            <div className="flex flex-wrap gap-2">
                {speakers.map(speaker => {
                    const voiceUrl = getSpeakerVoiceUrl(speaker)
                    const hasVoice = !!voiceUrl
                    const hasCharacter = hasSpeakerCharacter ? hasSpeakerCharacter(speaker) : true

                    return (
                        <div key={speaker} className="w-full sm:w-[280px] max-w-full flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--wuhu-neon-purple)]/30 bg-[var(--wuhu-bg-card)] hover:border-[var(--wuhu-neon-pink)]/50 transition-colors">
                            <div className="min-w-0">
                                <div className="font-semibold text-white truncate" title={speaker}>{speaker}</div>
                                <div className="text-xs text-white/50">{t("speakerVoice.linesCount", { count: speakerStats[speaker] })}</div>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${hasVoice ? 'bg-[var(--wuhu-neon-cyan)]/15 text-[var(--wuhu-neon-cyan)] border border-[var(--wuhu-neon-cyan)]/30' : 'bg-[var(--wuhu-neon-orange)]/15 text-[var(--wuhu-neon-orange)] border border-[var(--wuhu-neon-orange)]/30'}`}>
                                {hasVoice ? t("speakerVoice.configuredStatus") : t("speakerVoice.pendingStatus")}
                            </span>
                            {/* 无匹配角色时显示内联标记 */}
                            {!hasCharacter && !hasVoice && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--wuhu-neon-purple)]/15 text-[var(--wuhu-neon-purple)] border border-[var(--wuhu-neon-purple)]/30">
                                    {t("speakerVoice.inlineLabel")}
                                </span>
                            )}
                            <button
                                onClick={() => handleVoiceSettings(speaker)}
                                className="border border-white/20 text-white/70 hover:border-[var(--wuhu-neon-pink)] hover:text-white text-xs px-2.5 py-1.5 rounded-lg transition-colors"
                            >
                                {t("speakerVoice.voiceSettings")}
                            </button>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
