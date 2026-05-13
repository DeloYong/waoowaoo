'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'

interface WorldContextModalProps {
  isOpen: boolean
  onClose: () => void
  text: string
  onChange: (value: string) => void
}

export function WorldContextModal({ isOpen, onClose, text, onChange }: WorldContextModalProps) {
  const t = useTranslations('worldContextModal')
  const tc = useTranslations('common')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle')
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleTextChange = (value: string) => {
    onChange(value)
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }, 500)
  }

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_50px_rgba(167,87,255,0.3)] rounded-2xl p-7 w-full max-w-3xl transform transition-all scale-100 h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-2xl font-bold text-white">{t('title')}</h2>
              <p className="text-white/50 text-sm">{t('description')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div
              className={`text-xs px-3 py-1.5 rounded-full transition-all duration-300 ${
                saveStatus === 'saved'
                  ? 'bg-[var(--wuhu-neon-cyan)]/20 text-[var(--wuhu-neon-cyan)] border border-[var(--wuhu-neon-cyan)]/30'
                  : 'bg-white/10 text-white/70'
              }`}
            >
              {saveStatus === 'saved' ? (
                <span className="flex items-center gap-1.5">
                  <AppIcon name="check" className="w-3.5 h-3.5" />
                  {tc('saved')}
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-[var(--wuhu-neon-cyan)] rounded-full"></span>
                  {tc('autoSave')}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-white/40 hover:text-white hover:bg-white/10 rounded-full p-2"
            >
              <AppIcon name="close" className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-[var(--wuhu-bg-surface)] rounded-xl p-4 overflow-hidden flex flex-col">
          <textarea
            value={text}
            onChange={(event) => handleTextChange(event.target.value)}
            placeholder={t('placeholder')}
            className="flex-1 text-base resize-none leading-relaxed text-white placeholder:text-white/30 custom-scrollbar p-4 bg-transparent outline-none"
          />
        </div>

        <div className="mt-6 pt-0 flex justify-start items-center flex-shrink-0">
          <span className="text-xs text-white/50">{t('hint')}</span>
        </div>
      </div>
    </div>
  )
}
