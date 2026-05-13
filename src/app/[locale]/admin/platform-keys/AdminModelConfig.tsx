'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import {
  ADMIN_PRESET_PROVIDERS,
  ADMIN_PRESET_MODELS,
  PROVIDER_TEST_TYPE_MAP,
  encodeModelKey,
  parseModelKey,
  type PresetModel,
} from '@/lib/admin-model-config'

interface SavedProvider {
  id: string
  name: string
  apiKey: string
  hasApiKey: boolean
  enabledModels: string[]  // modelKey list
}

interface AdminModelConfigProps {
  // 从父组件传入的当前API Key配置
  currentApiKeys: Record<string, string>
  // 保存Provider API Key
  onSaveApiKey: (providerId: string, apiKey: string) => Promise<void>
  // 获取保存的模型配置
  savedConfig: {
    providers: SavedProvider[]
  } | null
  // 保存模型配置
  onSaveModelConfig: (config: { providers: SavedProvider[] }) => Promise<void>
}

interface TestStep {
  name: string
  status: 'pass' | 'fail' | 'skip'
  message: string
}

export default function AdminModelConfig({
  currentApiKeys,
  onSaveApiKey,
  savedConfig,
  onSaveModelConfig,
}: AdminModelConfigProps) {
  const [expandedProviders, setExpandedProviders] = useState<Record<string, boolean>>({})
  const [testingProvider, setTestingProvider] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, TestStep[]>>({})
  const [localApiKeys, setLocalApiKeys] = useState<Record<string, string>>({})
  const [localEnabledModels, setLocalEnabledModels] = useState<Record<string, Set<string>>>({})
  const [saving, setSaving] = useState(false)

  // 初始化本地状态
  useEffect(() => {
    const initialApiKeys: Record<string, string> = {}
    const initialEnabledModels: Record<string, Set<string>> = {}

    ADMIN_PRESET_PROVIDERS.forEach(provider => {
      // API Keys
      initialApiKeys[provider.id] = currentApiKeys[provider.id] || ''

      // Enabled models
      const savedProvider = savedConfig?.providers.find(p => p.id === provider.id)
      if (savedProvider) {
        initialEnabledModels[provider.id] = new Set(savedProvider.enabledModels)
      } else {
        // 默认启用所有预设模型
        const models = ADMIN_PRESET_MODELS.filter(m => m.provider === provider.id)
        initialEnabledModels[provider.id] = new Set(models.map(m => encodeModelKey(m.provider, m.modelId)))
      }
    })

    setLocalApiKeys(initialApiKeys)
    setLocalEnabledModels(initialEnabledModels)
  }, [currentApiKeys, savedConfig])

  // 测试Provider连接
  const handleTestProvider = useCallback(async (providerId: string) => {
    const apiKey = localApiKeys[providerId]
    if (!apiKey) {
      toast.error('请先输入API Key')
      return
    }

    setTestingProvider(providerId)
    setTestResults(prev => ({ ...prev, [providerId]: [] }))

    try {
      const testType = PROVIDER_TEST_TYPE_MAP[providerId]
      if (!testType) {
        throw new Error(`Unsupported provider: ${providerId}`)
      }

      const res = await fetch('/api/admin/platform-keys/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: testType }),
      })

      const data = await res.json()

      if (data.success) {
        setTestResults(prev => ({ ...prev, [providerId]: data.steps || [] }))
        toast.success(`${providerId} 连接成功`)
      } else {
        setTestResults(prev => ({ ...prev, [providerId]: data.steps || [] }))
        toast.error(`${providerId} 连接失败`)
      }
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [providerId]: [{ name: 'test', status: 'fail', message: error instanceof Error ? error.message : '测试失败' }],
      }))
      toast.error('测试失败')
    } finally {
      setTestingProvider(null)
    }
  }, [localApiKeys])

  // 保存API Key
  const handleSaveApiKey = useCallback(async (providerId: string) => {
    const apiKey = localApiKeys[providerId]
    if (!apiKey) {
      toast.error('API Key不能为空')
      return
    }

    try {
      await onSaveApiKey(providerId, apiKey)
      toast.success('API Key已保存')
    } catch (error) {
      toast.error('保存失败')
    }
  }, [localApiKeys, onSaveApiKey])

  // 切换模型启用状态
  const handleToggleModel = useCallback((providerId: string, modelKey: string) => {
    setLocalEnabledModels(prev => {
      const newSet = new Set(prev[providerId] || [])
      if (newSet.has(modelKey)) {
        newSet.delete(modelKey)
      } else {
        newSet.add(modelKey)
      }
      return { ...prev, [providerId]: newSet }
    })
  }, [])

  // 批量启用/禁用Provider的所有模型
  const handleToggleProviderModels = useCallback((providerId: string, enable: boolean) => {
    const models = ADMIN_PRESET_MODELS.filter(m => m.provider === providerId)
    const modelKeys = models.map(m => encodeModelKey(m.provider, m.modelId))

    setLocalEnabledModels(prev => ({
      ...prev,
      [providerId]: enable ? new Set(modelKeys) : new Set(),
    }))
  }, [])

  // 保存模型配置
  const handleSaveModelConfig = useCallback(async () => {
    setSaving(true)
    try {
      const providers = ADMIN_PRESET_PROVIDERS.map(provider => ({
        id: provider.id,
        name: provider.name,
        apiKey: localApiKeys[provider.id] || '',
        hasApiKey: !!localApiKeys[provider.id],
        enabledModels: Array.from(localEnabledModels[provider.id] || []),
      }))

      await onSaveModelConfig({ providers })
      toast.success('模型配置已保存')
    } catch (error) {
      toast.error('保存失败')
    } finally {
      setSaving(false)
    }
  }, [localApiKeys, localEnabledModels, onSaveModelConfig])

  // 切换Provider展开/折叠
  const toggleProvider = (providerId: string) => {
    setExpandedProviders(prev => ({
      ...prev,
      [providerId]: !prev[providerId],
    }))
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[white]">
            平台模型配置
          </h3>
          <p className="text-sm text-[rgba(255,255,255,0.5)] mt-1">
            配置各Provider的API Key，并选择启用的模型
          </p>
        </div>
        <button
          onClick={handleSaveModelConfig}
          disabled={saving}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存配置'}
        </button>
      </div>

      {/* Provider List */}
      {ADMIN_PRESET_PROVIDERS.map(provider => {
        const isExpanded = expandedProviders[provider.id]
        const hasApiKey = !!localApiKeys[provider.id]
        const testResult = testResults[provider.id]
        const isTesting = testingProvider === provider.id
        const enabledModels = localEnabledModels[provider.id] || new Set()
        const providerModels = ADMIN_PRESET_MODELS.filter(m => m.provider === provider.id)
        const enabledCount = enabledModels.size

        return (
          <div
            key={provider.id}
            className="bg-[var(--wuhu-bg-surface)] rounded-lg border border-[rgba(167, 87, 255, 0.2)]"
          >
            {/* Provider Header */}
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
              onClick={() => toggleProvider(provider.id)}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">
                  {isExpanded ? '▼' : '▶'}
                </span>
                <div>
                  <h4 className="font-medium text-[white]">
                    {provider.name}
                  </h4>
                  <p className="text-xs text-[rgba(255,255,255,0.5)]">
                    {providerModels.length} 个模型 · 已启用 {enabledCount} 个
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                {hasApiKey && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                    API Key 已配置
                  </span>
                )}
                <button
                  onClick={() => handleTestProvider(provider.id)}
                  disabled={isTesting || !hasApiKey}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 text-sm"
                >
                  {isTesting ? '测试中...' : '测试连接'}
                </button>
              </div>
            </div>

            {/* Provider Content */}
            {isExpanded && (
              <div className="border-t border-[rgba(167, 87, 255, 0.2)] p-4 space-y-4">
                {/* API Key Input */}
                <div>
                  <label className="block text-sm font-medium text-[white] mb-2">
                    API Key
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={localApiKeys[provider.id] || ''}
                      onChange={(e) => setLocalApiKeys(prev => ({
                        ...prev,
                        [provider.id]: e.target.value,
                      }))}
                      placeholder={`输入 ${provider.name} 的 API Key`}
                      className="flex-1 px-3 py-2 border border-[rgba(167, 87, 255, 0.2)] rounded bg-[var(--wuhu-bg-canvas)] text-[white] text-sm"
                    />
                    <button
                      onClick={() => handleSaveApiKey(provider.id)}
                      disabled={!localApiKeys[provider.id]}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
                    >
                      保存Key
                    </button>
                  </div>
                </div>

                {/* Test Results */}
                {testResult && testResult.length > 0 && (
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <p className="text-sm font-medium text-[white] mb-2">
                      测试结果
                    </p>
                    {testResult.map((step, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        <span className={
                          step.status === 'pass' ? 'text-green-500' :
                          step.status === 'fail' ? 'text-red-500' :
                          'text-gray-400'
                        }>
                          {step.status === 'pass' ? '✓' : step.status === 'fail' ? '✗' : '–'}
                        </span>
                        <span className="text-[rgba(255,255,255,0.7)]">
                          {step.name}: {step.message}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Model List */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-[white]">
                      预设模型 ({enabledCount}/{providerModels.length} 已启用)
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleProviderModels(provider.id, true)}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        全部启用
                      </button>
                      <button
                        onClick={() => handleToggleProviderModels(provider.id, false)}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        全部禁用
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {providerModels.map(model => {
                      const modelKey = encodeModelKey(model.provider, model.modelId)
                      const isEnabled = enabledModels.has(modelKey)

                      return (
                        <label
                          key={model.modelId}
                          className="flex items-center gap-3 p-2 rounded hover:bg-white/5 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={() => handleToggleModel(provider.id, modelKey)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <div className="flex-1">
                            <span className="text-sm text-[white]">
                              {model.name}
                            </span>
                            <span className="ml-2 text-xs text-[rgba(255,255,255,0.5)] font-mono">
                              {model.modelId}
                            </span>
                          </div>
                          <span className="text-xs text-[rgba(255,255,255,0.5)] px-2 py-0.5 bg-gray-100 rounded">
                            {model.type}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
