'use client'

import { useTranslations } from 'next-intl'
import { VideoPanel } from './types'
import { AppIcon } from '@/components/ui/icons'

interface VideoPromptModalProps {
  panel: VideoPanel | undefined
  panelIndex: number
  editValue: string
  onEditValueChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
}

export default function VideoPromptModal({
  panel,
  panelIndex,
  editValue,
  onEditValueChange,
  onSave,
  onCancel
}: VideoPromptModalProps) {
  const t = useTranslations('video')
  if (!panel) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onCancel}>
      <div className="bg-[var(--wuhu-bg-card)] rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* 标题栏 */}
        <div className="sticky top-0 bg-[var(--wuhu-bg-card)] border-b px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">{t('promptModal.title', { number: panelIndex + 1 })}</h3>
          <button onClick={onCancel} className="text-white/50 hover:text-white/70">
            <AppIcon name="close" className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* 镜头信息 */}
          <div className="p-3 bg-[var(--wuhu-bg-surface)] rounded-lg text-sm space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-white/50">{t('promptModal.shotType')}</span>
              <span className="px-2 py-0.5 bg-[var(--wuhu-neon-purple)]/20 text-[var(--wuhu-neon-purple)] rounded">{panel.textPanel?.shot_type}</span>
              {panel.textPanel?.camera_move && (
                <span className="px-2 py-0.5 bg-[var(--wuhu-neon-pink)]/20 text-[var(--wuhu-neon-pink)] rounded">{panel.textPanel.camera_move}</span>
              )}
              {panel.textPanel?.duration && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--wuhu-bg-surface)] text-white/70 rounded">
                  <AppIcon name="clock" className="w-3 h-3" />
                  {panel.textPanel.duration}
                  {t('promptModal.duration')}
                </span>
              )}
            </div>
            <div><span className="text-white/50">{t('promptModal.location')}</span>{panel.textPanel?.location || t('promptModal.locationUnknown')}</div>
            <div><span className="text-white/50">{t('promptModal.characters')}</span>{panel.textPanel?.characters?.join('、') || t('promptModal.charactersNone')}</div>
            <div><span className="text-white/50">{t('promptModal.description')}</span>{panel.textPanel?.description}</div>
            {panel.textPanel?.text_segment && (
              <div className="border-t pt-2 mt-2">
                <span className="text-white/50">{t('promptModal.text')}</span>
                <span className="text-white/70 italic">&quot;{panel.textPanel.text_segment}&quot;</span>
              </div>
            )}
          </div>

          {/* 视频提示词编辑 */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              {t('promptModal.promptLabel')}
            </label>
            <textarea
              value={editValue}
              onChange={(e) => onEditValueChange(e.target.value)}
              className="w-full px-3 py-2 border border-white/20 rounded-lg focus:ring-2 focus:ring-[var(--wuhu-neon-purple)] focus:border-[var(--wuhu-neon-purple)]/50"
              rows={6}
              placeholder={t('promptModal.placeholder')}
            />
            <p className="text-xs text-white/50 mt-1">
              {t('promptModal.tip')}
            </p>
          </div>

          {/* 按钮 */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={onCancel}
              className="bg-[var(--wuhu-bg-surface)] border border-white/20 hover:bg-white/5 rounded-lg px-4 py-2 text-white/70 hover:text-white transition-all"
            >
              {t('promptModal.cancel')}
            </button>
            <button
              onClick={onSave}
              className="bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] rounded-lg px-4 py-2 text-white shadow-[0_0_20px_rgba(167,87,255,0.3)] hover:shadow-[0_0_30px_rgba(167,87,255,0.4)] transition-all"
            >
              {t('promptModal.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
