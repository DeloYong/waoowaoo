'use client'

import { useState, useEffect } from "react"
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Navbar from "@/components/Navbar"
import PasswordStrengthIndicator from "@/components/auth/PasswordStrengthIndicator"
import { apiFetch } from '@/lib/api-fetch'
import { Link, useRouter } from '@/i18n/navigation'

export default function SignUp() {
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('auth')

  // 从 URL query 参数中读取邀请码
  useEffect(() => {
    const invite = searchParams?.get('invite')
    if (invite) {
      setInviteCode(invite.toUpperCase())
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    if (password !== confirmPassword) {
      setError(t('passwordMismatch'))
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError(t('passwordTooShort'))
      setLoading(false)
      return
    }

    try {
      const response = await apiFetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          password,
          inviteCode: inviteCode || undefined,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(t('signupSuccess'))
        setTimeout(() => {
          router.push({ pathname: '/auth/signin' })
        }, 2000)
      } else {
        setError(data.message || t('signupFailed'))
      }
    } catch {
      setError(t('signupError'))
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
                {t('createAccount')}
              </h1>
              <p className="text-white/70">{t('joinPlatform')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="text-white/80 block mb-2">
                  {t('phoneNumber')}
                </label>
                <input
                  id="name"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-[var(--wuhu-bg-surface)] border border-[var(--wuhu-neon-purple)]/30 focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_20px_rgba(255,100,200,0.3)] text-white placeholder:text-white/40 rounded-lg w-full px-4 py-3 outline-none transition-all duration-300"
                  placeholder={t('passwordMinPlaceholder')}
                />
                <PasswordStrengthIndicator password={password} />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="text-white/80 block mb-2">
                  {t('confirmPassword')}
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="bg-[var(--wuhu-bg-surface)] border border-[var(--wuhu-neon-purple)]/30 focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_20px_rgba(255,100,200,0.3)] text-white placeholder:text-white/40 rounded-lg w-full px-4 py-3 outline-none transition-all duration-300"
                  placeholder={t('confirmPasswordPlaceholder')}
                />
              </div>

              <div>
                <label htmlFor="inviteCode" className="text-white/80 block mb-2">
                  邀请码（选填）
                </label>
                <input
                  id="inviteCode"
                  name="inviteCode"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="bg-[var(--wuhu-bg-surface)] border border-[var(--wuhu-neon-purple)]/30 focus:border-[var(--wuhu-neon-pink)] focus:shadow-[0_0_20px_rgba(255,100,200,0.3)] text-white placeholder:text-white/40 rounded-lg w-full px-4 py-3 outline-none transition-all duration-300"
                  placeholder="请输入6位邀请码"
                  maxLength={6}
                />
                {inviteCode && (
                  <p className="mt-1 text-xs text-white/50">
                    邀请码: {inviteCode}
                  </p>
                )}
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-500/20 border border-green-500/50 text-green-300 px-4 py-3 rounded-lg text-sm">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] shadow-[0_0_20px_rgba(167,87,255,0.4)] hover:shadow-[0_0_30px_rgba(255,100,200,0.5)] text-white rounded-lg w-full py-3 px-4 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                {loading ? t('signupButtonLoading') : t('signupButton')}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-white/70">
                {t('hasAccount')}{" "}
                <Link href={{ pathname: '/auth/signin' }} className="text-[var(--wuhu-neon-cyan)] hover:text-[var(--wuhu-neon-pink)] hover:underline font-medium transition-colors duration-300">
                  {t('signinNow')}
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
