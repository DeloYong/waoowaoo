'use client'

import { useTranslations } from 'next-intl'

export default function StepParse() {
  const t = useTranslations('smartImport')

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-8">
      <div className="text-center">
        <div className="flex gap-1.5 justify-center mb-8">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-3 h-12 bg-gradient-to-b from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] rounded-full shadow-[0_0_20px_rgba(167,87,255,0.5)]"
              style={{
                animation: 'wave 1s ease-in-out infinite',
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">{t('analyzing.title')}</h2>
        <p className="text-white/70">{t('analyzing.description')}</p>
        <p className="text-sm text-white/50 mt-2">{t('analyzing.autoSave')}</p>

        <style jsx>{`
          @keyframes wave {
            0%, 100% { transform: scaleY(0.4); }
            50% { transform: scaleY(1); }
          }
        `}</style>
      </div>
    </div>
  )
}
