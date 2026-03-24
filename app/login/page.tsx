'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TrendingUp, Eye, EyeOff, AlertCircle, Shield } from 'lucide-react'

type Step = 'credentials' | 'totp'

function getCookie(name: string): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : ''
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Strict`
}

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep]               = useState<Step>('credentials')
  const [email, setEmail]             = useState('demo@wealthtracker.app')
  const [password, setPassword]       = useState('password123')
  const [totpCode, setTotpCode]       = useState('')
  const [showPwd, setShowPwd]         = useState(false)
  const [error, setError]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [rememberDevice, setRemember] = useState(true)
  const [deviceToken, setDeviceToken] = useState('')

  useEffect(() => {
    setDeviceToken(getCookie('financy_trusted'))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await signIn('credentials', {
      email,
      password,
      totpCode: step === 'totp' ? totpCode : '',
      deviceToken,
      redirect: false,
    })

    setLoading(false)

    if (!result?.error) {
      // Si on vient de valider le 2FA et que l'utilisateur veut se souvenir de l'appareil
      if (step === 'totp' && rememberDevice) {
        try {
          const res = await fetch('/api/auth/device-token', { method: 'POST' })
          const data = await res.json()
          if (data.token) setCookie('financy_trusted', data.token, 30)
        } catch {}
      }
      router.push('/dashboard')
      return
    }

    if (result.error === 'OTP_REQUIRED') {
      setStep('totp')
      return
    }
    if (result.error === 'INVALID_OTP') {
      setError('Code incorrect. Vérifiez votre email.')
      return
    }
    if (result.error === 'OTP_EXPIRED') {
      setError('Code expiré. Reconnectez-vous pour en recevoir un nouveau.')
      setStep('credentials')
      return
    }
    if (result.error === 'RATE_LIMITED') {
      setError('Trop de tentatives. Réessayez dans 15 minutes.')
      return
    }

    setError('Email ou mot de passe incorrect.')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-text-primary">Wealth Tracker</span>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-8">
          {step === 'credentials' ? (
            <>
              <h1 className="text-xl font-semibold text-text-primary mb-1">Connexion</h1>
              <p className="text-text-secondary text-sm mb-8">
                Accédez à votre tableau de bord patrimonial
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Adresse email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                    placeholder="vous@exemple.com"
                    required
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 pr-12 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                    >
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-accent hover:bg-accent-dark disabled:opacity-50 text-white font-semibold rounded-xl py-3 transition-colors"
                >
                  {loading ? 'Connexion...' : 'Se connecter'}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-border space-y-3">
                <p className="text-text-muted text-xs text-center">
                  Compte démo :{' '}
                  <span className="text-text-secondary font-mono">demo@wealthtracker.app</span>
                  {' / '}
                  <span className="text-text-secondary font-mono">password123</span>
                </p>
                <p className="text-text-muted text-sm text-center">
                  Pas encore de compte ?{' '}
                  <Link href="/register" className="text-accent hover:underline font-medium">
                    Créer un compte
                  </Link>
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-text-primary">Vérification 2FA</h1>
                  <p className="text-text-secondary text-xs">Code envoyé à {email}</p>
                </div>
              </div>

              <p className="text-text-secondary text-sm mb-6">
                Saisissez le code à 6 chiffres envoyé à votre adresse email.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Code d&apos;authentification
                  </label>
                  <input
                    type="text"
                    value={totpCode}
                    onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-text-primary text-center text-2xl font-mono tracking-widest placeholder:text-text-muted focus:outline-none focus:border-accent"
                    placeholder="000000"
                    maxLength={6}
                    autoFocus
                    required
                  />
                </div>

                {/* Se souvenir de cet appareil */}
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={e => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded accent-accent"
                  />
                  <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                    Se souvenir de cet appareil pendant 30 jours
                  </span>
                </label>

                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || totpCode.length < 6}
                  className="w-full bg-accent hover:bg-accent-dark disabled:opacity-50 text-white font-semibold rounded-xl py-3 transition-colors"
                >
                  {loading ? 'Vérification...' : 'Vérifier'}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep('credentials'); setError(''); setTotpCode('') }}
                  className="w-full text-text-secondary hover:text-text-primary text-sm transition-colors py-2"
                >
                  ← Retour
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
