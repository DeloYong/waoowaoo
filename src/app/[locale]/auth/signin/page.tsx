'use client'

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useTranslations } from 'next-intl'
import Navbar from "@/components/Navbar"
import { Link, useRouter } from '@/i18n/navigation'
import { buildAuthenticatedHomeTarget } from '@/lib/home/default-route'

export default function SignIn() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const t = useTranslations('auth')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      })

      if (result?.error === 'RateLimited') {
        setError(t('rateLimited'))
      } else if (result?.error) {
        setError(t('loginFailed'))
      } else {
        router.push(buildAuthenticatedHomeTarget())
        router.refresh()
      }
    } catch {
      setError(t('loginError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="wuhu-page-bg min-h-screen">
      <Navbar />
      <div className="flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          <div className="bg-[var(--wuhu-bg-card)]/90 border border-[var(--wuhu-neon-purple)]/30 shadow-[0_0_40px_rgba(167,87,255,0.2)] rounded-2xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">
                {t('welcomeBack')}
              </h1>
              <p className="text-white/70">{t('loginTo')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="username" className="text-white/80 block mb-2">
                  {t('phoneNumber')}
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="bg-[var(--wuhu-bg-surface)] border border-[var(--wuhu-neon-purple)]/30 focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_20px_rgba(255,100,200,0.3)] text-white placeholder:text-white/40 rounded-lg w-full px-4 py-3 outline-none transition-all duration-300"
                  placeholder={t('phoneNumberPlaceholder')}
                />
              </div>

              <div>
                <label htmlFor="password" className="text-white/80 block mb-2">
                  {t('password')}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-[var(--wuhu-bg-surface)] border border-[var(--wuhu-neon-purple)]/30 focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_20px_rgba(255,100,200,0.3)] text-white placeholder:text-white/40 rounded-lg w-full px-4 py-3 outline-none transition-all duration-300"
                  placeholder={t('passwordPlaceholder')}
                />
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] shadow-[0_0_20px_rgba(167,87,255,0.4)] hover:shadow-[0_0_30px_rgba(255,100,200,0.5)] text-white rounded-lg w-full py-3 px-4 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                {loading ? t('loginButtonLoading') : t('loginButton')}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-white/70">
                {t('noAccount')}{" "}
                <Link href={{ pathname: '/auth/signup' }} className="text-[var(--wuhu-neon-cyan)] hover:text-[var(--wuhu-neon-pink)] hover:underline font-medium transition-colors duration-300">
                  {t('signupNow')}
                </Link>
              </p>
            </div>

            <div className="mt-6 text-center">
              <Link href={{ pathname: '/' }} className="text-white/50 hover:text-white/70 text-sm transition-colors duration-300">
                {t('backToHome')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
