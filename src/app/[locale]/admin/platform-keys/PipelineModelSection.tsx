'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import {
  type PipelineModelAssignment,
  type PipelineModelAssignments,
} from '@/lib/platform-config'
import type { ProviderModelsResult } from '@/lib/platform-models'

interface PipelineModelSectionProps {
  assignments: PipelineModelAssignments | null
  onSave: (assignments: PipelineModelAssignments) => Promise<void>
}

const PIPELINE_LABELS: Record<keyof PipelineModelAssignments, string> = {
  analysis: 'AI 分析',
  character: '角色生成',
  location: '场景生成',
  storyboard: '分镜生成',
  edit: '修图/编辑',
  video: '视频生成',
  audio: '语音合成 (TTS)',
  lipSync: '口型同步',
  voiceDesign: '声音设计',
}

const PROVIDER_LABELS: Record<string, string> = {
  ark: '火山引擎 (Ark)',
  fal: 'Fal.ai',
  google_ai: 'Google AI',
  qwen: '通义千问',
  openai: 'OpenAI',
}

interface ProviderModel {
  id: string
  name?: string
  provider: string
}

export default function PipelineModelSection({
  assignments,
  onSave,
}: PipelineModelSectionProps) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [localAssignments, setLocalAssignments] = useState<PipelineModelAssignments>(
    assignments || createEmptyAssignments(),
  )

  // 模型数据
  const [providerModels, setProviderModels] = useState<ProviderModel[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelsError, setModelsError] = useState<string | null>(null)

  // 加载所有Provider的模型
  const loadProviderModels = useCallback(async (forceRefresh = false) => {
    setModelsLoading(true)
    setModelsError(null)
    try {
      const url = forceRefresh
        ? '/api/admin/platform-keys/models?refresh=true'
        : '/api/admin/platform-keys/models'
      const res = await fetch(url)
      if (!res.ok) throw new Error('获取模型列表失败')

      const data = await res.json()
      const providers: ProviderModelsResult[] = data.providers || []

      // 聚合所有Provider的模型
      const allModels: ProviderModel[] = []
      providers.forEach(provider => {
        if (provider.success && provider.models.length > 0) {
          allModels.push(...provider.models)
        }
      })

      setProviderModels(allModels)

      if (allModels.length === 0) {
        setModelsError('未找到可用模型，请检查API Key配置')
      } else if (forceRefresh) {
        toast.success(`已刷新，共 ${allModels.length} 个模型`)
      } else {
        toast.success(`已加载 ${allModels.length} 个模型`)
      }
    } catch (error) {
      setModelsError(error instanceof Error ? error.message : '加载失败')
      toast.error('加载模型列表失败')
    } finally {
      setModelsLoading(false)
    }
  }, [])

  // 进入编辑模式时自动加载模型
  const handleStartEdit = async () => {
    setLocalAssignments(assignments || createEmptyAssignments())
    setEditing(true)
    if (providerModels.length === 0 && !modelsLoading) {
      await loadProviderModels()
    }
  }

  const handleCancel = () => {
    setEditing(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(localAssignments)
      toast.success('流程模型配置已保存')
      setEditing(false)
    } catch (error) {
      toast.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const updateAssignment = (
    pipeline: keyof PipelineModelAssignments,
    field: keyof PipelineModelAssignment,
    value: string,
  ) => {
    setLocalAssignments((prev) => ({
      ...prev,
      [pipeline]: {
        ...prev[pipeline],
        [field]: value,
      },
    }))
  }

  // 选择模型时自动解析provider和model
  const handleModelSelect = (
    pipeline: keyof PipelineModelAssignments,
    modelKey: string,
  ) => {
    if (!modelKey) {
      // 清空选择
      updateAssignment(pipeline, 'provider', '')
      updateAssignment(pipeline, 'model', '')
      return
    }

    const [provider, model] = modelKey.split('::')
    updateAssignment(pipeline, 'provider', provider)
    updateAssignment(pipeline, 'model', model)
  }

  // 按Provider分组模型
  const modelsByProvider = providerModels.reduce<Record<string, ProviderModel[]>>((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = []
    }
    acc[model.provider].push(model)
    return acc
  }, {})

  return (
    <div className="bg-[var(--glass-bg-surface)] rounded-lg border border-[var(--glass-stroke-soft)] p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-[var(--glass-text-primary)]">
            流程模型配置
          </h3>
          <p className="text-sm text-[var(--glass-text-tertiary)] mt-1">
            为每个流程步骤设置系统默认模型，所有用户将使用这些模型
          </p>
        </div>
        <div className="flex gap-2">
          {editing && (
            <button
              onClick={() => loadProviderModels(true)}
              disabled={modelsLoading}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 text-sm"
              title="强制刷新模型列表（清除缓存）"
            >
              {modelsLoading ? '刷新中...' : '刷新模型'}
            </button>
          )}
          {editing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                取消
              </button>
            </>
          ) : (
            <button
              onClick={handleStartEdit}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              编辑
            </button>
          )}
        </div>
      </div>

      {/* 模型加载状态 */}
      {editing && modelsLoading && (
        <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
          <p className="text-sm text-blue-700">正在加载可用模型...</p>
        </div>
      )}

      {editing && modelsError && (
        <div className="mb-4 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
          <p className="text-sm text-yellow-700">{modelsError}</p>
        </div>
      )}

      <div className="space-y-4">
        {(Object.keys(PIPELINE_LABELS) as Array<keyof PipelineModelAssignments>).map(
          (pipeline) => {
            const assignment = editing
              ? localAssignments[pipeline]
              : assignments?.[pipeline]
            const label = PIPELINE_LABELS[pipeline]

            return (
              <div
                key={pipeline}
                className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 border-t border-[var(--glass-stroke-soft)]"
              >
                <div className="sm:w-32 shrink-0">
                  <span className="text-sm font-medium text-[var(--glass-text-primary)]">
                    {label}
                  </span>
                </div>

                {editing ? (
                  <div className="flex-1">
                    <select
                      value={assignment?.provider && assignment?.model
                        ? `${assignment.provider}::${assignment.model}`
                        : ''
                      }
                      onChange={(e) => handleModelSelect(pipeline, e.target.value)}
                      className="w-full px-3 py-2 border border-[var(--glass-stroke-base)] rounded bg-[var(--glass-bg-canvas)] text-[var(--glass-text-primary)] text-sm"
                    >
                      <option value="">选择模型</option>
                      {Object.entries(modelsByProvider).map(([provider, models]) => (
                        <optgroup
                          key={provider}
                          label={PROVIDER_LABELS[provider] || provider}
                        >
                          {models.map((model) => (
                            <option
                              key={`${provider}::${model.id}`}
                              value={`${provider}::${model.id}`}
                            >
                              {model.name || model.id}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex-1">
                    {assignment?.provider && assignment?.model ? (
                      <code className="px-3 py-1.5 bg-[var(--glass-bg-canvas)] rounded font-mono text-sm text-[var(--glass-text-secondary)]">
                        {PROVIDER_LABELS[assignment.provider] || assignment.provider} :: {assignment.model}
                      </code>
                    ) : (
                      <span className="text-sm text-[var(--glass-text-tertiary)]">未配置</span>
                    )}
                  </div>
                )}
              </div>
            )
          },
        )}
      </div>

      {/* 模型统计 */}
      {!editing && (
        <div className="mt-4 pt-4 border-t border-[var(--glass-stroke-soft)]">
          <p className="text-xs text-[var(--glass-text-tertiary)]">
            已配置: {(Object.values(assignments || {}).filter(a => a?.provider && a?.model).length)} / {Object.keys(PIPELINE_LABELS).length} 个流程步骤
          </p>
        </div>
      )}
    </div>
  )
}

function createEmptyAssignments(): PipelineModelAssignments {
  return {
    analysis: { provider: '', model: '' },
    character: { provider: '', model: '' },
    location: { provider: '', model: '' },
    storyboard: { provider: '', model: '' },
    edit: { provider: '', model: '' },
    video: { provider: '', model: '' },
    audio: { provider: '', model: '' },
    lipSync: { provider: '', model: '' },
    voiceDesign: { provider: '', model: '' },
  }
}
