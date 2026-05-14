'use client'
/* eslint-disable no-restricted-syntax */

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
