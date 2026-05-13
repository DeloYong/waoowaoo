'use client'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'

/**
 * PanelActionButtons - 面板间操作按钮组
 * 包含两个按钮：
 * - + 插入分镜（原有功能）
 * - 镜头变体（新功能）
 */

interface PanelActionButtonsProps {
    onInsertPanel: () => void
    onVariant: () => void
    disabled?: boolean
    hasImage: boolean // 原镜头是否有图片（没图片不能做变体）
}

export default function PanelActionButtons({
    onInsertPanel,
    onVariant,
    disabled,
    hasImage
}: PanelActionButtonsProps) {
    const t = useTranslations('storyboard')
    const baseButtonClass = `
        group relative h-7 w-7 rounded-full
        border border-white/20
        bg-[var(--wuhu-bg-card)] text-white/50
        shadow-none transition-all duration-200 ease-out
        flex items-center justify-center
    `
    const enabledButtonClass = `
        hover:text-white hover:bg-white/10 hover:border-[var(--wuhu-neon-pink)]
    `
    const disabledButtonClass = `
        bg-[var(--wuhu-bg-surface)] text-white/30 cursor-not-allowed
    `

    return (
        <div className="flex flex-col items-center gap-1">
            {/* 插入分镜按钮 */}
            <button
                onClick={onInsertPanel}
                disabled={disabled}
                className={`
                    ${baseButtonClass}
                    ${disabled ? disabledButtonClass : enabledButtonClass}
                `}
                title={t('panelActions.insertHere')}
            >
                <AppIcon name="plus" className="w-4 h-4" />

                {/* Hover 时显示提示 */}
                <span className={`
                    absolute -top-8 left-1/2 -translate-x-1/2
                    px-2 py-1 text-xs text-white bg-black/70 backdrop-blur-sm rounded-lg
                    opacity-0 group-hover:opacity-100
                    transition-opacity duration-200
                    whitespace-nowrap pointer-events-none
                    ${disabled ? 'hidden' : ''}
                `}>
                    {t('panelActions.insertPanel')}
                </span>
            </button>

            {/* 镜头变体按钮 */}
            <button
                onClick={onVariant}
                disabled={disabled || !hasImage}
                className={`
                    ${baseButtonClass}
                    ${disabled || !hasImage ? disabledButtonClass : enabledButtonClass}
                `}
                title={hasImage ? t('panelActions.generateVariant') : t('panelActions.needImage')}
            >
                <AppIcon name="videoAlt" className="w-4 h-4" />

                {/* Hover 时显示提示 */}
                <span className={`
                    absolute -top-8 left-1/2 -translate-x-1/2
                    px-2 py-1 text-xs text-white bg-black/70 backdrop-blur-sm rounded-lg
                    opacity-0 group-hover:opacity-100
                    transition-opacity duration-200
                    whitespace-nowrap pointer-events-none
                    ${disabled || !hasImage ? 'hidden' : ''}
                `}>
                    {t('panelActions.panelVariant')}
                </span>
            </button>
        </div>
    )
}
