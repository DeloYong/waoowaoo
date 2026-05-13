'use client'

/**
 * ModelCapabilityDropdown - 方案 A 经典分区式
 * 自定义下拉组件：上半区选模型，分割线，下半区配参数
 * 触发器显示模型名 + provider + 参数摘要
 *
 * 用于：
 *  - 项目配置中心 (ConfigEditModal / SettingsModal)
 *  - 系统级设置中心 (ApiConfigTabContainer)
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'
import type { CapabilityValue } from '@/lib/model-config-contract'
import { AppIcon, RatioPreviewIcon } from '@/components/ui/icons'

// ─── Types ────────────────────────────────────────────

export interface ModelCapabilityOption {
    /** Composite key e.g. "ark::doubao-seedance-1-0-pro-250528" */
    value: string
    /** Display name */
    label: string
    /** Raw provider id */
    provider?: string
    /** Friendly provider name */
    providerName?: string
    /** Whether this model is disabled in current context */
    disabled?: boolean
}

export interface CapabilityFieldDefinition {
    field: string
    label: string
    options: CapabilityValue[]
    disabledOptions?: CapabilityValue[]
}

export interface CapabilityBooleanToggle {
    key: string
    label: string
    value: boolean
    onChange: (next: boolean) => void
    onLabel?: string
    offLabel?: string
}

export interface ModelCapabilityDropdownProps {
    /** Available model options */
    models: ModelCapabilityOption[]
    /** Currently selected model key */
    value: string | undefined
    /** Callback when model selection changes */
    onModelChange: (modelKey: string) => void
    /** Capability fields for the currently selected model */
    capabilityFields: CapabilityFieldDefinition[]
    /** Current capability override values keyed by field name */
    capabilityOverrides: Record<string, CapabilityValue>
    /** Callback when a capability value changes. Pass empty string to reset. */
    onCapabilityChange: (field: string, rawValue: string, sample: CapabilityValue) => void
    /** Optional: label text to show when no model is selected */
    placeholder?: string
    /** Optional: compact mode for smaller card contexts */
    compact?: boolean
    /** Optional: extra boolean toggles rendered in param section */
    booleanToggles?: CapabilityBooleanToggle[]
    /** Optional: control dropdown placement strategy. Defaults to 'auto'. */
    placementMode?: 'auto' | 'downward'
}

const DEFAULT_PANEL_MAX_HEIGHT = 520
const VIEWPORT_EDGE_GAP = 16

// ─── Helpers ──────────────────────────────────────────

function RatioIcon({ ratio, size = 12, selected = false }: { ratio: string; size?: number; selected?: boolean }) {
    return (
        <RatioPreviewIcon
            ratio={ratio}
            size={size}
            selected={selected}
            radiusClassName="rounded-[3px]"
        />
    )
}

function isRatioLike(field: string, options: CapabilityValue[]): boolean {
    const normalizedField = field.toLowerCase().replace(/[_\-\s]/g, '')
    if (normalizedField === 'ratio' || normalizedField === 'aspectratio') return true
    return options.every((o) => typeof o === 'string' && /^\d+:\d+$/.test(o))
}

function isValidRatioText(value: string): boolean {
    return /^\d+:\d+$/.test(value)
}

function shouldUseSelectControl(field: string, options: CapabilityValue[]): boolean {
    if (options.length <= 3) return false
    if (field.toLowerCase().includes('duration')) return true
    if (field.toLowerCase().includes('fps')) return true
    return options.every((item) => typeof item === 'number')
}


function isOptionDisabled(def: CapabilityFieldDefinition, option: CapabilityValue): boolean {
    if (!Array.isArray(def.disabledOptions) || def.disabledOptions.length === 0) return false
    return def.disabledOptions.includes(option)
}

// ─── Component ────────────────────────────────────────

