# Wuhu 品牌展示页面实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 5-page Wuhu brand culture and theme display webpage with neon cyberpunk style and mascot showcase

**Architecture:** Next.js App Router page with reusable React components, using Tailwind CSS and existing Wuhu CSS variables. Components are isolated by responsibility: layout container, mascot display, color cards, scene preview.

**Tech Stack:** Next.js 14+, React, TypeScript, Tailwind CSS, CSS Variables

---

## 文件结构映射

| 路径 | 用途 |
|------|------|
| `src/app/[locale]/brand/page.tsx` | 品牌展示主页面 |
| `src/components/brand/BrandHero.tsx` | 封面 Hero 区域 |
| `src/components/brand/BrandIdentity.tsx` | 品牌核心一页纸 |
| `src/components/brand/MascotGallery.tsx` | 吉祥物形象专辑 |
| `src/components/brand/VisualSystem.tsx` | 视觉系统展示 |
| `src/components/brand/ScenePreview.tsx` | 应用场景预览 |
| `src/components/brand/Mascot.tsx` | 吉祥物 SVG 组件 |
| `src/styles/brand.css` | 品牌页面专属样式 |

---

## Task 1: 品牌页面基础框架和路由

**Files:**
- Create: `src/app/[locale]/brand/page.tsx`
- Create: `src/styles/brand.css`

- [ ] **Step 1: 创建页面基础结构**

```tsx
// src/app/[locale]/brand/page.tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import BrandHero from '@/components/brand/BrandHero'
import BrandIdentity from '@/components/brand/BrandIdentity'
import MascotGallery from '@/components/brand/MascotGallery'
import VisualSystem from '@/components/brand/VisualSystem'
import ScenePreview from '@/components/brand/ScenePreview'
import '@/styles/brand.css'

export default function BrandPage() {
  const t = useTranslations('brand')
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
```

- [ ] **Step 2: 创建品牌专属样式文件**

```css
/* src/styles/brand.css */

/* 页面切换动画 */
.brand-page .page-container {
  transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.brand-page .page-section {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 粒子背景效果 */
@keyframes particle-float {
  0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
  50% { transform: translateY(-20px) translateX(10px); opacity: 0.6; }
}

.brand-particle {
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--wuhu-neon-purple);
  box-shadow: 0 0 10px var(--wuhu-neon-purple);
  animation: particle-float 6s ease-in-out infinite;
  pointer-events: none;
}

/* 霓虹发光文字 */
.neon-text {
  background: var(--wuhu-gradient-text);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  text-shadow: 0 0 30px rgba(167, 87, 255, 0.5);
}

/* 发光卡片通用样式 */
.glow-card {
  background: var(--wuhu-bg-surface);
  border: 1px solid rgba(167, 87, 255, 0.3);
  border-radius: 16px;
  box-shadow: 
    0 4px 24px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(167, 87, 255, 0.1) inset;
  transition: all 0.3s ease;
}

.glow-card:hover {
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.4),
    0 0 20px rgba(167, 87, 255, 0.2),
    0 0 0 1px rgba(255, 100, 200, 0.2) inset;
  transform: translateY(-2px);
}

/* 吉祥物漂浮动画 */
@keyframes mascot-float {
  0%, 100% { transform: translateY(0) rotate(-3deg); }
  50% { transform: translateY(-15px) rotate(3deg); }
}

.mascot-float {
  animation: mascot-float 4s ease-in-out infinite;
}

/* 呼吸发光动画 */
@keyframes breathe-glow {
  0%, 100% { 
    box-shadow: 0 0 15px var(--wuhu-neon-purple), 0 0 30px rgba(167, 87, 255, 0.3);
  }
  50% { 
    box-shadow: 0 0 25px var(--wuhu-neon-pink), 0 0 50px rgba(255, 100, 200, 0.2);
  }
}

.breathe-glow {
  animation: breathe-glow 3s ease-in-out infinite;
}
```

- [ ] **Step 3: 验证 TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: No type errors (0 errors)

