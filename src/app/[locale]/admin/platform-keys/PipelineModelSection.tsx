'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import {
  type PipelineModelAssignment,
  type PipelineModelAssignments,
} from '@/lib/platform-config'

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

const COMMON_PROVIDERS = [
  { value: 'ark', label: '火山引擎 (Ark)' },
  { value: 'fal', label: 'Fal.ai' },
  { value: 'google_ai', label: 'Google AI' },
  { value: 'qwen', label: '通义千问' },
  { value: 'openai', label: 'OpenAI' },
]

export default function PipelineModelSection({
  assignments,
  onSave,
}: PipelineModelSectionProps) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [localAssignments, setLocalAssignments] = useState<PipelineModelAssignments>(
    assignments || createEmptyAssignments(),
  )

  const handleStartEdit = () => {
    setLocalAssignments(assignments || createEmptyAssignments())
    setEditing(true)
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
        {editing ? (
          <div className="flex gap-2">
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
          </div>
        ) : (
          <button
            onClick={handleStartEdit}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            编辑
          </button>
        )}
      </div>

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
                  <div className="flex-1 flex gap-3">
                    <select
                      value={assignment?.provider || ''}
                      onChange={(e) => updateAssignment(pipeline, 'provider', e.target.value)}
                      className="flex-1 px-3 py-2 border border-[var(--glass-stroke-base)] rounded bg-[var(--glass-bg-canvas)] text-[var(--glass-text-primary)] text-sm"
                    >
                      <option value="">选择 Provider</option>
                      {COMMON_PROVIDERS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={assignment?.model || ''}
                      onChange={(e) => updateAssignment(pipeline, 'model', e.target.value)}
                      placeholder="模型 ID (如: doubao-seed-2-0)"
                      className="flex-1 px-3 py-2 border border-[var(--glass-stroke-base)] rounded bg-[var(--glass-bg-canvas)] text-[var(--glass-text-primary)] text-sm"
                    />
                  </div>
                ) : (
                  <div className="flex-1">
                    {assignment?.provider && assignment?.model ? (
                      <code className="px-3 py-1.5 bg-[var(--glass-bg-canvas)] rounded font-mono text-sm text-[var(--glass-text-secondary)]">
                        {assignment.provider}::{assignment.model}
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
