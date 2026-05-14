'use client'
/* eslint-disable no-restricted-syntax */

import { useState } from 'react'

interface WuhuLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  animated?: boolean
}

const sizeConfig = {
  sm: {
    fontSize: 'text-xl',
    iconSize: 28,
    gap: 'gap-1',
    glow: 'drop-shadow-[0_0_8px_rgba(167,87,255,0.6)]',
  },
  md: {
    fontSize: 'text-3xl',
    iconSize: 44,
    gap: 'gap-2',
    glow: 'drop-shadow-[0_0_12px_rgba(167,87,255,0.7)]',
  },
  lg: {
    fontSize: 'text-5xl',
    iconSize: 70,
    gap: 'gap-3',
    glow: 'drop-shadow-[0_0_18px_rgba(167,87,255,0.8)]',
  },
  xl: {
    fontSize: 'text-7xl',
    iconSize: 100,
    gap: 'gap-4',
    glow: 'drop-shadow-[0_0_25px_rgba(167,87,255,0.9)]',
  },
}

export default function WuhuLogo({ size = 'md', animated = true }: WuhuLogoProps) {
  const [isHovered, setIsHovered] = useState(false)
  const config = sizeConfig[size]

  return (
    <div
      className={`
        flex items-center ${config.gap}
        font-black tracking-tight select-none
        ${config.fontSize}
        ${animated ? 'transition-all duration-300' : ''}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Mascot Icon */}
      <div
        className={`
          relative
          ${animated ? 'transition-all duration-300' : ''}
          ${isHovered && animated ? 'scale-110' : ''}
        `}
      >
        <svg
          width={config.iconSize}
          height={config.iconSize}
          viewBox="0 0 100 100"
          className={config.glow}
        >
          {/* Main body gradient */}
          <defs>
            <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(167, 87, 255, 1)" />
              <stop offset="50%" stopColor="rgba(255, 100, 200, 1)" />
              <stop offset="100%" stopColor="rgba(100, 255, 255, 1)" />
            </linearGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Main body */}
          <ellipse
            cx="50"
            cy="55"
            rx="38"
            ry="30"
            fill="url(#bodyGradient)"
            filter="url(#glow)"
            className={animated && isHovered ? 'animate-pulse' : ''}
          />

          {/* Left horn */}
          <polygon
            points="25,20 32,40 18,40"
            fill="rgba(167, 87, 255, 0.95)"
            filter="url(#glow)"
          />

          {/* Right horn */}
          <polygon
            points="75,20 68,40 82,40"
            fill="rgba(167, 87, 255, 0.95)"
            filter="url(#glow)"
          />

          {/* Eyes */}
          <ellipse cx="38" cy="52" rx="5" ry="6" fill="white" />
          <ellipse cx="62" cy="52" rx="5" ry="6" fill="white" />
          <ellipse cx="39" cy="53" rx="2.5" ry="3" fill="#1a1a2e" />
          <ellipse cx="63" cy="53" rx="2.5" ry="3" fill="#1a1a2e" />

          {/* Cute smile */}
          <path
            d="M 40 65 Q 50 72 60 65"
            stroke="white"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />

          {/* Blush cheeks */}
          <ellipse cx="28" cy="60" rx="6" ry="4" fill="rgba(255,100,200,0.4)" />
          <ellipse cx="72" cy="60" rx="6" ry="4" fill="rgba(255,100,200,0.4)" />
        </svg>
      </div>

      {/* Text */}
      <span
        className={`
          wuhu-text-gradient
          ${animated && isHovered ? 'wuhu-animate-rainbow' : ''}
        `}
        style={{
          textShadow: animated && isHovered
            ? '0 0 20px rgba(167, 87, 255, 0.8), 0 0 40px rgba(255, 100, 200, 0.5)'
            : '0 0 10px rgba(167, 87, 255, 0.5)',
        }}
      >
        wuhu
      </span>
    </div>
  )
}
