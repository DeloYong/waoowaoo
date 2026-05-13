'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useSession } from 'next-auth/react'
import { useRouter } from '@/i18n/navigation'
import Navbar from '@/components/Navbar'
import WuhuLoading from '@/components/WuhuLoading'
import { Link } from '@/i18n/navigation'
import { buildAuthenticatedHomeTarget } from '@/lib/home/default-route'
import WuhuMascot from '@/components/WuhuMascot'

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
              <div className="relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300%] h-[300%] bg-[radial-gradient(circle,rgba(167,87,255,0.2),rgba(255,100,200,0.1),transparent_50%)] rounded-full blur-3xl"></div>
                <WuhuMascot expression="happy" size="xl" animated={true} />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
