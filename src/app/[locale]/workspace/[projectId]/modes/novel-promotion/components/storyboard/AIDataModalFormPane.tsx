'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import type { useTranslations } from 'next-intl'
import GlassInput from '@/components/ui/primitives/GlassInput'
import GlassTextarea from '@/components/ui/primitives/GlassTextarea'
import { AppIcon } from '@/components/ui/icons'
import type {
  ActingCharacter,
  AIDataCharacter,
  PhotographyCharacter,
  PhotographyRules,
} from './AIDataModal.types'

interface AIDataModalFormPaneProps {
  t: ReturnType<typeof useTranslations<'storyboard'>>
  shotType: string
  cameraMove: string
  description: string
  location: string | null
  characters: AIDataCharacter[]
  videoPrompt: string
  photographyRules: PhotographyRules | null
  actingNotes: ActingCharacter[]
  activeCharIdx: number
  onActiveCharIdxChange: (idx: number) => void
  onShotTypeChange: (value: string) => void
  onCameraMoveChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onVideoPromptChange: (value: string) => void
  onPhotographyFieldChange: (path: string, value: string) => void
  onPhotographyCharacterChange: (index: number, field: keyof PhotographyCharacter, value: string) => void
  onActingCharacterChange: (index: number, field: keyof ActingCharacter, value: string) => void
}

function FL({ children }: { children: string }) {
  return <p className="mb-1 text-[10.5px] font-semibold text-white/50">{children}</p>
}

