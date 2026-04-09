'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'react-hot-toast'

interface PlatformKey {
  key: string
  value: string
  description: string | null
  updatedAt: string
}

export default function PlatformKeysPage() {
  const t = useTranslations('admin')
  const [keys, setKeys] = useState<PlatformKey[]>([])
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchKeys()
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

  if (loading) {
    return <div className="text-[var(--glass-text-secondary)]">加载中...</div>
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-[var(--glass-text-primary)] mb-6">
        平台 API Key 配置
      </h2>

      <div className="space-y-6">
        {keys.map((item) => (
          <div
            key={item.key}
            className="bg-[var(--glass-bg-surface)] rounded-lg border border-[var(--glass-stroke-soft)] p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-[var(--glass-text-primary)]">
                  {item.description || item.key}
                </h3>
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
  )
}
