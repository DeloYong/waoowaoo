'use client'
import { useTranslations } from 'next-intl'
import { MediaImageWithLoading } from '@/components/media/MediaImageWithLoading'

/**
 * 图片编辑弹窗 - 统一的 AI 修图组件
 * 支持角色和场景图片的 AI 编辑
 */

import { useState, useRef } from 'react'
import { AppIcon } from '@/components/ui/icons'

interface ImageEditModalProps {
    type: 'character' | 'location'
    name: string
    onClose: () => void
    onConfirm: (modifyPrompt: string, extraImageUrls?: string[]) => void
}

export default function ImageEditModal({
    type,
    name,
    onClose,
    onConfirm
}: ImageEditModalProps) {
    const t = useTranslations('assets')
    const [modifyPrompt, setModifyPrompt] = useState('')
    const [editImages, setEditImages] = useState<string[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)

    const title = type === 'character' ? t('imageEdit.editCharacterImage') : t('imageEdit.editLocationImage')
    const subtitle = type === 'character'
        ? t('imageEdit.characterLabel', { name })
        : t('imageEdit.locationLabel', { name })

    const handleSubmit = () => {
        if (!modifyPrompt.trim()) {
            alert(t('modal.designInstruction'))
            return
        }
        onConfirm(modifyPrompt, editImages.length > 0 ? editImages : undefined)
    }

    // 处理粘贴事件
    const handlePaste = async (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items
        if (!items) return

        for (const item of Array.from(items)) {
            if (item.type.startsWith('image/')) {
                e.preventDefault()
                const file = item.getAsFile()
                if (file) {
                    const reader = new FileReader()
                    reader.onload = (e) => {
                        const base64 = e.target?.result as string
                        setEditImages(prev => [...prev, base64])
                    }
                    reader.readAsDataURL(file)
                }
            }
        }
    }

    // 处理文件上传
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files) return

        Array.from(files).forEach(file => {
            const reader = new FileReader()
            reader.onload = (e) => {
                const base64 = e.target?.result as string
                setEditImages(prev => [...prev, base64])
            }
            reader.readAsDataURL(file)
        })

        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const removeImage = (index: number) => {
        setEditImages(prev => prev.filter((_, i) => i !== index))
    }

    return (
        <div className="fixed inset-0 bg-[var(--bg-black/60 backdrop-blur-sm)] z-50 flex items-center justify-center p-4">
            <div
                className="bg-[var(--wuhu-bg-surface)] rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                onPaste={handlePaste}
            >
                <div className="p-6 border-b">
                    <h3 className="text-lg font-bold text-[white]">{title}</h3>
                    <p className="text-sm text-[rgba(255,255,255,0.5)] mt-1">{subtitle} · {t('imageEdit.subtitle')}</p>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[rgba(255,255,255,0.7)] mb-2">{t('imageEdit.editInstruction')}</label>
                        <textarea
                            value={modifyPrompt}
                            onChange={(e) => setModifyPrompt(e.target.value)}
                            placeholder={type === 'character'
                                ? t('imageEdit.characterPlaceholder')
                                : t('imageEdit.locationPlaceholder')
                            }
                            className="w-full h-24 px-3 py-2 border border-[rgba(167, 87, 255, 0.4)] rounded-lg focus:ring-2 focus:ring-[var(--wuhu-neon-cyan)] focus:border-[var(--wuhu-neon-cyan)] resize-none"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[rgba(255,255,255,0.7)] mb-2">
                            {t('imageEdit.referenceImages')} <span className="text-[rgba(255,255,255,0.5)] font-normal">{t('imageEdit.referenceImagesHint')}</span>
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
                            {editImages.map((img, idx) => (
                                <div key={idx} className="relative w-16 h-16">
                                    <MediaImageWithLoading
                                        src={img}
                                        alt=""
                                        containerClassName="w-full h-full rounded-lg"
                                        className="w-full h-full object-cover rounded-lg"
                                    />
                                    <button
                                        onClick={() => removeImage(idx)}
                                        className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--wuhu-neon-pink)] text-white rounded-full text-xs flex items-center justify-center hover:bg-[var(--wuhu-neon-pink)]"
                                    >
                                        <AppIcon name="closeSm" className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-16 h-16 border-2 border-dashed border-[rgba(167, 87, 255, 0.4)] rounded-lg flex items-center justify-center text-[rgba(255,255,255,0.5)] hover:border-[var(--wuhu-neon-cyan)] hover:text-[var(--wuhu-neon-cyan)] transition-colors"
                            >
                                <AppIcon name="plus" className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                </div>
                <div className="p-6 border-t flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-[rgba(255,255,255,0.7)] hover:bg-[rgba(255,255,255,0.05)] rounded-lg transition-colors"
                    >
                        {t("common.cancel")}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!modifyPrompt.trim()}
                        className="px-4 py-2 bg-[var(--wuhu-neon-purple)] text-white rounded-lg hover:bg-[var(--wuhu-neon-pink)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {t('imageEdit.startEditing')}
                    </button>
                </div>
            </div>
        </div>
    )
}
