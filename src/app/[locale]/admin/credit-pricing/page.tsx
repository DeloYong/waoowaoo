'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'react-hot-toast'

interface PricingConfig {
  image: { basic: number; advanced: number }
  video: { basic_per_sec: number; advanced_per_sec: number }
  text: { per_1000_chars: number }
  audio: { per_10_sec: number }
  voiceDesign: { per_call: number }
  lipSync: { per_call: number }
}

interface TierMap {
  [key: string]: string
}

export default function CreditPricingPage() {
  const t = useTranslations('admin')
  const [pricing, setPricing] = useState<PricingConfig>({
    image: { basic: 1, advanced: 3 },
    video: { basic_per_sec: 5, advanced_per_sec: 20 },
    text: { per_1000_chars: 2 },
    audio: { per_10_sec: 2 },
    voiceDesign: { per_call: 5 },
    lipSync: { per_call: 10 },
  })
  const [tierMap, setTierMap] = useState<TierMap>({})
  const [newModelKey, setNewModelKey] = useState('')
  const [newTier, setNewTier] = useState('basic')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/admin/credit-pricing')
      if (!res.ok) throw new Error('获取失败')
      const data = await res.json()
      if (data.pricing) setPricing(data.pricing)
      if (data.tierMap) setTierMap(data.tierMap)
    } catch (error) {
      toast.error('获取配置失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/credit-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pricing, tierMap }),
      })
      if (!res.ok) throw new Error('保存失败')
      toast.success('保存成功')
    } catch (error) {
      toast.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const addModelTier = () => {
    if (!newModelKey) return
    setTierMap((prev) => ({ ...prev, [newModelKey]: newTier }))
    setNewModelKey('')
  }

  const removeModelTier = (key: string) => {
    setTierMap((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  if (loading) {
    return <div className="text-[var(--glass-text-secondary)]">加载中...</div>
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-[var(--glass-text-primary)] mb-6">
        积分定价配置
      </h2>

      <div className="space-y-8">
        {/* 积分定价 */}
        <div className="bg-[var(--glass-bg-surface)] rounded-lg border border-[var(--glass-stroke-soft)] p-6">
          <h3 className="text-lg font-semibold text-[var(--glass-text-primary)] mb-4">
            积分定价目录
          </h3>

          <div className="space-y-4">
            {/* 图片 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[var(--glass-text-secondary)] mb-2">
                  图片 - 基础档
                </label>
                <input
                  type="number"
                  value={pricing.image.basic}
                  onChange={(e) =>
                    setPricing((prev) => ({
                      ...prev,
                      image: { ...prev.image, basic: Number(e.target.value) },
                    }))
                  }
                  className="w-full px-4 py-2 border border-[var(--glass-stroke-base)] rounded bg-[var(--glass-bg-canvas)]"
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--glass-text-secondary)] mb-2">
                  图片 - 高级档
                </label>
                <input
                  type="number"
                  value={pricing.image.advanced}
                  onChange={(e) =>
                    setPricing((prev) => ({
                      ...prev,
                      image: { ...prev.image, advanced: Number(e.target.value) },
                    }))
                  }
                  className="w-full px-4 py-2 border border-[var(--glass-stroke-base)] rounded bg-[var(--glass-bg-canvas)]"
                />
              </div>
            </div>

            {/* 视频 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[var(--glass-text-secondary)] mb-2">
                  视频 - 基础档（每秒）
                </label>
                <input
                  type="number"
                  value={pricing.video.basic_per_sec}
                  onChange={(e) =>
                    setPricing((prev) => ({
                      ...prev,
                      video: { ...prev.video, basic_per_sec: Number(e.target.value) },
                    }))
                  }
                  className="w-full px-4 py-2 border border-[var(--glass-stroke-base)] rounded bg-[var(--glass-bg-canvas)]"
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--glass-text-secondary)] mb-2">
                  视频 - 高级档（每秒）
                </label>
                <input
                  type="number"
                  value={pricing.video.advanced_per_sec}
                  onChange={(e) =>
                    setPricing((prev) => ({
                      ...prev,
                      video: { ...prev.video, advanced_per_sec: Number(e.target.value) },
                    }))
                  }
                  className="w-full px-4 py-2 border border-[var(--glass-stroke-base)] rounded bg-[var(--glass-bg-canvas)]"
                />
              </div>
            </div>

            {/* 文本 */}
            <div>
              <label className="block text-sm text-[var(--glass-text-secondary)] mb-2">
                文本（每1000字符）
              </label>
              <input
                type="number"
                value={pricing.text.per_1000_chars}
                onChange={(e) =>
                  setPricing((prev) => ({
                    ...prev,
                    text: { per_1000_chars: Number(e.target.value) },
                  }))
                }
                className="w-full px-4 py-2 border border-[var(--glass-stroke-base)] rounded bg-[var(--glass-bg-canvas)]"
              />
            </div>

            {/* 音频 */}
            <div>
              <label className="block text-sm text-[var(--glass-text-secondary)] mb-2">
                音频（每10秒）
              </label>
              <input
                type="number"
                value={pricing.audio.per_10_sec}
                onChange={(e) =>
                  setPricing((prev) => ({
                    ...prev,
                    audio: { per_10_sec: Number(e.target.value) },
                  }))
                }
                className="w-full px-4 py-2 border border-[var(--glass-stroke-base)] rounded bg-[var(--glass-bg-canvas)]"
              />
            </div>

            {/* 语音设计 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[var(--glass-text-secondary)] mb-2">
                  语音设计（每次）
                </label>
                <input
                  type="number"
                  value={pricing.voiceDesign.per_call}
                  onChange={(e) =>
                    setPricing((prev) => ({
                      ...prev,
                      voiceDesign: { per_call: Number(e.target.value) },
                    }))
                  }
                  className="w-full px-4 py-2 border border-[var(--glass-stroke-base)] rounded bg-[var(--glass-bg-canvas)]"
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--glass-text-secondary)] mb-2">
                  唇形同步（每次）
                </label>
                <input
                  type="number"
                  value={pricing.lipSync.per_call}
                  onChange={(e) =>
                    setPricing((prev) => ({
                      ...prev,
                      lipSync: { per_call: Number(e.target.value) },
                    }))
                  }
                  className="w-full px-4 py-2 border border-[var(--glass-stroke-base)] rounded bg-[var(--glass-bg-canvas)]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 模型档次映射 */}
        <div className="bg-[var(--glass-bg-surface)] rounded-lg border border-[var(--glass-stroke-soft)] p-6">
          <h3 className="text-lg font-semibold text-[var(--glass-text-primary)] mb-4">
            模型档次映射
          </h3>

          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newModelKey}
                onChange={(e) => setNewModelKey(e.target.value)}
                placeholder="模型 Key (如: fal::fal-ai/flux/schnell)"
                className="flex-1 px-4 py-2 border border-[var(--glass-stroke-base)] rounded bg-[var(--glass-bg-canvas)]"
              />
              <select
                value={newTier}
                onChange={(e) => setNewTier(e.target.value)}
                className="px-4 py-2 border border-[var(--glass-stroke-base)] rounded bg-[var(--glass-bg-canvas)]"
              >
                <option value="basic">基础档</option>
                <option value="advanced">高级档</option>
              </select>
              <button
                onClick={addModelTier}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                添加
              </button>
            </div>

            <div className="space-y-2">
              {Object.entries(tierMap).map(([key, tier]) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-3 bg-[var(--glass-bg-canvas)] rounded"
                >
                  <div className="flex-1">
                    <code className="text-sm text-[var(--glass-text-primary)]">{key}</code>
                    <span className="ml-4 px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                      {tier}
                    </span>
                  </div>
                  <button
                    onClick={() => removeModelTier(key)}
                    className="px-3 py-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 保存按钮 */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 font-semibold"
        >
          {saving ? '保存中...' : '保存配置'}
        </button>
      </div>
    </div>
  )
}
