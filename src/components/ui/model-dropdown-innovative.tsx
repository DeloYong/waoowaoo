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

function useDropdown(isOpen: boolean, setIsOpen: (val: boolean) => void, alignRight: boolean = false) {
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

        const width = Math.max(rect.width, 240)
        let left = rect.left
        if (alignRight) {
            left = rect.right - width
        }

        setPanelStyle({
            position: 'fixed',
            left,
            width,
            maxHeight: currentMaxHeight,
            ...(openUpward
                ? { bottom: viewportHeight - rect.top + 6 }
                : { top: rect.bottom + 6 }),
            zIndex: 9999
        })
    }, [alignRight])

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
// V6: The Split Toolbar (Deconstructed Controls)
// Breaks the monolithic dropdown into two separate context actions. No massive popover.
// ============================================================================
export function ModelInnovativeV6(props: ModelDropdownTestProps) {
    const [modelOpen, setModelOpen] = useState(false)
    const [paramOpen, setParamOpen] = useState(false)

    const { triggerRef: modelTrigger, panelRef: modelPanel, panelStyle: modelStyle } = useDropdown(modelOpen, setModelOpen)
    const { triggerRef: paramTrigger, panelRef: paramPanel, panelStyle: paramStyle } = useDropdown(paramOpen, setParamOpen, true)

    const activeModel = props.models.find(m => m.value === props.value)
    const summary = resolveParamSummary(props.capabilityFields, props.capabilityOverrides)

    return (
        <div className="flex items-center bg-[var(--wuhu-bg-surface)] border border-white/20 rounded-xl shadow-[0_0_20px_rgba(167,87,255,0.1)] backdrop-blur-md">
            {/* Left Button: Model Selection */}
            <button
                ref={modelTrigger}
                onClick={() => { setModelOpen(!modelOpen); setParamOpen(false) }}
                className={`flex-1 flex items-center justify-between px-4 py-3 transition-colors rounded-l-xl hover:bg-white/5 ${modelOpen ? 'bg-white/5' : ''}`}
            >
                <div className="flex flex-col items-start min-w-0 pr-2">
                    <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider mb-0.5">模型 Model</span>
                    <span className="text-[14px] font-semibold text-white truncate">
                        {activeModel ? activeModel.label : props.placeholder}
                    </span>
                </div>
                <AppIcon name="chevronDown" className="w-4 h-4 text-white/50 shrink-0" />
            </button>

            {/* Divider */}
            <div className="w-[1px] h-10 bg-white/20" />

            {/* Right Button: Param Configuration */}
            <button
                ref={paramTrigger}
                onClick={() => { setParamOpen(!paramOpen); setModelOpen(false) }}
                className={`flex-1 flex items-center justify-between px-4 py-3 transition-colors rounded-r-xl hover:bg-white/5 ${paramOpen ? 'bg-white/5' : ''}`}
                disabled={props.capabilityFields.length === 0}
            >
                <div className="flex flex-col items-start min-w-0 pr-2">
                    <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider mb-0.5">参数 Params</span>
                    <span className={`text-[14px] font-semibold truncate ${props.capabilityFields.length === 0 ? 'text-white/50' : 'text-[var(--wuhu-neon-cyan)]'}`}>
                        {props.capabilityFields.length === 0 ? '不可配置' : (summary || '配置')}
                    </span>
                </div>
                <AppIcon name="chevronDown" className="w-4 h-4 text-white/50 shrink-0" />
            </button>

            {/* Portals */}
            {modelOpen && createPortal(
                <div ref={modelPanel} style={modelStyle} className="rounded-xl shadow-[0_0_50px_rgba(167,87,255,0.3)] border border-[var(--wuhu-neon-purple)]/30 p-2 bg-[var(--wuhu-bg-card)]">
                    {props.models.map(m => (
                        <button
                            key={m.value}
                            onClick={() => { props.onModelChange(m.value); setModelOpen(false) }}
                            className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-white/10 flex items-center justify-between transition-colors"
                        >
                            <span className="text-[14px] font-medium text-white">{m.label}</span>
                            {m.value === props.value && <AppIcon name="check" className="w-4 h-4 text-[var(--wuhu-neon-pink)]" />}
                        </button>
                    ))}
                </div>, document.body
            )}
            {paramOpen && props.capabilityFields.length > 0 && createPortal(
                <div ref={paramPanel} style={paramStyle} className="rounded-xl shadow-[0_0_50px_rgba(167,87,255,0.3)] border border-[var(--wuhu-neon-purple)]/30 p-4 space-y-4 bg-[var(--wuhu-bg-card)]">
                    {props.capabilityFields.map(field => {
                        const val = props.capabilityOverrides[field.field] !== undefined ? String(props.capabilityOverrides[field.field]) : String(field.options[0] || '')
                        return (
                            <div key={field.field}>
                                <div className="text-[12px] font-medium text-white/60 mb-2">{field.label || field.field}</div>
                                <div className="flex gap-2">
                                    {field.options.map(opt => {
                                        const s = String(opt)
                                        const active = s === val
                                        return (
                                            <button
                                                key={s}
                                                onClick={() => props.onCapabilityChange(field.field, s, field.options[0])}
                                                className={`flex-1 px-2 py-1.5 text-[13px] rounded-lg transition-colors border ${active ? 'bg-[var(--wuhu-neon-purple)]/20 border-[var(--wuhu-neon-cyan)] text-[var(--wuhu-neon-cyan)] font-semibold' : 'bg-transparent border-white/20 text-white/60 hover:bg-white/10'}`}
                                            >
                                                {s}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>, document.body
            )}
        </div>
    )
}

// ============================================================================
// V7: The Inline Canvas Expandable (No Overlays, Document Flow)
// Pushes content down naturally. Perfect for form wizards.
// ============================================================================
export function ModelInnovativeV7(props: ModelDropdownTestProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const activeModel = props.models.find(m => m.value === props.value)

    return (
        <div className="bg-[var(--wuhu-bg-card)] rounded-2xl border border-[var(--wuhu-neon-purple)]/30 overflow-hidden transition-all duration-300 shadow-[0_0_30px_rgba(167,87,255,0.15)]">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 bg-transparent outline-none focus:outline-none"
            >
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[var(--wuhu-neon-purple)]/20 flex items-center justify-center text-[var(--wuhu-neon-cyan)]">
                        <AppIcon name="cpu" className="w-5 h-5" />
                    </div>
                    <div className="text-left flex flex-col">
                        <span className="text-[15px] font-bold text-white">
                            {activeModel ? activeModel.label : '未选择模型'}
                        </span>
                        <span className="text-[12px] text-white/50 mt-0.5">
                            展开以修改模型或参数设置
                        </span>
                    </div>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-white/10 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                    <AppIcon name="chevronDown" className="w-4 h-4 text-white/60" />
                </div>
            </button>

            <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
                <div className="p-4 pt-0 border-t border-white/10 mt-2 mx-4">
                    <div className="mt-4 mb-2 text-[12px] font-bold uppercase tracking-wider text-white/50">1. 选择模型</div>
                    <div className="grid grid-cols-2 gap-2 mb-6">
                        {props.models.map(m => {
                            const active = m.value === props.value
                            return (
                                <button
                                    key={m.value}
                                    onClick={() => props.onModelChange(m.value)}
                                    className={`p-3 text-left rounded-xl transition-colors border ${active ? 'bg-[var(--wuhu-neon-purple)]/20 border-[var(--wuhu-neon-cyan)] shadow-[0_0_15px_rgba(167,87,255,0.2)]' : 'bg-[var(--wuhu-bg-surface)] border-white/20 hover:border-white/40'}`}
                                >
                                    <div className={`text-[13px] font-semibold mb-1 ${active ? 'text-[var(--wuhu-neon-cyan)]' : 'text-white'}`}>{m.label}</div>
                                    {m.providerName && <div className="text-[10px] text-white/50">{m.providerName}</div>}
                                </button>
                            )
                        })}
                    </div>

                    {props.capabilityFields.length > 0 && (
                        <>
                            <div className="mb-2 text-[12px] font-bold uppercase tracking-wider text-white/50">2. 参数微调</div>
                            <div className="space-y-4 bg-[var(--wuhu-bg-surface)] p-4 rounded-xl border border-white/10">
                                {props.capabilityFields.map(field => {
                                    const val = props.capabilityOverrides[field.field] !== undefined ? String(props.capabilityOverrides[field.field]) : String(field.options[0] || '')
                                    return (
                                        <div key={field.field} className="flex items-center justify-between gap-4">
                                            <span className="text-[13px] font-medium text-white shrink-0">{field.label || field.field}</span>
                                            <div className="flex flex-wrap gap-2 justify-end">
                                                {field.options.map(opt => {
                                                    const s = String(opt)
                                                    const active = s === val
                                                    return (
                                                        <button
                                                            key={s}
                                                            onClick={() => props.onCapabilityChange(field.field, s, field.options[0])}
                                                            className={`px-3 py-1 text-[12px] transition-all rounded-md ${active ? 'bg-white text-black shadow-md font-bold' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
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
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

// ============================================================================
// V8: The Pro Centered Modal (Context Shift)
// Clicking opens a spacious, distraction-free modal dialog. Left-right layout.
// ============================================================================
export function ModelInnovativeV8(props: ModelDropdownTestProps) {
    const [isOpen, setIsOpen] = useState(false)
    const activeModel = props.models.find(m => m.value === props.value)

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="w-full flex items-center justify-between px-5 py-3 rounded-xl bg-[var(--wuhu-bg-surface)] border border-white/20 hover:shadow-[0_0_30px_rgba(167,87,255,0.2)] transition-shadow"
            >
                <div className="flex items-center gap-3">
                    <AppIcon name="settingsHex" className="w-5 h-5 text-white/60" />
                    <span className="text-[15px] font-medium text-white">
                        {activeModel ? activeModel.label : '配置模型...'}
                    </span>
                </div>
                <div className="text-[12px] font-bold text-[var(--wuhu-neon-cyan)] bg-[var(--wuhu-neon-cyan)]/10 px-3 py-1 rounded-full uppercase tracking-widest">
                    编辑
                </div>
            </button>

            {isOpen && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
                    <div className="relative w-full max-w-3xl h-[500px] flex rounded-2xl bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_60px_rgba(167,87,255,0.3)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Left: Models List */}
                        <div className="w-1/2 flex flex-col border-r border-white/10 bg-[var(--wuhu-bg-surface)]">
                            <div className="p-5 border-b border-white/10 flex items-center justify-between">
                                <h2 className="text-[18px] font-bold text-white">模型库</h2>
                                <span className="text-[12px] text-white/50">包含 {props.models.length} 项</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                {props.models.map(m => {
                                    const active = m.value === props.value
                                    return (
                                        <button
                                            key={m.value}
                                            onClick={() => props.onModelChange(m.value)}
                                            className={`w-full text-left p-4 rounded-xl transition-colors border ${active ? 'bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] shadow-[0_4px_20px_rgba(167,87,255,0.4)] border-transparent' : 'bg-transparent border-transparent hover:bg-white/10'}`}
                                        >
                                            <div className={`text-[15px] font-bold ${active ? 'text-white' : 'text-white'}`}>{m.label}</div>
                                            {m.providerName && <div className={`text-[12px] mt-1 ${active ? 'text-white/80' : 'text-white/50'}`}>{m.providerName}</div>}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                        {/* Right: Params Configuration */}
                        <div className="w-1/2 flex flex-col bg-[var(--wuhu-bg-card)]">
                            <div className="p-5 border-b border-white/10 flex items-center justify-between">
                                <h2 className="text-[18px] font-bold text-white">参数设置</h2>
                                <button onClick={() => setIsOpen(false)} className="p-1 rounded-full hover:bg-white/10">
                                    <AppIcon name="close" className="w-5 h-5 text-white/60" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                                {props.capabilityFields.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center text-white/50 gap-4 opacity-70">
                                        <AppIcon name="info" className="w-10 h-10" />
                                        <p>当前模型无可用参数</p>
                                    </div>
                                ) : (
                                    props.capabilityFields.map(field => {
                                        const val = props.capabilityOverrides[field.field] !== undefined ? String(props.capabilityOverrides[field.field]) : String(field.options[0] || '')
                                        return (
                                            <div key={field.field} className="space-y-4">
                                                <div className="text-[14px] font-bold text-white/50 uppercase tracking-widest">{field.label || field.field}</div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {field.options.map(opt => {
                                                        const s = String(opt)
                                                        const active = s === val
                                                        return (
                                                            <button
                                                                key={s}
                                                                onClick={() => props.onCapabilityChange(field.field, s, field.options[0])}
                                                                className={`p-3 text-[14px] text-center rounded-xl transition-all border ${active ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'bg-transparent text-white border-white/20 hover:border-white/40'}`}
                                                            >
                                                                {s}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                            <div className="p-4 border-t border-white/10 bg-[var(--wuhu-bg-surface)] flex justify-end">
                                <button onClick={() => setIsOpen(false)} className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white font-semibold hover:shadow-[0_0_20px_rgba(167,87,255,0.4)]">
                                    确认应用
                                </button>
                            </div>
                        </div>
                    </div>
                </div>, document.body
            )}
        </>
    )
}

// ============================================================================
// V9: The Drill-Down Popover (Nested Navigation)
// Click Model -> Popover shows Model List -> Click "Params" -> View shifts sideways inside popover.
// ============================================================================
export function ModelInnovativeV9(props: ModelDropdownTestProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [view, setView] = useState<'models' | 'params'>('models')
    const { triggerRef, panelRef, panelStyle } = useDropdown(isOpen, setIsOpen)
    const activeModel = props.models.find(m => m.value === props.value)

    // When re-opening, reset view
    useEffect(() => {
        if (isOpen) setView('models')
    }, [isOpen])

    return (
        <>
            <button
                ref={triggerRef}
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-between w-full p-2 rounded-lg bg-[var(--wuhu-bg-surface)] border ${isOpen ? 'border-[var(--wuhu-neon-pink)] ring-1 ring-[var(--wuhu-neon-pink)]/20 shadow-[0_4px_20px_rgba(255,100,200,0.2)]' : 'border-white/20 group hover:border-white/40'}`}
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded shrink-0 bg-[var(--wuhu-neon-pink)]/10 flex items-center justify-center">
                        <AppIcon name="sparkles" className="w-4 h-4 text-[var(--wuhu-neon-pink)]" />
                    </div>
                    <div className="flex flex-col text-left">
                        <span className="text-[13px] font-semibold text-white">{activeModel ? activeModel.label : '未选择'}</span>
                        <span className="text-[11px] text-white/50">{props.capabilityFields.length} 项参数配置可设</span>
                    </div>
                </div>
                <AppIcon name="chevronDown" className="w-4 h-4 mr-1 text-white/50 transition-transform group-hover:text-white" />
            </button>

            {isOpen && createPortal(
                <div ref={panelRef} style={panelStyle} className="rounded-xl shadow-[0_0_50px_rgba(167,87,255,0.3)] border border-[var(--wuhu-neon-purple)]/30 overflow-hidden bg-[var(--wuhu-bg-card)]">
                    <div className={`flex w-[200%] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${view === 'params' ? '-translate-x-1/2' : 'translate-x-0'}`}>
                        {/* Page 1: Models */}
                        <div className="w-1/2 flex flex-col max-h-[300px]">
                            <div className="p-3 border-b border-white/10 bg-[var(--wuhu-bg-surface)] font-bold text-[13px] text-center text-white">选择主要模型</div>
                            <div className="overflow-y-auto flex-1 p-2 space-y-1">
                                {props.models.map(m => {
                                    const active = m.value === props.value
                                    return (
                                        <div key={m.value} className="flex gap-1 group">
                                            <button
                                                onClick={() => props.onModelChange(m.value)}
                                                className={`flex-1 flex items-center px-3 py-2 rounded-lg text-left transition-colors ${active ? 'bg-[var(--wuhu-neon-pink)]/10 text-[var(--wuhu-neon-pink)] font-bold' : 'hover:bg-white/10 text-white'}`}
                                            >
                                                <span className="text-[13px]">{m.label}</span>
                                                {active && <AppIcon name="check" className="w-3.5 h-3.5 ml-auto" />}
                                            </button>
                                            {active && props.capabilityFields.length > 0 && (
                                                <button
                                                    onClick={() => setView('params')}
                                                    className="px-2 py-2 w-[40px] flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 shadow-sm"
                                                    title="配置参数"
                                                >
                                                    <AppIcon name="settingsHex" className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                        {/* Page 2: Params */}
                        <div className="w-1/2 flex flex-col max-h-[300px]">
                            <div className="p-2 border-b border-white/10 bg-[var(--wuhu-bg-surface)] flex items-center">
                                <button onClick={() => setView('models')} className="p-1 px-2 shrink-0 flex items-center gap-1 hover:bg-white/10 rounded font-medium text-[12px] text-white/60">
                                    <AppIcon name="chevronDown" className="w-4 h-4 rotate-90" />
                                    返回
                                </button>
                                <div className="font-bold text-[13px] text-center flex-1 mr-8 text-white">参数配置</div>
                            </div>
                            <div className="overflow-y-auto flex-1 p-4 space-y-5">
                                {props.capabilityFields.map(field => {
                                    const val = props.capabilityOverrides[field.field] !== undefined ? String(props.capabilityOverrides[field.field]) : String(field.options[0] || '')
                                    return (
                                        <div key={field.field} className="space-y-2">
                                            <div className="text-[12px] font-semibold text-white/60">{field.label || field.field}</div>
                                            <div className="grid grid-cols-1 gap-1.5">
                                                {field.options.map(opt => {
                                                    const s = String(opt)
                                                    const active = s === val
                                                    return (
                                                        <button
                                                            key={s}
                                                            onClick={() => props.onCapabilityChange(field.field, s, field.options[0])}
                                                            className={`w-full p-2 text-[12px] text-center rounded-md border transition-all ${active ? 'bg-[var(--wuhu-neon-pink)] text-white border-[var(--wuhu-neon-pink)] shadow-[0_0_15px_rgba(255,100,200,0.4)]' : 'bg-white/5 border-white/20 text-white hover:border-white/40'}`}
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
                        </div>
                    </div>
                </div>, document.body
            )}
        </>
    )
}

// ============================================================================
// V10: Bottom Sheet Drawer (Mobile-inspired / Context Menu Bottom)
// Triggers a drawer anchored to the bottom of the screen. Very tactile.
// ============================================================================
export function ModelInnovativeV10(props: ModelDropdownTestProps) {
    const [isOpen, setIsOpen] = useState(false)
    const activeModel = props.models.find(m => m.value === props.value)

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-full bg-[var(--wuhu-bg-card)] border border-white hover:bg-white hover:text-black group transition-all text-white font-bold shadow-[0_4px_20px_rgba(167,87,255,0.2)]"
            >
                <AppIcon name="cpu" className="w-5 h-5 group-hover:animate-pulse" />
                <span>生成偏好: {activeModel ? activeModel.label : '点击选择'}</span>
            </button>

            {isOpen && createPortal(
                <div className="fixed inset-0 z-[99999] flex flex-col justify-end">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="relative w-full max-w-4xl mx-auto bg-[var(--wuhu-bg-card)] border-t border-[var(--wuhu-neon-purple)]/50 rounded-t-[32px] p-6 pb-12 shadow-[0_-10px_50px_rgba(167,87,255,0.2)] animate-in slide-in-from-bottom duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
                        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6" />

                        <div className="flex justify-between items-center mb-6 px-2">
                            <h2 className="text-[24px] font-black text-white tracking-tight">配置生成偏好</h2>
                            <button onClick={() => setIsOpen(false)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20">
                                <AppIcon name="close" className="w-5 h-5 text-white" />
                            </button>
                        </div>

                        <div className="flex flex-col md:flex-row gap-8 px-2">
                            {/* Left: Models horizontally scrollable block */}
                            <div className="w-full md:w-2/3">
                                <h3 className="text-[14px] font-bold text-white/50 uppercase tracking-wider mb-4">核心模型选择</h3>
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                    {props.models.map(m => {
                                        const active = m.value === props.value
                                        return (
                                            <button
                                                key={m.value}
                                                onClick={() => props.onModelChange(m.value)}
                                                className={`flex flex-col items-start p-4 rounded-[20px] transition-all border-2 text-left ${active ? 'border-[var(--wuhu-neon-cyan)] bg-[var(--wuhu-neon-purple)]/20 shadow-[0_8px_25px_rgba(167,87,255,0.2)]' : 'border-white/20 bg-[var(--wuhu-bg-surface)] hover:border-white/40'}`}
                                            >
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${active ? 'bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] shadow-[0_4px_15px_rgba(167,87,255,0.4)]' : 'bg-[var(--wuhu-bg-card)] border border-white/10'}`}>
                                                    <AppIcon name="sparkles" className={`w-5 h-5 ${active ? 'text-white' : 'text-white/50'}`} />
                                                </div>
                                                <span className={`text-[15px] font-bold leading-tight ${active ? 'text-[var(--wuhu-neon-cyan)]' : 'text-white'}`}>{m.label}</span>
                                                {m.providerName && <span className="text-[11px] font-medium text-white/50 mt-1">{m.providerName}</span>}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Right: Vertical params list */}
                            <div className="w-full md:w-1/3 flex flex-col pt-2 md:pt-0 border-t md:border-t-0 md:border-l border-white/10 md:pl-8">
                                <h3 className="text-[14px] font-bold text-white/50 uppercase tracking-wider mb-4">参数微调</h3>
                                {props.capabilityFields.length === 0 ? (
                                    <div className="text-white/50 text-[14px]">自动最佳配置应用中</div>
                                ) : (
                                    <div className="space-y-6">
                                        {props.capabilityFields.map(field => {
                                            const val = props.capabilityOverrides[field.field] !== undefined ? String(props.capabilityOverrides[field.field]) : String(field.options[0] || '')
                                            return (
                                                <div key={field.field}>
                                                    <div className="text-[15px] font-bold text-white mb-3">{field.label || field.field}</div>
                                                    <div className="flex bg-white/5 p-1.5 rounded-[16px]">
                                                        {field.options.map(opt => {
                                                            const s = String(opt)
                                                            const active = s === val
                                                            return (
                                                                <button
                                                                    key={s}
                                                                    onClick={() => props.onCapabilityChange(field.field, s, field.options[0])}
                                                                    className={`flex-1 py-2 text-[14px] font-bold rounded-[12px] transition-all ${active ? 'bg-white text-black shadow-md' : 'text-white/50 hover:text-white'}`}
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
                            </div>
                        </div>
                    </div>
                </div>, document.body
            )}
        </>
    )
}
