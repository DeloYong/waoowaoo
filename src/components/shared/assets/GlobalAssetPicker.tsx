'use client'
import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import ImagePreviewModal from '@/components/ui/ImagePreviewModal'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import { resolveTaskPresentationState } from '@/lib/task/presentation'
import { MediaImageWithLoading } from '@/components/media/MediaImageWithLoading'
import { AppIcon } from '@/components/ui/icons'
import { apiFetch } from '@/lib/api-fetch'

interface GlobalAssetPickerProps {
    isOpen: boolean
    onClose: () => void
    onSelect: (globalAssetId: string) => void
    type: 'character' | 'location' | 'prop' | 'voice'
    loading?: boolean
}

interface GlobalCharacterAppearance {
    id: string
    imageUrl: string | null
    imageUrls: string[]
    selectedIndex: number | null
}

interface GlobalCharacter {
    id: string
    name: string
    folderId: string | null
    customVoiceUrl: string | null
    appearances: GlobalCharacterAppearance[]
}

interface GlobalLocationImage {
    id: string
    imageIndex: number
    imageUrl: string | null
    isSelected: boolean
}

interface GlobalLocation {
    id: string
    name: string
    summary: string | null
    folderId: string | null
    images: GlobalLocationImage[]
}

type GlobalProp = GlobalLocation

interface GlobalVoice {
    id: string
    name: string
    description: string | null
    folderId: string | null
    customVoiceUrl: string | null
    voiceId: string | null
    voiceType: string
    voicePrompt: string | null
    gender: string | null
    language: string
}

/** 从 appearances 中提取预览图 URL */
function getCharacterPreview(char: GlobalCharacter): string | null {
    const first = char.appearances?.[0]
    if (!first) return null
    // 优先使用 selectedIndex 指向的图
    if (first.selectedIndex != null && first.imageUrls?.[first.selectedIndex]) {
        return first.imageUrls[first.selectedIndex]
    }
    return first.imageUrl || first.imageUrls?.[0] || null
}

/** 从 images 中提取预览图 URL */
function getLocationPreview(loc: GlobalLocation): string | null {
    const selected = loc.images?.find(img => img.isSelected)
    if (selected?.imageUrl) return selected.imageUrl
    return loc.images?.[0]?.imageUrl || null
}

// 内联 SVG 图标组件
const XMarkIcon = ({ className }: { className?: string }) => (
    <AppIcon name="close" className={className} />
)

const MagnifyingGlassIcon = ({ className }: { className?: string }) => (
    <AppIcon name="search" className={className} />
)

const UserIcon = ({ className }: { className?: string }) => (
    <AppIcon name="userAlt" className={className} />
)

const PhotoIcon = ({ className }: { className?: string }) => (
    <AppIcon name="image" className={className} />
)

const CheckCircleIcon = ({ className }: { className?: string }) => (
    <AppIcon name="badgeCheck" className={className} />
)


const MicrophoneIcon = ({ className }: { className?: string }) => (
    <AppIcon name="mic" className={className} />
)

