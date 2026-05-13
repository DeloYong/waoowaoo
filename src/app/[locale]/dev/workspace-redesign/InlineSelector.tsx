'use client'

import { useState, useRef, useEffect } from 'react'
import { AppIcon } from '@/components/ui/icons'

/**
 * 内嵌下拉选择器
 * 显示为紧凑的标签按钮，点击展开向上弹出选项列表
 */
export function InlineSelector({
  label,
  selectedId,
  options,
  onSelect,
  renderLabel,
}: {
  label: string
  selectedId: string
  options: { id: string; labelKey: string; emoji?: string }[]
  onSelect: (id: string) => void
  renderLabel: (opt: { id: string; labelKey: string; emoji?: string }) => string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.id === selectedId)

  // 点击外部关闭
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border transition-all duration-200 cursor-pointer ${
          open
            ? 'border-[var(--wuhu-neon-cyan)] bg-[rgba(255,255,255,0.05)] text-[white]'
            : 'border-[rgba(167, 87, 255, 0.2)] text-[rgba(255,255,255,0.7)] hover:border-[rgba(167, 87, 255, 0.4)]'
        }`}
      >
        <span className="text-[9px] text-[rgba(255,255,255,0.5)] font-semibold">{label}:</span>
        <span>{selected ? renderLabel(selected) : ''}</span>
        <AppIcon name="chevronDown" className={`w-2.5 h-2.5 text-[rgba(255,255,255,0.5)] transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-1.5 z-50 bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_40px_rgba(167,87,255,0.2)] rounded-xl p-1 min-w-[130px] animate-scale-in shadow-lg">
          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => { onSelect(opt.id); setOpen(false) }}
              className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                selectedId === opt.id
                  ? 'bg-[rgba(0, 255, 255, 0.1)] text-[var(--wuhu-neon-cyan)]'
                  : 'text-[rgba(255,255,255,0.7)] hover:bg-[rgba(255,255,255,0.05)]'
              }`}
            >
              {renderLabel(opt)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
