'use client'

import { useEffect, useState } from 'react'
import { logWarn as _ulogWarn } from '@/lib/logging/core'
import { AppIcon } from '@/components/ui/icons'

interface Clip {
  id: string
  clipIndex?: number
  summary: string
  content: string
  screenplay?: string | null
  characters: string | null
  location: string | null
}

type ScreenplayContentItem =
  | { type: 'action'; text: string }
  | { type: 'dialogue'; character: string; lines: string }
  | { type: 'voiceover'; text: string }

interface ScreenplayScene {
  scene_number?: number
  heading?: {
    int_ext?: string
    location?: string
    time?: string
  }
  description?: string
  content?: ScreenplayContentItem[]
}

interface ScreenplayData {
  scenes: ScreenplayScene[]
}

function parseScreenplay(value: string | null | undefined): ScreenplayData | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    if (!parsed || typeof parsed !== 'object') return null
    const scenes = (parsed as { scenes?: unknown }).scenes
    if (!Array.isArray(scenes)) return null
    return parsed as ScreenplayData
  } catch (error) {
    _ulogWarn('解析剧本JSON失败:', error)
    return null
  }
}

interface ScriptViewScriptPanelProps {
  clips: Clip[]
  selectedClipId: string | null
  onSelectClip: (clipId: string) => void
  savingClips: Set<string>
  onClipEdit?: (clipId: string) => void
  onClipDelete?: (clipId: string) => void
  onClipUpdate?: (clipId: string, data: Partial<Clip>) => void
  t: (key: string, values?: Record<string, unknown>) => string
  tScript: (key: string, values?: Record<string, unknown>) => string
}

function EditableText({
  text,
  onSave,
  className = '',
  tScript,
}: {
  text: string
  onSave: (val: string) => void
  className?: string
  tScript: (key: string, values?: Record<string, unknown>) => string
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(text)

  useEffect(() => {
    setValue(text)
  }, [text])

  const handleBlur = () => {
    setIsEditing(false)
    if (value !== text) {
      onSave(value)
    }
  }

  if (isEditing) {
    return (
      <textarea
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        className={`w-full bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 rounded p-1 outline-none focus:ring-2 focus:ring-[var(--wuhu-neon-pink)]/50 text-white ${className}`}
        style={{ resize: 'none', minHeight: '1.5em' }}
      />
    )
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation()
        setIsEditing(true)
      }}
      className={`cursor-text hover:bg-[var(--wuhu-neon-purple)]/10 rounded px-1 -mx-1 transition-colors border border-transparent hover:border-[var(--wuhu-neon-purple)]/30 ${className}`}
      title={tScript('screenplay.clickToEdit')}
    >
      {text}
    </div>
  )
}

