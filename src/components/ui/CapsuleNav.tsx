'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'

type StepStatus = 'empty' | 'active' | 'processing' | 'ready'

interface NavItemData {
    id: string
    icon: string
    label: string
    status: StepStatus
    href?: string  // 可选的链接地址
    disabled?: boolean  // 是否禁用（开发中）
    disabledLabel?: string  // 禁用时显示的提示文字
}

interface CapsuleNavProps {
    items: NavItemData[]
    activeId: string
    onItemClick: (id: string) => void
    projectId?: string  // 用于构建链接
    episodeId?: string  // 用于构建链接
}

/**
 * NavItem - 胶囊导航单项
 * 支持左键点击切换、中键/Ctrl+点击在新标签页打开
 */
function NavItem({
    active,
    onClick,
    label,
    status,
    href,
    disabled,
    disabledLabel
}: {
    active: boolean
    onClick: () => void
    label: string
    status: StepStatus
    href?: string
    disabled?: boolean
    disabledLabel?: string
}) {
    const handleClick = (e: React.MouseEvent) => {
        if (disabled) return
        if (e.button === 1 || e.ctrlKey || e.metaKey) {
            if (href) {
                window.open(href, '_blank')
            }
            return
        }
        onClick()
    }

    const handleAuxClick = (e: React.MouseEvent) => {
        if (disabled) return
        if (e.button === 1 && href) {
            e.preventDefault()
            window.open(href, '_blank')
        }
    }

    return (
        <div className="relative group">
            <button
                onClick={handleClick}
                onAuxClick={handleAuxClick}
                disabled={disabled}
                className={`
                    relative flex min-h-[52px] items-center gap-1 px-6 pt-3.5 pb-4 transition-all duration-300 ease-out
                    ${disabled
                        ? 'cursor-not-allowed'
                        : active
                            ? 'text-white'
                            : 'text-white/60 hover:text-white'}
                    ${!disabled && 'active:scale-[0.98]'}
                `}
            >
                {disabled ? (
                    <span className="text-base font-medium text-white/40 opacity-80">
                        {label}
                    </span>
                ) : (
                    <span className="text-base font-semibold">{label}</span>
                )}
                {/* 底部指示条 */}
                <span className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 h-[3px] rounded-full transition-all duration-300 ease-out
                    ${active
                        ? 'w-6 bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] shadow-[0_0_15px_rgba(255,100,200,0.6)]'
                        : 'w-0 bg-transparent'
                    }`}
                />
                {status === 'ready' && !disabled && (
                    <span className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full transition-colors shadow-[0_0_8px_currentColor]
                        ${active ? 'bg-[var(--wuhu-neon-pink)]' : 'bg-[var(--wuhu-neon-cyan)]'}`}
                    />
                )}
                {status === 'processing' && !disabled && (
                    <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[var(--wuhu-neon-purple)] shadow-[0_0_10px_var(--wuhu-neon-purple)] animate-pulse" />
                )}
            </button>
            {disabled && disabledLabel && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                    <div className="bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 text-xs px-3 py-2 whitespace-nowrap text-white rounded-lg shadow-[0_0_20px_rgba(167,87,255,0.2)]">
                        {disabledLabel}
                    </div>
                    <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 bg-[var(--wuhu-bg-card)] rotate-45 border-l border-t border-[var(--wuhu-neon-purple)]/30" />
                </div>
            )}
        </div>
    )
}


/**
 * CapsuleNav - 胶囊形态悬浮导航
 * 支持中键和Ctrl+点击在新标签页打开
 */
export function CapsuleNav({ items, activeId, onItemClick, projectId, episodeId }: CapsuleNavProps) {
    // 构建每个导航项的链接地址
    const buildHref = (stageId: string): string | undefined => {
        if (!projectId) return undefined
        const params = new URLSearchParams()
        params.set('stage', stageId)
        if (episodeId) {
            params.set('episode', episodeId)
        }
        return `/workspace/${projectId}?${params.toString()}`
    }

    return (
        <nav className="fixed top-20 left-1/2 -translate-x-1/2 z-40 animate-fadeInDown">
            <div
                className="flex rounded-full px-2 py-1 bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30"
                style={{
                    boxShadow: '0 0 20px rgba(167, 87, 255, 0.2), 0 8px 32px rgba(0,0,0,0.3)',
                }}
            >
                {items.map((item) => (
                    <NavItem
                        key={item.id}
                        active={activeId === item.id}
                        onClick={() => onItemClick(item.id)}
                        label={item.label}
                        status={item.status}
                        href={buildHref(item.id)}
                        disabled={item.disabled}
                        disabledLabel={item.disabledLabel}
                    />
                ))}
            </div>
        </nav>
    )
}

