'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useSession } from 'next-auth/react'
import { useRouter } from '@/i18n/navigation'
import Navbar from '@/components/Navbar'
import WuhuLoading from '@/components/WuhuLoading'
import { Link } from '@/i18n/navigation'
import { buildAuthenticatedHomeTarget } from '@/lib/home/default-route'

export default function Home() {
  const t = useTranslations('landing')
  const { data: session, status } = useSession()
  const router = useRouter()

  // 已登录用户自动跳转到 home
  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(buildAuthenticatedHomeTarget())
    }
  }, [status, router])

  // session 加载中或已登录（即将跳转），不渲染落地页，避免闪烁
  if (status !== 'unauthenticated') {
    return <WuhuLoading />
  }

  return (
    <div className="min-h-screen overflow-hidden font-sans">
      {/* Navbar */}
      <div className="relative z-50">
        <Navbar />
      </div>

      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[radial-gradient(circle,rgba(167,87,255,0.15),transparent_60%)] rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(255,100,200,0.12),transparent_60%)] rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(100,255,255,0.08),transparent_60%)] rounded-full blur-3xl" />
      </div>

      <main className="relative z-10">
        <section className="relative min-h-screen flex items-center justify-center -mt-16 px-4">
          <div className="container mx-auto grid lg:grid-cols-2 gap-16 items-center">
            <div className="text-left space-y-8 animate-slide-up" style={{ animationDuration: '0.8s' }}>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <span className="block text-white">
                  {t('title')}
                </span>
                <span className="wuhu-text-gradient">
                  {t('subtitle')}
                </span>
              </h1>

              <div className="flex flex-wrap gap-4 pt-4 animate-fade-in" style={{ animationDelay: '0.6s' }}>
                <Link
                  href={{ pathname: '/auth/signup' }}
                  className="px-8 py-4 rounded-xl font-semibold transition-all duration-300 bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_20px_rgba(167,87,255,0.5)] hover:shadow-[0_0_35px_rgba(255,100,200,0.6)] hover:scale-105"
                >
                  {t('getStarted')}
                </Link>
              </div>
            </div>

            <div className="relative h-[600px] hidden lg:flex items-center justify-center animate-scale-in" style={{ animationDuration: '1s' }}>
              <div className="relative w-full max-w-md aspect-square">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[radial-gradient(circle,rgba(148,163,184,0.2),transparent_65%)] rounded-full blur-3xl opacity-70"></div>
                <div className="absolute top-0 right-10 w-64 h-80 bg-[var(--wuhu-bg-card)]/60 border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_30px_rgba(167,87,255,0.2)] rounded-3xl transform rotate-6 animate-float-delayed"></div>
                <div className="absolute bottom-10 left-10 w-72 h-80 bg-[var(--wuhu-bg-card)]/40 border border-[var(--wuhu-neon-pink)]/20 shadow-[0_0_25px_rgba(255,100,200,0.15)] rounded-3xl transform -rotate-3 animate-float-slow"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-96 bg-[var(--wuhu-bg-card)]/80 border border-[var(--wuhu-neon-cyan)]/20 shadow-[0_0_40px_rgba(100,255,255,0.15)] rounded-3xl overflow-hidden animate-float">
                  <div className="p-6 h-full flex flex-col">
                    <div className="w-full h-48 bg-white/10 rounded-2xl mb-6 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-[var(--wuhu-neon-purple)]/20 group-hover:bg-[var(--wuhu-neon-purple)]/35 transition-colors"></div>
                      <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[var(--wuhu-bg-surface)]"></div>
                      <div className="absolute bottom-4 left-4 w-12 h-12 rounded-lg bg-[var(--wuhu-bg-surface)] border border-[var(--wuhu-neon-cyan)]/30 rotate-12"></div>
                    </div>
                    <div className="space-y-3">
                      <div className="h-3 w-3/4 bg-white/10 rounded-full"></div>
                      <div className="h-3 w-1/2 bg-white/10 rounded-full"></div>
                      <div className="pt-4 flex gap-2">
                        <div className="h-10 w-10 rounded-full bg-[var(--wuhu-bg-surface)] border border-[var(--wuhu-neon-purple)]/20"></div>
                        <div className="h-10 flex-1 rounded-full bg-[var(--wuhu-neon-purple)]/30 border border-[var(--wuhu-neon-purple)]/30"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