export default function ScriptViewScriptPanel({
  clips,
  selectedClipId,
  onSelectClip,
  savingClips,
  onClipEdit,
  onClipDelete,
  onClipUpdate,
  t,
  tScript,
}: ScriptViewScriptPanelProps) {
  const handleScriptSave = async (clipId: string, newContent: string, isJson: boolean) => {
    if (!onClipUpdate) return
    const updateData: Partial<Clip> = isJson ? { screenplay: newContent } : { content: newContent }
    await onClipUpdate(clipId, updateData)
  }

  return (
    <div className="col-span-12 lg:col-span-8 flex flex-col min-h-[400px] lg:h-full gap-4">
      <div className="flex justify-between items-end px-2">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="w-1.5 h-6 bg-gradient-to-b from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] rounded-full" /> {tScript('scriptBreakdown')}
        </h2>
        <span className="text-sm text-white/50">
          {tScript('splitCount', { count: clips.length })}
        </span>
      </div>

      <div className="flex-1 bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/20 shadow-[0_0_30px_rgba(167,87,255,0.1)] rounded-2xl overflow-hidden flex flex-col relative w-full min-h-[300px]">
        <div className="lg:absolute lg:inset-0 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {clips.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-white/40">
              <AppIcon name="fileFold" className="h-10 w-10 mb-2" />
              <p>{tScript('noClips')}</p>
            </div>
          ) : (
            clips.map((clip, idx) => {
              const screenplay = parseScreenplay(clip.screenplay)

              return (
                <div
                  key={clip.id}
                  onClick={() => onSelectClip(clip.id)}
                  className={`
                    group p-5 border-[1.5px] rounded-2xl transition-all cursor-pointer relative bg-[var(--wuhu-bg-surface)]
                    ${selectedClipId === clip.id
                      ? 'border-[var(--wuhu-neon-pink)] shadow-[0_0_30px_rgba(255,100,200,0.2)] ring-2 ring-[var(--wuhu-neon-pink)]/20'
                      : 'border-[var(--wuhu-neon-purple)]/20 hover:border-[var(--wuhu-neon-purple)]/50 hover:shadow-[0_0_20px_rgba(167,87,255,0.15)]'
                    }
                  `}
                >
                  {savingClips.has(clip.id) && (
                    <div className="absolute top-2 right-2 text-xs text-[var(--wuhu-neon-purple)] flex items-center gap-1 animate-pulse">
                      <AppIcon name="upload" className="w-3 h-3" />
                      {t('preview.saving')}
                    </div>
                  )}

                  <div className="flex justify-between mb-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded text-[var(--wuhu-neon-purple)] bg-[var(--wuhu-neon-purple)]/10">
                      {tScript('segment.title', { index: idx + 1 })} {selectedClipId === clip.id && tScript('segment.selected')}
                    </span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onClipEdit && (
                        <button
                          onClick={() => onClipEdit(clip.id)}
                          className="text-white/40 text-xs cursor-pointer hover:text-[var(--wuhu-neon-purple)]"
                        >
                          {t('common.edit')}
                        </button>
                      )}
                      {onClipDelete && (
                        <button
                          onClick={() => onClipDelete(clip.id)}
                          className="text-white/40 text-xs cursor-pointer hover:text-[var(--wuhu-neon-pink)]"
                        >
                          {t('common.delete')}
                        </button>
                      )}
                    </div>
                  </div>

                  {screenplay && screenplay.scenes ? (
                    <div className="space-y-3 text-white">
                      {screenplay.scenes.map((scene, sceneIdx: number) => (
                        <div key={sceneIdx}>
                          {/* 场景头信息 */}
                          <div className="flex items-center gap-1.5 text-xs mb-2 flex-wrap">
                            <span className="font-bold text-[var(--wuhu-neon-purple)] bg-[var(--wuhu-neon-purple)]/10 px-2 py-0.5 rounded">
                              {tScript('screenplay.scene', { number: scene.scene_number })}
                            </span>
                            <span className="text-white/50 flex items-center gap-1">
                              {scene.heading?.int_ext} ·
                              <EditableText
                                text={scene.heading?.location || ''}
                                onSave={(newVal) => {
                                  const newScreenplay = JSON.parse(JSON.stringify(screenplay))
                                  newScreenplay.scenes[sceneIdx].heading.location = newVal
                                  void handleScriptSave(clip.id, JSON.stringify(newScreenplay), true)
                                }}
                                className="inline"
                                tScript={tScript}
                              />
                              ·
                              <EditableText
                                text={scene.heading?.time || ''}
                                onSave={(newVal) => {
                                  const newScreenplay = JSON.parse(JSON.stringify(screenplay))
                                  newScreenplay.scenes[sceneIdx].heading.time = newVal
                                  void handleScriptSave(clip.id, JSON.stringify(newScreenplay), true)
                                }}
                                className="inline"
                                tScript={tScript}
                              />
                            </span>
                          </div>

                          {/* 场景描述 */}
                          {scene.description && (
                            <div className="text-xs text-white/70 bg-white/5 border-l-2 border-[var(--wuhu-neon-purple)]/30 px-2 py-1 rounded mb-2">
                              <EditableText
                                text={scene.description}
                                onSave={(newVal) => {
                                  const newScreenplay = JSON.parse(JSON.stringify(screenplay))
                                  newScreenplay.scenes[sceneIdx].description = newVal
                                  void handleScriptSave(clip.id, JSON.stringify(newScreenplay), true)
                                }}
                                tScript={tScript}
                              />
                            </div>
                          )}

                          {/* 内容流 - 高密度胶囊文本流 */}
                          <div className="flex flex-col gap-2">
                            {scene.content?.map((item, itemIdx: number) => {
                              if (item.type === 'action') {
                                return (
                                  <div key={itemIdx} className="text-sm text-white/70 bg-white/5 border border-[var(--wuhu-neon-purple)]/20 px-2.5 py-1 rounded-lg flex items-start gap-2 w-fit max-w-full leading-[1.5]">
                                    <AppIcon name="clapperboard" className="w-3.5 h-3.5 text-white/40 shrink-0 mt-[2px]" />
                                    <EditableText
                                      text={item.text}
                                      onSave={(newVal) => {
                                        const newScreenplay = JSON.parse(JSON.stringify(screenplay))
                                        newScreenplay.scenes[sceneIdx].content[itemIdx].text = newVal
                                        void handleScriptSave(clip.id, JSON.stringify(newScreenplay), true)
                                      }}
                                      tScript={tScript}
                                    />
                                  </div>
                                )
                              }
                              if (item.type === 'dialogue') {
                                return (
                                  <div key={itemIdx} className="flex flex-wrap items-baseline gap-2">
                                    <span className="inline-flex items-center text-[13px] font-bold text-[var(--wuhu-neon-pink)] bg-[var(--wuhu-neon-pink)]/10 border border-[var(--wuhu-neon-pink)]/30 px-2.5 py-0.5 rounded-full shrink-0">
                                      {item.character}
                                    </span>
                                    <div className="text-[15px] text-white font-medium leading-[1.5] flex-1 min-w-0">
                                      <EditableText
                                        text={item.lines}
                                        onSave={(newVal) => {
                                          const newScreenplay = JSON.parse(JSON.stringify(screenplay))
                                          newScreenplay.scenes[sceneIdx].content[itemIdx].lines = newVal
                                          void handleScriptSave(clip.id, JSON.stringify(newScreenplay), true)
                                        }}
                                        tScript={tScript}
                                      />
                                    </div>
                                  </div>
                                )
                              }
                              if (item.type === 'voiceover') {
                                return (
                                  <div key={itemIdx} className="flex flex-wrap items-baseline gap-2">
                                    <span className="inline-flex items-center text-[13px] font-bold text-[var(--wuhu-neon-purple)]/80 bg-[var(--wuhu-neon-purple)]/10 border border-[var(--wuhu-neon-purple)]/20 px-2.5 py-0.5 rounded-full shrink-0 italic">
                                      {tScript('screenplay.narration')}
                                    </span>
                                    <p className="text-[15px] text-white/60 font-medium italic leading-[1.5] flex-1">{item.text}</p>
                                  </div>
                                )
                              }
                              return null
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-white/70 text-sm leading-relaxed">{clip.summary || clip.content}</p>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
