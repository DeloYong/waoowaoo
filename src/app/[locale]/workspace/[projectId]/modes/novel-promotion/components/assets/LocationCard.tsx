'use client'

import { useTranslations } from 'next-intl'
/**
 * 场景卡片组件 - 支持多图片选择
 * 布局：上面名字+描述，下面三张图片
 */

import { useState, useRef } from 'react'
import { Location } from '@/types/project'
import { shouldShowError } from '@/lib/error-utils'
import { useUploadProjectLocationImage } from '@/lib/query/mutations'
import { resolveTaskPresentationState } from '@/lib/task/presentation'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import ImageGenerationInlineCountButton from '@/components/image-generation/ImageGenerationInlineCountButton'
import LocationCardHeader from './location-card/LocationCardHeader'
import LocationImageList from './location-card/LocationImageList'
import LocationCardActions from './location-card/LocationCardActions'
import { getImageGenerationCountOptions } from '@/lib/image-generation/count'
import { useImageGenerationCount } from '@/lib/image-generation/use-image-generation-count'
import { countGeneratedImageSlots, resolveDisplayImageSlots } from '@/lib/image-generation/slot-state'
import { AppIcon } from '@/components/ui/icons'
import { canGenerateLocationBackedAsset } from './location-backed-asset'

interface LocationCardProps {
  location: Location
  assetType?: 'location' | 'prop'
  onEdit: () => void
  onDelete: () => void
  onRegenerate: (count?: number) => void
  onGenerate: (count?: number) => void
  onUndo?: () => void  // 撤回到上一版本
  onImageClick: (imageUrl: string) => void
  onSelectImage?: (locationId: string, imageIndex: number | null) => void
  onImageEdit?: (locationId: string, imageIndex: number) => void  // 新增：图片编辑
  onCopyFromGlobal?: () => void
  onSaveToGlobal?: () => void
  isSavingToGlobal?: boolean
  activeTaskKeys?: Set<string>
  onClearTaskKey?: (key: string) => void
  projectId: string
  onConfirmSelection?: (locationId: string) => void
}

