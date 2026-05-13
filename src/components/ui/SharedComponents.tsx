'use client'

/**
 * AnimatedBackground - 流光极光背景动画
 * 用于页面全局背景
 */
export function AnimatedBackground() {
    return (
        <div className="fixed inset-0 -z-10 overflow-hidden bg-[var(--wuhu-bg-canvas)]">
            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] opacity-40 animate-aurora filter blur-[100px]">
                <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-[var(--wuhu-neon-purple)]/20 rounded-full mix-blend-multiply animate-blob" />
                <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-[var(--wuhu-neon-pink)]/20 rounded-full mix-blend-multiply animate-blob animation-delay-2000" />
                <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-[var(--wuhu-neon-cyan)]/20 rounded-full mix-blend-multiply animate-blob animation-delay-4000" />
            </div>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-3xl" />
        </div>
    )
}

/**
 * GlassPanel - 毛玻璃卡片容器
 */
export function GlassPanel({
    children,
    className = ''
}: {
    children: React.ReactNode
    className?: string
}) {
    return (
        <div className={`
      bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_40px_rgba(167,87,255,0.2)] rounded-xl
      ${className}
    `}>
            {children}
        </div>
    )
}

/**
 * Button - 通用按钮组件
 */
export function Button({
    children,
    primary = false,
    onClick,
    disabled = false,
    icon,
    className = ''
}: {
    children: React.ReactNode
    primary?: boolean
    onClick?: () => void
    disabled?: boolean
    icon?: React.ReactNode
    className?: string
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
        px-6 py-2.5 rounded-lg transition-all font-medium
        ${primary
                    ? 'bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_20px_rgba(167,87,255,0.3)] hover:shadow-[0_0_30px_rgba(167,87,255,0.4)]'
                    : 'bg-[var(--wuhu-bg-surface)] border border-white/20 text-white/80 hover:border-white/40 hover:text-white'}
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
        >
            {icon && <span>{icon}</span>}
            {children}
        </button>
    )
}