export function ModelCapabilityDropdown({
    models,
    value,
    onModelChange,
    capabilityFields,
    capabilityOverrides,
    onCapabilityChange,
    placeholder,
    compact = false,
    booleanToggles = [],
    placementMode = 'auto',
}: ModelCapabilityDropdownProps) {
    const t = useTranslations('configModal')
    const tv = useTranslations('video')
    const [isOpen, setIsOpen] = useState(false)
    const triggerRef = useRef<HTMLDivElement>(null)
    const panelRef = useRef<HTMLDivElement>(null)
    const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({})

    const updateDropdownPlacement = useCallback(() => {
        const trigger = triggerRef.current
        if (!trigger) return

        const rect = trigger.getBoundingClientRect()
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight
        const spaceAbove = Math.max(0, rect.top - VIEWPORT_EDGE_GAP)
        const spaceBelow = Math.max(0, viewportHeight - rect.bottom - VIEWPORT_EDGE_GAP)
        const preferAutoPlacement = placementMode === 'auto'
        const shouldOpenUpward = preferAutoPlacement
            ? (spaceBelow < DEFAULT_PANEL_MAX_HEIGHT && spaceAbove > spaceBelow)
            : false
        const availableSpace = shouldOpenUpward ? spaceAbove : spaceBelow
        const clampedMaxHeight = Math.max(0, Math.min(DEFAULT_PANEL_MAX_HEIGHT, Math.floor(availableSpace)))



        const viewportWidth = window.innerWidth || document.documentElement.clientWidth
        const minWidth = compact ? 340 : 400
        const panelWidth = Math.max(minWidth, rect.width)
        // Ensure panel doesn't overflow the right edge of viewport
        const maxLeft = viewportWidth - panelWidth - VIEWPORT_EDGE_GAP
        const panelLeft = Math.max(VIEWPORT_EDGE_GAP, Math.min(rect.left, maxLeft))

        setPanelStyle({
            position: 'fixed' as const,
            left: `${panelLeft}px`,
            width: `${panelWidth}px`,
            maxHeight: `${clampedMaxHeight}px`,
            ...(shouldOpenUpward
                ? { bottom: `${viewportHeight - rect.top + 4}px` }
                : { top: `${rect.bottom + 4}px` }
            ),
        })
    }, [compact, placementMode])

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            const target = e.target as Node
            if (triggerRef.current?.contains(target)) return
            if (panelRef.current?.contains(target)) return
            setIsOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useLayoutEffect(() => {
        if (!isOpen) return

        updateDropdownPlacement()
        window.addEventListener('resize', updateDropdownPlacement)
        window.addEventListener('scroll', updateDropdownPlacement, true)

        return () => {
            window.removeEventListener('resize', updateDropdownPlacement)
            window.removeEventListener('scroll', updateDropdownPlacement, true)
        }
    }, [isOpen, updateDropdownPlacement])

    const handleToggleOpen = () => {
        if (isOpen) {
            setIsOpen(false)
            return
        }
        updateDropdownPlacement()
        setIsOpen(true)
    }

    const selectedModel = models.find((m) => m.value === value)
    const visibleCapabilityFields = capabilityFields.filter((field) => field.field !== 'generationMode')

    const resolveCapabilityLabel = useCallback((field: CapabilityFieldDefinition): string => {
        try {
            return tv(`capability.${field.field}` as never)
        } catch {
            return field.label
        }
    }, [tv])

    /** Format option value for display — converts booleans to localized On/Off */
    const formatOptionLabel = useCallback((val: CapabilityValue): string => {
        if (val === true || val === 'true') return t('boolOn')
        if (val === false || val === 'false') return t('boolOff')
        return String(val)
    }, [t])

    // Build summary text from capability overrides + defaults
    const paramSummary = visibleCapabilityFields
        .map((def) => {
            const val = capabilityOverrides[def.field] !== undefined
                ? capabilityOverrides[def.field]
                : (def.options.length > 0 ? def.options[0] : '')
            return formatOptionLabel(val)
        })
        .concat(
            booleanToggles.map((toggle) => {
                if (toggle.value) return `${toggle.label}:${toggle.onLabel || 'On'}`
                return ''
            }),
        )
        .filter(Boolean)
        .join(' · ')

    const triggerPy = compact ? 'py-1' : 'py-2.5'
    const triggerPx = compact ? 'px-1.5' : 'px-3'
    const textSize = compact ? 'text-[11px]' : 'text-sm'
    const modelOptionTextSize = compact ? 'text-[12px]' : 'text-sm'

    return (
        <div ref={triggerRef}>
            {/* ─── Trigger (Deep Glass Glow Style) ─── */}
            <button
                type="button"
                onClick={handleToggleOpen}
                className={`bg-[var(--wuhu-bg-surface)] border border-white/20 w-full ${triggerPx} ${triggerPy} rounded-[14px] transition-all duration-200 cursor-pointer ${isOpen
                    ? '!border-[var(--wuhu-neon-pink)] shadow-[0_0_15px_rgba(255,100,200,0.3)]'
                    : 'hover:border-white/40'
                    }`}
            >
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        {selectedModel ? (
                            <>
                                <span className={`${textSize} text-white font-semibold truncate`}>
                                    {selectedModel.label}
                                </span>
                            </>
                        ) : (
                            <span className={`${textSize} text-white/50`}>
                                {placeholder || t('pleaseSelect')}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        {selectedModel && (paramSummary || selectedModel.providerName || selectedModel.provider) && (
                            <span className="relative group/info">
                                <AppIcon name="info" className="w-4 h-4 text-white/50 hover:text-white/70 transition-colors cursor-help" />
                                <span className="pointer-events-none absolute right-0 bottom-full mb-2 whitespace-nowrap rounded-lg bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 px-3 py-1.5 text-[12px] text-white opacity-0 transition-opacity group-hover/info:opacity-100 z-50 shadow-[0_0_20px_rgba(167,87,255,0.2)]">
                                    {[selectedModel.providerName || selectedModel.provider, paramSummary].filter(Boolean).join(' · ')}
                                </span>
                            </span>
                        )}
                        <AppIcon name="chevronDown" className={`w-4 h-4 transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180 text-white' : 'text-white/50'}`} />
                    </div>
                </div>
            </button>

            {/* ─── Dropdown Panel (Portal · Wuhu Neon Style) ─── */}
            {isOpen && createPortal(
                <div
                    ref={panelRef}
                    className="bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 z-[9999] overflow-hidden flex flex-col rounded-[20px] shadow-[0_0_40px_rgba(167,87,255,0.3)]"
                    style={panelStyle}
                >
                    {/* Model list */}
                    <div className="px-2 pb-2 min-h-0 flex-1 overflow-y-auto custom-scrollbar">
                        {(() => {
                            // Group models by provider
                            const grouped = new Map<string, ModelCapabilityOption[]>()
                            for (const m of models) {
                                const key = m.providerName || m.provider || 'Other'
                                if (!grouped.has(key)) grouped.set(key, [])
                                grouped.get(key)!.push(m)
                            }
                            return Array.from(grouped.entries()).map(([providerLabel, groupModels]) => (
                                <div key={providerLabel} className="mb-1">
                                    <div className="sticky top-0 z-10 px-2 pt-2 pb-1 bg-[var(--wuhu-bg-card)]/80 backdrop-blur-md">
                                        <span className="text-[11px] font-bold text-white/50 tracking-wide">
                                            {providerLabel}
                                        </span>
                                    </div>
                                    <div className="space-y-0.5">
                                        {groupModels.map((m) => (
                                            <button
                                                key={m.value}
                                                type="button"
                                                onClick={() => {
                                                    if (m.disabled) return
                                                    onModelChange(m.value)
                                                }}
                                                disabled={m.disabled}
                                                className={`w-full text-left px-4 py-2 transition-all border-l-[3px] ${value === m.value
                                                    ? 'border-[var(--wuhu-neon-pink)] bg-white/10 font-bold'
                                                    : m.disabled
                                                        ? 'border-transparent text-white/40 opacity-60 cursor-not-allowed'
                                                        : 'border-transparent hover:bg-white/5'
                                                    }`}
                                            >
                                                <span className={value === m.value
                                                    ? `${modelOptionTextSize} font-bold text-white`
                                                    : `${modelOptionTextSize} font-medium text-white/70`
                                                }>
                                                    {m.label}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))
                        })()}
                    </div>

                    {/* Capability params: fixed at panel bottom */}
                    {(visibleCapabilityFields.length > 0 || booleanToggles.length > 0) && (
                        <div data-capability-params className="shrink-0 bg-[var(--wuhu-bg-surface)]">
                            <div className="px-4 py-3">
                                <div className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-2.5">
                                    {t('paramConfig')}
                                </div>
                                <div className="max-h-[156px] overflow-y-auto custom-scrollbar pr-1">
                                    <div className="space-y-3">
                                        {visibleCapabilityFields.map((def) => {
                                            const currentVal = capabilityOverrides[def.field] !== undefined
                                                ? String(capabilityOverrides[def.field])
                                                : ''
                                            const isR = isRatioLike(def.field, def.options)
                                            const useSelect = shouldUseSelectControl(def.field, def.options)
                                            const fallbackOption = def.options[0]
                                            const selectValue = currentVal || String(fallbackOption)

                                            return (
                                                <div key={def.field} className="flex items-center justify-between gap-3">
                                                    <span className="text-[13px] text-white/70 font-semibold shrink-0">
                                                        {resolveCapabilityLabel(def)}
                                                    </span>
                                                    {def.options.length === 1 ? (
                                                        <span className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-white/5 border border-white/20 text-white/70 flex items-center gap-1">
                                                            {(() => {
                                                                const ratioValue = String(def.options[0])
                                                                return isR && isValidRatioText(ratioValue) ? <RatioIcon ratio={ratioValue} size={10} /> : null
                                                            })()}
                                                            {formatOptionLabel(def.options[0])}
                                                            <span className="text-white/50 text-[10px]">({t('fixed')})</span>
                                                        </span>
                                                    ) : useSelect ? (
                                                        <div className="relative group">
                                                            <select
                                                                value={selectValue}
                                                                onChange={(event) => onCapabilityChange(def.field, event.target.value, def.options[0])}
                                                                className="appearance-none bg-transparent hover:bg-white/5 text-[13px] font-bold text-white pl-3 pr-7 py-1 rounded-md transition-colors outline-none cursor-pointer border border-transparent"
                                                            >
                                                                {def.options.map((opt) => {
                                                                    const s = String(opt)
                                                                    return (
                                                                        <option key={s} value={s}>
                                                                            {formatOptionLabel(opt)}
                                                                        </option>
                                                                    )
                                                                })}
                                                            </select>
                                                            <AppIcon name="chevronDown" className="w-3.5 h-3.5 text-white/50 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none group-hover:text-white transition-colors" />
                                                        </div>
                                                    ) : (
                                                        <div className="flex bg-white/5 p-[3px] rounded-lg">
                                                            {def.options.map((opt) => {
                                                                const s = String(opt)
                                                                const disabled = isOptionDisabled(def, opt)
                                                                const on = currentVal ? s === currentVal : s === String(fallbackOption)
                                                                return (
                                                                    <button
                                                                        key={s}
                                                                        type="button"
                                                                        onClick={() => onCapabilityChange(def.field, s, def.options[0])}
                                                                        className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-all flex items-center gap-1 cursor-pointer ${on
                                                                            ? 'bg-[var(--wuhu-neon-purple)]/30 text-white font-bold'
                                                                            : disabled
                                                                                ? 'text-white/40 opacity-75 hover:opacity-95'
                                                                                : 'text-white/60 hover:text-white'
                                                                            }`}
                                                                    >
                                                                        {isR && isValidRatioText(s) && <RatioIcon ratio={s} size={10} selected={on} />}
                                                                        {formatOptionLabel(opt)}
                                                                    </button>
                                                                )
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                        {booleanToggles.map((toggle) => (
                                            <div key={toggle.key} className="flex items-center justify-between gap-3">
                                                <span className="text-[13px] text-white/70 font-semibold shrink-0">
                                                    {toggle.label}
                                                </span>
                                                <div className="flex bg-white/5 p-[3px] rounded-lg">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggle.onChange(true)}
                                                        className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-all ${toggle.value
                                                            ? 'bg-[var(--wuhu-neon-purple)]/30 text-white font-bold'
                                                            : 'text-white/60 hover:text-white'
                                                            }`}
                                                    >
                                                        {toggle.onLabel || 'On'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggle.onChange(false)}
                                                        className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-all ${!toggle.value
                                                            ? 'bg-[var(--wuhu-neon-purple)]/30 text-white font-bold'
                                                            : 'text-white/60 hover:text-white'
                                                            }`}
                                                    >
                                                        {toggle.offLabel || 'Off'}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>,
                document.body,
            )}
        </div>
    )
}
