'use client'

import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { AppIcon } from '@/components/ui/icons'
import type { ModelCapabilityOption, CapabilityFieldDefinition } from './config-modals/ModelCapabilityDropdown'
import type { CapabilityValue } from '@/lib/model-config-contract'

export interface ModelDropdownTestProps {
    models: ModelCapabilityOption[]
    value: string | undefined
    onModelChange: (modelKey: string) => void
    capabilityFields: CapabilityFieldDefinition[]
    capabilityOverrides: Record<string, CapabilityValue>
    onCapabilityChange: (field: string, rawValue: string, sample: CapabilityValue) => void
    placeholder?: string
}

const VIEWPORT_EDGE_GAP = 8
const DEFAULT_MAX_HEIGHT = 450

function useDropdown(isOpen: boolean, setIsOpen: (val: boolean) => void) {
    const triggerRef = useRef<HTMLButtonElement>(null)
    const panelRef = useRef<HTMLDivElement>(null)
    const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({})

    const updatePosition = useCallback(() => {
        if (!triggerRef.current) return
        const rect = triggerRef.current.getBoundingClientRect()
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight
        const spaceBelow = viewportHeight - rect.bottom - VIEWPORT_EDGE_GAP
        const spaceAbove = rect.top - VIEWPORT_EDGE_GAP

        let openUpward = false
        let currentMaxHeight = DEFAULT_MAX_HEIGHT

        if (spaceBelow < 250 && spaceAbove > spaceBelow) {
            openUpward = true
            currentMaxHeight = Math.min(DEFAULT_MAX_HEIGHT, spaceAbove)
        } else {
            currentMaxHeight = Math.min(DEFAULT_MAX_HEIGHT, spaceBelow)
        }

        setPanelStyle({
            position: 'fixed',
            left: rect.left,
            width: Math.max(rect.width, 320),
            maxHeight: currentMaxHeight,
            ...(openUpward
                ? { bottom: viewportHeight - rect.top + 6 }
                : { top: rect.bottom + 6 }),
            zIndex: 9999
        })
    }, [])

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            const target = e.target as Node
            if (triggerRef.current?.contains(target)) return
            if (panelRef.current?.contains(target)) return
            setIsOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [setIsOpen])

    useLayoutEffect(() => {
        if (!isOpen) return
        updatePosition()
        window.addEventListener('resize', updatePosition)
        window.addEventListener('scroll', updatePosition, true)
        return () => {
            window.removeEventListener('resize', updatePosition)
            window.removeEventListener('scroll', updatePosition, true)
        }
    }, [isOpen, updatePosition])

    return { triggerRef, panelRef, panelStyle }
}

function resolveParamSummary(fields: CapabilityFieldDefinition[], overrides: Record<string, CapabilityValue>) {
    return fields.map(def => {
        const val = overrides[def.field] !== undefined ? String(overrides[def.field]) : String(def.options[0] || '')
        return val
    }).filter(Boolean).join(' · ')
}