/**
 * EpisodeSelector - 剧集选择器
 */
interface Episode {
    id: string
    title: string
    summary?: string
    status?: {
        story?: StepStatus
        script?: StepStatus
        visual?: StepStatus
    }
}

interface EpisodeSelectorProps {
    episodes: Episode[]
    currentId: string
    onSelect: (id: string) => void
    onAdd?: () => void
    onRename?: (id: string, newName: string) => void
    onDelete?: (id: string) => void
    projectName?: string  // 项目名称，显示在左上角
}

export function EpisodeSelector({
    episodes,
    currentId,
    onSelect,
    onAdd,
    onRename,
    onDelete,
    projectName
}: EpisodeSelectorProps) {
    const t = useTranslations('common')
    const [isOpen, setIsOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editingName, setEditingName] = useState('')
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const currentEp = episodes.find(e => e.id === currentId) || episodes[0]
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    if (!currentEp) return null

    return (
        <div className="fixed top-20 left-6 z-40" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_20px_rgba(167,87,255,0.15)] flex items-center gap-3 px-4 py-3 transition-all group hover:shadow-[0_0_30px_rgba(255,100,200,0.25)]"
                style={{ borderRadius: '1.5rem' }}
            >
                <div className="bg-[var(--wuhu-bg-surface)] flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold wuhu-text-gradient">
                    {t('episode')}
                </div>
                <div className="flex flex-col items-start text-left mr-2">
                    <span className="text-sm font-bold text-white line-clamp-1 max-w-[160px]">
                        {projectName || t('project')}
                    </span>
                    <span className="text-sm text-white/70 line-clamp-1 max-w-[160px]">
                        {currentEp.title}
                    </span>
                </div>
                <AppIcon name="chevronDown" className={`w-4 h-4 text-white/50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_30px_rgba(167,87,255,0.25)] absolute left-0 top-full mt-2 w-72 origin-top-left p-2 rounded-2xl animate-fadeIn">
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-1">
                        {episodes.map(ep => {
                            const statusColor = ep.status?.visual === 'ready'
                                ? 'bg-[var(--wuhu-neon-cyan)] shadow-[0_0_8px_var(--wuhu-neon-cyan)]'
                                : ep.status?.script === 'ready'
                                    ? 'bg-[var(--wuhu-neon-purple)] shadow-[0_0_8px_var(--wuhu-neon-purple)]'
                                    : 'bg-white/20'

                            // 编辑模式
                            if (editingId === ep.id) {
                                return (
                                    <div key={ep.id} className="flex items-center gap-2 p-3 rounded-xl bg-[var(--wuhu-bg-surface)] border border-[var(--wuhu-neon-purple)]/50">
                                        <div className={`w-2 h-10 rounded-full ${statusColor}`} />
                                        <input
                                            type="text"
                                            value={editingName}
                                            onChange={(e) => setEditingName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && editingName.trim()) {
                                                    onRename?.(ep.id, editingName.trim())
                                                    setEditingId(null)
                                                } else if (e.key === 'Escape') {
                                                    setEditingId(null)
                                                }
                                            }}
                                            className="flex-1 px-2 py-1 text-sm bg-[var(--wuhu-bg-dark)] border border-[var(--wuhu-neon-purple)]/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--wuhu-neon-pink)] text-white"
                                            autoFocus
                                        />
                                        <button
                                            onClick={() => {
                                                if (editingName.trim()) {
                                                    onRename?.(ep.id, editingName.trim())
                                                }
                                                setEditingId(null)
                                            }}
                                            className="w-7 h-7 rounded-lg bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white hover:shadow-[0_0_15px_rgba(255,100,200,0.5)] flex items-center justify-center transition-all"
                                        >
                                            <AppIcon name="check" className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setEditingId(null)}
                                            className="w-7 h-7 rounded-lg bg-[var(--wuhu-bg-surface)] text-white/70 hover:bg-[var(--wuhu-bg-card)] flex items-center justify-center transition-all"
                                        >
                                            <AppIcon name="close" className="w-4 h-4" />
                                        </button>
                                    </div>
                                )
                            }

                            // 删除确认模式
                            if (deletingId === ep.id) {
                                return (
                                    <div key={ep.id} className="flex items-center gap-2 p-3 rounded-xl bg-[var(--wuhu-neon-pink)]/10 border border-[var(--wuhu-neon-pink)]/30">
                                        <div className="flex-1 text-sm font-medium text-[var(--wuhu-neon-pink)] truncate">
                                            {t('deleteEpisode')}：{ep.title}
                                        </div>
                                        <button
                                            onClick={() => {
                                                onDelete?.(ep.id)
                                                setDeletingId(null)
                                                setIsOpen(false)
                                            }}
                                            className="px-2 py-1 rounded-lg bg-[var(--wuhu-neon-pink)] text-white text-xs font-medium hover:shadow-[0_0_15px_rgba(255,100,200,0.5)] transition-all"
                                        >
                                            {t('deleteEpisodeConfirm')}
                                        </button>
                                        <button
                                            onClick={() => setDeletingId(null)}
                                            className="w-7 h-7 rounded-lg bg-[var(--wuhu-bg-surface)] text-white/70 hover:bg-[var(--wuhu-bg-card)] flex items-center justify-center transition-all"
                                        >
                                            <AppIcon name="close" className="w-4 h-4" />
                                        </button>
                                    </div>
                                )
                            }

                            return (
                                <div
                                    key={ep.id}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${ep.id === currentId
                                        ? 'bg-gradient-to-r from-[var(--wuhu-neon-purple)]/20 to-[var(--wuhu-neon-pink)]/20 border border-[var(--wuhu-neon-pink)]/50 shadow-[0_0_20px_rgba(255,100,200,0.2)]'
                                        : 'hover:bg-[var(--wuhu-bg-surface)] border border-transparent hover:border-[var(--wuhu-neon-purple)]/30'
                                        }`}
                                >
                                    <button
                                        onClick={() => { onSelect(ep.id); setIsOpen(false); }}
                                        className="flex-1 flex items-center gap-3 text-left"
                                    >
                                        <div className={`w-2 h-10 rounded-full ${statusColor}`} />
                                        <div className="flex-1">
                                            <div className="font-bold text-white text-sm truncate">{ep.title}</div>
                                            {ep.summary && (
                                                <div className="text-xs text-white/50 truncate">{ep.summary}</div>
                                            )}
                                        </div>
                                        {ep.id === currentId && (
                                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--wuhu-neon-pink)]/20 text-[var(--wuhu-neon-pink)]">
                                                <AppIcon name="checkDot" className="h-2.5 w-2.5" />
                                            </span>
                                        )}
                                    </button>
                                    {onRename && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setEditingId(ep.id)
                                                setEditingName(ep.title)
                                            }}
                                            className="w-7 h-7 rounded-lg hover:bg-[var(--wuhu-bg-surface)] flex items-center justify-center text-white/40 hover:text-[var(--wuhu-neon-purple)] transition-colors"
                                            title={t('editEpisodeName')}
                                        >
                                            <AppIcon name="edit" className="w-4 h-4" />
                                        </button>
                                    )}
                                    {onDelete && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setDeletingId(ep.id)
                                            }}
                                            className="w-7 h-7 rounded-lg hover:bg-[var(--wuhu-neon-pink)]/10 flex items-center justify-center text-white/40 hover:text-[var(--wuhu-neon-pink)] transition-colors"
                                            title={t('deleteEpisode')}
                                        >
                                            <AppIcon name="trash" className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                    {onAdd && (
                        <>
                            <div className="h-px bg-[var(--wuhu-neon-purple)]/20 my-2 mx-2" />
                            <button
                                onClick={() => { onAdd(); setIsOpen(false); }}
                                className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-white/50 hover:text-white hover:bg-gradient-to-r hover:from-[var(--wuhu-neon-purple)]/20 hover:to-[var(--wuhu-neon-pink)]/20 font-medium text-sm transition-all"
                            >
                                <span className="text-lg">+</span> {t('newEpisode')}
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

export default CapsuleNav
