'use client'

import { useState } from 'react'

interface WuhuMascotProps {
  expression?: 'default' | 'happy' | 'thinking' | 'surprised' | 'working'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  animated?: boolean
}

const expressions = {
  default: { leftEye: '○', rightEye: '◉', mouth: 'ᴗ' },
  happy: { leftEye: '◠', rightEye: '◠', mouth: '▽' },
  thinking: { leftEye: '◑', rightEye: '◐', mouth: '～' },
  surprised: { leftEye: '◎', rightEye: '◎', mouth: 'O' },
  working: { leftEye: '✧', rightEye: '✧', mouth: 'ω' }
}

export default function WuhuMascot({
  expression = 'default',
  size = 'md',
  animated = true
}: WuhuMascotProps) {
  const [isHovered, setIsHovered] = useState(false)
  const expr = expressions[expression]

  const sizeMap = {
    sm: { w: 60, h: 60, fontSize: '12px' },
    md: { w: 100, h: 100, fontSize: '18px' },
    lg: { w: 160, h: 160, fontSize: '28px' },
    xl: { w: 240, h: 240, fontSize: '42px' }
  }

  const { w, h, fontSize } = sizeMap[size]

  return (
    <div
      className={`relative ${animated ? 'wuhu-animate-float' : ''}`}
      style={{ width: w, height: h }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <svg width={w} height={h} viewBox="0 0 100 100">
        {/* Body glow */}
        <defs>
          <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.65 0.28 290)" />
            <stop offset="50%" stopColor="oklch(0.7 0.32 350)" />
            <stop offset="100%" stopColor="oklch(0.75 0.25 180)" />
          </linearGradient>
        </defs>

        {/* Body - round monster shape */}
        <ellipse
          cx="50" cy="55" rx="35" ry="32"
          fill="url(#bodyGradient)"
          filter="url(#neonGlow)"
          style={{ transform: isHovered ? 'scale(1.05)' : 'scale(1)', transformOrigin: 'center', transition: 'transform 0.3s ease' }}
        />

        {/* Little horns */}
        <path d="M30 28 L25 15 L35 25 Z" fill="oklch(0.65 0.28 290)" filter="url(#neonGlow)" />
        <path d="M70 28 L75 15 L65 25 Z" fill="oklch(0.65 0.28 290)" filter="url(#neonGlow)" />

        {/* Eyes and mouth are placed via text overlay for simplicity */}
      </svg>

      {/* Face overlay */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center text-white font-bold"
        style={{
          fontSize,
          textShadow: '0 0 10px rgba(255,255,255,0.8)',
          paddingTop: size === 'sm' ? '4px' : '8px'
        }}
      >
        <div className="flex gap-2">
          <span>{expr.leftEye}</span>
          <span>{expr.rightEye}</span>
        </div>
        <div style={{ marginTop: '-2px' }}>{expr.mouth}</div>
      </div>
    </div>
  )
}
