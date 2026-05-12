import WuhuMascot from './WuhuMascot'

interface WuhuEmptyStateProps {
  title: string
  description?: string
  action?: React.ReactNode
  expression?: 'default' | 'happy' | 'thinking' | 'surprised' | 'working'
}

export default function WuhuEmptyState({
  title,
  description,
  action,
  expression = 'thinking'
}: WuhuEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <WuhuMascot expression={expression} size="lg" animated={true} />

      <h3 className="mt-6 text-xl font-bold wuhu-text-gradient">
        {title}
      </h3>

      {description && (
        <p className="mt-2 text-[var(--glass-text-secondary)] max-w-md">
          {description}
        </p>
      )}

      {action && (
        <div className="mt-6">
          {action}
        </div>
      )}
    </div>
  )
}
