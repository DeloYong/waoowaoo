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

interface ProviderModel {
  id: string
  name?: string
  provider: string
  type?: string
}

const PIPELINE_LABELS: Record<string, string> = {
  image: '图片生成',
  video: '视频生成',
  text: '文本分析',
  audio: '语音合成 (TTS)',
  voiceDesign: '音色设计',
  lipSync: '口型同步',
}

const PIPELINE_DESCRIPTIONS: Record<string, string> = {
  image: '按图片张数计费，区分基础档/高级档模型',
  video: '按视频秒数计费，区分基础档/高级档模型',
  text: '按字符数计费，每1000字符消耗积分',
  audio: '按音频时长计费，每10秒消耗积分',
  voiceDesign: '按调用次数计费，每次生成音色消耗积分',
  lipSync: '按调用次数计费，每次口型同步消耗积分',
}

const TIER_LABELS: Record<string, string> = {
  basic: '基础档',
  advanced: '高级档',
}

const UNIT_LABELS: Record<string, Record<string, string>> = {
  image: { basic: '积分/张', advanced: '积分/张' },
  video: { basic_per_sec: '积分/秒', advanced_per_sec: '积分/秒' },
  text: { per_1000_chars: '积分/千字符' },
  audio: { per_10_sec: '积分/10秒' },
  voiceDesign: { per_call: '积分/次' },
  lipSync: { per_call: '积分/次' },
}

function PricingInput({
  label,
  value,
  onChange,
  unit,
  description,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  unit: string
  description?: string
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-[rgba(255,255,255,0.7)]">
        {label}
      </label>
      {description && (
        <p className="text-xs text-[rgba(255,255,255,0.5)]">{description}</p>
      )}
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-32 px-3 py-2 border border-[rgba(167, 87, 255, 0.2)] rounded bg-[var(--wuhu-bg-canvas)] text-[white] text-sm"
        />
        <span className="text-xs text-[rgba(255,255,255,0.5)]">{unit}</span>
      </div>
    </div>
  )
}

function PricingSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="p-4 rounded-lg border border-[rgba(167, 87, 255, 0.2)] bg-[var(--wuhu-bg-canvas)]/50">
      <h4 className="text-sm font-semibold text-[white] mb-1">{title}</h4>
      <p className="text-xs text-[rgba(255,255,255,0.5)] mb-3">{description}</p>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function PriceCalculator({
  pricing,
}: {
  pricing: PricingConfig
}) {
  const [calcType, setCalcType] = useState<string>('image')
  const [calcQuantity, setCalcQuantity] = useState(1)
  const [calcTier, setCalcTier] = useState<string>('basic')

  let unitPrice = 0
  let unit = ''
  let totalCredits = 0

  switch (calcType) {
    case 'image':
      unitPrice = calcTier === 'basic' ? pricing.image.basic : pricing.image.advanced
      unit = '张'
      totalCredits = Math.ceil(unitPrice * calcQuantity)
      break
    case 'video':
      unitPrice = calcTier === 'basic' ? pricing.video.basic_per_sec : pricing.video.advanced_per_sec
      unit = '秒'
      totalCredits = Math.ceil(unitPrice * calcQuantity)
      break
    case 'text':
      unitPrice = pricing.text.per_1000_chars
      unit = '千字符'
      totalCredits = Math.ceil(unitPrice * calcQuantity)
      break
    case 'audio':
      unitPrice = pricing.audio.per_10_sec
      unit = '10秒'
      totalCredits = Math.ceil(unitPrice * calcQuantity)
      break
    case 'voiceDesign':
      unitPrice = pricing.voiceDesign.per_call
      unit = '次'
      totalCredits = Math.ceil(unitPrice * calcQuantity)
      break
    case 'lipSync':
      unitPrice = pricing.lipSync.per_call
      unit = '次'
      totalCredits = Math.ceil(unitPrice * calcQuantity)
      break
  }

  return (
    <div className="p-4 rounded-lg border border-[rgba(167, 87, 255, 0.2)] bg-[var(--wuhu-bg-canvas)]/50">
      <h4 className="text-sm font-semibold text-[white] mb-3">积分消耗试算</h4>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="block text-xs text-[rgba(255,255,255,0.5)] mb-1">类型</label>
          <select
            value={calcType}
            onChange={(e) => { setCalcType(e.target.value); setCalcQuantity(1) }}
            className="px-3 py-1.5 border border-[rgba(167, 87, 255, 0.2)] rounded bg-[var(--wuhu-bg-canvas)] text-[white] text-sm"
          >
            {Object.entries(PIPELINE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        {(calcType === 'image' || calcType === 'video') && (
          <div>
            <label className="block text-xs text-[rgba(255,255,255,0.5)] mb-1">档次</label>
            <select
              value={calcTier}
              onChange={(e) => setCalcTier(e.target.value)}
              className="px-3 py-1.5 border border-[rgba(167, 87, 255, 0.2)] rounded bg-[var(--wuhu-bg-canvas)] text-[white] text-sm"
            >
              <option value="basic">基础档</option>
              <option value="advanced">高级档</option>
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs text-[rgba(255,255,255,0.5)] mb-1">数量</label>
          <input
            type="number"
            min={1}
            value={calcQuantity}
            onChange={(e) => setCalcQuantity(Math.max(1, Number(e.target.value)))}
            className="w-24 px-3 py-1.5 border border-[rgba(167, 87, 255, 0.2)] rounded bg-[var(--wuhu-bg-canvas)] text-[white] text-sm"
          />
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <div>
          <span className="text-[rgba(255,255,255,0.5)]">单价：</span>
          <span className="text-[white] font-medium">{unitPrice}</span>
          <span className="text-[rgba(255,255,255,0.5)]"> 积分/{unit}</span>
        </div>
        <div className="text-[rgba(255,255,255,0.5)]">x</div>
        <div>
          <span className="text-[rgba(255,255,255,0.5)]">数量：</span>
          <span className="text-[white] font-medium">{calcQuantity} {unit}</span>
        </div>
        <div className="text-[rgba(255,255,255,0.5)]">=</div>
        <div className="px-3 py-1.5 rounded bg-[rgba(0, 255, 255, 0.1)] text-[var(--wuhu-neon-cyan)] font-bold">
          {totalCredits} 积分
        </div>
      </div>
    </div>
  )
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
  const [providerModels, setProviderModels] = useState<ProviderModel[]>([])
  const [newModelKey, setNewModelKey] = useState('')
  const [newTier, setNewTier] = useState('basic')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const [pricingRes, modelsRes] = await Promise.all([
        fetch('/api/admin/credit-pricing'),
        fetch('/api/admin/platform-keys/models'),
      ])
      if (pricingRes.ok) {
        const data = await pricingRes.json()
        if (data.pricing) setPricing(data.pricing)
        if (data.tierMap) setTierMap(data.tierMap)
      }
      if (modelsRes.ok) {
        const data = await modelsRes.json()
        const providers: Array<{ success: boolean; models: ProviderModel[] }> = data.providers || []
        const allModels: ProviderModel[] = []
        providers.forEach(p => {
          if (p.success) allModels.push(...p.models)
        })
        setProviderModels(allModels)
      }
    } catch {
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
    } catch {
      toast.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const addModelTier = (modelKey: string) => {
    if (!modelKey) return
    setTierMap((prev) => ({ ...prev, [modelKey]: newTier }))
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
    return <div className="text-[rgba(255,255,255,0.7)]">加载中...</div>
  }

  // 将模型按类型分组
  const modelsByType: Record<string, ProviderModel[]> = {}
  providerModels.forEach(m => {
    const type = m.type || 'unknown'
    if (!modelsByType[type]) modelsByType[type] = []
    modelsByType[type].push(m)
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[white]">
            积分定价配置
          </h2>
          <p className="text-sm text-[rgba(255,255,255,0.5)] mt-1">
            管理各类型 AI 服务的积分消耗定价，配置模型档次映射
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 font-medium"
        >
          {saving ? '保存中...' : '保存配置'}
        </button>
      </div>

      <div className="space-y-8">
        {/* 积分定价目录 */}
        <div className="bg-[var(--wuhu-bg-surface)] rounded-lg border border-[rgba(167, 87, 255, 0.2)] p-6">
          <h3 className="text-lg font-semibold text-[white] mb-2">
            积分定价目录
          </h3>
          <p className="text-sm text-[rgba(255,255,255,0.5)] mb-4">
            设置各类 AI 服务的积分消耗单价。基础档适用于轻量模型，高级档适用于高质量模型。
          </p>

          <div className="space-y-4">
            {/* 图片 */}
            <PricingSection
              title={PIPELINE_LABELS.image}
              description={PIPELINE_DESCRIPTIONS.image}
            >
              <div className="grid grid-cols-2 gap-4">
                <PricingInput
                  label={`${TIER_LABELS.basic}单价`}
                  value={pricing.image.basic}
                  onChange={(v) => setPricing((p) => ({ ...p, image: { ...p.image, basic: v } }))}
                  unit={UNIT_LABELS.image.basic}
                  description="如 Seedream Lite、Flux Schnell 等快速模型"
                />
                <PricingInput
                  label={`${TIER_LABELS.advanced}单价`}
                  value={pricing.image.advanced}
                  onChange={(v) => setPricing((p) => ({ ...p, image: { ...p.image, advanced: v } }))}
                  unit={UNIT_LABELS.image.advanced}
                  description="如 Seedream Pro、Flux Pro 等高质量模型"
                />
              </div>
            </PricingSection>

            {/* 视频 */}
            <PricingSection
              title={PIPELINE_LABELS.video}
              description={PIPELINE_DESCRIPTIONS.video}
            >
              <div className="grid grid-cols-2 gap-4">
                <PricingInput
                  label={`${TIER_LABELS.basic}单价`}
                  value={pricing.video.basic_per_sec}
                  onChange={(v) => setPricing((p) => ({ ...p, video: { ...p.video, basic_per_sec: v } }))}
                  unit={UNIT_LABELS.video.basic_per_sec}
                  description="如 Seedance Fast、Wan Flash 等快速模型"
                />
                <PricingInput
                  label={`${TIER_LABELS.advanced}单价`}
                  value={pricing.video.advanced_per_sec}
                  onChange={(v) => setPricing((p) => ({ ...p, video: { ...p.video, advanced_per_sec: v } }))}
                  unit={UNIT_LABELS.video.advanced_per_sec}
                  description="如 Seedance Pro、Wan Pro 等高质量模型"
                />
              </div>
            </PricingSection>

            {/* 文本 */}
            <PricingSection
              title={PIPELINE_LABELS.text}
              description={PIPELINE_DESCRIPTIONS.text}
            >
              <PricingInput
                label="单价"
                value={pricing.text.per_1000_chars}
                onChange={(v) => setPricing((p) => ({ ...p, text: { per_1000_chars: v } }))}
                unit={UNIT_LABELS.text.per_1000_chars}
                description="适用于所有 LLM 文本分析模型"
              />
            </PricingSection>

            {/* 音频 */}
            <PricingSection
              title={PIPELINE_LABELS.audio}
              description={PIPELINE_DESCRIPTIONS.audio}
            >
              <PricingInput
                label="单价"
                value={pricing.audio.per_10_sec}
                onChange={(v) => setPricing((p) => ({ ...p, audio: { per_10_sec: v } }))}
                unit={UNIT_LABELS.audio.per_10_sec}
                description="适用于所有 TTS 语音合成模型"
              />
            </PricingSection>

            {/* 语音设计 + 口型同步 */}
            <div className="grid grid-cols-2 gap-4">
              <PricingSection
                title={PIPELINE_LABELS.voiceDesign}
                description={PIPELINE_DESCRIPTIONS.voiceDesign}
              >
                <PricingInput
                  label="单价"
                  value={pricing.voiceDesign.per_call}
                  onChange={(v) => setPricing((p) => ({ ...p, voiceDesign: { per_call: v } }))}
                  unit={UNIT_LABELS.voiceDesign.per_call}
                />
              </PricingSection>

              <PricingSection
                title={PIPELINE_LABELS.lipSync}
                description={PIPELINE_DESCRIPTIONS.lipSync}
              >
                <PricingInput
                  label="单价"
                  value={pricing.lipSync.per_call}
                  onChange={(v) => setPricing((p) => ({ ...p, lipSync: { per_call: v } }))}
                  unit={UNIT_LABELS.lipSync.per_call}
                />
              </PricingSection>
            </div>
          </div>
        </div>

        {/* 积分试算 */}
        <div className="bg-[var(--wuhu-bg-surface)] rounded-lg border border-[rgba(167, 87, 255, 0.2)] p-6">
          <h3 className="text-lg font-semibold text-[white] mb-2">
            积分消耗试算
          </h3>
          <p className="text-sm text-[rgba(255,255,255,0.5)] mb-4">
            根据当前定价配置，试算各类操作的积分消耗
          </p>
          <PriceCalculator pricing={pricing} />
        </div>

        {/* 模型档次映射 */}
        <div className="bg-[var(--wuhu-bg-surface)] rounded-lg border border-[rgba(167, 87, 255, 0.2)] p-6">
          <h3 className="text-lg font-semibold text-[white] mb-2">
            模型档次映射
          </h3>
          <p className="text-sm text-[rgba(255,255,255,0.5)] mb-4">
            为每个模型指定档次（基础档/高级档），决定使用哪个定价。未映射的模型默认为基础档。
          </p>

          <div className="space-y-4">
            {/* 快捷添加：从已有模型中选择 */}
            {Object.keys(modelsByType).length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-medium text-[rgba(255,255,255,0.7)] uppercase tracking-wider">从已连接的模型中选择</h5>
                {Object.entries(modelsByType).map(([type, models]) => (
                  <div key={type} className="space-y-1">
                    <p className="text-xs text-[rgba(255,255,255,0.5)]">{type === 'image' ? '图片模型' : type === 'video' ? '视频模型' : type === 'llm' ? 'LLM 模型' : type === 'audio' ? '音频模型' : type === 'voicedesign' ? '音色设计模型' : type === 'lipsync' ? '口型同步模型' : type}</p>
                    <div className="flex flex-wrap gap-1">
                      {models.map((model) => {
                        const modelKey = `${model.provider}::${model.id}`
                        const isMapped = tierMap[modelKey] !== undefined
                        return (
                          <button
                            key={modelKey}
                            onClick={() => {
                              if (isMapped) {
                                removeModelTier(modelKey)
                              } else {
                                setTierMap((prev) => ({
                                  ...prev,
                                  [modelKey]: type === 'image' || type === 'video' ? newTier : 'basic',
                                }))
                              }
                            }}
                            className={`px-2 py-1 text-xs rounded border transition-colors ${
                              isMapped
                                ? 'bg-blue-100 border-blue-300 text-blue-700'
                                : 'bg-[var(--wuhu-bg-canvas)] border-[rgba(167, 87, 255, 0.2)] text-[rgba(255,255,255,0.7)] hover:bg-[rgba(255,255,255,0.05)]'
                            }`}
                            title={isMapped ? `已映射为 ${TIER_LABELS[tierMap[modelKey]] || tierMap[modelKey]}，点击移除` : `点击映射为 ${TIER_LABELS[newTier]}`}
                          >
                            {model.name || model.id}
                            {isMapped && ` (${TIER_LABELS[tierMap[modelKey]] || tierMap[modelKey]})`}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 手动添加 */}
            <div className="border-t border-[rgba(167, 87, 255, 0.2)] pt-4">
              <h5 className="text-xs font-medium text-[rgba(255,255,255,0.7)] uppercase tracking-wider mb-2">手动添加</h5>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newModelKey}
                  onChange={(e) => setNewModelKey(e.target.value)}
                  placeholder="模型 Key (如: ark::doubao-seedream-4-5-251128)"
                  className="flex-1 px-3 py-2 border border-[rgba(167, 87, 255, 0.2)] rounded bg-[var(--wuhu-bg-canvas)] text-[white] text-sm"
                />
                <select
                  value={newTier}
                  onChange={(e) => setNewTier(e.target.value)}
                  className="px-3 py-2 border border-[rgba(167, 87, 255, 0.2)] rounded bg-[var(--wuhu-bg-canvas)] text-[white] text-sm"
                >
                  <option value="basic">{TIER_LABELS.basic}</option>
                  <option value="advanced">{TIER_LABELS.advanced}</option>
                </select>
                <button
                  onClick={() => addModelTier(newModelKey)}
                  disabled={!newModelKey}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
                >
                  添加
                </button>
              </div>
            </div>

            {/* 已映射列表 */}
            {Object.keys(tierMap).length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-medium text-[rgba(255,255,255,0.7)] uppercase tracking-wider">已映射模型</h5>
                <div className="space-y-1.5">
                  {Object.entries(tierMap).map(([key, tier]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between p-2.5 bg-[var(--wuhu-bg-canvas)] rounded border border-[rgba(167, 87, 255, 0.2)]"
                    >
                      <div className="flex items-center gap-3">
                        <code className="text-sm text-[white] font-mono">{key}</code>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          tier === 'advanced'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {TIER_LABELS[tier] || tier}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={tier}
                          onChange={(e) => setTierMap((prev) => ({ ...prev, [key]: e.target.value }))}
                          className="px-2 py-1 border border-[rgba(167, 87, 255, 0.2)] rounded bg-[var(--wuhu-bg-canvas)] text-[white] text-xs"
                        >
                          <option value="basic">{TIER_LABELS.basic}</option>
                          <option value="advanced">{TIER_LABELS.advanced}</option>
                        </select>
                        <button
                          onClick={() => removeModelTier(key)}
                          className="px-2 py-1 text-red-500 hover:bg-red-50 rounded text-xs"
                        >
                          移除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Object.keys(tierMap).length === 0 && (
              <p className="text-sm text-[rgba(255,255,255,0.5)] text-center py-4">
                暂无模型档次映射，未映射的模型将使用基础档定价
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
