'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'

interface Folder {
    id: string
    name: string
}

interface FolderModalProps {
    folder: Folder | null
    onClose: () => void
    onSave: (name: string) => void
}

// 内联 SVG 图标
const XMarkIcon = ({ className }: { className?: string }) => (
    <AppIcon name="close" className={className} />
)

export function FolderModal({ folder, onClose, onSave }: FolderModalProps) {
    const t = useTranslations('assetHub')
    const [name, setName] = useState(folder?.name || '')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (name.trim()) {
            onSave(name.trim())
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_50px_rgba(167,87,255,0.35)] rounded-2xl max-w-sm w-full">
                <div className="p-5">
                    {/* 标题 */}
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-lg font-semibold text-white">
                            {folder ? t('editFolder') : t('newFolder')}
                        </h3>
                        <button
                            onClick={onClose}
                            className="h-8 w-8 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-[var(--wuhu-neon-purple)]/20"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="mb-5">
                            <label className="block text-sm font-medium text-white/70 mb-2">
                                {t('folderName')}
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t('folderNamePlaceholder')}
                                className="bg-[var(--wuhu-bg-surface)] border border-[var(--wuhu-neon-purple)]/30 text-white placeholder:text-white/40 focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_20px_rgba(255,100,200,0.3)] rounded-xl w-full px-3 py-2 text-sm outline-none transition-all"
                                autoFocus
                            />
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button
                                type="button"
                                onClick={onClose}
                                className="border border-[var(--wuhu-neon-purple)]/40 text-white/80 hover:bg-[var(--wuhu-neon-purple)]/20 px-4 py-2 rounded-lg text-sm transition-all"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                type="submit"
                                disabled={!name.trim()}
                                className="bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_15px_rgba(167,87,255,0.4)] px-4 py-2 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {folder ? t('save') : t('create')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