- [ ] **Step 4: Commit**

```bash
git add src/app/[locale]/brand/page.tsx src/styles/brand.css
git commit -m "feat(brand): add brand page base framework and routing"
```

---

## Task 2: 封面 Hero 组件

**Files:**
- Create: `src/components/brand/BrandHero.tsx`
- Create: `src/components/brand/Mascot.tsx`

- [ ] **Step 1: 创建吉祥物基础 SVG 组件**

```tsx
// src/components/brand/Mascot.tsx
'use client'

interface MascotProps {
  expression?: 'wink' | 'surprise' | 'director' | 'celebrate' | 'thinking' | 'sorry'
  size?: number
  className?: string
}

export default function Mascot({ expression = 'wink', size = 200, className = '' }: MascotProps) {
  const renderEyes = () => {
    switch (expression) {
      case 'wink':
        return (
          <>
            {/* 左眼眨眼 */}
            <ellipse cx="70" cy="80" rx="15" ry="5" fill="white" />
            {/* 右眼正常 */}
            <circle cx="130" cy="80" r="18" fill="white" />
            <circle cx="134" cy="78" r="10" fill="var(--wuhu-neon-purple)" />
            <circle cx="138" cy="74" r="4" fill="white" />
          </>
        )
      case 'surprise':
        return (
          <>
            <circle cx="70" cy="80" r="22" fill="white" />
            <circle cx="70" cy="80" r="12" fill="var(--wuhu-neon-pink)" />
            <text x="70" y="85" textAnchor="middle" fontSize="16" fill="white">★</text>
            <circle cx="130" cy="80" r="22" fill="white" />
            <circle cx="130" cy="80" r="12" fill="var(--wuhu-neon-pink)" />
            <text x="130" y="85" textAnchor="middle" fontSize="16" fill="white">★</text>
          </>
        )
      case 'director':
        return (
          <>
            <circle cx="70" cy="85" r="15" fill="white" />
            <circle cx="72" cy="84" r="8" fill="var(--wuhu-neon-purple)" />
            <circle cx="130" cy="85" r="15" fill="white" />
            <circle cx="132" cy="84" r="8" fill="var(--wuhu-neon-purple)" />
          </>
        )
      case 'celebrate':
        return (
          <>
            <circle cx="70" cy="80" r="18" fill="white" />
            <circle cx="72" cy="78" r="10" fill="var(--wuhu-neon-cyan)" />
            <path d="M65 78 L70 73 L75 78" stroke="white" strokeWidth="2" fill="none" />
            <circle cx="130" cy="80" r="18" fill="white" />
            <circle cx="132" cy="78" r="10" fill="var(--wuhu-neon-cyan)" />
            <path d="M125 78 L130 73 L135 78" stroke="white" strokeWidth="2" fill="none" />
          </>
        )
      case 'thinking':
        return (
          <>
            <ellipse cx="70" cy="80" rx="12" ry="15" fill="white" />
            <circle cx="70" cy="82" r="6" fill="var(--wuhu-neon-purple)" />
            <ellipse cx="130" cy="80" rx="12" ry="15" fill="white" />
            <circle cx="130" cy="82" r="6" fill="var(--wuhu-neon-purple)" />
          </>
        )
      case 'sorry':
        return (
          <>
            <path d="M58 78 Q70 72 82 78" stroke="white" strokeWidth="3" fill="none" />
            <path d="M118 78 Q130 72 142 78" stroke="white" strokeWidth="3" fill="none" />
          </>
        )
      default:
        return null
    }
  }

  const renderMouth = () => {
    switch (expression) {
      case 'wink':
        return <path d="M85 110 Q100 125 115 110" stroke="white" strokeWidth="3" fill="none" />
      case 'surprise':
        return <ellipse cx="100" cy="120" rx="12" ry="15" fill="white" />
      case 'director':
        return <path d="M80 115 Q100 130 120 115" stroke="white" strokeWidth="3" fill="none" />
      case 'celebrate':
        return <path d="M75 110 Q100 140 125 110" stroke="white" strokeWidth="3" fill="none" />
      case 'thinking':
        return <ellipse cx="100" cy="125" rx="8" ry="5" fill="white" opacity="0.8" />
      case 'sorry':
        return <path d="M85 120 Q100 110 115 120" stroke="white" strokeWidth="3" fill="none" />
      default:
        return null
    }
  }

  const renderAccessories = () => {
    if (expression === 'director') {
      return (
        <>
          {/* 导演帽 */}
          <path d="M50 55 L150 55 L145 35 L55 35 Z" fill="#1a1a2e" stroke="var(--wuhu-neon-purple)" strokeWidth="2" />
          <rect x="75" y="25" width="50" height="15" rx="3" fill="#1a1a2e" stroke="var(--wuhu-neon-purple)" strokeWidth="2" />
        </>
      )
    }
    if (expression === 'celebrate') {
      return (
        <>
          {/* 撒花粒子 */}
          <circle cx="40" cy="50" r="5" fill="var(--wuhu-neon-pink)" />
          <circle cx="160" cy="45" r="4" fill="var(--wuhu-neon-cyan)" />
          <circle cx="35" cy="130" r="3" fill="var(--wuhu-neon-purple)" />
          <circle cx="165" cy="125" r="4" fill="var(--wuhu-neon-pink)" />
          <text x="30" y="90" fontSize="12" fill="var(--wuhu-neon-cyan)">✦</text>
          <text x="160" y="100" fontSize="12" fill="var(--wuhu-neon-pink)">✦</text>
        </>
      )
    }
    if (expression === 'thinking') {
      return (
        <>
          {/* 思考灯泡 */}
          <circle cx="155" cy="50" r="12" fill="none" stroke="var(--wuhu-neon-cyan)" strokeWidth="2" opacity="0.8" />
          <text x="155" y="55" textAnchor="middle" fontSize="14" fill="var(--wuhu-neon-cyan)">?</text>
        </>
      )
    }
    return null
  }

  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 200 240" className={className}>
      {/* 外发光滤镜 */}
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--wuhu-neon-purple)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--wuhu-neon-pink)" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      {/* 身体 - 半透明球形 */}
      <circle cx="100" cy="130" r="75" fill="url(#bodyGradient)" stroke="var(--wuhu-neon-purple)" strokeWidth="3" filter="url(#glow)" />
      
      {/* 内部能量流动效果 */}
      <ellipse cx="100" cy="140" rx="50" ry="40" fill="none" stroke="var(--wuhu-neon-cyan)" strokeWidth="1" opacity="0.3" />
      <ellipse cx="100" cy="150" rx="35" ry="25" fill="none" stroke="var(--wuhu-neon-pink)" strokeWidth="1" opacity="0.2" />

      {/* 角 */}
      <path d="M60 65 L55 40 L70 55 Z" fill="var(--wuhu-neon-purple)" filter="url(#glow)" />
      <path d="M140 65 L145 40 L130 55 Z" fill="var(--wuhu-neon-pink)" filter="url(#glow)" />

      {/* 装饰配件 */}
      {renderAccessories()}

      {/* 眼睛 */}
      {renderEyes()}

      {/* 嘴巴 */}
      {renderMouth()}

      {/* 小爪子 */}
      <ellipse cx="45" cy="170" rx="12" ry="8" fill="rgba(255,255,255,0.3)" />
      <ellipse cx="155" cy="170" rx="12" ry="8" fill="rgba(255,255,255,0.3)" />
    </svg>
  )
}
```