function AutoGrowTextarea({
  value,
  onChange,
  rows,
  placeholder,
  density = 'default',
  className,
}: {
  value: string
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
  rows: number
  placeholder?: string
  density?: 'compact' | 'default'
  className?: string
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  return (
    <textarea
      ref={ref}
      rows={rows}
      value={value}
      onChange={onChange}
      onInput={(event) => {
        const el = event.currentTarget
        el.style.height = '0px'
        el.style.height = `${el.scrollHeight}px`
      }}
      placeholder={placeholder}
      className={[
        'overflow-hidden w-full px-3 py-2 text-sm bg-[var(--wuhu-bg-surface)] border border-[var(--wuhu-neon-purple)]/30 rounded-xl text-white placeholder:text-white/30 focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_15px_rgba(255,100,200,0.3)] outline-none transition-all resize-none',
        className,
      ].filter(Boolean).join(' ')}
    />
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <AppIcon name="sparkles" className="h-3.5 w-3.5 text-[var(--wuhu-neon-purple)] flex-shrink-0" />
      <span className="text-[11px] font-semibold text-white">{children}</span>
    </div>
  )
}

function CollapseSection({
  label,
  iconName,
  children,
}: {
  label: string
  iconName?: 'video' | 'film'
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-[var(--wuhu-neon-purple)]/30 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[var(--wuhu-bg-surface)] hover:bg-[var(--wuhu-neon-purple)]/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          {iconName ? (
            <AppIcon
              name={iconName}
              className="h-3.5 w-3.5 text-[var(--wuhu-neon-purple)] flex-shrink-0"
            />
          ) : null}
          <span className="text-[11px] font-semibold text-white/70">{label}</span>
        </div>
        <AppIcon
          name={open ? 'chevronUp' : 'chevronDown'}
          className="h-3.5 w-3.5 text-white/40 flex-shrink-0"
        />
      </button>
      {open && (
        <div className="px-3.5 py-3 space-y-3 bg-[var(--wuhu-bg-card)]">
          {children}
        </div>
      )}
    </div>
  )
}

export default function AIDataModalFormPane({
  t,
  shotType,
  cameraMove,
  description,
  location,
  characters,
  videoPrompt,
  photographyRules,
  actingNotes,
  activeCharIdx,
  onActiveCharIdxChange,
  onShotTypeChange,
  onCameraMoveChange,
  onDescriptionChange,
  onVideoPromptChange,
  onPhotographyFieldChange,
  onPhotographyCharacterChange,
  onActingCharacterChange,
}: AIDataModalFormPaneProps) {
  const activeChar = characters[activeCharIdx]
  const photoChar = photographyRules?.characters.find(c => c.name === activeChar?.name)
  const actingCharIdx = actingNotes.findIndex(n => n.name === activeChar?.name)
  const actingChar = actingCharIdx >= 0 ? actingNotes[actingCharIdx] : null

  return (
    <div className="w-[55%] border-r border-white/10 overflow-y-auto p-5 space-y-5">

      {/* ① 视觉描述 — 最高优先 */}
      <section>
        <div className="flex items-center gap-2 mb-2.5">
          <AppIcon name="fileText" className="h-3.5 w-3.5 text-[var(--wuhu-neon-purple)] flex-shrink-0" />
          <span className="text-[11px] font-semibold text-white">
            {t('aiData.visualDescription')}
          </span>
        </div>
        <AutoGrowTextarea
          rows={3}
          value={description}
          onChange={e => onDescriptionChange(e.target.value)}
          placeholder={t('insert.placeholder.description')}
        />
      </section>

      {/* ② 镜头设置 */}
      <section>
        <SectionLabel>{t('aiData.shotAndScene')}</SectionLabel>
        <div className="grid grid-cols-2 gap-3 mb-2">
          <div>
            <FL>{t('aiData.shotType')}</FL>
            <div className="relative">
              <AppIcon name="clapperboard" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
              <input
                value={shotType}
                onChange={e => onShotTypeChange(e.target.value)}
                placeholder={t('aiData.shotTypePlaceholder')}
                className="w-full pl-9 pr-3 py-2 text-sm bg-[var(--wuhu-bg-surface)] border border-[var(--wuhu-neon-purple)]/30 rounded-xl text-white placeholder:text-white/30 focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_15px_rgba(255,100,200,0.3)] outline-none transition-all"
              />
            </div>
          </div>
          <div>
            <FL>{t('aiData.cameraMove')}</FL>
            <div className="relative">
              <AppIcon name="video" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
              <input
                value={cameraMove}
                onChange={e => onCameraMoveChange(e.target.value)}
                placeholder={t('aiData.cameraMovePlaceholder')}
                className="w-full pl-9 pr-3 py-2 text-sm bg-[var(--wuhu-bg-surface)] border border-[var(--wuhu-neon-purple)]/30 rounded-xl text-white placeholder:text-white/30 focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_15px_rgba(255,100,200,0.3)] outline-none transition-all"
              />
            </div>
          </div>
        </div>
        {/* 场景 + 比例 — 只读文字，不用 input 避免视觉干扰 */}
        {location && (
          <div className="flex items-center gap-2 text-[11.5px] text-white/50">
            <AppIcon name="imageAlt" className="h-3.5 w-3.5 text-[var(--wuhu-neon-purple)] flex-shrink-0" />
            <span>
              {t('aiData.scene').replace('（只读）', '')}：<span className="text-white/70 font-medium">{location}</span>
            </span>
          </div>
        )}
      </section>

      {/* ③ 角色详情 — tab 切换 */}
      {characters.length > 0 && (
        <section>
          <SectionLabel>{t('aiData.characterDetails')}</SectionLabel>

          {/* Tab 按钮 */}
          <div className="flex gap-2 mb-3 flex-wrap">
            {characters.map((char, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onActiveCharIdxChange(i)}
                className={[
                  'flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all',
                  activeCharIdx === i
                    ? 'border-[var(--wuhu-neon-pink)] bg-[var(--wuhu-neon-pink)]/10 text-[var(--wuhu-neon-pink)] shadow-[0_0_15px_rgba(255,100,200,0.3)]'
                    : 'border-[var(--wuhu-neon-purple)]/30 bg-[var(--wuhu-bg-surface)] text-white/50 hover:text-white/70 hover:border-[var(--wuhu-neon-purple)]/50',
                ].join(' ')}
              >
                <div className={[
                  'h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0',
                  activeCharIdx === i ? 'bg-[var(--wuhu-neon-pink)]/20 text-[var(--wuhu-neon-pink)]' : 'bg-[var(--wuhu-bg-card)] text-white/40',
                ].join(' ')}>
                  <AppIcon name="user" className="h-3 w-3" />
                </div>
                {char.name}
                {char.slot && (
                  <span className="bg-white/10 text-white/70 text-[9.5px] inline-flex items-center gap-1 px-2 py-0.5 rounded-full">
                    <AppIcon name="badgeCheck" className="h-3 w-3" />
                    {char.slot}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* 当前角色详情卡 */}
          {activeChar && (
            <div className="rounded-xl border border-[var(--wuhu-neon-purple)]/50 overflow-hidden">
              {/* slot 行 */}
              <div className="flex items-center gap-2 px-3.5 py-2 bg-[var(--wuhu-bg-surface)] border-b border-white/10 flex-wrap">
                <AppIcon name="badgeCheck" className="h-3.5 w-3.5 text-[var(--wuhu-neon-purple)] flex-shrink-0" />
                <span className="text-[10.5px] font-semibold text-white/50">
                  {t('aiData.slot')}：
                </span>
                <span className="bg-[var(--wuhu-neon-purple)]/20 text-[var(--wuhu-neon-purple)] text-[10.5px] px-2 py-0.5 rounded-full">
                  {activeChar.slot ?? t('aiData.slotUnset')}
                </span>
              </div>

              <div className="px-3.5 py-3 space-y-3 bg-[var(--wuhu-bg-card)]">
                {/* 外貌 — 只读 */}
                {activeChar.appearance && (
                  <div>
                    <FL>{t('aiData.appearanceReadonly')}</FL>
                    <div className="flex items-start gap-2 rounded-xl bg-[var(--wuhu-bg-surface)] px-3 py-2">
                      <AppIcon name="sparkles" className="mt-0.5 h-3.5 w-3.5 text-[var(--wuhu-neon-purple)] flex-shrink-0" />
                      <p className="text-[12px] text-white/70 leading-relaxed">
                        {activeChar.appearance}
                      </p>
                    </div>
                  </div>
                )}

                {/* 画面站位 */}
                {photoChar && (
                  <div>
                    <FL>{t('aiData.framePosition')}</FL>
                    <div className="space-y-2">
                      <div>
                        <p className="text-[10px] text-white/50 mb-1">{t('aiData.screenPosition')}</p>
                        <input
                          value={photoChar.screen_position}
                          onChange={e => {
                            const idx = photographyRules!.characters.findIndex(c => c.name === activeChar.name)
                            if (idx >= 0) onPhotographyCharacterChange(idx, 'screen_position', e.target.value)
                          }}
                          className="w-full px-3 py-2 text-sm bg-[var(--wuhu-bg-surface)] border border-[var(--wuhu-neon-purple)]/30 rounded-xl text-white focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_15px_rgba(255,100,200,0.3)] outline-none transition-all"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[10px] text-white/50 mb-1">{t('aiData.posture')}</p>
                          <input
                            value={photoChar.posture}
                            onChange={e => {
                              const idx = photographyRules!.characters.findIndex(c => c.name === activeChar.name)
                              if (idx >= 0) onPhotographyCharacterChange(idx, 'posture', e.target.value)
                            }}
                            className="w-full px-3 py-2 text-sm bg-[var(--wuhu-bg-surface)] border border-[var(--wuhu-neon-purple)]/30 rounded-xl text-white focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_15px_rgba(255,100,200,0.3)] outline-none transition-all"
                          />
                        </div>
                        <div>
                          <p className="text-[10px] text-white/50 mb-1">{t('aiData.facing')}</p>
                          <input
                            value={photoChar.facing}
                            onChange={e => {
                              const idx = photographyRules!.characters.findIndex(c => c.name === activeChar.name)
                              if (idx >= 0) onPhotographyCharacterChange(idx, 'facing', e.target.value)
                            }}
                            className="w-full px-3 py-2 text-sm bg-[var(--wuhu-bg-surface)] border border-[var(--wuhu-neon-purple)]/30 rounded-xl text-white focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_15px_rgba(255,100,200,0.3)] outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 表演指导 */}
                {actingChar && (
                  <div>
                    <FL>{t('aiData.actingGuide')}</FL>
                    <textarea
                      rows={2}
                      value={actingChar.acting}
                      onChange={e => onActingCharacterChange(actingCharIdx, 'acting', e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[var(--wuhu-bg-surface)] border border-[var(--wuhu-neon-purple)]/30 rounded-xl text-white placeholder:text-white/30 focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_15px_rgba(255,100,200,0.3)] outline-none transition-all resize-none"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ④ 视频提示词 — 折叠 */}
      <CollapseSection label={t('aiData.videoPrompt')} iconName="video">
        <AutoGrowTextarea
          rows={4}
          value={videoPrompt}
          onChange={e => onVideoPromptChange(e.target.value)}
          placeholder={t('panel.videoPromptPlaceholder')}
          className="bg-[var(--wuhu-neon-purple)]/10"
        />
      </CollapseSection>

      {/* ⑤ 摄影环境 — 折叠 */}
      {photographyRules && (
        <CollapseSection label={t('aiData.photoEnv')} iconName="film">
          <div>
            <FL>{t('aiData.summary')}</FL>
            <input
              value={photographyRules.scene_summary}
              onChange={e => onPhotographyFieldChange('scene_summary', e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[var(--wuhu-bg-surface)] border border-[var(--wuhu-neon-purple)]/30 rounded-xl text-white focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_15px_rgba(255,100,200,0.3)] outline-none transition-all"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FL>{t('aiData.lightingDirection')}</FL>
              <input
                value={photographyRules.lighting?.direction ?? ''}
                onChange={e => onPhotographyFieldChange('lighting.direction', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[var(--wuhu-bg-surface)] border border-[var(--wuhu-neon-purple)]/30 rounded-xl text-white focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_15px_rgba(255,100,200,0.3)] outline-none transition-all"
              />
            </div>
            <div>
              <FL>{t('aiData.lightingQuality')}</FL>
              <input
                value={photographyRules.lighting?.quality ?? ''}
                onChange={e => onPhotographyFieldChange('lighting.quality', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[var(--wuhu-bg-surface)] border border-[var(--wuhu-neon-purple)]/30 rounded-xl text-white focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_15px_rgba(255,100,200,0.3)] outline-none transition-all"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FL>{t('aiData.depthOfField')}</FL>
              <input
                value={photographyRules.depth_of_field}
                onChange={e => onPhotographyFieldChange('depth_of_field', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[var(--wuhu-bg-surface)] border border-[var(--wuhu-neon-purple)]/30 rounded-xl text-white focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_15px_rgba(255,100,200,0.3)] outline-none transition-all"
              />
            </div>
            <div>
              <FL>{t('aiData.colorTone')}</FL>
              <input
                value={photographyRules.color_tone}
                onChange={e => onPhotographyFieldChange('color_tone', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[var(--wuhu-bg-surface)] border border-[var(--wuhu-neon-purple)]/30 rounded-xl text-white focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_15px_rgba(255,100,200,0.3)] outline-none transition-all"
              />
            </div>
          </div>
        </CollapseSection>
      )}
    </div>
  )
}
