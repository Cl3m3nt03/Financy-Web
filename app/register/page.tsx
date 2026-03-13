'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TrendingUp, Eye, EyeOff, AlertCircle, Check, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PasswordStrength {
  score: number
  label: string
  barColor: string
  textColor: string
}

function getPasswordStrength(password: string): PasswordStrength {
  let score = 0
  if (password.length >= 8)           score++
  if (password.length >= 12)          score++
  if (/[A-Z]/.test(password))         score++
  if (/[0-9]/.test(password))         score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  const levels: Omit<PasswordStrength, 'score'>[] = [
    { label: '',          barColor: 'bg-zinc-700',    textColor: '' },
    { label: 'Faible',    barColor: 'bg-red-500',     textColor: 'text-red-400' },
    { label: 'Moyen',     barColor: 'bg-amber-500',   textColor: 'text-amber-400' },
    { label: 'Bon',       barColor: 'bg-accent',       textColor: 'text-amber-400' },
    { label: 'Excellent', barColor: 'bg-emerald-500', textColor: 'text-emerald-400' },
  ]
  return { score, ...levels[Math.min(score, 4)] }
}

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [showPwd, setShowPwd]     = useState(false)
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

  const strength = getPasswordStrength(form.password)
  const rules = [
    { ok: form.password.length >= 8,       label: 'Au moins 8 caractères' },
    { ok: /[A-Z]/.test(form.password),     label: 'Une majuscule' },
    { ok: /[0-9]/.test(form.password),     label: 'Un chiffre' },
    { ok: form.password === form.confirm && form.confirm.length > 0, label: 'Mots de passe identiques' },
  ]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)

    // Création du compte
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        password: form.password,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Une erreur est survenue.')
      setLoading(false)
      return
    }

    // Connexion automatique après inscription
    const result = await signIn('credentials', {
      email: form.email,
      password: form.password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('Compte créé, mais la connexion a échoué. Connectez-vous manuellement.')
      router.push('/login')
    } else {
      router.push('/dashboard')
    }
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
          <h1 className="text-xl font-semibold text-text-primary mb-1">Créer un compte</h1>
          <p className="text-text-secondary text-sm mb-8">
            Commencez à suivre votre patrimoine gratuitement.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nom */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Prénom / Nom
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded-xl pl-10 pr-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                  placeholder="Jean Dupont"
                  required
                  autoComplete="name"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Adresse email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                placeholder="vous@exemple.com"
                required
                autoComplete="email"
              />
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 pr-12 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Barre de force */}
              {form.password.length > 0 && (
                <div className="mt-2 space-y-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(i => (
                      <div
                        key={i}
                        className={cn(
                          'h-1 flex-1 rounded-full transition-all',
                          strength.score >= i ? strength.barColor : 'bg-zinc-700'
                        )}
                      />
                    ))}
                  </div>
                  {strength.label && (
                    <p className={cn('text-xs font-medium', strength.textColor)}>
                      Force : {strength.label}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Confirmation */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Confirmer le mot de passe
              </label>
              <input
                type={showPwd ? 'text' : 'password'}
                value={form.confirm}
                onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                className={cn(
                  'w-full bg-surface-2 border rounded-xl px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none transition-colors',
                  form.confirm.length > 0
                    ? form.confirm === form.password
                      ? 'border-emerald-500/50 focus:border-emerald-500'
                      : 'border-red-500/50 focus:border-red-500'
                    : 'border-border focus:border-accent'
                )}
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />
            </div>

            {/* Règles mot de passe */}
            {(form.password.length > 0 || form.confirm.length > 0) && (
              <div className="grid grid-cols-2 gap-1.5">
                {rules.map((rule, i) => (
                  <div key={i} className={cn('flex items-center gap-1.5 text-xs', rule.ok ? 'text-emerald-400' : 'text-text-muted')}>
                    <Check className={cn('w-3 h-3 shrink-0', rule.ok ? 'opacity-100' : 'opacity-30')} />
                    {rule.label}
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || rules.some(r => !r.ok)}
              className="w-full bg-accent hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 transition-colors mt-2"
            >
              {loading ? 'Création du compte...' : 'Créer mon compte'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-border text-center">
            <p className="text-text-muted text-sm">
              Déjà un compte ?{' '}
              <Link href="/login" className="text-accent hover:underline font-medium">
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
