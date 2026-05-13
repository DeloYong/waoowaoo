'use client'

import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'
/**
 * InsertPanelButton - 面板间插入按钮
 * 在两个 PanelCard 之间显示一个 + 号按钮
 */

interface InsertPanelButtonProps {
    onClick: () => void
    disabled?: boolean
}

export default function InsertPanelButton({ onClick, disabled }: InsertPanelButtonProps) {
    const t = useTranslations('storyboard')
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
                group relative h-7 w-7 rounded-full
                bg-[var(--wuhu-bg-surface)] border border-white/20 hover:bg-white/5 rounded-lg transition-all border border-[rgba(167, 87, 255, 0.2)]
                bg-[var(--wuhu-bg-surface)] text-[rgba(255,255,255,0.7)]
                shadow-[0_2px_8px_rgba(0,0,0,0.15)] transition-all duration-200 ease-out
                flex items-center justify-center
                ${disabled
                    ? 'bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.5)] cursor-not-allowed'
                    : 'hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:border-[var(--wuhu-neon-cyan)] hover:bg-[rgba(0, 255, 255, 0.1)]'
                }
            `}
            title={t('panelActions.insertHere')}
        >
            <AppIcon name="plus" className="w-4 h-4" />

            {/* Hover 时显示提示 */}
            <span className={`
                absolute -top-8 left-1/2 -translate-x-1/2
                px-2 py-1 text-xs text-white bg-[var(--bg-black/60 backdrop-blur-sm)] rounded
                opacity-0 group-hover:opacity-100
                transition-opacity duration-200
                whitespace-nowrap pointer-events-none
                ${disabled ? 'hidden' : ''}
            `}>
                {t('panelActions.insertPanel')}
            </span>
        </button>
    )
}
