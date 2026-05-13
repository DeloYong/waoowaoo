'use client'
import { logInfo as _ulogInfo } from '@/lib/logging/core'
import { useTranslations } from 'next-intl'

/**
 * LocationSection - 场景资产区块组件
 * 从 AssetsStage.tsx 提取，负责场景列表的展示和操作
 * 
 * 🔥 V6.5 重构：内部直接订阅 useProjectAssets，消除 props drilling
 */

import { Location, Prop } from '@/types/project'
import { useProjectAssets } from '@/lib/query/hooks/useProjectAssets'
import LocationCard from './LocationCard'
import { AppIcon } from '@/components/ui/icons'
import { resolveLocationBackedGenerateType } from './location-backed-asset'

interface LocationSectionProps {
    // 🔥 V6.5 删除：locations prop - 现在内部直接订阅
    projectId: string
    assetType?: 'location' | 'prop'
    activeTaskKeys: Set<string>
    onClearTaskKey: (key: string) => void
    onRegisterTransientTaskKey: (key: string) => void
    // 回调函数
    onAddLocation: () => void
    onDeleteLocation: (locationId: string) => void
    onEditLocation: (location: Location | Prop) => void
    // 🔥 V6.6 重构：重命名为 handleGenerateImage
    handleGenerateImage: (type: 'character' | 'location' | 'prop', id: string, appearanceId?: string, count?: number) => Promise<void>
    onSelectImage: (locationId: string, imageIndex: number | null) => void
    onConfirmSelection: (locationId: string) => void
    onRegenerateSingle: (locationId: string, imageIndex: number) => Promise<void>
    onRegenerateGroup: (locationId: string, count?: number) => Promise<void>
    onUndo: (locationId: string) => void
    onImageClick: (imageUrl: string) => void
    onImageEdit: (locationId: string, imageIndex: number, locationName: string) => void
    onCopyFromGlobal: (locationId: string) => void  // 🆕 从资产中心复制
    onSaveToGlobal: (locationId: string) => void  // 🆕 保存到资产中心
    /** 分集筛选：仅显示指定 ID 的场景/道具，null 表示显示全部 */
    filterIds?: Set<string> | null
}

export default function LocationSection({
    // 🔥 V6.5 删除：locations prop - 现在内部直接订阅
    projectId,
    assetType = 'location',
    activeTaskKeys,
    onClearTaskKey,
    onRegisterTransientTaskKey,
    onAddLocation,
    onDeleteLocation,
    onEditLocation,
    handleGenerateImage,
    onSelectImage,
    onConfirmSelection,
    onRegenerateSingle,
    onRegenerateGroup,
    onUndo,
    onImageClick,
    onImageEdit,
    onCopyFromGlobal,
    onSaveToGlobal,
    filterIds = null,
}: LocationSectionProps) {
    const t = useTranslations('assets')

    const { data: assets } = useProjectAssets(projectId)
    const allLocations: Array<Location | Prop> = assetType === 'prop'
        ? assets?.props ?? []
        : assets?.locations ?? []
    const locations = filterIds ? allLocations.filter((l) => filterIds.has(l.id)) : allLocations
    const assetKey = assetType === 'prop' ? 'prop' : 'location'
    const generateType = resolveLocationBackedGenerateType(assetType)

    return (
        <div className="bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/20 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(0, 255, 255, 0.1)] text-[var(--wuhu-neon-cyan)]">
                        <AppIcon name="imageLandscape" className="h-5 w-5" />
                    </span>
                    <h3 className="text-lg font-bold text-white">
                        {assetType === 'prop' ? t('stage.propAssets') : t("stage.locationAssets")}
                    </h3>
                    <span className="text-sm text-white/40 bg-white/5 px-2 py-1 rounded-lg">
                        {assetType === 'prop'
                            ? t('stage.propCounts', { count: locations.length })
                            : t("stage.locationCounts", { count: locations.length })}
                    </span>
                </div>
                <button
                    onClick={onAddLocation}
                    className="bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_20px_rgba(167,87,255,0.3)] hover:shadow-[0_0_30px_rgba(167,87,255,0.4)] rounded-lg transition-all flex items-center gap-2 px-4 py-2 font-medium"
                >
                    + {t(`${assetKey}.add`)}
                </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 xl:grid-cols-6 gap-6">
                {locations.map(location => (
                    <LocationCard
                        key={location.id}
                        location={location}
                        assetType={assetType}
                        onEdit={() => onEditLocation(location)}
                        onDelete={() => onDeleteLocation(location.id)}
                        onRegenerate={(count) => {
                            // 获取有效图片数量
                            const validImages = location.images?.filter(img => img.imageUrl) || []

                            _ulogInfo('[LocationSection] 重新生成判断:', {
                                locationName: location.name,
                                images: location.images,
                                validImages,
                                validImageCount: validImages.length
                            })

                            // 单图：重新生成单张
                            if (validImages.length === 1) {
                                const imageIndex = validImages[0].imageIndex
                                const taskKey = `location-${location.id}-${imageIndex}`
                                _ulogInfo('[LocationSection] 调用单张重新生成, imageIndex:', imageIndex)
                                onRegisterTransientTaskKey(taskKey)
                                void onRegenerateSingle(location.id, imageIndex).catch(() => {
                                    onClearTaskKey(taskKey)
                                })
                            }
                            // 多图或无图：重新生成整组
                            else {
                                const taskKey = `location-${location.id}-group`
                                _ulogInfo('[LocationSection] 调用整组重新生成')
                                onRegisterTransientTaskKey(taskKey)
                                void onRegenerateGroup(location.id, count).catch(() => {
                                    onClearTaskKey(taskKey)
                                })
                            }
                        }}
                        onGenerate={(count) => {
                            const taskKey = `location-${location.id}-group`
                            onRegisterTransientTaskKey(taskKey)
                            void handleGenerateImage(generateType, location.id, undefined, count).catch(() => {
                                onClearTaskKey(taskKey)
                            })
                        }}
                        onUndo={() => onUndo(location.id)}
                        onImageClick={onImageClick}
                        onSelectImage={onSelectImage}
                        onImageEdit={(locId, imgIdx) => onImageEdit(locId, imgIdx, location.name)}
                        onCopyFromGlobal={() => onCopyFromGlobal(location.id)}
                        onSaveToGlobal={() => onSaveToGlobal(location.id)}
                        activeTaskKeys={activeTaskKeys}
                        onClearTaskKey={onClearTaskKey}
                        projectId={projectId}
                        onConfirmSelection={assetType === 'location' ? onConfirmSelection : undefined}
                    />
                ))}
            </div>
        </div>
    )
}
