'use client'

import Mascot from './Mascot'

export default function BrandHero() {
  // 生成随机粒子
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    delay: Math.random() * 5,
    size: 2 + Math.random() * 4,
  }))

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
      {/* 粒子背景 */}
      {particles.map(p => (
        <div
          key={p.id}
          className="brand-particle"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            animationDelay: `${p.delay}s`,
            width: `${p.size}px`,
            height: `${p.size}px`,
          }}
        />
      ))}

      {/* Logo 文字 */}
      <h1 className="text-5xl font-bold mb-8 neon-text tracking-wider breathe-glow px-12 py-4 rounded-3xl">
        wuhu
      </h1>

      {/* 吉祥物 */}
      <div className="mascot-float">
        <Mascot expression="wink" size={280} />
      </div>

      {/* Slogan */}
      <p className="mt-8 text-2xl text-white/80">
        芜湖起飞！AI 创作，惊喜连连
      </p>

      {/* 向下滚动提示 */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="text-white/40 text-sm flex flex-col items-center gap-2">
          <span>向下滑动探索</span>
          <span className="text-xl">↓</span>
        </div>
      </div>
    </div>
  )
}
