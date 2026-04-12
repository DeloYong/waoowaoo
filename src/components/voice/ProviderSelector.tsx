'use client'
import { useState, useEffect } from 'react'
import { useConfig } from '@/hooks/useConfig'

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
  const { config } = useConfig()
  const [availableProviders, setAvailableProviders] = useState<string[]>([])

  useEffect(() => {
    // 获取当前类型支持的已启用提供商
    const providers: string[] = []

    // 检查火山是否配置了API Key并且对应模型已启用
    if (config?.platform?.arkApiKey && config?.models?.some((m: any) =>
      m.provider === 'ark' && m.type === getModelType(type) && m.enabled
    )) {
      providers.push('ark')
    }

    // 检查阿里云是否配置
    if (config?.platform?.bailianApiKey && config?.models?.some((m: any) =>
      m.provider === 'bailian' && m.type === getModelType(type) && m.enabled
    )) {
      providers.push('bailian')
    }

    setAvailableProviders(providers)

    // 如果当前值不在可用列表，自动切换到第一个
    if (value && !providers.includes(value) && providers.length > 0) {
      onChange(providers[0])
    }
  }, [config, type, value, onChange])

  function getModelType(type: string): string {
    switch (type) {
      case 'tts': return 'audio'
      case 'voice-design': return 'voicedesign'
      case 'lipsync': return 'lipsync'
      default: return ''
    }
  }

  if (availableProviders.length <= 1) return null // 只有一个提供商时隐藏选择

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-2">语音提供商</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {availableProviders.map((p) => (
          <option key={p} value={p}>{providerLabels[p as keyof typeof providerLabels]}</option>
        ))}
      </select>
    </div>
  )
}
