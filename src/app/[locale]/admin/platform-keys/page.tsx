'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'react-hot-toast'
import AdminModelConfig from './AdminModelConfig'
import {
  type PipelineModelAssignments,
} from '@/lib/platform-config'

interface PlatformKey {
  key: string
  value: string
  description: string | null
  updatedAt: string
}

interface SavedModelProvider {
  id: string
  name: string
  apiKey: string
  hasApiKey: boolean
  enabledModels: string[]
}

export default function PlatformKeysPage() {
  const t = useTranslations('admin')
  const [keys, setKeys] = useState<PlatformKey[]>([])
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Model config state
  const [savedModelConfig, setSavedModelConfig] = useState<{
    providers: SavedModelProvider[]
  } | null>(null)
  const [modelConfigLoading, setModelConfigLoading] = useState(true)

  useEffect(() => {
    fetchKeys()
    fetchModelConfig()
  }, [])

  const fetchKeys = async () => {
    try {
      const res = await fetch('/api/admin/platform-keys')
      if (!res.ok) throw new Error('获取失败')
      const data = await res.json()
      setKeys(data.configs || [])
    } catch (error) {
      toast.error('获取配置失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (key: string) => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/platform-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: editValue }),
      })
      if (!res.ok) throw new Error('保存失败')
      toast.success('保存成功')
      setEditingKey(null)
      fetchKeys()
    } catch (error) {
      toast.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const fetchModelConfig = async () => {
    try {
      const res = await fetch('/api/admin/model-config')
      if (!res.ok) {
        // Config may not exist yet
        setSavedModelConfig(null)
        return
      }
      const data = await res.json()
      setSavedModelConfig(data)
    } catch (error) {
      // Silently fail
    } finally {
      setModelConfigLoading(false)
    }
  }

  const handleSaveApiKey = async (providerId: string, apiKey: string) => {
    // Map provider ID to config key
    const keyMap: Record<string, string> = {
      'ark': 'platform.ark_api_key',
      'fal': 'platform.fal_api_key',
      'google_ai': 'platform.google_ai_key',
      'qwen': 'platform.qwen_api_key',
    }

    const configKey = keyMap[providerId]
    if (!configKey) {
      throw new Error(`Unknown provider: ${providerId}`)
    }

    const res = await fetch('/api/admin/platform-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: configKey, value: apiKey }),
    })

    if (!res.ok) throw new Error('保存失败')
  }

  const handleSaveModelConfig = async (config: { providers: SavedModelProvider[] }) => {
    const res = await fetch('/api/admin/model-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })

    if (!res.ok) throw new Error('保存失败')
    setSavedModelConfig(config)
  }

  const handleTest = async (provider: string) => {
    toast.loading('测试连接中...')
    try {
      const res = await fetch('/api/admin/platform-keys/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('连接成功')
      } else {
        toast.error(data.error || '连接失败')
      }
    } catch (error) {
      toast.error('测试失败')
    }
  }

  // Extract current API keys from keys list
  const currentApiKeys = keys.reduce<Record<string, string>>((acc, item) => {
    const providerMap: Record<string, string> = {
      'platform.ark_api_key': 'ark',
      'platform.fal_api_key': 'fal',
      'platform.google_ai_key': 'google_ai',
      'platform.qwen_api_key': 'qwen',
    }
    const providerId = providerMap[item.key]
    if (providerId && item.value) {
      acc[providerId] = item.value
    }
    return acc
  }, {})

  if (loading) {
    return <div className="text-[var(--glass-text-secondary)]">加载中...</div>
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-[var(--glass-text-primary)] mb-6">
        平台 API Key 配置
      </h2>

      <div className="space-y-6">
        {/* Model Config Section */}
        {modelConfigLoading ? (
          <div className="text-[var(--glass-text-secondary)]">加载模型配置...</div>
        ) : (
          <AdminModelConfig
            currentApiKeys={currentApiKeys}
            onSaveApiKey={handleSaveApiKey}
            savedConfig={savedModelConfig}
            onSaveModelConfig={handleSaveModelConfig}
          />
        )}

        {/* API Keys Section (Legacy) */}
        <div className="border-t border-[var(--glass-stroke-soft)] pt-6">
          <h3 className="text-lg font-semibold text-[var(--glass-text-primary)] mb-4">
            原始 API Key 配置（旧版）
          </h3>
          {keys.map((item) => (
            <div
              key={item.key}
              className="bg-[var(--glass-bg-surface)] rounded-lg border border-[var(--glass-stroke-soft)] p-6 mb-4"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-lg font-semibold text-[var(--glass-text-primary)]">
                    {item.description || item.key}
                  </h4>
                  <p className="text-sm text-[var(--glass-text-tertiary)] font-mono mt-1">
                    {item.key}
                  </p>
                </div>
                {editingKey === item.key ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSave(item.key)}
                      disabled={saving}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                    >
                      {saving ? '保存中...' : '保存'}
                    </button>
                    <button
                      onClick={() => setEditingKey(null)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditingKey(item.key)
                      setEditValue('')
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    编辑
                  </button>
                )}
              </div>

              {editingKey === item.key ? (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="输入新的 API Key"
                  className="w-full px-4 py-2 border border-[var(--glass-stroke-base)] rounded bg-[var(--glass-bg-canvas)] text-[var(--glass-text-primary)]"
                />
              ) : (
                <div className="flex items-center gap-4">
                  <code className="flex-1 px-4 py-2 bg-[var(--glass-bg-canvas)] rounded font-mono text-sm text-[var(--glass-text-secondary)]">
                    {item.value || '未配置'}
                  </code>
                  {item.value && (
                    <button
                      onClick={() => {
                        const provider = item.key.replace('platform.', '').replace('_api_key', '')
                        handleTest(provider)
                      }}
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      测试连接
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
