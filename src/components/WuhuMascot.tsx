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
    sm: { w: 60, h: 60, fontSize: '10px', gap: '4px' },
    md: { w: 100, h: 100, fontSize: '16px', gap: '8px' },
    lg: { w: 160, h: 160, fontSize: '26px', gap: '12px' },
    xl: { w: 240, h: 240, fontSize: '40px', gap: '16px' }
  }

  const { w, h, fontSize, gap } = sizeMap[size]

  return (
    <div
      className={`relative ${animated ? 'wuhu-animate-float' : ''}`}
      style={{ width: w, height: h }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main body - neon gradient monster */}
      <div
        className="absolute rounded-full transition-transform duration-300"
        style={{
          width: w * 0.85,
          height: h * 0.75,
          left: w * 0.075,
          top: h * 0.15,
          background: 'linear-gradient(135deg, oklch(0.65 0.28 290), oklch(0.7 0.32 350), oklch(0.75 0.25 180))',
          boxShadow: `
            0 0 15px oklch(0.65 0.28 290),
            0 0 30px oklch(0.7 0.32 350),
            0 0 45px oklch(0.75 0.25 180)
          `,
          transform: isHovered ? 'scale(1.05)' : 'scale(1)',
          transformOrigin: 'center'
        }}
      />

      {/* Left horn */}
      <div
        style={{
          position: 'absolute',
          left: w * 0.12,
          top: h * 0.02,
          width: 0,
          height: 0,
          borderLeft: `${w * 0.06}px solid transparent`,
          borderRight: `${w * 0.06}px solid transparent`,
          borderBottom: `${h * 0.15}px solid oklch(0.65 0.28 290)`,
          filter: 'drop-shadow(0 0 8px oklch(0.65 0.28 290))'
        }}
      />

      {/* Right horn */}
      <div
        style={{
          position: 'absolute',
          right: w * 0.12,
          top: h * 0.02,
          width: 0,
          height: 0,
          borderLeft: `${w * 0.06}px solid transparent`,
          borderRight: `${w * 0.06}px solid transparent`,
          borderBottom: `${h * 0.15}px solid oklch(0.65 0.28 290)`,
          filter: 'drop-shadow(0 0 8px oklch(0.65 0.28 290))'
        }}
      />

      {/* Face overlay */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center text-white font-bold"
        style={{
          fontSize,
          textShadow: '0 0 10px rgba(255,255,255,0.9), 0 0 20px rgba(255,255,255,0.5)',
          paddingTop: size === 'sm' ? '2px' : '4px'
        }}
      >
        <div className="flex" style={{ gap }}>
          <span>{expr.leftEye}</span>
          <span>{expr.rightEye}</span>
        </div>
        <div style={{ marginTop: '-1px' }}>{expr.mouth}</div>
      </div>
    </div>
  )
}
