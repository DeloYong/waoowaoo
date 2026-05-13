'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'
import { useProjectAssets, useProjectData } from '@/lib/query/hooks'
import { AppIcon } from '@/components/ui/icons'
import JSZip from 'jszip'
import { logError as _logError } from '@/lib/logging/core'

/**
 * AssetToolbar - 资产管理工具栏组件
 * 从 AssetsStage.tsx 提取，负责资产统计与顶部操作
 */

interface EpisodeOption {
    id: string
    episodeNumber: number
    name: string
}

interface AssetToolbarProps {
    projectId: string
    totalAssets: number
    totalAppearances: number
    totalLocations: number
    totalProps: number
    isBatchSubmitting: boolean
    isAnalyzingAssets: boolean
    isGlobalAnalyzing?: boolean
    onGlobalAnalyze?: () => void
    /** Episode filter */
    episodeId: string | null
    onEpisodeChange: (episodeId: string | null) => void
    episodes: EpisodeOption[]
}

// ─── 剧集筛选 Chip ────────────────────────────────────

function EpisodeChip({
    episodeId,
    onEpisodeChange,
    episodes,
}: {
    episodeId: string | null
    onEpisodeChange: (id: string | null) => void
    episodes: EpisodeOption[]
}) {
    const t = useTranslations('assets')
    const [open, setOpen] = useState(false)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const menuRef = useRef<HTMLDivElement>(null)
    const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)

    const selectedEpisode = episodes.find((ep) => ep.id === episodeId)
    const label = selectedEpisode ? selectedEpisode.name : t('filterBar.allEpisodes')

    const updatePosition = useCallback(() => {
        if (!triggerRef.current) return
        const rect = triggerRef.current.getBoundingClientRect()
        setMenuPos({
            top: rect.bottom + 6,
            left: rect.left,
        })
    }, [])

    useEffect(() => {
        if (!open) return
        updatePosition()
        const handleClickOutside = (e: MouseEvent) => {
            if (
                triggerRef.current?.contains(e.target as Node) ||
                menuRef.current?.contains(e.target as Node)
            ) return
            setOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [open, updatePosition])

    const handleSelect = (id: string | null) => {
        setOpen(false)
        onEpisodeChange(id)
    }

    return (
        <>
            <button
                ref={triggerRef}
                onClick={() => setOpen((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-medium transition-all duration-200 cursor-pointer border ${
                    episodeId
                        ? 'bg-[var(--wuhu-neon-purple)]/20 text-[var(--wuhu-neon-cyan)] border-[var(--wuhu-neon-purple)]/30'
                        : 'bg-white/5 text-white/70 border-white/20 hover:bg-white/10'
                }`}
            >
                <AppIcon name="film" className="w-3.5 h-3.5" />
                <span>{label}</span>
                {episodeId ? (
                    <span
                        role="button"
                        onClick={(e) => { e.stopPropagation(); onEpisodeChange(null) }}
                        className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-[var(--wuhu-neon-cyan)]/20 transition-colors"
                    >
                        <AppIcon name="close" className="w-3 h-3" />
                    </span>
                ) : (
                    <AppIcon
                        name="chevronDown"
                        className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                    />
                )}
            </button>
            {open && menuPos && createPortal(
                <div
                    ref={menuRef}
                    className="fixed z-[99999] min-w-[180px] max-h-[320px] overflow-y-auto py-1.5 rounded-xl bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_50px_rgba(167,87,255,0.3)] animate-in fade-in-0 zoom-in-95 duration-150"
                    style={{ top: menuPos.top, left: menuPos.left }}
                >
                    {/* All episodes option */}
                    <button
                        onClick={() => handleSelect(null)}
                        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors cursor-pointer ${
                            !episodeId
                                ? 'text-[var(--wuhu-neon-cyan)] bg-[var(--wuhu-neon-purple)]/20 font-medium'
                                : 'text-white hover:bg-white/10'
                        }`}
                    >
                        <AppIcon name="folderOpen" className="w-4 h-4 text-white/40" />
                        <span>{t('filterBar.allEpisodes')}</span>
                    </button>
                    {/* Divider */}
                    <div className="mx-3 my-1 border-t border-white/10" />
                    {/* Episode list */}
                    {episodes.map((ep) => (
                        <button
                            key={ep.id}
                            onClick={() => handleSelect(ep.id)}
                            className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors cursor-pointer ${
                                episodeId === ep.id
                                    ? 'text-[var(--wuhu-neon-cyan)] bg-[var(--wuhu-neon-purple)]/20 font-medium'
                                    : 'text-white hover:bg-white/10'
                            }`}
                        >
                            <AppIcon name="film" className="w-4 h-4 text-white/40" />
                            <span>{ep.name}</span>
                        </button>
                    ))}
                </div>,
                document.body,
            )}
        </>
    )
}

export default function AssetToolbar({
    projectId,
    totalAssets,
    totalAppearances,
    totalLocations,
    totalProps,
    isBatchSubmitting,
    isAnalyzingAssets,
    isGlobalAnalyzing = false,
    onGlobalAnalyze,
    episodeId,
    onEpisodeChange,
    episodes,
}: AssetToolbarProps) {
    const t = useTranslations('assets')
    const { data: assets } = useProjectAssets(projectId)
    const { data: projectData } = useProjectData(projectId)
    const projectName = projectData?.name
    const [isDownloading, setIsDownloading] = useState(false)

    const handleDownloadAll = async () => {
        const characters = assets?.characters ?? []
        const locations = assets?.locations ?? []
        const props = assets?.props ?? []

        const imageEntries: Array<{ filename: string; url: string }> = []

        // 角色图片
        for (const character of characters) {
            for (const appearance of character.appearances ?? []) {
                const url = appearance.imageUrl
                if (!url) continue
                const safeName = character.name.replace(/[/\\:*?"<>|]/g, '_')
                const filename = appearance.appearanceIndex === 0
                    ? `characters/${safeName}.jpg`
                    : `characters/${safeName}_appearance${appearance.appearanceIndex}.jpg`
                imageEntries.push({ filename, url })
            }
        }

        // 场景图片：取已选中的那张（或第一张）
        for (const location of locations) {
            const selectedImage = location.images?.find((img: { isSelected: boolean; imageUrl: string | null }) => img.isSelected) ?? location.images?.[0]
            const url = selectedImage?.imageUrl
            if (!url) continue
            const safeName = location.name.replace(/[/\\:*?"<>|]/g, '_')
            imageEntries.push({ filename: `locations/${safeName}.jpg`, url })
        }

        for (const prop of props) {
            const selectedImage = prop.images?.find((img: { isSelected: boolean; imageUrl: string | null }) => img.isSelected) ?? prop.images?.[0]
            const url = selectedImage?.imageUrl
            if (!url) continue
            const safeName = prop.name.replace(/[/\\:*?"<>|]/g, '_')
            imageEntries.push({ filename: `props/${safeName}.jpg`, url })
        }

        if (imageEntries.length === 0) {
            alert(t('assetLibrary.downloadEmpty'))
            return
        }

        setIsDownloading(true)
        try {
            const zip = new JSZip()
            await Promise.all(
                imageEntries.map(async ({ filename, url }) => {
                    try {
                        const response = await fetch(url)
                        if (!response.ok) return
                        const blob = await response.blob()
                        zip.file(filename, blob)
                    } catch {
                        // 单张失败不阻断其他
                    }
                })
            )
            const content = await zip.generateAsync({ type: 'blob' })
            const link = document.createElement('a')
            link.href = URL.createObjectURL(content)
            const safeName = projectName ? projectName.replace(/[/\\:*?"<>|]/g, '_') : 'assets'
            link.download = `${safeName}_${new Date().toISOString().slice(0, 10)}.zip`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(link.href)
        } catch (error) {
            _logError('打包下载失败:', error)
            alert(t('assetLibrary.downloadFailed'))
        } finally {
            setIsDownloading(false)
        }
    }

    return (
        <div className="bg-[var(--wuhu-bg-card)]/90 backdrop-blur border-b border-[var(--wuhu-neon-purple)]/20 p-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-white/70 inline-flex items-center gap-2">
                        <AppIcon name="diamond" className="w-4 h-4 text-[var(--wuhu-neon-cyan)]" />
                        {t("toolbar.assetManagement")}
                    </span>
                    {/* 剧集筛选 chip */}
                    {episodes.length > 0 && (
                        <EpisodeChip
                            episodeId={episodeId}
                            onEpisodeChange={onEpisodeChange}
                            episodes={episodes}
                        />
                    )}
                    <span className="text-sm text-white/40">
                        {t("toolbar.assetCount", { total: totalAssets, appearances: totalAppearances, locations: totalLocations, props: totalProps })}
                    </span>
                    {/* 全局资产分析按钮 */}
                    {onGlobalAnalyze && (
                        <button
                            onClick={onGlobalAnalyze}
                            disabled={isGlobalAnalyzing || isBatchSubmitting || isAnalyzingAssets}
                            className="bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_20px_rgba(167,87,255,0.3)] hover:shadow-[0_0_30px_rgba(167,87,255,0.4)] rounded-lg transition-all flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            title={t("toolbar.globalAnalyzeHint")}
                        >
                            <AppIcon name="idea" className="w-3.5 h-3.5" />
                            <span>{t("toolbar.globalAnalyze")}</span>
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {/* 打包下载按钮 */}
                    <button
                        onClick={handleDownloadAll}
                        disabled={isDownloading || totalAssets === 0}
                        title={t("toolbar.downloadAll")}
                        className="bg-[var(--wuhu-bg-surface)] border border-white/20 hover:bg-white/5 rounded-lg text-white/70 hover:text-white transition-all flex items-center justify-center w-9 h-9 disabled:opacity-50 disabled:cursor-not-allowed border border-[rgba(167, 87, 255, 0.2)]"
                    >
                        <AppIcon
                            name={isDownloading ? 'refresh' : 'download'}
                            className={`w-4 h-4 ${isDownloading ? 'animate-spin' : ''}`}
                        />
                    </button>
                </div>
            </div>
        </div>
    )
}
