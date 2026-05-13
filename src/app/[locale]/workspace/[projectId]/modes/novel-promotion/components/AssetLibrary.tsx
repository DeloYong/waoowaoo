'use client'

/**
 * 资产库 - 全局浮动按钮,打开后显示完整的资产管理界面
 * 复用AssetsStage组件,保持功能完全一致
 * 
 * 🔥 V6.5 重构：删除 characters/locations props，AssetsStage 现在内部直接订阅
 * 🔥 V6.6 重构：删除 onGenerateImage prop，AssetsStage 现在内部使用 mutation hooks
 */

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import AssetsStage from './AssetsStage'
import { AppIcon } from '@/components/ui/icons'
import { useAssets } from '@/lib/query/hooks'
import JSZip from 'jszip'
import { logError as _logError } from '@/lib/logging/core'

interface AssetLibraryProps {
  projectId: string
  isAnalyzingAssets: boolean
}

export default function AssetLibrary({
  projectId,
  isAnalyzingAssets
}: AssetLibraryProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const t = useTranslations('assets')

  // 获取项目资产数据用于下载
  const { data: assets = [] } = useAssets({
    scope: 'project',
    projectId,
  })

  const handleDownloadAll = async () => {
    // 收集所有有效图片
    const imageEntries: Array<{ filename: string; url: string }> = []

    // 角色图片
    for (const asset of assets) {
      if (asset.kind !== 'character') continue
      for (const variant of asset.variants) {
        const selectedRender = variant.renders.find((render) => render.isSelected) ?? variant.renders[0]
        const url = selectedRender?.imageUrl
        if (!url) continue
        const safeName = asset.name.replace(/[/\\:*?"<>|]/g, '_')
        const filename = variant.index === 0
          ? `characters/${safeName}.jpg`
          : `characters/${safeName}_appearance${variant.index}.jpg`
        imageEntries.push({ filename, url })
      }
    }

    // 场景图片：取已选中的那张
    for (const asset of assets) {
      if (asset.kind !== 'location') continue
      const selectedVariant = asset.variants.find((variant) => variant.renders[0]?.isSelected) ?? asset.variants[0]
      const url = selectedVariant?.renders[0]?.imageUrl
      if (!url) continue
      const safeName = asset.name.replace(/[/\\:*?"<>|]/g, '_')
      imageEntries.push({ filename: `locations/${safeName}.jpg`, url })
    }

    for (const asset of assets) {
      if (asset.kind !== 'prop') continue
      const selectedVariant = asset.variants.find((variant) => variant.renders[0]?.isSelected) ?? asset.variants[0]
      const url = selectedVariant?.renders[0]?.imageUrl
      if (!url) continue
      const safeName = asset.name.replace(/[/\\:*?"<>|]/g, '_')
      imageEntries.push({ filename: `props/${safeName}.jpg`, url })
    }

    if (imageEntries.length === 0) {
      alert(t('assetLibrary.downloadEmpty'))
      return
    }

    setIsDownloading(true)
    try {
      const zip = new JSZip()
      await Promise.all(
        imageEntries.map(async ({ filename, url }) => {
          try {
            const response = await fetch(url)
            if (!response.ok) return
            const blob = await response.blob()
            zip.file(filename, blob)
          } catch {
            // 单张失败不影响其他
          }
        })
      )
      const content = await zip.generateAsync({ type: 'blob' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(content)
      link.download = `assets_${new Date().toISOString().slice(0, 10)}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)
    } catch (error) {
      _logError('打包下载失败:', error)
      alert(t('assetLibrary.downloadFailed'))
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <>
      {/* 触发按钮 - Wuhu 风格 */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed top-20 right-4 z-40 flex items-center gap-2 px-5 py-2.5 bg-[var(--wuhu-bg-surface)] border border-white/20 hover:bg-white/5 rounded-xl text-white/70 hover:text-white transition-all font-medium"
      >
        <AppIcon name="folderCards" className="w-5 h-5" />
        {t('assetLibrary.button')}
      </button>

      {/* 全屏弹窗 - Wuhu 风格 */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
          <div className="bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_40px_rgba(167,87,255,0.2)] w-full h-full max-w-[95vw] max-h-[95vh] flex flex-col overflow-hidden rounded-2xl">
            {/* 头部 */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(167,87,255,0.3)]">
                  <AppIcon name="folderCards" className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">{t('assetLibrary.title')}</h2>

                {/* 下载按钮 - 紧贴标题 */}
                <button
                  type="button"
                  onClick={handleDownloadAll}
                  disabled={isDownloading}
                  title={t('common.download')}
                  className="w-9 h-9 bg-[var(--wuhu-bg-surface)] border border-white/20 hover:bg-white/5 rounded-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all text-white/70 hover:text-white"
                >
                  <AppIcon
                    name={isDownloading ? 'refresh' : 'download'}
                    className={`w-4 h-4${isDownloading ? ' animate-spin' : ''}`}
                  />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-10 h-10 bg-[var(--wuhu-bg-surface)] border border-white/20 hover:bg-white/5 rounded-xl flex items-center justify-center transition-all"
              >
                <AppIcon name="close" className="w-5 h-5 text-white/50" />
              </button>
            </div>

            {/* 内容区域 - 复用AssetsStage，现在 AssetsStage 内部直接订阅和处理图片生成 */}
            <div className="flex-1 overflow-y-auto p-8">
              <AssetsStage
                projectId={projectId}
                isAnalyzingAssets={isAnalyzingAssets}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
