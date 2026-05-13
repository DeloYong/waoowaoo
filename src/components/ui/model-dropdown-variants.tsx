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
const DEFAULT_MAX_HEIGHT = 400

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
        if (def.field === 'duration') return `${val}s`
        return val
    }).filter(Boolean).join(' · ')
}

// ============================================================================
// Variant 1: Apple iOS Segmented Control Style
// Clean white/glass, segmented parameters, extremely rounded corners.
// ============================================================================
export function ModelDropdownV1(props: ModelDropdownTestProps) {
    const [isOpen, setIsOpen] = useState(false)
    const { triggerRef, panelRef, panelStyle } = useDropdown(isOpen, setIsOpen)
    const activeModel = props.models.find(m => m.value === props.value)
    const summary = resolveParamSummary(props.capabilityFields, props.capabilityOverrides)

    return (
        <>
            <button
                ref={triggerRef}
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-between w-full h-[46px] px-4 rounded-[14px] transition-all duration-300 bg-[var(--wuhu-bg-surface)] border border-white/20 hover:bg-white/5 ${isOpen ? 'border-[var(--wuhu-neon-pink)] shadow-[0_0_15px_rgba(255,100,200,0.3)]' : ''}`}
            >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="font-semibold text-[14px] text-white">
                        {activeModel ? activeModel.label : props.placeholder}
                    </span>
                    {activeModel?.providerName && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                            {activeModel.providerName}
                        </span>
                    )}
                    {summary && <span className="text-[12px] text-white/50 ml-auto pr-2">{summary}</span>}
                </div>
                <AppIcon name="chevronDown" className={`w-4 h-4 text-white/50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && createPortal(
                <div ref={panelRef} style={panelStyle} className="rounded-[20px] shadow-[0_0_40px_rgba(167,87,255,0.3)] border border-[var(--wuhu-neon-purple)]/30 overflow-hidden flex flex-col backdrop-blur-2xl bg-[var(--wuhu-bg-card)]">
                    <div className="overflow-y-auto px-2 py-2 max-h-[220px]">
                        {props.models.map(m => {
                            const active = m.value === props.value
                            return (
                                <button
                                    key={m.value}
                                    onClick={() => props.onModelChange(m.value)}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[12px] mb-0.5 transition-all ${active ? 'bg-gradient-to-r from-[var(--wuhu-neon-purple)]/30 to-[var(--wuhu-neon-pink)]/20 text-white border-l-2 border-[var(--wuhu-neon-pink)]' : 'hover:bg-white/10 text-white/70'}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[14px] ${active ? 'font-bold' : 'font-medium'}`}>{m.label}</span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${active ? 'bg-white/10 text-white' : 'border border-white/20 text-white/50'}`}>
                                            {m.providerName}
                                        </span>
                                    </div>
                                    {active && <AppIcon name="check" className="w-4 h-4 ml-2" />}
                                </button>
                            )
                        })}
                    </div>
                    {props.capabilityFields.length > 0 && (
                        <div className="bg-white/5 border-t border-white/10 p-3 space-y-3">
                            {props.capabilityFields.map(field => {
                                const val = props.capabilityOverrides[field.field] !== undefined ? String(props.capabilityOverrides[field.field]) : String(field.options[0] || '')
                                return (
                                    <div key={field.field} className="flex items-center justify-between">
                                        <span className="text-[12px] font-semibold text-white/60">{field.label || field.field}</span>
                                        <div className="flex bg-white/5 p-0.5 rounded-[10px]">
                                            {field.options.map((opt) => {
                                                const s = String(opt)
                                                const active = s === val
                                                return (
                                                    <button
                                                        key={s}
                                                        onClick={() => props.onCapabilityChange(field.field, s, field.options[0])}
                                                        className={`px-3 py-1 text-[12px] font-medium rounded-[8px] transition-all ${active ? 'bg-[var(--wuhu-neon-purple)]/30 shadow-sm text-white' : 'text-white/50 hover:text-white/70'}`}
                                                    >
                                                        {s}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>, document.body
            )}
        </>
    )
}

// ============================================================================
// Variant 2: Minimalist Tech Borderless (Vercel Style)
// Sharp, thin borders, hover states very subtle, focus on typography
// ============================================================================
export function ModelDropdownV2(props: ModelDropdownTestProps) {
    const [isOpen, setIsOpen] = useState(false)
    const { triggerRef, panelRef, panelStyle } = useDropdown(isOpen, setIsOpen)
    const activeModel = props.models.find(m => m.value === props.value)
    const summary = resolveParamSummary(props.capabilityFields, props.capabilityOverrides)

    return (
        <>
            <button
                ref={triggerRef}
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-between w-full h-[40px] px-3 rounded-md transition-colors bg-[var(--wuhu-bg-surface)] border ${isOpen ? 'border-[var(--wuhu-neon-pink)]' : 'border-white/20 hover:border-white/40'}`}
            >
                <div className="flex items-baseline gap-2 truncate">
                    <span className="font-medium text-[13px] text-white">
                        {activeModel ? activeModel.label : props.placeholder}
                    </span>
                    <span className="text-[11px] text-white/50">
                        {summary ? `— ${summary}` : ''}
                    </span>
                </div>
                <AppIcon name="chevronDown" className={`w-3.5 h-3.5 text-white/60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && createPortal(
                <div ref={panelRef} style={panelStyle} className="rounded-md shadow-[0_0_40px_rgba(167,87,255,0.3)] border border-[var(--wuhu-neon-purple)]/30 overflow-hidden flex flex-col bg-[var(--wuhu-bg-card)]">
                    <div className="overflow-y-auto max-h-[200px]">
                        {props.models.map(m => {
                            const active = m.value === props.value
                            return (
                                <button
                                    key={m.value}
                                    onClick={() => props.onModelChange(m.value)}
                                    className={`w-full flex items-center justify-between px-3 py-2 text-left group ${active ? 'bg-gradient-to-r from-[var(--wuhu-neon-purple)]/30 to-[var(--wuhu-neon-pink)]/20 border-l-2 border-[var(--wuhu-neon-pink)]' : 'hover:bg-white/10'}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[13px] ${active ? 'text-white font-medium' : 'text-white/70'}`}>{m.label}</span>
                                        {m.providerName && (
                                            <span className="text-[10px] text-white/50">{m.providerName}</span>
                                        )}
                                    </div>
                                    {active && <AppIcon name="check" className="w-3.5 h-3.5 text-white" />}
                                </button>
                            )
                        })}
                    </div>
                    {props.capabilityFields.length > 0 && (
                        <div className="border-t border-white/10 bg-[var(--wuhu-bg-surface)]">
                            {props.capabilityFields.map(field => {
                                const val = props.capabilityOverrides[field.field] !== undefined ? String(props.capabilityOverrides[field.field]) : String(field.options[0] || '')
                                return (
                                    <div key={field.field} className="flex flex-col border-b last:border-0 border-white/5">
                                        <div className="px-3 pt-2 text-[10px] tracking-wider uppercase text-white/50 font-semibold">{field.label || field.field}</div>
                                        <div className="flex px-2 pb-2 mt-1 flex-wrap gap-1">
                                            {field.options.map((opt) => {
                                                const s = String(opt)
                                                const active = s === val
                                                return (
                                                    <button
                                                        key={s}
                                                        onClick={() => props.onCapabilityChange(field.field, s, field.options[0])}
                                                        className={`min-w-[40px] px-2 py-1 text-[11px] font-mono rounded transition-colors ${active ? 'bg-[var(--wuhu-neon-purple)] text-white' : 'bg-transparent text-white/60 hover:bg-white/10 box-border border border-transparent'}`}
                                                    >
                                                        {s}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>, document.body
            )}
        </>
    )
}

// ============================================================================
// Variant 3: Neon / Playful Flow (Gradient accents, expressive)
// Premium AI feeling with slight accent colors and generous padding
// ============================================================================
export function ModelDropdownV3(props: ModelDropdownTestProps) {
    const [isOpen, setIsOpen] = useState(false)
    const { triggerRef, panelRef, panelStyle } = useDropdown(isOpen, setIsOpen)
    const activeModel = props.models.find(m => m.value === props.value)
    const summary = resolveParamSummary(props.capabilityFields, props.capabilityOverrides)

    return (
        <>
            <button
                ref={triggerRef}
                onClick={() => setIsOpen(!isOpen)}
                className={`relative flex items-center justify-between w-full h-[54px] px-4 rounded-[16px] transition-all duration-300 overflow-hidden group bg-[var(--wuhu-bg-surface)] backdrop-blur-xl ${isOpen ? 'shadow-[0_0_0_2px_var(--wuhu-neon-pink)]' : 'hover:shadow-[0_0_20px_rgba(167,87,255,0.15)] border border-white/20'}`}
            >
                {isOpen && <div className="absolute inset-0 bg-[var(--wuhu-neon-purple)]/10 transition-opacity duration-300" />}
                <div className="relative flex flex-col items-start min-w-0 pr-4 z-10">
                    <div className="flex items-center gap-2 w-full">
                        <span className="font-bold text-[15px] truncate text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                            {activeModel ? activeModel.label : props.placeholder}
                        </span>
                        {activeModel?.providerName && (
                            <span className="px-1.5 py-0.5 rounded border border-white/20 text-[10px] text-white/50 uppercase tracking-wider">
                                {activeModel.providerName}
                            </span>
                        )}
                    </div>
                    {summary && <span className="text-[12px] mt-0.5 font-medium text-[var(--wuhu-neon-purple)] opacity-90">{summary}</span>}
                </div>
                <div className="relative w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-colors z-10">
                    <AppIcon name="chevronDown" className={`w-4 h-4 text-white/60 transition-transform duration-300 ${isOpen ? 'rotate-180 text-[var(--wuhu-neon-pink)]' : ''}`} />
                </div>
            </button>

            {isOpen && createPortal(
                <div ref={panelRef} style={panelStyle} className="rounded-[20px] shadow-[0_0_50px_rgba(167,87,255,0.3)] border border-[var(--wuhu-neon-purple)]/30 flex flex-col bg-gradient-to-br from-[var(--wuhu-bg-card)] to-[var(--wuhu-bg-surface)] backdrop-blur-3xl overflow-hidden">
                    <div className="overflow-y-auto max-h-[220px] p-2 space-y-1">
                        {props.models.map(m => {
                            const active = m.value === props.value
                            return (
                                <button
                                    key={m.value}
                                    onClick={() => props.onModelChange(m.value)}
                                    className={`w-full flex items-center px-4 py-3 rounded-xl transition-all ${active ? 'bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-lg shadow-[var(--wuhu-neon-purple)]/30' : 'hover:bg-white/10 text-white/70'}`}
                                >
                                    <div className="w-5 h-5 mr-3 shrink-0 flex items-center justify-center">
                                        {active ? <AppIcon name="check" className="w-4 h-4 text-white" /> : <div className="w-1.5 h-1.5 rounded-full bg-white/30" />}
                                    </div>
                                    <span className={`text-[14px] flex-1 text-left ${active ? 'font-bold' : 'font-medium'}`}>{m.label}</span>
                                </button>
                            )
                        })}
                    </div>
                    {props.capabilityFields.length > 0 && (
                        <div className="p-4 border-t border-white/10 bg-white/5 space-y-4">
                            {props.capabilityFields.map(field => {
                                const val = props.capabilityOverrides[field.field] !== undefined ? String(props.capabilityOverrides[field.field]) : String(field.options[0] || '')
                                return (
                                    <div key={field.field} className="flex flex-col gap-2">
                                        <div className="text-[13px] font-semibold text-white">{field.label || field.field}</div>
                                        <div className="flex flex-wrap gap-2">
                                            {field.options.map((opt) => {
                                                const s = String(opt)
                                                const active = s === val
                                                return (
                                                    <button
                                                        key={s}
                                                        onClick={() => props.onCapabilityChange(field.field, s, field.options[0])}
                                                        className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all border ${active ? 'bg-[var(--wuhu-neon-purple)]/20 border-[var(--wuhu-neon-purple)] text-[var(--wuhu-neon-cyan)]' : 'bg-transparent border-white/20 text-white/60 hover:border-white/40'}`}
                                                    >
                                                        {s}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>, document.body
            )}
        </>
    )
}

// ============================================================================
// Variant 4: Card Overlay (Like the original photo, but beautifully refined)
// Dual-tone top and bottom, very clear visual hierarchy.
// ============================================================================
export function ModelDropdownV4(props: ModelDropdownTestProps) {
    const [isOpen, setIsOpen] = useState(false)
    const { triggerRef, panelRef, panelStyle } = useDropdown(isOpen, setIsOpen)
    const activeModel = props.models.find(m => m.value === props.value)

    // Convert to what original had: e.g. "2 · 720p"
    const summary = resolveParamSummary(props.capabilityFields, props.capabilityOverrides)

    return (
        <>
            <button
                ref={triggerRef}
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-between w-full h-[50px] px-4 rounded-[12px] bg-[var(--wuhu-bg-surface)] border transition-shadow duration-200 ${isOpen ? 'border-[var(--wuhu-neon-purple)] shadow-[0_0_0_4px_rgba(167,87,255,0.15)] ring-0' : 'border-white/20 hover:border-white/40'}`}
            >
                <div className="flex items-center gap-3">
                    <span className="font-semibold text-[15px] text-white">{activeModel ? activeModel.label : props.placeholder}</span>
                    {activeModel?.providerName && (
                        <span className="px-2 py-0.5 rounded-[6px] border border-white/10 text-[11px] text-white/60 bg-[var(--wuhu-bg-card)] shadow-sm">
                            {activeModel.providerName}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {summary && <span className="font-medium text-[13px] text-white/50">{summary}</span>}
                    <AppIcon name="chevronDown" className={`w-4 h-4 text-white/50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {isOpen && createPortal(
                <div ref={panelRef} style={panelStyle} className="rounded-[16px] shadow-[0_0_50px_rgba(167,87,255,0.3)] border border-[var(--wuhu-neon-purple)]/30 overflow-hidden flex flex-col bg-[var(--wuhu-bg-card)]">
                    {/* Top: Models */}
                    <div className="px-3 pt-3 pb-2 bg-[var(--wuhu-bg-surface)]">
                        <div className="text-[12px] font-bold text-white/60 mb-2 px-1">选择模型</div>
                        <div className="overflow-y-auto max-h-[160px] custom-scrollbar space-y-1 pr-1">
                            {props.models.map(m => {
                                const active = m.value === props.value
                                return (
                                    <button
                                        key={m.value}
                                        onClick={() => props.onModelChange(m.value)}
                                        className={`w-full flex items-center px-3 py-2.5 rounded-[10px] transition-all border ${active ? 'bg-[var(--wuhu-neon-purple)]/20 border-[var(--wuhu-neon-purple)]/40' : 'bg-transparent border-transparent hover:bg-white/10'}`}
                                    >
                                        <span className={`text-[14px] flex-1 text-left ${active ? 'font-semibold text-[var(--wuhu-neon-cyan)]' : 'text-white font-medium'}`}>{m.label}</span>
                                        {m.providerName && (
                                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 text-white/50 ml-2">{m.providerName}</span>
                                        )}
                                        {active && <div className="w-1.5 h-6 rounded-full bg-[var(--wuhu-neon-pink)] ml-3" />}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                    {/* Bottom: Settings */}
                    {props.capabilityFields.length > 0 && (
                        <div className="p-4 bg-[var(--wuhu-bg-surface)] border-t border-white/10 space-y-4">
                            <div className="text-[12px] font-bold text-white/60">参数配置</div>
                            {props.capabilityFields.map(field => {
                                const val = props.capabilityOverrides[field.field] !== undefined ? String(props.capabilityOverrides[field.field]) : String(field.options[0] || '')

                                // To mimic the "duration using select, ratio using pill" behaviour from the original
                                const useSelectBox = field.options.every(o => typeof o === 'number') || field.field.toLowerCase().includes('duration')

                                return (
                                    <div key={field.field} className="flex items-center justify-between gap-4">
                                        <span className="text-[14px] text-white font-medium shrink-0">{field.label || field.field}</span>

                                        {useSelectBox ? (
                                            <div className="relative w-[120px]">
                                                <select
                                                    value={val}
                                                    onChange={e => props.onCapabilityChange(field.field, e.target.value, field.options[0])}
                                                    className="w-full h-[36px] appearance-none bg-[var(--wuhu-bg-card)] border border-white/20 rounded-[8px] px-3 font-medium text-[13px] text-white focus:outline-none focus:border-[var(--wuhu-neon-pink)]"
                                                >
                                                    {field.options.map(opt => <option key={String(opt)} value={String(opt)}>{opt}</option>)}
                                                </select>
                                                <AppIcon name="chevronDown" className="w-4 h-4 text-white/50 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                            </div>
                                        ) : (
                                            <div className="flex bg-[var(--wuhu-bg-card)] p-[3px] rounded-[10px] border border-white/10">
                                                {field.options.map((opt) => {
                                                    const s = String(opt)
                                                    const active = s === val
                                                    return (
                                                        <button
                                                            key={s}
                                                            onClick={() => props.onCapabilityChange(field.field, s, field.options[0])}
                                                            className={`px-3 py-1.5 text-[13px] font-medium rounded-[7px] transition-all min-w-[50px] text-center ${active ? 'bg-[var(--wuhu-neon-purple)]/30 text-[var(--wuhu-neon-cyan)] shadow-sm' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                                                        >
                                                            {s}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>, document.body
            )}
        </>
    )
}

// ============================================================================
// Variant 5: Ultra-Minimal Inline Flat
// No explicit boxes for the dropdown fields. A seamless, document-like feel.
// ============================================================================
export function ModelDropdownV5(props: ModelDropdownTestProps) {
    const [isOpen, setIsOpen] = useState(false)
    const { triggerRef, panelRef, panelStyle } = useDropdown(isOpen, setIsOpen)
    const activeModel = props.models.find(m => m.value === props.value)
    const summary = resolveParamSummary(props.capabilityFields, props.capabilityOverrides)

    return (
        <>
            <button
                ref={triggerRef}
                onClick={() => setIsOpen(!isOpen)}
                className={`group flex flex-col justify-center w-full px-2 py-2 rounded-lg transition-all border-b-2 ${isOpen ? 'border-[var(--wuhu-neon-pink)] bg-white/10' : 'border-transparent hover:border-white/20 hover:bg-[var(--wuhu-bg-surface)]'}`}
            >
                <div className="flex items-center gap-2 w-full">
                    <span className="font-semibold text-[16px] text-white">
                        {activeModel ? activeModel.label : props.placeholder}
                    </span>
                    <AppIcon name="chevronDown" className={`w-4 h-4 text-white/50 ml-auto transition-transform ${isOpen ? 'rotate-180 text-[var(--wuhu-neon-pink)]' : 'group-hover:text-white/70'}`} />
                </div>
                <div className="flex items-center gap-2 mt-1 opacity-70">
                    <span className="text-[12px] text-white/50 font-mono uppercase">
                        {activeModel?.providerName || 'MODEL'}
                    </span>
                    {summary && (
                        <>
                            <span className="w-1 h-1 rounded-full bg-white/30" />
                            <span className="text-[12px] text-white/60">{summary}</span>
                        </>
                    )}
                </div>
            </button>

            {isOpen && createPortal(
                <div ref={panelRef} style={panelStyle} className="rounded-xl shadow-[0_0_50px_rgba(167,87,255,0.3)] border border-[var(--wuhu-neon-purple)]/30 bg-[var(--wuhu-bg-card)] overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-y-auto max-h-[200px] p-2">
                        {props.models.map(m => {
                            const active = m.value === props.value
                            return (
                                <button
                                    key={m.value}
                                    onClick={() => props.onModelChange(m.value)}
                                    className={`relative flex items-center w-full px-4 py-3 rounded-lg text-left transition-colors mb-1 overflow-hidden ${active ? 'bg-[var(--wuhu-neon-purple)]/10' : 'hover:bg-white/10'}`}
                                >
                                    {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-[var(--wuhu-neon-pink)] rounded-r-md" />}
                                    <span className={`text-[15px] flex-1 ${active ? 'text-[var(--wuhu-neon-pink)] font-bold' : 'text-white font-medium'}`}>{m.label}</span>
                                    {m.providerName && (
                                        <span className="text-[11px] font-mono text-white/50 bg-white/5 px-2 py-0.5 rounded">{m.providerName}</span>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                    {props.capabilityFields.length > 0 && (
                        <div className="p-4 bg-[var(--wuhu-bg-surface)] border-t border-white/10 space-y-4">
                            {props.capabilityFields.map(field => {
                                const val = props.capabilityOverrides[field.field] !== undefined ? String(props.capabilityOverrides[field.field]) : String(field.options[0] || '')
                                return (
                                    <div key={field.field} className="flex flex-col gap-2">
                                        <span className="text-[11px] uppercase tracking-widest font-bold text-white/50">{field.label || field.field}</span>
                                        <div className="flex gap-2">
                                            {field.options.map((opt) => {
                                                const s = String(opt)
                                                const active = s === val
                                                return (
                                                    <button
                                                        key={s}
                                                        onClick={() => props.onCapabilityChange(field.field, s, field.options[0])}
                                                        className={`flex-1 py-1.5 text-[13px] font-semibold rounded-md border-b-2 transition-all ${active ? 'border-[var(--wuhu-neon-pink)] text-[var(--wuhu-neon-pink)] bg-[var(--wuhu-neon-pink)]/10' : 'border-transparent text-white/60 hover:bg-white/10'}`}
                                                    >
                                                        {s}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>, document.body
            )}
        </>
    )
}
