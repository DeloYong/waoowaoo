'use client'

import { useState } from 'react'

interface WuhuLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  animated?: boolean
}

export default function WuhuLogo({ size = 'md', animated = true }: WuhuLogoProps) {
  const [isHovered, setIsHovered] = useState(false)

  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-3xl',
    lg: 'text-5xl',
    xl: 'text-7xl'
  }

  return (
    <div
      className={`
        font-black tracking-tight select-none
        ${sizeClasses[size]}
        ${animated ? 'transition-all duration-300' : ''}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span
        className={`
          wuhu-text-gradient
          ${animated && isHovered ? 'wuhu-animate-rainbow' : ''}
        `}
        style={{
          textShadow: animated && isHovered
            ? '0 0 20px rgba(167, 87, 255, 0.8), 0 0 40px rgba(255, 100, 200, 0.5)'
            : '0 0 10px rgba(167, 87, 255, 0.5)'
        }}
      >
        wuhu
      </span>
    </div>
  )
}