export default function GlobalAssetPicker({
    isOpen,
    onClose,
    onSelect,
    type,
    loading: externalLoading
}: GlobalAssetPickerProps) {
    const t = useTranslations('assetPicker')

    // 轻量级查询：只查询当前 type，不附带任务状态
    const charactersQuery = useQuery({
        queryKey: ['global-assets', 'characters'],
        queryFn: async () => {
            const res = await apiFetch('/api/assets?scope=global&kind=character')
            if (!res.ok) throw new Error('Failed to fetch characters')
            const data = await res.json()
            return data.assets as GlobalCharacter[]
        },
        enabled: type === 'character',
    })
    const locationsQuery = useQuery({
        queryKey: ['global-assets', 'locations'],
        queryFn: async () => {
            const res = await apiFetch('/api/assets?scope=global&kind=location')
            if (!res.ok) throw new Error('Failed to fetch locations')
            const data = await res.json()
            return data.assets as GlobalLocation[]
        },
        enabled: type === 'location',
    })
    const propsQuery = useQuery({
        queryKey: ['global-assets', 'props'],
        queryFn: async () => {
            const res = await apiFetch('/api/assets?scope=global&kind=prop')
            if (!res.ok) throw new Error('Failed to fetch props')
            const data = await res.json()
            return data.assets as GlobalProp[]
        },
        enabled: type === 'prop',
    })
    const voicesQuery = useQuery({
        queryKey: ['global-assets', 'voices'],
        queryFn: async () => {
            const res = await apiFetch('/api/assets?scope=global&kind=voice')
            if (!res.ok) throw new Error('Failed to fetch voices')
            const data = await res.json()
            return data.assets as GlobalVoice[]
        },
        enabled: type === 'voice',
    })

    const characters = (charactersQuery.data || []) as GlobalCharacter[]
    const locations = (locationsQuery.data || []) as GlobalLocation[]
    const props = (propsQuery.data || []) as GlobalProp[]
    const voices = (voicesQuery.data || []) as GlobalVoice[]
    const isLoading = type === 'character'
        ? charactersQuery.isFetching
        : type === 'location'
            ? locationsQuery.isFetching
            : type === 'prop'
                ? propsQuery.isFetching
            : voicesQuery.isFetching
    const loadingState = isLoading
        ? resolveTaskPresentationState({
            phase: 'processing',
            intent: 'process',
            resource: type === 'voice' ? 'audio' : 'image',
            hasOutput: false,
        })
        : null
    const copyingState = externalLoading
        ? resolveTaskPresentationState({
            phase: 'processing',
            intent: 'process',
            resource: type === 'voice' ? 'audio' : 'image',
            hasOutput: false,
        })
        : null
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [previewImage, setPreviewImage] = useState<string | null>(null)
    const [previewAudio, setPreviewAudio] = useState<string | null>(null)
    const [isPlayingAudio, setIsPlayingAudio] = useState(false)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    // 提取稳定的 refetch 引用，避免 useEffect 无限循环
    const refetchCharacters = charactersQuery.refetch
    const refetchLocations = locationsQuery.refetch
    const refetchProps = propsQuery.refetch
    const refetchVoices = voicesQuery.refetch

    // 停止音频播放的辅助函数
    const stopAudio = () => {
        if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current.currentTime = 0
            audioRef.current = null
        }
        setIsPlayingAudio(false)
        setPreviewAudio(null)
    }

    useEffect(() => {
        if (isOpen) {
            setSelectedId(null)
            setSearchQuery('')
            if (type === 'character') {
                refetchCharacters()
            } else if (type === 'location') {
                refetchLocations()
            } else if (type === 'prop') {
                refetchProps()
            } else {
                refetchVoices()
            }
        } else {
            // 关闭对话框时停止播放
            stopAudio()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, type])

    const handleConfirm = () => {
        if (selectedId) {
            stopAudio()  // 确认复制时停止音频播放
            onSelect(selectedId)
        }
    }

    const filteredCharacters = characters.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const filteredLocations = locations.filter(l =>
        l.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const filteredProps = props.filter(l =>
        l.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const filteredVoices = voices.filter(v =>
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.description && v.description.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    // 播放/暂停音频预览
    const handlePlayAudio = (audioUrl: string, e: React.MouseEvent) => {
        e.stopPropagation()

        // 如果点击的是当前正在播放的音频，则暂停
        if (previewAudio === audioUrl && isPlayingAudio) {
            stopAudio()
            return
        }

        // 停止之前的播放
        stopAudio()

        // 开始播放新音频
        setIsPlayingAudio(true)
        setPreviewAudio(audioUrl)
        const audio = new Audio(audioUrl)
        audioRef.current = audio
        audio.play()
        audio.onended = () => {
            setIsPlayingAudio(false)
            setPreviewAudio(null)
            audioRef.current = null
        }
        audio.onerror = () => {
            setIsPlayingAudio(false)
            setPreviewAudio(null)
            audioRef.current = null
        }
    }

    if (!isOpen) return null

    const items = type === 'character'
        ? filteredCharacters
        : type === 'location'
            ? filteredLocations
            : type === 'prop'
                ? filteredProps
                : filteredVoices
    const hasNoAssets = type === 'character'
        ? characters.length === 0
        : type === 'location'
            ? locations.length === 0
            : type === 'prop'
                ? props.length === 0
                : voices.length === 0

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn flex items-center justify-center z-50">
            <div className="bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_50px_rgba(167,87,255,0.3)] rounded-2xl w-[600px] max-h-[80vh] flex flex-col">
                {/* 头部 */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <h2 className="text-lg font-semibold text-white">
                        {type === 'character' ? t('selectCharacter') : type === 'location' ? t('selectLocation') : type === 'prop' ? t('selectProp') : t('selectVoice')}
                    </h2>
                    <button onClick={onClose} className="text-white/40 hover:text-white hover:bg-white/10 p-2 rounded-lg">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* 搜索栏 */}
                <div className="px-6 py-3 border-b border-white/10">
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('searchPlaceholder')}
                            className="w-full pl-9 pr-4 py-2 text-sm bg-[var(--wuhu-bg-surface)] border border-[var(--wuhu-neon-purple)]/30 rounded-xl text-white placeholder:text-white/30 focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_15px_rgba(255,100,200,0.3)] outline-none transition-all"
                        />
                    </div>
                </div>

                {/* 资产列表 */}
                <div className="flex-1 overflow-y-auto p-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-40">
                            <TaskStatusInline state={loadingState} />
                        </div>
                    ) : hasNoAssets ? (
                        <div className="flex flex-col items-center justify-center h-40 text-white/50">
                            {type === 'character' ? (
                                <UserIcon className="w-12 h-12 mb-2" />
                            ) : type === 'location' || type === 'prop' ? (
                                <PhotoIcon className="w-12 h-12 mb-2" />
                            ) : (
                                <MicrophoneIcon className="w-12 h-12 mb-2" />
                            )}
                            <p>{t('noAssets')}</p>
                            <p className="text-sm mt-1">{t('createInAssetHub')}</p>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex items-center justify-center h-40 text-white/50">
                            <p>{t('noSearchResults')}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-3">
                            {type === 'character' ? (
                                filteredCharacters.map((char) => {
                                    const charPreview = getCharacterPreview(char)
                                    return (
                                        <div
                                            key={char.id}
                                            onClick={() => setSelectedId(char.id)}
                                            className={`relative cursor-pointer rounded-xl border-2 p-2 transition-all ${selectedId === char.id
                                                ? 'border-[var(--wuhu-neon-pink)] shadow-[0_0_20px_rgba(255,100,200,0.4)] bg-[var(--wuhu-neon-pink)]/10'
                                                : 'border-[var(--wuhu-neon-purple)]/30 hover:border-[var(--wuhu-neon-pink)]/50 hover:shadow-[0_0_20px_rgba(167,87,255,0.2)]'
                                                }`}
                                        >
                                            {/* 选中标记 */}
                                            {selectedId === char.id && (
                                                <CheckCircleIcon className="absolute -top-2 -right-2 w-6 h-6 text-[var(--wuhu-neon-pink)] bg-[var(--wuhu-bg-card)] rounded-full" />
                                            )}

                                            {/* 预览图 */}
                                            <div className="aspect-square rounded-lg overflow-hidden bg-[var(--wuhu-bg-surface)] mb-2 relative">
                                                {charPreview ? (
                                                    <MediaImageWithLoading
                                                        src={charPreview}
                                                        alt={char.name}
                                                        containerClassName="w-full h-full"
                                                        className="w-full h-full object-cover cursor-zoom-in"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setPreviewImage(charPreview)
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-white/40">
                                                        <UserIcon className="w-12 h-12" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* 名称 */}
                                            <div className="text-center">
                                                <p className="font-medium text-sm text-white truncate">{char.name}</p>
                                                <p className="text-xs text-white/50 mt-1">
                                                    {char.appearances?.length || 0} {t('appearances')}
                                                    {char.customVoiceUrl && ' · Voice'}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })
                            ) : type === 'location' ? (
                                filteredLocations.map((loc) => {
                                    const locPreview = getLocationPreview(loc)
                                    return (
                                        <div
                                            key={loc.id}
                                            onClick={() => setSelectedId(loc.id)}
                                            className={`relative cursor-pointer rounded-xl border-2 p-2 transition-all ${selectedId === loc.id
                                                ? 'border-[var(--wuhu-neon-pink)] shadow-[0_0_20px_rgba(255,100,200,0.4)] bg-[var(--wuhu-neon-pink)]/10'
                                                : 'border-[var(--wuhu-neon-purple)]/30 hover:border-[var(--wuhu-neon-pink)]/50 hover:shadow-[0_0_20px_rgba(167,87,255,0.2)]'
                                                }`}
                                        >
                                            {/* 选中标记 */}
                                            {selectedId === loc.id && (
                                                <CheckCircleIcon className="absolute -top-2 -right-2 w-6 h-6 text-[var(--wuhu-neon-pink)] bg-[var(--wuhu-bg-card)] rounded-full" />
                                            )}

                                            {/* 预览图 */}
                                            <div className="aspect-video rounded-lg overflow-hidden bg-[var(--wuhu-bg-surface)] mb-2 relative">
                                                {locPreview ? (
                                                    <MediaImageWithLoading
                                                        src={locPreview}
                                                        alt={loc.name}
                                                        containerClassName="w-full h-full"
                                                        className="w-full h-full object-cover cursor-zoom-in"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setPreviewImage(locPreview)
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-white/40">
                                                        <PhotoIcon className="w-12 h-12" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* 名称 */}
                                            <div className="text-center">
                                                <p className="font-medium text-sm text-white truncate">{loc.name}</p>
                                                <p className="text-xs text-white/50 mt-1">
                                                    {loc.images?.length || 0} {t('images')}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })
                            ) : type === 'prop' ? (
                                filteredProps.map((prop) => {
                                    const propPreview = getLocationPreview(prop)
                                    return (
                                        <div
                                            key={prop.id}
                                            onClick={() => setSelectedId(prop.id)}
                                            className={`relative cursor-pointer rounded-xl border-2 p-2 transition-all ${selectedId === prop.id
                                                ? 'border-[var(--wuhu-neon-pink)] shadow-[0_0_20px_rgba(255,100,200,0.4)] bg-[var(--wuhu-neon-pink)]/10'
                                                : 'border-[var(--wuhu-neon-purple)]/30 hover:border-[var(--wuhu-neon-pink)]/50 hover:shadow-[0_0_20px_rgba(167,87,255,0.2)]'
                                                }`}
                                        >
                                            {selectedId === prop.id && (
                                                <CheckCircleIcon className="absolute -top-2 -right-2 w-6 h-6 text-[var(--wuhu-neon-pink)] bg-[var(--wuhu-bg-card)] rounded-full" />
                                            )}
                                            <div className="aspect-video rounded-lg overflow-hidden bg-[var(--wuhu-bg-surface)] mb-2 relative">
                                                {propPreview ? (
                                                    <MediaImageWithLoading
                                                        src={propPreview}
                                                        alt={prop.name}
                                                        containerClassName="w-full h-full"
                                                        className="w-full h-full object-cover cursor-zoom-in"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setPreviewImage(propPreview)
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-white/40">
                                                        <PhotoIcon className="w-12 h-12" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-center">
                                                <p className="font-medium text-sm text-white truncate">{prop.name}</p>
                                                <p className="text-xs text-white/50 mt-1">
                                                    {prop.images?.length || 0} {t('images')}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                // 音色列表渲染 - 与资产中心 VoiceCard 风格统一
                                filteredVoices.map((voice) => {
                                    const genderIcon = voice.gender === 'male' ? 'M' : voice.gender === 'female' ? 'F' : ''
                                    const isVoicePlaying = previewAudio === voice.customVoiceUrl && isPlayingAudio
                                    return (
                                        <div
                                            key={voice.id}
                                            onClick={() => setSelectedId(voice.id)}
                                            className={`relative cursor-pointer bg-[var(--wuhu-bg-card)] border overflow-hidden transition-all ${selectedId === voice.id
                                                ? 'border-[var(--wuhu-neon-pink)] shadow-[0_0_20px_rgba(255,100,200,0.4)]'
                                                : 'border-[var(--wuhu-neon-purple)]/30 hover:border-[var(--wuhu-neon-pink)]/50 hover:shadow-[0_0_20px_rgba(167,87,255,0.2)]'
                                                }`}
                                        >
                                            {/* 选中标记 */}
                                            {selectedId === voice.id && (
                                                <div className="absolute top-2 right-2 w-6 h-6 bg-[var(--wuhu-neon-purple)] rounded-full flex items-center justify-center z-10 p-0">
                                                    <AppIcon name="checkSolid" className="w-4 h-4 text-white" />
                                                </div>
                                            )}

                                            {/* 音色图标区域 - 与 VoiceCard 统一 */}
                                            <div className="relative bg-[var(--wuhu-bg-surface)] p-6 flex items-center justify-center">
                                                <div className="w-16 h-16 rounded-full bg-[var(--wuhu-neon-purple)]/20 flex items-center justify-center">
                                                    <MicrophoneIcon className="w-8 h-8 text-[var(--wuhu-neon-purple)]" />
                                                </div>

                                                {/* 性别标签 */}
                                                {genderIcon && (
                                                    <div className="absolute top-2 left-2 bg-white/10 text-white/70 text-xs px-2 py-0.5 rounded-full">
                                                        {genderIcon}
                                                    </div>
                                                )}

                                                {/* 试听按钮 - 圆形，与 VoiceCard 统一 */}
                                                {voice.customVoiceUrl && (
                                                    <button
                                                        onClick={(e) => handlePlayAudio(voice.customVoiceUrl!, e)}
                                                        className={`absolute bottom-2 right-2 w-10 h-10 rounded-full flex items-center justify-center transition-all ${isVoicePlaying
                                                            ? 'bg-[var(--wuhu-neon-purple)] text-white animate-pulse'
                                                            : 'border border-white/20 text-white/70 hover:border-[var(--wuhu-neon-pink)] hover:text-white hover:bg-white/10'
                                                            }`}
                                                    >
                                                        {isVoicePlaying ? (
                                                            <AppIcon name="pause" className="w-5 h-5" />
                                                        ) : (
                                                            <AppIcon name="play" className="w-5 h-5" />
                                                        )}
                                                    </button>
                                                )}
                                            </div>

                                            {/* 信息区域 */}
                                            <div className="p-3">
                                                <h3 className="font-medium text-white text-sm truncate">{voice.name}</h3>
                                                {voice.description && (
                                                    <p className="mt-1 text-xs text-white/70 line-clamp-2">{voice.description}</p>
                                                )}
                                                {voice.voicePrompt && !voice.description && (
                                                    <p className="mt-1 text-xs text-white/50 line-clamp-2 italic">{voice.voicePrompt}</p>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    )}
                </div>

                {/* 底部按钮 */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/10 bg-[var(--wuhu-bg-surface)]">
                    <button
                        onClick={onClose}
                        className="border border-white/20 text-white/70 hover:border-[var(--wuhu-neon-pink)] hover:text-white hover:bg-white/10 px-4 py-2 text-sm rounded-xl"
                    >
                        {t('cancel')}
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!selectedId || externalLoading}
                        className="bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_15px_rgba(167,87,255,0.4)] hover:shadow-[0_0_25px_rgba(255,100,200,0.5)] px-4 py-2 text-sm rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {externalLoading && <TaskStatusInline state={copyingState} className="text-white [&>span]:sr-only [&_svg]:text-white" />}
                        {t('confirmCopy')}
                    </button>
                </div>
            </div>

            {/* 图片放大预览弹窗 */}
            {
                previewImage && (
                    <ImagePreviewModal
                        imageUrl={previewImage}
                        onClose={() => setPreviewImage(null)}
                    />
                )
            }
        </div >
    )
}