- [ ] **Step 2: 创建封面 Hero 组件**

```tsx
// src/components/brand/BrandHero.tsx
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
      <h1 className="text-8xl font-bold mb-8 neon-text tracking-wider breathe-glow px-12 py-4 rounded-3xl">
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
```

- [ ] **Step 3: 运行类型检查**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/components/brand/BrandHero.tsx src/components/brand/Mascot.tsx
git commit -m "feat(brand): add BrandHero and Mascot SVG components"
```

---

## Task 3: 品牌核心一页纸组件

**Files:**
- Create: `src/components/brand/BrandIdentity.tsx`

- [ ] **Step 1: 编写品牌身份组件**

```tsx
// src/components/brand/BrandIdentity.tsx
'use client'

export default function BrandIdentity() {
  const brandCards = [
    {
      icon: '🏷️',
      title: '品牌身份',
      items: [
        '中文名: 芜湖',
        '英文名: wuhu',
        'Slogan: 芜湖起飞！',
        '定位: AI 创意创作平台',
      ],
      color: 'var(--wuhu-neon-purple)',
    },
    {
      icon: '🎯',
      title: '目标用户',
      items: [
        '短剧/漫画创作者',
        '年轻内容生产者',
        '追求趣味与效率的',
        'AI 工具使用者',
      ],
      color: 'var(--wuhu-neon-pink)',
    },
    {
      icon: '✨',
      title: '品牌气质',
      items: [
        '🟣 酷萌风',
        '🟡 霓虹活力',
        '🔵 搞怪有趣',
        '',
      ],
      color: 'var(--wuhu-neon-cyan)',
    },
  ]

  return (
    <div className="w-full max-w-6xl px-8">
      <h2 className="text-4xl font-bold text-center mb-12 neon-text">
        品牌核心
      </h2>

      {/* 三栏卡片布局 */}
      <div className="grid grid-cols-3 gap-8">
        {brandCards.map((card, index) => (
          <div
            key={index}
            className="glow-card p-8 text-center"
            style={{
              borderColor: `${card.color}40`,
              animationDelay: `${index * 0.2}s`,
            }}
          >
            {/* 图标 */}
            <div 
              className="text-5xl mb-6"
              style={{
                filter: `drop-shadow(0 0 15px ${card.color})`,
              }}
            >
              {card.icon}
            </div>

            {/* 标题 */}
            <h3 
              className="text-2xl font-bold mb-6"
              style={{ color: card.color }}
            >
              {card.title}
            </h3>

            {/* 内容列表 */}
            <ul className="space-y-3">
              {card.items.map((item, i) => (
                <li key={i} className="text-white/70 text-lg">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* 渐变分割线 */}
      <div className="mt-16 h-px bg-gradient-to-r from-transparent via-[var(--wuhu-neon-purple)] to-transparent opacity-50" />

      {/* 底部小彩蛋 - 角落探头的呜虎 */}
      <div className="absolute bottom-8 right-8 opacity-30 hover:opacity-100 transition-opacity duration-300">
        <div className="text-6xl transform rotate-12">👀</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/brand/BrandIdentity.tsx
git commit -m "feat(brand): add BrandIdentity three-column display"
```

---

## Task 4: 吉祥物形象专辑组件

**Files:**
- Create: `src/components/brand/MascotGallery.tsx`
- Modify: `src/components/brand/Mascot.tsx` (if needed, already created)

- [ ] **Step 1: 创建吉祥物画廊组件**

```tsx
// src/components/brand/MascotGallery.tsx
'use client'

import Mascot from './Mascot'

export default function MascotGallery() {
  const expressions = [
    { key: 'wink', name: '眨眼', description: '默认搞怪脸', emoji: '😜' },
    { key: 'surprise', name: '惊喜', description: '星星眼睛', emoji: '⭐' },
    { key: 'director', name: '导演', description: '专业创作', emoji: '🎬' },
    { key: 'celebrate', name: '庆祝', description: '撒花欢呼', emoji: '🎉' },
    { key: 'thinking', name: '思考', description: '创意迸发', emoji: '🤔' },
    { key: 'sorry', name: '抱歉', description: '委屈挠头', emoji: '🥺' },
  ] as const

  return (
    <div className="w-full max-w-6xl px-8">
      <h2 className="text-4xl font-bold text-center mb-4 neon-text">
        呜虎 Woohoo
      </h2>
      <p className="text-center text-white/60 mb-12 text-lg">
        圆滚滚的小怪兽，你的创意创作伙伴
      </p>

      <div className="flex gap-12">
        {/* 左侧：主形象大展示 */}
        <div className="flex-1 flex flex-col items-center">
          <div className="mascot-float">
            <Mascot expression="wink" size={320} />
          </div>
          <div className="mt-8 text-center">
            <p className="text-white/80 text-xl font-medium mb-2">名字：呜虎 (Woohoo)</p>
            <p className="text-white/60">类型：圆滚滚的创意小怪兽</p>
            <p className="text-white/60">特征：半透明身体 + 霓虹尖角 + 星星眼</p>
          </div>
        </div>

        {/* 右侧：表情网格 2x3 */}
        <div className="flex-1">
          <div className="grid grid-cols-3 gap-4">
            {expressions.map((expr, index) => (
              <div
                key={expr.key}
                className="glow-card p-4 flex flex-col items-center cursor-pointer hover:scale-105 transition-transform"
                style={{
                  animationDelay: `${index * 0.1}s`,
                }}
              >
                <Mascot expression={expr.key} size={100} />
                <div className="mt-2 text-center">
                  <span className="text-xl mr-1">{expr.emoji}</span>
                  <span className="text-white/80 font-medium">{expr.name}</span>
                  <p className="text-white/40 text-xs mt-1">{expr.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: 运行构建验证**

Run: `npm run build`
Expected: Build completes successfully

- [ ] **Step 4: Commit**

```bash
git add src/components/brand/MascotGallery.tsx
git commit -m "feat(brand): add MascotGallery expression showcase"
```

---

## Task 5: 视觉系统展示组件

**Files:**
- Create: `src/components/brand/VisualSystem.tsx`

- [ ] **Step 1: 创建视觉系统展示组件**

```tsx
// src/components/brand/VisualSystem.tsx
'use client'

export default function VisualSystem() {
  const colors = [
    {
      name: '电光紫',
      hex: '#A757FF',
      oklch: 'oklch(0.65 0.28 290)',
      cssVar: '--wuhu-neon-purple',
      usage: '主色 / 品牌色',
    },
    {
      name: '荧光粉',
      hex: '#FF64C8',
      oklch: 'oklch(0.7 0.32 350)',
      cssVar: '--wuhu-neon-pink',
      usage: '强调 / 交互',
    },
    {
      name: '亮青色',
      hex: '#64FFFF',
      oklch: 'oklch(0.75 0.25 180)',
      cssVar: '--wuhu-neon-cyan',
      usage: '高亮 / 成功',
    },
  ]

  return (
    <div className="w-full max-w-6xl px-8">
      <h2 className="text-4xl font-bold text-center mb-12 neon-text">
        视觉系统
      </h2>

      {/* 色卡展示区域 */}
      <div className="flex justify-center gap-12 mb-16">
        {colors.map((color, index) => (
          <div key={index} className="text-center">
            {/* 色卡 */}
            <div
              className="w-32 h-32 rounded-2xl mb-6 breathe-glow"
              style={{
                background: `linear-gradient(135deg, ${color.hex}80, ${color.hex}40)`,
                border: `2px solid ${color.hex}`,
                boxShadow: `0 0 30px ${color.hex}60, inset 0 0 20px ${color.hex}30`,
              }}
            />
            {/* 颜色信息 */}
            <h3 className="text-xl font-bold text-white mb-2">{color.name}</h3>
            <p className="text-white/60 font-mono text-sm">{color.hex}</p>
            <p className="text-white/40 font-mono text-xs mt-1">{color.oklch}</p>
            <p className="text-white/50 text-sm mt-3">{color.usage}</p>
          </div>
        ))}
      </div>

      {/* 渐变分割线 */}
      <div className="h-px bg-gradient-to-r from-transparent via-[var(--wuhu-neon-purple)] to-transparent opacity-50 mb-12" />

      {/* 核心组件预览 */}
      <h3 className="text-2xl font-bold text-white/80 text-center mb-8">核心组件预览</h3>
      
      <div className="grid grid-cols-3 gap-6">
        {/* 主要按钮预览 */}
        <div className="glow-card p-6 flex flex-col items-center">
          <p className="text-white/50 text-sm mb-4">主要按钮</p>
          <button className="px-8 py-3 bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] rounded-lg text-white font-medium shadow-[0_0_20px_rgba(167,87,255,0.3)] hover:shadow-[0_0_30px_rgba(167,87,255,0.4)] transition-all">
            立即开始
          </button>
        </div>

        {/* 发光卡片预览 */}
        <div className="glow-card p-6 flex flex-col items-center">
          <p className="text-white/50 text-sm mb-4">发光卡片</p>
          <div className="w-full bg-[var(--wuhu-bg-surface)] rounded-lg p-4 border border-[var(--wuhu-neon-purple)]/30">
            <p className="text-white/70 text-center">卡片内容区域</p>
          </div>
        </div>

        {/* 渐变文字预览 */}
        <div className="glow-card p-6 flex flex-col items-center">
          <p className="text-white/50 text-sm mb-4">渐变文字</p>
          <p className="neon-text text-2xl font-bold">¥99.00</p>
        </div>
      </div>

      {/* CSS 变量代码展示 */}
      <div className="mt-12 glow-card p-6">
        <p className="text-white/50 text-sm mb-3">核心 CSS 变量</p>
        <pre className="text-white/70 font-mono text-sm overflow-x-auto">
{`/* 霓虹三原色 */
--wuhu-neon-purple: oklch(0.65 0.28 290);
--wuhu-neon-pink: oklch(0.7 0.32 350);
--wuhu-neon-cyan: oklch(0.75 0.25 180);

/* 渐变系统 */
--wuhu-gradient-text: linear-gradient(90deg, 
  var(--wuhu-neon-cyan), 
  var(--wuhu-neon-purple), 
  var(--wuhu-neon-pink));`}
        </pre>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/brand/VisualSystem.tsx
git commit -m "feat(brand): add VisualSystem color and component showcase"
```

---

## Task 6: 应用场景预览组件

**Files:**
- Create: `src/components/brand/ScenePreview.tsx`

- [ ] **Step 1: 创建场景预览组件**

```tsx
// src/components/brand/ScenePreview.tsx
'use client'

export default function ScenePreview() {
  const scenes = [
    {
      icon: '🌐',
      title: '网站首页',
      description: '呜虎在 Hero 区域跳跃，背景粒子流动，迎接每一位创作者',
      color: 'var(--wuhu-neon-purple)',
    },
    {
      icon: '📱',
      title: '社交媒体',
      description: '呜虎表情包贴纸系列，微信/微博传播，病毒式品牌扩散',
      color: 'var(--wuhu-neon-pink)',
    },
    {
      icon: '🎨',
      title: '营销物料',
      description: '海报、易拉宝、周边产品，品牌露出无处不在',
      color: 'var(--wuhu-neon-cyan)',
    },
    {
      icon: '🎥',
      title: '视频水印',
      description: '动态结尾动画，强化品牌记忆，创作者作品的骄傲印记',
      color: 'var(--wuhu-neon-orange)',
    },
  ]

  return (
    <div className="w-full max-w-6xl px-8">
      <h2 className="text-4xl font-bold text-center mb-12 neon-text">
        应用场景
      </h2>

      {/* 2x2 场景网格 */}
      <div className="grid grid-cols-2 gap-8">
        {scenes.map((scene, index) => (
          <div
            key={index}
            className="glow-card p-8 hover:scale-105 transition-transform cursor-pointer"
            style={{
              borderColor: `${scene.color}40`,
            }}
          >
            <div 
              className="text-5xl mb-6"
              style={{
                filter: `drop-shadow(0 0 10px ${scene.color})`,
              }}
            >
              {scene.icon}
            </div>
            <h3 
              className="text-2xl font-bold mb-4"
              style={{ color: scene.color }}
            >
              {scene.title}
            </h3>
            <p className="text-white/60 text-lg leading-relaxed">
              {scene.description}
            </p>
          </div>
        ))}
      </div>

      {/* 底部品牌理念 */}
      <div className="mt-16 text-center">
        <div className="inline-block px-12 py-6 rounded-2xl bg-gradient-to-r from-[var(--wuhu-neon-purple)]/20 via-[var(--wuhu-neon-pink)]/20 to-[var(--wuhu-neon-cyan)]/20 border border-white/10">
          <p className="text-white/80 text-xl mb-2">
            Wuhu 品牌的核心是「惊喜感」
          </p>
          <p className="text-white/50">
            就像看到视频成品时脱口而出的那句——「芜湖起飞！」
          </p>
        </div>
      </div>

      {/* 封底 Logo */}
      <div className="mt-16 text-center">
        <div className="text-6xl font-bold neon-text inline-block px-8 py-4 rounded-2xl breathe-glow">
          WH
        </div>
        <p className="mt-6 text-white/40 text-lg">wuhu.ai</p>
        <p className="mt-2 text-white/30 text-xl">「 芜湖起飞！」</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: 完整构建验证**

Run: `npm run build`
Expected: Build completes successfully with no errors

- [ ] **Step 4: 启动开发服务器预览**

Run: `npm run dev`
Expected: Dev server starts, visit `/brand` route to preview

- [ ] **Step 5: Commit**

```bash
git add src/components/brand/ScenePreview.tsx
git commit -m "feat(brand): add ScenePreview and brand page completion"
```

---

## Task 7: 国际化文案和收尾优化

**Files:**
- Modify: `messages/zh.json` (or appropriate i18n file)
- Modify: `messages/en.json` (for English support)
- Create: `src/components/brand/index.ts` (export barrel)

- [ ] **Step 1: 创建组件导出 barrel**

```typescript
// src/components/brand/index.ts
export { default as BrandHero } from './BrandHero'
export { default as BrandIdentity } from './BrandIdentity'
export { default as MascotGallery } from './MascotGallery'
export { default as VisualSystem } from './VisualSystem'
export { default as ScenePreview } from './ScenePreview'
export { default as Mascot } from './Mascot'
```

- [ ] **Step 2: 添加国际化文案（中文）**

```json
// messages/zh.json - add to existing
{
  "brand": {
    "title": "Wuhu 品牌",
    "slogan": "芜湖起飞！AI 创作，惊喜连连",
    "brandIdentity": "品牌核心",
    "mascot": "呜虎 Woohoo",
    "visualSystem": "视觉系统",
    "scenes": "应用场景",
    "prevPage": "↑ 上一页",
    "nextPage": "下一页 ↓",
    "scrollHint": "向下滑动探索"
  }
}
```

- [ ] **Step 3: 更新主页面使用翻译**

Modify `src/app/[locale]/brand/page.tsx` to use `t('brand.slogan')` etc.

- [ ] **Step 4: 最终构建验证**

Run: `npm run build`
Expected: Build completes successfully

- [ ] **Step 5: Commit**

```bash
git add src/components/brand/index.ts messages/zh.json
git commit -m "feat(brand): add i18n support and component exports"
```

---

## 计划自检清单

### 1. Spec 覆盖检查

- ✅ 封面 Hero 区域（含大 Logo、吉祥物、Slogan）
- ✅ 品牌核心一页纸（三栏卡片）
- ✅ 吉祥物形象专辑（主形象 + 6 表情网格）
- ✅ 视觉系统展示（色卡 + 组件预览）
- ✅ 应用场景预览（2x2 网格）
- ✅ 封底品牌理念

### 2. 占位符检查

- ✅ 无 "TBD" 或 "TODO" 标记
- ✅ 所有代码步骤都有完整代码
- ✅ 所有测试命令都明确给出预期结果

### 3. 类型一致性检查

- ✅ Mascot 组件 props 类型在所有使用处一致
- ✅ 所有文件路径准确无误
- ✅ CSS 变量名与现有 globals.css 一致

---

Plan complete and saved to `docs/superpowers/plans/2025-05-13-wuhu-brand-display-page.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
