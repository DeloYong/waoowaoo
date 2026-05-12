'use client'

import { Button } from '@/components/ui/SharedComponents'

interface WuhuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'gradient'
  glow?: boolean
  children: React.ReactNode
}

export function WuhuButton({
  variant = 'primary',
  glow = true,
  className = '',
  children,
  ...props
}: WuhuButtonProps) {
  const baseStyles = "transition-all duration-300 font-medium"

  const variants = {
    primary: "bg-[var(--wuhu-neon-purple)] text-white hover:brightness-110",
    secondary: "border-2 border-[var(--wuhu-neon-purple)] text-[var(--wuhu-neon-purple)] bg-transparent hover:bg-[var(--wuhu-neon-purple)] hover:text-white",
    ghost: "text-[var(--wuhu-neon-purple)] hover:bg-[var(--wuhu-neon-purple)] hover:text-white",
    gradient: "bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white hover:brightness-110"
  }

  const glowStyles = glow && variant !== 'ghost' ? "wuhu-glow-purple wuhu-glow-hover" : ""

  return (
    <Button
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${glowStyles}
        ${className}
      `}
      {...props}
    >
      {children}
    </Button>
  )
}
