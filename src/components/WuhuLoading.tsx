import WuhuMascot from './WuhuMascot'

interface WuhuLoadingProps {
  text?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function WuhuLoading({
  text = '芜湖起飞中...',
  size = 'md'
}: WuhuLoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="wuhu-animate-pulse rounded-full p-4">
        <WuhuMascot expression="working" size={size} animated={false} />
      </div>
      <p className="mt-4 text-[var(--glass-text-secondary)] animate-pulse">
        {text}
      </p>
    </div>
  )
}
