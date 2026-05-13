'use client'

import { useTranslations } from 'next-intl'
import { toDisplayImageUrl } from '@/lib/media/image-url'
import { MediaImageWithLoading } from '@/components/media/MediaImageWithLoading'
import type { SelectedAsset } from './hooks/useImageGeneration'
import { AppIcon } from '@/components/ui/icons'

interface ImageEditModalSelectedAssetsProps {
  selectedAssets: SelectedAsset[]
  onOpenAssetPicker: () => void
  onPreviewImage: (url: string | null) => void
  onRemoveAsset: (assetId: string, assetType: string) => void
}

export default function ImageEditModalSelectedAssets({
  selectedAssets,
  onOpenAssetPicker,
  onPreviewImage,
  onRemoveAsset,
}: ImageEditModalSelectedAssetsProps) {
  const t = useTranslations('storyboard')
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-[rgba(255,255,255,0.7)]">
          {t('imageEdit.selectedAssetsLabel')} <span className="text-[rgba(255,255,255,0.5)] font-normal">({t('imageEdit.selectedAssetsCount', { count: selectedAssets.length })})</span>
        </label>
        <button
          onClick={onOpenAssetPicker}
          className="text-sm text-[var(--wuhu-neon-cyan)] hover:text-[var(--wuhu-neon-cyan)] flex items-center gap-1"
        >
          <AppIcon name="plus" className="w-4 h-4" />
          {t('imageEdit.addAsset')}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 min-h-[64px] p-2 bg-[rgba(255,255,255,0.05)] rounded-lg">
        {selectedAssets.length === 0 ? (
          <p className="text-sm text-[rgba(255,255,255,0.5)] w-full text-center py-4">{t('imageEdit.noAssets')}</p>
        ) : (
          selectedAssets.map((asset) => {
            const displayImageUrl = toDisplayImageUrl(asset.imageUrl)
            return (
              <div key={`${asset.type}-${asset.id}`} className="relative w-14 h-14 group">
                {displayImageUrl ? (
                  <MediaImageWithLoading
                    src={displayImageUrl}
                    alt={asset.name}
                    containerClassName="w-full h-full rounded-lg"
                    className="w-full h-full object-cover rounded-lg border cursor-zoom-in"
                    onClick={() => onPreviewImage(asset.imageUrl || null)}
                  />
                ) : (
                  <div className="w-full h-full bg-[rgba(255,255,255,0.05)] rounded-lg flex items-center justify-center text-[rgba(255,255,255,0.5)] text-xs">
                    {asset.type === 'character' ? (
                      <AppIcon name="user" className="h-4 w-4" />
                    ) : (
                      <AppIcon name="imageAlt" className="h-4 w-4" />
                    )}
                  </div>
                )}
                <button
                  onClick={(event) => {
                    event.stopPropagation()
                    onRemoveAsset(asset.id, asset.type)
                  }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--wuhu-neon-pink)] text-white rounded-full text-xs flex items-center justify-center hover:bg-[var(--wuhu-neon-pink)] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <AppIcon name="closeSm" className="h-3 w-3" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-[var(--bg-black/60 backdrop-blur-sm)] text-white text-xs px-1 py-0.5 rounded-b-lg truncate">
                  {asset.name}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
