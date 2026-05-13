'use client'
import { useEffect, useMemo } from 'react'
import { useUserModels } from '@/lib/query/hooks/useUserModels'

interface ProviderSelectorProps {
  type: 'tts' | 'voice-design' | 'lipsync'
  value: string
  onChange: (provider: string) => void
  className?: string
}

const providerLabels = {
  ark: '火山引擎',
  bailian: '阿里云百炼'
} as const

export function ProviderSelector({ type, value, onChange, className = '' }: ProviderSelectorProps) {
  const { data: userModels } = useUserModels()

  const availableProviders = useMemo(() => {
    if (!userModels) return []

    const modelType = type === 'tts' ? 'audio' : type === 'voice-design' ? 'voicedesign' : 'lipsync'
    const models = (userModels[modelType as keyof Omit<typeof userModels, 'defaultModels'>] || []) as import('@/lib/query/hooks/useUserModels').UserModelOption[]

    // 获取唯一的提供商列表
    const providers = [...new Set(models.map((m) => m.provider).filter(Boolean) as string[])]
    return providers
  }, [userModels, type])

  useEffect(() => {
    // 如果当前值不在可用列表，自动切换到第一个
    if (value && !availableProviders.includes(value) && availableProviders.length > 0) {
      onChange(availableProviders[0])
    }
  }, [availableProviders, value, onChange])

  if (availableProviders.length <= 1) return null // 只有一个提供商时隐藏选择

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-white/70 mb-2">语音提供商</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-[var(--wuhu-bg-surface)] border border-white/20 text-white rounded-lg focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_15px_rgba(255,100,200,0.3)]"
      >
        {availableProviders.map((p) => (
          <option key={p} value={p}>
            {providerLabels[p as keyof typeof providerLabels] || p}
          </option>
        ))}
      </select>
    </div>
  )
}