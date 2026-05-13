'use client'
import { logError as _ulogError } from '@/lib/logging/core'
import { useTranslations } from 'next-intl'

import { useState } from 'react'

interface ScreenplayScene {
    scene_number: number
    heading: {
        int_ext: string
        location: string
        time: string
    } | string
    description?: string
    characters?: string[]
    content: Array<{
        type: 'action' | 'dialogue' | 'voiceover'
        text?: string
        character?: string
        lines?: string
        parenthetical?: string
    }>
}

interface Screenplay {
    clip_id: string
    original_text?: string
    scenes: ScreenplayScene[]
}

interface ScreenplayDisplayProps {
    screenplay: string | null
    originalContent: string
}

export default function ScreenplayDisplay({ screenplay, originalContent }: ScreenplayDisplayProps) {
    const t = useTranslations('storyboard')
    const [activeTab, setActiveTab] = useState<'screenplay' | 'original'>('screenplay')

    // 解析剧本JSON
    let parsedScreenplay: Screenplay | null = null
    try {
        if (screenplay) {
            parsedScreenplay = JSON.parse(screenplay)
        }
    } catch (e) {
        _ulogError('Failed to parse screenplay:', e)
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setActiveTab('screenplay')}
                    className={`rounded-xl px-3 py-1.5 text-sm transition-all ${activeTab === 'screenplay'
                        ? 'bg-[var(--wuhu-bg-surface)] border border-white/20 text-white/70'
                        : 'bg-transparent text-white/50 hover:bg-white/5'
                        }`}
                >
                    {t('screenplay.tabs.formatted')}
                </button>
                <button
                    onClick={() => setActiveTab('original')}
                    className={`rounded-xl px-3 py-1.5 text-sm transition-all ${activeTab === 'original'
                        ? 'bg-[var(--wuhu-bg-surface)] border border-white/20 text-white/70'
                        : 'bg-transparent text-white/50 hover:bg-white/5'
                        }`}
                >
                    {t('screenplay.tabs.original')}
                </button>
            </div>

            <div className="bg-[var(--wuhu-bg-surface)] rounded-xl p-4 max-h-96 overflow-y-auto">
                {activeTab === 'screenplay' && parsedScreenplay ? (
                    <div className="space-y-3">
                        {parsedScreenplay.scenes.map((scene, sceneIndex) => (
                            <div key={sceneIndex} className="border-l-2 border-[var(--wuhu-neon-purple)] pl-3 space-y-2">
                                <div className="flex items-center gap-2 text-xs flex-wrap">
                                    <span className="font-bold text-[var(--wuhu-neon-purple)] bg-[var(--wuhu-neon-purple)]/20 px-2 py-0.5 rounded">
                                        {t('screenplay.scene', { number: scene.scene_number })}
                                    </span>
                                    <span className="text-white/50">
                                        {typeof scene.heading === 'string'
                                            ? scene.heading
                                            : `${scene.heading.int_ext} · ${scene.heading.location} · ${scene.heading.time}`}
                                    </span>
                                </div>

                                {scene.description && (
                                    <div className="text-xs text-white/50 italic bg-white/5 px-2 py-1 rounded">
                                        {scene.description}
                                    </div>
                                )}

                                {scene.characters && scene.characters.length > 0 && (
                                    <div className="flex gap-1 flex-wrap items-center">
                                        <span className="text-[10px] text-white/50">{t('screenplay.characters')}</span>
                                        {scene.characters.map((name, index) => (
                                            <span key={`${name}-${index}`} className="text-[10px] text-white/70 bg-white/5 px-1.5 py-0.5 rounded">
                                                {name}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    {scene.content.map((item, itemIndex) => (
                                        <div key={itemIndex}>
                                            {item.type === 'action' && (
                                                <p className="text-sm text-white/70 leading-relaxed">{item.text}</p>
                                            )}
                                            {item.type === 'dialogue' && (
                                                <div className="bg-[var(--wuhu-neon-pink)]/10 border-l-2 border-[var(--wuhu-neon-pink)] pl-2 py-1">
                                                    <div>
                                                        <span className="text-xs font-medium text-[var(--wuhu-neon-pink)]">{item.character}</span>
                                                        {item.parenthetical && (
                                                            <span className="text-[var(--wuhu-neon-pink)] ml-1">({item.parenthetical})</span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-white/70">
                                                        <span className="select-none text-white/50">&quot;</span>
                                                        {item.lines}
                                                        <span className="select-none text-white/50">&quot;</span>
                                                    </p>
                                                </div>
                                            )}
                                            {item.type === 'voiceover' && (
                                                <div className="bg-[var(--wuhu-neon-purple)]/10 border-l-2 border-[var(--wuhu-neon-purple)] pl-2 py-1">
                                                    <span className="text-xs text-[var(--wuhu-neon-purple)]">{t('screenplay.voiceover')}</span>
                                                    <p className="text-sm text-white/70 italic">{item.text}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : activeTab === 'screenplay' && !parsedScreenplay ? (
                    <div className="text-center text-white/50 py-8">
                        <p>{t('screenplay.parseFailedTitle')}</p>
                        <p className="text-xs mt-1">{t('screenplay.parseFailedDescription')}</p>
                    </div>
                ) : (
                    <div className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed">{originalContent}</div>
                )}
            </div>
        </div>
    )
}
