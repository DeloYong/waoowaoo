interface WuhuCardProps {
  className?: string
  children: React.ReactNode
  glow?: 'purple' | 'pink' | 'cyan' | 'none'
  hoverable?: boolean
}

export function WuhuCard({
  className = '',
  children,
  glow = 'purple',
  hoverable = true
}: WuhuCardProps) {
  const glowClasses = {
    purple: 'wuhu-glow-purple',
    pink: 'wuhu-glow-pink',
    cyan: 'wuhu-glow-cyan',
    none: ''
  }

  const hoverClass = hoverable ? 'hover:scale-[1.02] hover:shadow-lg' : ''

  return (
    <div
      className={`bg-[var(--wuhu-bg-card)] rounded-xl border border-[var(--wuhu-neon-purple)]/30 p-6 transition-all duration-300 ${glow !== 'none' ? glowClasses[glow] : ''} ${hoverClass} ${className}`}
    >
      {children}
    </div>
  )
}
