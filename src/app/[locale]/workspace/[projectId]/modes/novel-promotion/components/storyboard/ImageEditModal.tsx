'use client'
import { useTranslations } from 'next-intl'
import { useState, useRef, useCallback } from 'react'
import { Character, Location } from '@/types/project'
import { useProjectAssets } from '@/lib/query/hooks/useProjectAssets'
import { SelectedAsset } from './hooks/useImageGeneration'
import ImagePreviewModal from '@/components/ui/ImagePreviewModal'
import { MediaImageWithLoading } from '@/components/media/MediaImageWithLoading'
import ImageEditModalSelectedAssets from './ImageEditModalSelectedAssets'
import ImageEditModalAssetPicker from './ImageEditModalAssetPicker'
import { AppIcon } from '@/components/ui/icons'

interface ImageEditModalProps {
  projectId: string
  defaultAssets: SelectedAsset[]
  onSubmit: (prompt: string, images: string[], assets: SelectedAsset[]) => void
  onClose: () => void
}

export default function ImageEditModal({
  projectId,
  defaultAssets,
  onSubmit,
  onClose,
}: ImageEditModalProps) {
  const t = useTranslations('storyboard')

  const { data: assets } = useProjectAssets(projectId)
  const characters: Character[] = assets?.characters ?? []
  const locations: Location[] = assets?.locations ?? []

  const [editPrompt, setEditPrompt] = useState('')
  const [editImages, setEditImages] = useState<string[]>([])
  const [selectedAssets, setSelectedAssets] = useState<SelectedAsset[]>(defaultAssets)
  const [showAssetPicker, setShowAssetPicker] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = (readerEvent) => {
        const base64 = readerEvent.target?.result as string
        setEditImages((previous) => [...previous, base64])
      }
      reader.readAsDataURL(file)
    })

    event.target.value = ''
  }, [])

  const handlePaste = useCallback((event: React.ClipboardEvent) => {
    const items = event.clipboardData.items
    for (let index = 0; index < items.length; index++) {
      if (items[index].type.startsWith('image/')) {
        const file = items[index].getAsFile()
        if (file) {
          const reader = new FileReader()
          reader.onload = (readerEvent) => {
            const base64 = readerEvent.target?.result as string
            setEditImages((previous) => [...previous, base64])
          }
          reader.readAsDataURL(file)
        }
      }
    }
  }, [])

  const removeImage = (index: number) => {
    setEditImages((previous) => previous.filter((_, imageIndex) => imageIndex !== index))
  }

  const handleAddAsset = (asset: SelectedAsset) => {
    setSelectedAssets((previous) => {
      if (previous.some((item) => item.id === asset.id && item.type === asset.type)) return previous
      return [...previous, asset]
    })
  }

  const handleRemoveAsset = (assetId: string, assetType: string) => {
    setSelectedAssets((previous) => previous.filter((item) => !(item.id === assetId && item.type === assetType)))
  }

  const handleSubmit = () => {
    if (!editPrompt.trim()) {
      alert(t('prompts.enterInstruction'))
      return
    }
    onSubmit(editPrompt, editImages, selectedAssets)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_50px_rgba(167,87,255,0.3)] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onPaste={handlePaste}
      >
        <div className="p-6 border-b border-[var(--wuhu-neon-purple)]/20">
          <h3 className="text-lg font-bold text-white">{t('imageEdit.title')}</h3>
          <p className="text-sm text-white/50 mt-1">{t('imageEdit.subtitle')}</p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">{t('prompts.aiInstruction')}</label>
            <textarea
              value={editPrompt}
              onChange={(event) => setEditPrompt(event.target.value)}
              placeholder={t('imageEdit.promptPlaceholder')}
              className="w-full h-24 px-3 py-2 border border-white/20 bg-[var(--wuhu-bg-surface)] text-white rounded-lg focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_15px_rgba(255,100,200,0.3)] resize-none placeholder:text-white/30"
              autoFocus
            />
          </div>

          <ImageEditModalSelectedAssets
            selectedAssets={selectedAssets}
            onOpenAssetPicker={() => setShowAssetPicker(true)}
            onPreviewImage={setPreviewImage}
            onRemoveAsset={handleRemoveAsset}
          />

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              {t('imageEdit.referenceImagesLabel')} <span className="text-white/50 font-normal">{t('imageEdit.referenceImagesHint')}</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
            <div className="flex flex-wrap gap-2">
              {editImages.map((image, index) => (
                <div key={index} className="relative w-16 h-16">
                  <MediaImageWithLoading
                    src={image}
                    alt=""
                    containerClassName="w-full h-full rounded-lg"
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <AppIcon name="closeSm" className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-16 h-16 border-2 border-dashed border-white/20 rounded-lg flex items-center justify-center text-white/50 hover:border-[var(--wuhu-neon-purple)] hover:text-[var(--wuhu-neon-purple)] transition-colors"
              >
                <AppIcon name="plus" className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-[var(--wuhu-neon-purple)]/20 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-white/70 border border-white/20 rounded-lg hover:border-[var(--wuhu-neon-pink)] hover:text-white hover:bg-white/10 transition-all"
          >
            {t('candidate.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!editPrompt.trim()}
            className="px-4 py-2 bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white rounded-lg shadow-[0_0_15px_rgba(167,87,255,0.4)] hover:shadow-[0_0_25px_rgba(167,87,255,0.6)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {t('imageEdit.start')}
          </button>
        </div>
      </div>

      <ImageEditModalAssetPicker
        isOpen={showAssetPicker}
        characters={characters}
        locations={locations}
        selectedAssets={selectedAssets}
        onClose={() => setShowAssetPicker(false)}
        onAddAsset={handleAddAsset}
        onRemoveAsset={handleRemoveAsset}
        onPreviewImage={setPreviewImage}
      />

      {previewImage && (
        <ImagePreviewModal
          imageUrl={previewImage}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  )
}
