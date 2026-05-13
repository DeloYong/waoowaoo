'use client'

import { useState } from 'react'
import BrandHero from '@/components/brand/BrandHero'
import BrandIdentity from '@/components/brand/BrandIdentity'
import MascotGallery from '@/components/brand/MascotGallery'
import VisualSystem from '@/components/brand/VisualSystem'
import ScenePreview from '@/components/brand/ScenePreview'
import '@/styles/brand.css'

export default function BrandPage() {
  const [currentPage, setCurrentPage] = useState(0)
  const totalPages = 5

  const handleNext = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages - 1))
  }

  const handlePrev = () => {
    setCurrentPage(prev => Math.max(prev - 1, 0))
  }

  return (
    <div className="brand-page min-h-screen bg-gradient-to-br from-[oklch(0.12_0.05_280)] via-[oklch(0.15_0.04_290)] to-[oklch(0.13_0.05_300)] overflow-hidden">
      {/* 页面导航指示器 */}
      <div className="fixed right-8 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3">
        {[...Array(totalPages)].map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentPage(i)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              currentPage === i
                ? 'bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] shadow-[0_0_10px_var(--wuhu-neon-purple)]'
                : 'bg-white/20 hover:bg-white/40'
            }`}
          />
        ))}
      </div>

      {/* 页面切换容器 */}
      <div className="page-container transition-transform duration-500 ease-out" style={{ transform: `translateY(-${currentPage * 100}vh)` }}>
        <div className="page-section h-screen flex items-center justify-center">
          <BrandHero />
        </div>
        <div className="page-section h-screen flex items-center justify-center">
          <BrandIdentity />
        </div>
        <div className="page-section h-screen flex items-center justify-center">
          <MascotGallery />
        </div>
        <div className="page-section h-screen flex items-center justify-center">
          <VisualSystem />
        </div>
        <div className="page-section h-screen flex items-center justify-center">
          <ScenePreview />
        </div>
      </div>

      {/* 上下翻页按钮 */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-4 z-50">
        <button
          onClick={handlePrev}
          disabled={currentPage === 0}
          className="px-4 py-2 bg-[var(--wuhu-bg-surface)] border border-[var(--wuhu-neon-purple)]/30 rounded-lg text-white/70 hover:text-white disabled:opacity-30 transition-all hover:shadow-[0_0_15px_rgba(167,87,255,0.3)]"
        >
          ↑ 上一页
        </button>
        <button
          onClick={handleNext}
          disabled={currentPage === totalPages - 1}
          className="px-4 py-2 bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] rounded-lg text-white disabled:opacity-30 transition-all hover:shadow-[0_0_20px_rgba(167,87,255,0.4)]"
        >
          下一页 ↓
        </button>
      </div>
    </div>
  )
}
