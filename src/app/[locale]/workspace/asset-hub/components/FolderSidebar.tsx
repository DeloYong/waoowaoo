'use client'

import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'

interface Folder {
    id: string
    name: string
}

interface FolderSidebarProps {
    folders: Folder[]
    selectedFolderId: string | null
    onSelectFolder: (folderId: string | null) => void
    onCreateFolder: () => void
    onEditFolder: (folder: Folder) => void
    onDeleteFolder: (folderId: string) => void
}

// 内联 SVG 图标
const FolderIcon = ({ className }: { className?: string }) => (
    <AppIcon name="folder" className={className} />
)

const PlusIcon = ({ className }: { className?: string }) => (
    <AppIcon name="plus" className={className} />
)

const PencilIcon = ({ className }: { className?: string }) => (
    <AppIcon name="edit" className={className} />
)

const TrashIcon = ({ className }: { className?: string }) => (
    <AppIcon name="trash" className={className} />
)

export function FolderSidebar({
    folders,
    selectedFolderId,
    onSelectFolder,
    onCreateFolder,
    onEditFolder,
    onDeleteFolder
}: FolderSidebarProps) {
    const t = useTranslations('assetHub')

    return (
        <div className="w-56 flex-shrink-0">
            <div className="bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-white/70">{t('folders')}</h3>
                    <button
                        onClick={onCreateFolder}
                        className="bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] h-6 w-6 rounded-full flex items-center justify-center text-white shadow-[0_0_10px_rgba(167,87,255,0.4)]"
                        title={t('newFolder')}
                    >
                        <PlusIcon className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-1">
                    {/* 所有资产 */}
                    <button
                        onClick={() => onSelectFolder(null)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-all ${selectedFolderId === null
                                ? 'bg-gradient-to-r from-[var(--wuhu-neon-purple)]/30 to-[var(--wuhu-neon-pink)]/30 text-white border-l-2 border-[var(--wuhu-neon-pink)] shadow-[0_0_15px_rgba(255,100,200,0.2)]'
                                : 'text-white/70 hover:bg-[var(--wuhu-neon-purple)]/10 hover:text-white'
                            }`}
                    >
                        <FolderIcon className="w-4 h-4" />
                        <span className="truncate">{t('allAssets')}</span>
                    </button>

                    {/* 文件夹列表 */}
                    {folders.map((folder) => (
                        <div
                            key={folder.id}
                            className={`group flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${selectedFolderId === folder.id
                                    ? 'bg-gradient-to-r from-[var(--wuhu-neon-purple)]/30 to-[var(--wuhu-neon-pink)]/30 text-white border-l-2 border-[var(--wuhu-neon-pink)] shadow-[0_0_15px_rgba(255,100,200,0.2)]'
                                    : 'text-white/70 hover:bg-[var(--wuhu-neon-purple)]/10 hover:text-white'
                                }`}
                        >
                            <button
                                onClick={() => onSelectFolder(folder.id)}
                                className="flex-1 flex items-center gap-2 text-left text-sm min-w-0"
                            >
                                <FolderIcon className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate">{folder.name}</span>
                            </button>

                            {/* 操作按钮 */}
                            <div className="hidden group-hover:flex items-center gap-0.5">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onEditFolder(folder)
                                    }}
                                    className="h-5 w-5 rounded flex items-center justify-center text-white/50 hover:text-white hover:bg-[var(--wuhu-neon-purple)]/20"
                                    title={t('editFolder')}
                                >
                                    <PencilIcon className="w-3 h-3" />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onDeleteFolder(folder.id)
                                    }}
                                    className="h-5 w-5 rounded flex items-center justify-center text-white/50 hover:text-[var(--wuhu-neon-pink)] hover:bg-[var(--wuhu-neon-pink)]/20"
                                    title={t('deleteFolder')}
                                >
                                    <TrashIcon className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    ))}

                    {folders.length === 0 && (
                        <div className="text-xs text-white/40 text-center py-4">
                            {t('noFolders')}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
