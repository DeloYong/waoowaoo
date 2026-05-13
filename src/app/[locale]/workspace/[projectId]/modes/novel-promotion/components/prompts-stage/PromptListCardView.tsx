import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'
import TaskStatusOverlay from '@/components/task/TaskStatusOverlay'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import { resolveTaskPresentationState } from '@/lib/task/presentation'
import { MediaImageWithLoading } from '@/components/media/MediaImageWithLoading'
import {
  parseImagePrompt,
  type LocationAssetWithImages,
  type PromptStageRuntime,
} from './hooks/usePromptStageActions'

interface PromptListCardViewProps {
  runtime: PromptStageRuntime
}
export default function PromptListCardView({ runtime }: PromptListCardViewProps) {
  const t = useTranslations('storyboard')
  const tCommon = useTranslations('common')

  const {
    shots,
    onGenerateImage,
    isBatchSubmitting,
    assetLibraryCharacters,
    assetLibraryLocations,
    styleLabel,
    editingPrompt,
    editValue,
    aiModifyInstruction,
    selectedAssets,
    showAssetPicker,
    aiModifyingShots,
    textareaRef,
    shotExtraAssets,
    getGenerateButtonToneClass,
    getShotRunningState,
    isShotTaskRunning,
    handleStartEdit,
    handleSaveEdit,
    handleCancelEdit,
    handleModifyInstructionChange,
    handleSelectAsset,
    handleAiModify,
    handleEditValueChange,
    handleRemoveSelectedAsset,
    setPreviewImage,
  } = runtime

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {shots.map((shot) => {
        const shotRunningState = getShotRunningState(shot)
        const isEditing = editingPrompt?.shotId === shot.id && editingPrompt?.field === 'imagePrompt'
        const promptContent = shot.imagePrompt ? parseImagePrompt(shot.imagePrompt).content : ''

        return (
          <div key={shot.id} className="card-base overflow-hidden">
            <div className="aspect-video bg-[rgba(255,255,255,0.05)] flex items-center justify-center relative">
              {shot.imageUrl ? (
                <MediaImageWithLoading
                  src={shot.imageUrl}
                  alt={`${t('panel.shot')}${shot.shotId}`}
                  containerClassName="w-full h-full"
                  className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setPreviewImage(shot.imageUrl)}
                />
              ) : (
                <AppIcon name="video" className="w-16 h-16 text-[rgba(255,255,255,0.5)]" />
              )}
              <div className="absolute top-2 left-2 bg-[var(--bg-black/60 backdrop-blur-sm)] text-white px-2 py-1 rounded text-xs font-medium">
                #{shot.shotId}
              </div>
              {shot.imageUrl && (
                <button
                  onClick={(event) => {
                    event.stopPropagation()
                    onGenerateImage(shot.id, shotExtraAssets[shot.id])
                  }}
                  disabled={isBatchSubmitting}
                  className="absolute top-2 right-2 bg-[var(--bg-black/60 backdrop-blur-sm)] hover:bg-[white] text-white p-2 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed z-10"
                  title={t('panel.regenerateImage')}
                >
                  <AppIcon name="refresh" className="w-4 h-4" />
                </button>
              )}
              {isShotTaskRunning(shot) && <TaskStatusOverlay state={shotRunningState} />}
            </div>

            <div className="p-5 space-y-4">
              {shot.imagePrompt && (
                <div className="space-y-2 border-b pb-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[rgba(0, 255, 255, 0.1)] text-[var(--wuhu-neon-cyan)] rounded-md text-sm font-medium">
                      <AppIcon name="imageEdit" className="w-4 h-4" />
                      {styleLabel}
                    </span>
                  </div>

                  <div className="text-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-[white] text-base">{t('prompts.imagePrompt')}</span>
                      {!isEditing && (
                        <button
                          onClick={() => handleStartEdit(shot.id, 'imagePrompt', shot.imagePrompt || '')}
                          className="text-[var(--wuhu-neon-cyan)] hover:text-[white] p-1.5 hover:bg-[rgba(0, 255, 255, 0.1)] rounded transition-colors"
                          title={t('prompts.imagePrompt')}
                        >
                          <AppIcon name="edit" className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-[rgba(255,255,255,0.7)] mb-1">{t('prompts.currentPrompt')}</label>
                          <textarea
                            value={editValue}
                            onChange={(event) => handleEditValueChange(event.target.value)}
                            className="w-full px-3 py-2 border border-[rgba(167, 87, 255, 0.4)] rounded-lg focus:ring-2 focus:ring-[var(--wuhu-neon-cyan)] focus:border-[var(--wuhu-neon-cyan)] text-sm resize-none"
                            rows={4}
                            autoFocus
                          />
                        </div>

                        <div className="border-t pt-3">
                          <label className="block text-xs font-medium text-[rgba(255,255,255,0.7)] mb-1">
                            {t('prompts.aiInstruction')} <span className="text-[rgba(255,255,255,0.5)]">{t('prompts.supportReference')}</span>
                          </label>
                          <div className="relative">
                            <textarea
                              ref={textareaRef}
                              value={aiModifyInstruction}
                              onChange={(event) => handleModifyInstructionChange(event.target.value)}
                              placeholder={t('prompts.instructionPlaceholder')}
                              className="w-full px-3 py-2 border border-[rgba(167, 87, 255, 0.4)] rounded-lg focus:ring-2 focus:ring-[var(--wuhu-neon-cyan)] focus:border-[var(--wuhu-neon-cyan)] text-sm resize-none"
                              rows={2}
                            />

                            {showAssetPicker && (
                              <div className="absolute z-10 mt-1 w-full bg-[var(--wuhu-bg-surface)] border border-[rgba(167, 87, 255, 0.4)] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                <div className="p-2">
                                  <div className="text-xs font-medium text-[rgba(255,255,255,0.5)] mb-2">{t('prompts.selectAsset')}</div>

                                  {assetLibraryCharacters.length > 0 && (
                                    <div className="mb-2">
                                      <div className="text-xs text-[rgba(255,255,255,0.5)] mb-1">{t('prompts.character')}</div>
                                      {assetLibraryCharacters.map((character) => (
                                        <button
                                          key={character.id}
                                          onClick={() => handleSelectAsset({ id: character.id, name: character.name, description: character.description, type: 'character' })}
                                          className="w-full text-left px-2 py-1.5 hover:bg-[rgba(0, 255, 255, 0.1)] rounded text-sm"
                                        >
                                          {character.name}
                                        </button>
                                      ))}
                                    </div>
                                  )}

                                  {assetLibraryLocations.length > 0 && (
                                    <div>
                                      <div className="text-xs text-[rgba(255,255,255,0.5)] mb-1">{t('prompts.location')}</div>
                                      {assetLibraryLocations.map((location) => {
                                        const locationAsset = location as LocationAssetWithImages
                                        const selectedImage = locationAsset.selectedImageId
                                          ? locationAsset.images?.find((image) => image.id === locationAsset.selectedImageId)
                                          : locationAsset.images?.find((image) => image.isSelected) || locationAsset.images?.find((image) => image.imageUrl) || locationAsset.images?.[0]
                                        const description = selectedImage?.description || locationAsset.description || ''

                                        return (
                                          <button
                                            key={location.id}
                                            onClick={() => handleSelectAsset({ id: location.id, name: location.name, description, type: 'location' })}
                                            className="w-full text-left px-2 py-1.5 hover:bg-[rgba(0, 255, 255, 0.1)] rounded text-sm"
                                          >
                                            {location.name}
                                          </button>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {selectedAssets.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3 p-2.5 bg-[rgba(255,255,255,0.05)]/50 rounded-lg border border-[rgba(167, 87, 255, 0.2)]">
                              <div className="text-xs text-[rgba(255,255,255,0.5)] font-medium w-full mb-1">{t('prompts.referencedAssets')}</div>
                              {selectedAssets.map((asset, index) => (
                                <span
                                  key={asset.id}
                                  className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${asset.type === 'character'
                                    ? 'bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.7)] border border-[rgba(167, 87, 255, 0.4)] hover:bg-[rgba(255,255,255,0.05)] hover:border-[var(--wuhu-neon-cyan)]'
                                    : 'bg-[rgba(0, 255, 255, 0.1)] text-[var(--wuhu-neon-cyan)] border border-[var(--wuhu-neon-cyan)] hover:bg-[rgba(0, 255, 255, 0.1)] hover:border-[var(--wuhu-neon-cyan)]'
                                    }`}
                                >
                                  <span>{asset.name}</span>
                                  <button
                                    onClick={() => handleRemoveSelectedAsset(index, asset.name)}
                                    className="ml-0.5 hover:bg-[var(--wuhu-bg-surface)] rounded p-0.5 transition-colors"
                                    title={t('prompts.removeAsset')}
                                  >
                                    <AppIcon name="closeSolid" className="w-3 h-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}

                          <button
                            onClick={handleAiModify}
                            disabled={editingPrompt ? aiModifyingShots.has(editingPrompt.shotId) || !aiModifyInstruction.trim() : true}
                            className="bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_20px_rgba(167,87,255,0.3)] hover:shadow-[0_0_30px_rgba(167,87,255,0.4)] rounded-lg transition-all mt-2 w-full px-3 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            title={t('prompts.aiModifyTip')}
                          >
                            {editingPrompt && aiModifyingShots.has(editingPrompt.shotId) ? (
                              <TaskStatusInline
                                state={resolveTaskPresentationState({ phase: 'processing', intent: 'modify', resource: 'text', hasOutput: true })}
                                className="text-white [&>span]:text-white [&_svg]:text-white"
                              />
                            ) : (
                              t('prompts.aiModify')
                            )}
                          </button>
                        </div>

                        <div className="flex gap-2 pt-2 border-t">
                          <button
                            onClick={handleSaveEdit}
                            className="flex-1 px-4 py-2 bg-[var(--wuhu-neon-purple)] text-white rounded-lg text-sm font-medium hover:bg-[var(--wuhu-neon-pink)] transition-colors"
                          >
                            {t('prompts.save')}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="flex-1 px-4 py-2 bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.7)] rounded-lg text-sm font-medium hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                          >
                            {tCommon('cancel')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[rgba(255,255,255,0.7)] leading-relaxed">{promptContent}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-[rgba(255,255,255,0.5)] font-medium">SRT:</span>
                  <span className="text-[white]">{shot.srtStart}-{shot.srtEnd}</span>
                  <span className="text-[rgba(255,255,255,0.5)]">({shot.srtDuration?.toFixed(1)}s)</span>
                </div>
                {shot.scale && (
                  <div className="flex items-center gap-2">
                    <span className="text-[rgba(255,255,255,0.5)] font-medium">{t('panel.shotType')}</span>
                    <span className="text-[white]">{shot.scale}</span>
                  </div>
                )}
                {shot.locations && (
                  <div className="flex items-center gap-2">
                    <span className="text-[rgba(255,255,255,0.5)] font-medium">{t('panel.location')}</span>
                    <span className="text-[white]">{shot.locations}</span>
                  </div>
                )}
                {shot.module && (
                  <div className="flex items-center gap-2">
                    <span className="text-[rgba(255,255,255,0.5)] font-medium">{t('panel.mode')}</span>
                    <span className="text-[white]">{shot.module}</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => onGenerateImage(shot.id, shotExtraAssets[shot.id])}
                disabled={isShotTaskRunning(shot) || isBatchSubmitting}
                className={`bg-[var(--wuhu-bg-surface)] border border-white/20 hover:bg-white/5 rounded-lg transition-all w-full py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed ${getGenerateButtonToneClass(shot)}`}
              >
                {shot.imageUrl ? t('group.hasSynced') : isShotTaskRunning(shot) ? (
                  <TaskStatusInline state={shotRunningState} className="justify-center text-white [&>span]:text-white [&_svg]:text-white" />
                ) : t('assets.location.generateImage')}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