function DefaultParamsRenderer({ fields, overrides, onChange, className }: { fields: CapabilityFieldDefinition[], overrides: Record<string, CapabilityValue>, onChange: (field: string, rawValue: string, sample: CapabilityValue) => void, className?: string }) {
    if (fields.length === 0) return null;
    return (
        <div className={className}>
            <div className="text-[11px] font-bold text-white/50 px-1 pt-0.5 mb-2">参数配置</div>
            {fields.map(field => {
                const val = overrides[field.field] !== undefined ? String(overrides[field.field]) : String(field.options[0] || '')
                if (field.field === 'duration' || field.options.length >= 4) {
                    return (
                        <div key={field.field} className="flex items-center justify-between gap-4 px-1 py-1 relative group">
                            <span className="text-[13px] font-semibold text-white/70 shrink-0">{field.label || field.field}</span>
                            <div className="relative">
                                <select
                                    value={val}
                                    onChange={(e) => onChange(field.field, e.target.value, field.options[0])}
                                    className="appearance-none bg-transparent hover:bg-white/10 text-[13px] font-bold text-white pl-3 pr-7 py-1 rounded-md transition-colors outline-none cursor-pointer border border-transparent"
                                >
                                    {field.options.map(opt => <option key={String(opt)} value={String(opt)}>{String(opt)}</option>)}
                                </select>
                                <AppIcon name="chevronDown" className="w-3.5 h-3.5 text-white/50 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none group-hover:text-white transition-colors" />
                            </div>
                        </div>
                    )
                }
                return (
                    <div key={field.field} className="flex items-center justify-between gap-4 px-1 py-1">
                        <span className="text-[13px] font-semibold text-white/70 shrink-0">{field.label || field.field}</span>
                        <div className="flex bg-white/5 p-[3px] rounded-lg">
                            {field.options.map(opt => {
                                const s = String(opt)
                                const active = s === val
                                return (
                                    <button key={s} onClick={() => onChange(field.field, s, field.options[0])} className={`px-4 py-1.5 text-[12px] font-medium rounded-md transition-all ${active ? 'bg-[var(--wuhu-neon-purple)] text-white shadow-[0_0_10px_rgba(167,87,255,0.3)] font-bold' : 'text-white/50 hover:text-white'}`}>
                                        {s}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

// ============================================================================
// V1: Deep Glass Glow (绝对的文字发光与透明度) 
// 完美继承原 V6 的文字投影流派。去背景化。
// ============================================================================
export function IOSVariant1(props: ModelDropdownTestProps) {
    const [isOpen, setIsOpen] = useState(false)
    const { triggerRef, panelRef, panelStyle } = useDropdown(isOpen, setIsOpen)
    const activeModel = props.models.find(m => m.value === props.value)

    return (
        <>
            <button ref={triggerRef} onClick={() => setIsOpen(!isOpen)} className={`w-full h-[46px] px-4 rounded-[14px] bg-[var(--wuhu-bg-surface)] border transition-colors ${isOpen ? 'border-[var(--wuhu-neon-pink)]' : 'border-white/20 hover:border-white/40'}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-[14px] text-white">{activeModel?.label || props.placeholder}</span>
                        {activeModel?.providerName && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded border border-white/20 text-white/60 whitespace-nowrap">
                                {activeModel.providerName}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[13px] text-white/60">{resolveParamSummary(props.capabilityFields, props.capabilityOverrides)}</span>
                        <AppIcon name="chevronDown" className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180 text-[var(--wuhu-neon-pink)]' : 'text-white/50'}`} />
                    </div>
                </div>
            </button>
            {isOpen && createPortal(
                <div ref={panelRef} style={panelStyle} className="rounded-[20px] shadow-[0_0_40px_rgba(167,87,255,0.3)] border border-[var(--wuhu-neon-purple)]/30 bg-[var(--wuhu-bg-card)] flex flex-col p-2">
                    <div className="overflow-y-auto max-h-[220px]">
                        {props.models.map(m => (
                            <button key={m.value} onClick={() => props.onModelChange(m.value)} className={`w-full text-left px-3 py-2.5 rounded-[12px] font-medium transition-colors hover:bg-white/10 ${m.value === props.value ? 'bg-white/5' : ''}`}>
                                <span className={m.value === props.value ? 'text-[var(--wuhu-neon-pink)] font-bold' : 'text-white'}>{m.label}</span>
                            </button>
                        ))}
                    </div>
                    {props.capabilityFields.length > 0 && <div className="h-[1px] bg-white/10 mx-2 my-2" />}
                    <DefaultParamsRenderer fields={props.capabilityFields} overrides={props.capabilityOverrides} onChange={props.onCapabilityChange} className="space-y-3 p-2" />
                </div>, document.body
            )}
        </>
    )
}

// ============================================================================
// V2: Left Indicator Line (硬朗工业线段侧边提示) 
// 完美继承原 V7 的左侧工业级边框设计。
// ============================================================================
export function IOSVariant2(props: ModelDropdownTestProps) {
    const [isOpen, setIsOpen] = useState(false)
    const { triggerRef, panelRef, panelStyle } = useDropdown(isOpen, setIsOpen)
    const activeModel = props.models.find(m => m.value === props.value)

    return (
        <>
            <button ref={triggerRef} onClick={() => setIsOpen(!isOpen)} className="w-full h-[46px] px-4 rounded-[14px] bg-[var(--wuhu-bg-surface)] border border-white/20 flex items-center justify-between hover:border-white/40 transition-colors">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-[14px] text-white">{activeModel?.label || props.placeholder}</span>
                    {activeModel?.providerName && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded border border-white/20 text-white/60 whitespace-nowrap">
                            {activeModel.providerName}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[13px] text-white/60">{resolveParamSummary(props.capabilityFields, props.capabilityOverrides)}</span>
                    <AppIcon name="chevronDown" className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180 text-white' : 'text-white/50'}`} />
                </div>
            </button>
            {isOpen && createPortal(
                <div ref={panelRef} style={panelStyle} className="rounded-[20px] shadow-[0_0_50px_rgba(167,87,255,0.3)] border border-[var(--wuhu-neon-purple)]/30 bg-[var(--wuhu-bg-card)] flex flex-col pt-3 pb-2 overflow-hidden">
                    <div className="overflow-y-auto max-h-[220px]">
                        {props.models.map(m => {
                            const active = m.value === props.value
                            return (
                                <button key={m.value} onClick={() => props.onModelChange(m.value)} className={`w-full text-left px-5 py-2.5 transition-colors border-l-[3px] ${active ? 'border-[var(--wuhu-neon-pink)] bg-white/5 text-white font-bold' : 'border-transparent text-white/70 hover:bg-white/10'}`}>
                                    {m.label}
                                </button>
                            )
                        })}
                    </div>
                    {props.capabilityFields.length > 0 && <div className="h-[1px] bg-white/10 mx-4 my-3" />}
                    <DefaultParamsRenderer fields={props.capabilityFields} overrides={props.capabilityOverrides} onChange={props.onCapabilityChange} className="space-y-4 px-5 pb-3" />
                </div>, document.body
            )}
        </>
    )
}

// ============================================================================
// V3: Fusion (Indicator + Glow) 融合变体
// 吸收了左边条指示 + 文字自身发光的完美合体。
// ============================================================================
export function IOSVariant3(props: ModelDropdownTestProps) {
    const [isOpen, setIsOpen] = useState(false)
    const { triggerRef, panelRef, panelStyle } = useDropdown(isOpen, setIsOpen)
    const activeModel = props.models.find(m => m.value === props.value)

    return (
        <>
            <button ref={triggerRef} onClick={() => setIsOpen(!isOpen)} className={`w-full h-[46px] px-4 rounded-[14px] bg-[var(--wuhu-bg-surface)] border transition-all duration-300 ${isOpen ? 'border-[var(--wuhu-neon-pink)] shadow-[0_0_15px_rgba(255,100,200,0.3)]' : 'border-white/20 hover:border-white/40'}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-[14px] text-white">{activeModel?.label || props.placeholder}</span>
                        {activeModel?.providerName && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded border border-white/20 text-white/60 whitespace-nowrap">
                                {activeModel.providerName}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[13px] text-white/60">{resolveParamSummary(props.capabilityFields, props.capabilityOverrides)}</span>
                        <AppIcon name="chevronDown" className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180 text-[var(--wuhu-neon-pink)]' : 'text-white/50'}`} />
                    </div>
                </div>
            </button>
            {isOpen && createPortal(
                <div ref={panelRef} style={panelStyle} className="rounded-[20px] shadow-[0_0_50px_rgba(167,87,255,0.3)] border border-[var(--wuhu-neon-purple)]/30 bg-[var(--wuhu-bg-card)] flex flex-col p-2 overflow-hidden">
                    <div className="overflow-y-auto max-h-[220px]">
                        {props.models.map(m => {
                            const active = m.value === props.value
                            return (
                                <button key={m.value} onClick={() => props.onModelChange(m.value)} className={`w-full text-left px-3 py-2.5 rounded-[8px] transition-all border-l-[3px] hover:bg-white/10 ${active ? 'bg-[var(--wuhu-neon-purple)]/10 border-[var(--wuhu-neon-pink)] shadow-[-4px_0_12px_rgba(255,100,200,0.2)]' : 'border-transparent text-white/70'}`}>
                                    <span className={active ? 'text-[var(--wuhu-neon-pink)] font-bold pl-1' : 'pl-1'}>
                                        {m.label}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                    {props.capabilityFields.length > 0 && <div className="h-[1px] bg-white/10 mx-2 my-3" />}
                    <DefaultParamsRenderer fields={props.capabilityFields} overrides={props.capabilityOverrides} onChange={props.onCapabilityChange} className="space-y-4 px-2 pb-2" />
                </div>, document.body
            )}
        </>
    )
}

// ============================================================================
// V4: Pill Active Marker + Glow (极简悬浮胶囊标示 + 文本色晕)
// 原左侧边条缩编为一个极其悬浮的前置小药丸胶囊，十分精致高级。
// ============================================================================
export function IOSVariant4(props: ModelDropdownTestProps) {
    const [isOpen, setIsOpen] = useState(false)
    const { triggerRef, panelRef, panelStyle } = useDropdown(isOpen, setIsOpen)
    const activeModel = props.models.find(m => m.value === props.value)

    return (
        <>
            <button ref={triggerRef} onClick={() => setIsOpen(!isOpen)} className="w-full h-[46px] px-4 rounded-[14px] bg-[var(--wuhu-bg-surface)] border border-white/20 flex items-center justify-between hover:border-white/40 transition-colors">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-[14px] text-white">{activeModel?.label || props.placeholder}</span>
                    {activeModel?.providerName && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded border border-white/20 text-white/60 whitespace-nowrap">
                            {activeModel.providerName}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[13px] text-white/60">{resolveParamSummary(props.capabilityFields, props.capabilityOverrides)}</span>
                    <AppIcon name="chevronDown" className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''} text-white/50`} />
                </div>
            </button>
            {isOpen && createPortal(
                <div ref={panelRef} style={panelStyle} className="rounded-[20px] shadow-[0_0_50px_rgba(167,87,255,0.3)] border border-[var(--wuhu-neon-purple)]/30 bg-[var(--wuhu-bg-card)] flex flex-col p-2 overflow-hidden">
                    <div className="overflow-y-auto max-h-[220px]">
                        {props.models.map(m => {
                            const active = m.value === props.value
                            return (
                                <button key={m.value} onClick={() => props.onModelChange(m.value)} className="w-full relative text-left px-5 py-2.5 rounded-[10px] transition-colors hover:bg-white/10">
                                    {active && (
                                        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-3/5 rounded-full bg-[var(--wuhu-neon-pink)] shadow-[0_0_8px_rgba(255,100,200,0.5)]" />
                                    )}
                                    <span className={active ? 'text-[var(--wuhu-neon-pink)] font-bold' : 'text-white/70 font-medium'}>
                                        {m.label}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                    {props.capabilityFields.length > 0 && <div className="h-[1px] bg-white/10 mx-3 my-3" />}
                    <DefaultParamsRenderer fields={props.capabilityFields} overrides={props.capabilityOverrides} onChange={props.onCapabilityChange} className="space-y-4 px-3 pb-3" />
                </div>, document.body
            )}
        </>
    )
}

// ============================================================================
// V5: Underline Glow (下划弧度标示 + 全文字发光)
// 在保留 Glow 特性的前提下，将纯粹的左侧指示器转移到了内嵌胶囊底部极具设计感的下划线。
// ============================================================================
export function IOSVariant5(props: ModelDropdownTestProps) {
    const [isOpen, setIsOpen] = useState(false)
    const { triggerRef, panelRef, panelStyle } = useDropdown(isOpen, setIsOpen)
    const activeModel = props.models.find(m => m.value === props.value)

    return (
        <>
            <button ref={triggerRef} onClick={() => setIsOpen(!isOpen)} className="w-full h-[46px] px-4 rounded-[14px] bg-[var(--wuhu-bg-surface)] border border-white/20 flex items-center justify-between hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-[14px] text-white">{activeModel?.label || props.placeholder}</span>
                    {activeModel?.providerName && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded border border-white/20 text-white/60 whitespace-nowrap">
                            {activeModel.providerName}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[13px] text-white/60">{resolveParamSummary(props.capabilityFields, props.capabilityOverrides)}</span>
                    <AppIcon name="chevronDown" className="w-4 h-4 text-white/50" />
                </div>
            </button>
            {isOpen && createPortal(
                <div ref={panelRef} style={panelStyle} className="rounded-[20px] shadow-[0_0_50px_rgba(167,87,255,0.3)] border border-[var(--wuhu-neon-purple)]/30 bg-[var(--wuhu-bg-card)] flex flex-col p-2 overflow-hidden">
                    <div className="overflow-y-auto max-h-[220px]">
                        {props.models.map(m => {
                            const active = m.value === props.value
                            return (
                                <button key={m.value} onClick={() => props.onModelChange(m.value)} className={`w-full text-left px-4 py-3 rounded-[12px] transition-all border-b-[2px] ${active ? 'border-[var(--wuhu-neon-pink)] bg-white/5 shadow-[0_4px_16px_rgba(255,100,200,0.2)]' : 'border-transparent text-white/70 hover:bg-white/10'}`}>
                                    <span className={active ? 'text-[var(--wuhu-neon-pink)] font-bold' : 'font-medium'}>
                                        {m.label}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                    {props.capabilityFields.length > 0 && <div className="h-[1px] bg-white/10 mx-3 my-3" />}
                    <DefaultParamsRenderer fields={props.capabilityFields} overrides={props.capabilityOverrides} onChange={props.onCapabilityChange} className="space-y-4 px-3 pb-2" />
                </div>, document.body
            )}
        </>
    )
}