export default function LocationCard({
  location,
  assetType = 'location',
  onEdit,
  onDelete,
  onRegenerate,
  onGenerate,
  onUndo,
  onImageClick,
  onSelectImage,
  onImageEdit,
  onCopyFromGlobal,
  onSaveToGlobal,
  isSavingToGlobal = false,
  activeTaskKeys = new Set(),
  projectId,
  onConfirmSelection
}: LocationCardProps) {
  // 🔥 使用 mutation
  const uploadImage = useUploadProjectLocationImage(projectId)
  const t = useTranslations('assets')
  const assetKey = assetType === 'prop' ? 'prop' : 'location'
  const { count: generationCount, setCount: setGenerationCount } = useImageGenerationCount('location')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingUploadIndex, setPendingUploadIndex] = useState<number | undefined>(undefined)
  const [isConfirmingSelection, setIsConfirmingSelection] = useState(false)

  // 触发文件选择
  const triggerUpload = (imageIndex?: number) => {
    setPendingUploadIndex(imageIndex)
    fileInputRef.current?.click()
  }

  // 处理图片上传
  const handleUpload = () => {
    const file = fileInputRef.current?.files?.[0]
    if (!file) return

    const uploadIndex = pendingUploadIndex

    uploadImage.mutate(
      {
        file,
        locationId: location.id,
        imageIndex: uploadIndex,
        labelText: location.name
      },
      {
        onSuccess: () => {
          alert(t('image.uploadSuccess'))
        },
        onError: (error) => {
          if (shouldShowError(error)) {
            alert(t('image.uploadFailedError', { error: error.message }))
          }
        },
        onSettled: () => {
          setPendingUploadIndex(undefined)
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
        }
      }
    )
  }

  const orderedImages = [...(location.images || [])].sort((left, right) => left.imageIndex - right.imageIndex)
  const imagesWithUrl = orderedImages.filter((img) => img.imageUrl)
  const generatedImageCount = countGeneratedImageSlots(orderedImages)

  // 获取选中的图片
  const selectedImage = location.selectedImageId
    ? orderedImages.find((img) => img.id === location.selectedImageId)
    : orderedImages.find((img) => img.isSelected)
  const selectedIndex = selectedImage?.imageIndex ?? null

  // 当前显示的图片及其 imageIndex
  const currentImageUrl = selectedImage?.imageUrl || imagesWithUrl[0]?.imageUrl || null
  const currentImageIndex = selectedIndex ?? imagesWithUrl[0]?.imageIndex ?? 0

  const isImageTaskRunning = (imageIndex: number) => {
    return activeTaskKeys.has(`location-${location.id}-${imageIndex}`)
  }

  const isGroupTaskRunning = activeTaskKeys.has(`location-${location.id}-group`)

  const isAnyTaskRunning = isGroupTaskRunning || Array.from(activeTaskKeys).some(key =>
    key.startsWith(`location-${location.id}`)
  )

  const locationTaskRunning = (location.images || []).some((image) => !!image.imageTaskRunning)
  const locationTaskPresentation = locationTaskRunning
    ? resolveTaskPresentationState({
      phase: 'processing',
      intent: currentImageUrl ? 'regenerate' : 'generate',
      resource: 'image',
      hasOutput: !!currentImageUrl,
    })
    : null
  const fallbackRunningPresentation = isAnyTaskRunning
    ? resolveTaskPresentationState({
      phase: 'processing',
      intent: 'regenerate',
      resource: 'image',
      hasOutput: !!currentImageUrl,
    })
    : null
  const displayTaskPresentation = locationTaskPresentation || fallbackRunningPresentation
  const confirmingSelectionState = isConfirmingSelection
    ? resolveTaskPresentationState({
      phase: 'processing',
      intent: 'process',
      resource: 'image',
      hasOutput: !!currentImageUrl,
    })
    : null
  const uploadPendingState = uploadImage.isPending
    ? resolveTaskPresentationState({
      phase: 'processing',
      intent: 'process',
      resource: 'image',
      hasOutput: !!currentImageUrl,
    })
    : null

  // 统一任务态 + 前端瞬时提交态
  const isTaskRunning =
    locationTaskRunning ||
    isAnyTaskRunning

  const displaySelectionImages = resolveDisplayImageSlots(orderedImages, {
    hasRunningTask: isTaskRunning,
    requestedCount: generatedImageCount > 1 ? generatedImageCount : generationCount,
  })
  const displaySlotCount = displaySelectionImages.length
  const hasMultipleImages = generatedImageCount > 1

  // 检查是否有历史版本（用于撤回功能）
  const hasPreviousVersion = location.images?.some(img => img.previousImageUrl) || false

  const showSelectionMode = displaySlotCount > 1

  // 选择模式：显示名字在上，三张图片在下
  if (showSelectionMode) {
    const selectionStatusText = isTaskRunning || generatedImageCount < displaySlotCount
      ? t('image.generatedProgress', { generated: generatedImageCount, total: displaySlotCount })
      : selectedIndex !== null
        ? t('image.optionSelected', { number: selectedIndex + 1 })
        : t('image.selectFirst')

    const selectionHeaderActions = (
      <>
        {onCopyFromGlobal && (
          <button
            onClick={onCopyFromGlobal}
            className="w-6 h-6 rounded hover:bg-[rgba(0, 255, 255, 0.1)] flex items-center justify-center transition-colors"
            title={t('character.copyFromGlobal')}
          >
            <AppIcon name="copy" className="w-4 h-4 text-[var(--wuhu-neon-cyan)]" />
          </button>
        )}
        {onSaveToGlobal && (
          <button
            onClick={onSaveToGlobal}
            disabled={isSavingToGlobal}
            className="w-6 h-6 rounded hover:bg-[rgba(167, 87, 255, 0.2)] flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={t('character.saveToGlobal')}
          >
            <AppIcon name={isSavingToGlobal ? "loader" : "upload"} className={`w-4 h-4 text-[var(--wuhu-neon-purple)] ${isSavingToGlobal ? "animate-spin" : ""}`} />
          </button>
        )}
        <ImageGenerationInlineCountButton
          prefix={isGroupTaskRunning ? (
            <>
              <TaskStatusInline state={displayTaskPresentation} className="[&_span]:sr-only [&_svg]:text-[var(--wuhu-neon-cyan)]" />
              <span className="text-[10px] font-medium text-[var(--wuhu-neon-cyan)] ml-0.5">{t('image.regenCountPrefix')}</span>
            </>
          ) : (
            <>
              <AppIcon name="refresh" className="w-4 h-4 text-[var(--wuhu-neon-cyan)]" />
              <span className="text-[10px] font-medium text-[var(--wuhu-neon-cyan)] ml-0.5">{t('image.regenCountPrefix')}</span>
            </>
          )}
          value={generationCount}
          options={getImageGenerationCountOptions('location')}
          onValueChange={setGenerationCount}
          onClick={() => onRegenerate(generatedImageCount)}
          disabled={isTaskRunning || isAnyTaskRunning || uploadImage.isPending}
          showCountControl={false}
          ariaLabel={t('image.regenCountPrefix')}
          className="inline-flex h-6 items-center justify-center rounded-md px-1.5 hover:bg-[rgba(0, 255, 255, 0.1)] transition-colors disabled:opacity-50"
        />
        {onUndo && hasPreviousVersion && (
          <button
            onClick={onUndo}
            disabled={isTaskRunning || isAnyTaskRunning}
            className="w-6 h-6 rounded hover:bg-[rgba(255, 100, 200, 0.1)] flex items-center justify-center transition-colors disabled:opacity-50"
            title={t('image.undo')}
          >
            <AppIcon name="undo" className="w-4 h-4 text-[var(--wuhu-neon-pink)]" />
          </button>
        )}
        <button
          onClick={onDelete}
          className="w-6 h-6 rounded hover:bg-[rgba(255, 100, 200, 0.1)] flex items-center justify-center transition-colors"
          title={t(`${assetKey}.delete`)}
        >
          <AppIcon name="trash" className="w-4 h-4 text-[var(--wuhu-neon-pink)]" />
        </button>
      </>
    )

    return (
      <div className="col-span-3 bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/20 rounded-xl transition-all duration-300 hover:border-[var(--wuhu-neon-pink)] hover:shadow-[0_0_25px_rgba(255,100,200,0.25)] p-4 transition-all">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={() => handleUpload()}
          className="hidden"
        />
        <LocationCardHeader
          mode="selection"
          locationName={location.name}
          summary={location.summary}
          selectedIndex={selectedIndex}
          statusText={selectionStatusText}
          actions={selectionHeaderActions}
        />

        <LocationImageList
          mode="selection"
          locationId={location.id}
          locationName={location.name}
          images={displaySelectionImages}
          selectedImageId={location.selectedImageId}
          selectedIndex={selectedIndex}
          isGroupTaskRunning={isGroupTaskRunning}
          isImageTaskRunning={isImageTaskRunning}
          displayTaskPresentation={displayTaskPresentation}
          onImageClick={onImageClick}
          onSelectImage={onSelectImage}
        />

        <LocationCardActions
          mode="selection"
          selectedIndex={selectedIndex}
          isConfirmingSelection={isConfirmingSelection}
          confirmingSelectionState={confirmingSelectionState}
          onConfirmSelection={selectedIndex !== null && onConfirmSelection
            ? () => {
              setIsConfirmingSelection(true)
              onConfirmSelection(location.id)
            }
            : undefined}
        />
      </div>
    )
  }

  // 单图模式
  const singleOverlayActions = (
    <>
      <button
        onClick={() => triggerUpload(selectedIndex !== null ? selectedIndex : 0)}
        disabled={uploadImage.isPending || isTaskRunning || isAnyTaskRunning}
        className="w-7 h-7 rounded-full bg-[var(--wuhu-bg-surface)] hover:bg-[var(--wuhu-neon-purple)] hover:text-white flex items-center justify-center transition-all shadow-sm disabled:opacity-50"
        title={currentImageUrl ? t('image.uploadReplace') : t('image.upload')}
      >
        {uploadImage.isPending ? (
          <TaskStatusInline state={uploadPendingState} className="[&_span]:sr-only [&_svg]:text-current" />
        ) : (
          <AppIcon name="upload" className="w-4 h-4 text-[var(--wuhu-neon-purple)]" />
        )}
      </button>
      {!isTaskRunning && currentImageUrl && onImageEdit && (
        <button
          onClick={() => onImageEdit(location.id, currentImageIndex)}
          className="w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-sm"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          title={t('image.edit')}
        >
          <AppIcon name="edit" className="w-4 h-4 text-white" />
        </button>
      )}
      <button
        onClick={() => onRegenerate()}
        disabled={uploadImage.isPending || isTaskRunning}
        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-sm active:scale-90 ${isTaskRunning
          ? 'bg-[var(--wuhu-neon-purple)] hover:bg-[var(--wuhu-neon-purple)]'
          : 'bg-[var(--wuhu-bg-surface)] hover:bg-[var(--wuhu-bg-surface)]'
          }`}
        title={isTaskRunning ? t('image.regenerateStuck') : t(`${assetKey}.regenerateImage`)}
      >
        {isGroupTaskRunning ? (
          <TaskStatusInline state={displayTaskPresentation} className="[&_span]:sr-only [&_svg]:text-white" />
        ) : (
          <AppIcon name="refresh" className={`w-4 h-4 ${isTaskRunning ? 'text-white' : 'text-[rgba(255,255,255,0.7)]'}`} />
        )}
      </button>
      {!isTaskRunning && currentImageUrl && onUndo && hasPreviousVersion && (
        <button
          onClick={onUndo}
          disabled={isTaskRunning || isAnyTaskRunning}
          className="w-7 h-7 rounded-full bg-[var(--wuhu-bg-surface)] hover:bg-[var(--wuhu-neon-pink)] hover:text-white flex items-center justify-center transition-all shadow-sm disabled:opacity-50"
          title={t('image.undo')}
        >
          <AppIcon name="undo" className="w-4 h-4 text-[var(--wuhu-neon-pink)] hover:text-white" />
        </button>
      )}
    </>
  )

  const compactHeaderActions = (
    <>
      {onCopyFromGlobal && (
          <button
            onClick={onCopyFromGlobal}
          className="text-xs text-[var(--wuhu-neon-cyan)] hover:text-[var(--wuhu-neon-cyan)] flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-[rgba(0, 255, 255, 0.1)] transition-colors flex-shrink-0"
          title={t('character.copyFromGlobal')}
        >
          <AppIcon name="copy" className="w-4 h-4" />
          <span>{t('character.copyFromGlobal')}</span>
        </button>
      )}
      {onSaveToGlobal && (
          <button
            onClick={onSaveToGlobal}
            disabled={isSavingToGlobal}
          className="text-xs text-[var(--wuhu-neon-purple)] hover:text-[var(--wuhu-neon-purple)] flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-[rgba(167, 87, 255, 0.2)] transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          title={t('character.saveToGlobal')}
        >
          <AppIcon name={isSavingToGlobal ? "loader" : "upload"} className={`w-4 h-4 ${isSavingToGlobal ? "animate-spin" : ""}`} />
          <span>{t('character.saveToGlobal')}</span>
        </button>
      )}
        <button
          onClick={onEdit}
        className="flex-shrink-0 w-5 h-5 rounded hover:bg-[rgba(255,255,255,0.05)] flex items-center justify-center transition-colors"
          title={t(`${assetKey}.edit`)}
      >
        <AppIcon name="edit" className="w-3.5 h-3.5 text-[rgba(255,255,255,0.7)]" />
      </button>
        <button
          onClick={onDelete}
        className="flex-shrink-0 w-5 h-5 rounded hover:bg-[rgba(255, 100, 200, 0.1)] flex items-center justify-center transition-colors"
          title={t(`${assetKey}.delete`)}
      >
        <AppIcon name="trash" className="w-3.5 h-3.5 text-[var(--wuhu-neon-pink)]" />
      </button>
    </>
  )

  const firstImage = location.images?.[0]
  const canGenerate = canGenerateLocationBackedAsset(location)

  return (
    <div className="flex flex-col gap-2 bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/20 rounded-xl transition-all duration-300 hover:border-[var(--wuhu-neon-pink)] hover:shadow-[0_0_25px_rgba(255,100,200,0.25)] p-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={() => handleUpload()}
        className="hidden"
      />
      <div className="relative">
        <LocationImageList
          mode="single"
          locationName={location.name}
          currentImageUrl={currentImageUrl}
          selectedIndex={selectedIndex}
          hasMultipleImages={hasMultipleImages}
          isTaskRunning={isTaskRunning}
          displayTaskPresentation={displayTaskPresentation}
          imageErrorMessage={firstImage?.lastError?.message || firstImage?.imageErrorMessage}
          onImageClick={onImageClick}
          overlayActions={singleOverlayActions}
        />
      </div>

      <LocationCardHeader
        mode="compact"
        locationName={location.name}
        summary={location.summary}
        actions={compactHeaderActions}
      />

      <LocationCardActions
        mode="compact"
        currentImageUrl={currentImageUrl}
        isTaskRunning={isTaskRunning}
        canGenerate={canGenerate}
        generationCount={generationCount}
        onGenerationCountChange={setGenerationCount}
        onGenerate={onGenerate}
      />
    </div>
  )
}
