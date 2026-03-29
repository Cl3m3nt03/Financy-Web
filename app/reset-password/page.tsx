'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react'

function ResetForm() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const token        = searchParams.get('token') ?? ''

  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [showPwd,   setShowPwd]   = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [success,   setSuccess]   = useState(false)
  const [error,     setError]     = useState('')

  const rules = [
    { label: 'Au moins 8 caractères',          ok: password.length >= 8 },
    { label: 'Une majuscule',                   ok: /[A-Z]/.test(password) },
    { label: 'Un chiffre',                      ok: /[0-9]/.test(password) },
    { label: 'Les mots de passe correspondent', ok: password === confirm && confirm.length > 0 },
  ]
  const allOk = rules.every(r => r.ok)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!allOk || !token) return
    setLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/auth/reset-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erreur.'); return }
      setSuccess(true)
      setTimeout(() => router.push('/login'), 3000)
    } catch {
      setError('Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="bg-surface border border-red-500/30 rounded-2xl p-8 text-center space-y-3">
        <XCircle className="w-10 h-10 text-red-400 mx-auto" />
        <p className="text-text-primary font-semibold">Lien invalide</p>
        <p className="text-text-muted text-sm">Ce lien de réinitialisation est invalide ou a expiré.</p>
        <Link href="/forgot-password" className="block text-accent text-sm font-medium mt-2">
          Demander un nouveau lien
        </Link>
      </div>
    )
  }

  if (success) {
    return (
      <div className="bg-surface border border-emerald-500/30 rounded-2xl p-8 text-center space-y-4">
        <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
        <p className="text-text-primary font-semibold">Mot de passe mis à jour !</p>
        <p className="text-text-muted text-sm">Redirection vers la connexion...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-2xl p-8 space-y-5">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Nouveau mot de passe
        </label>
        <div className="relative">
          <input
            type={showPwd ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full bg-background border border-border rounded-xl px-4 py-3 pr-11 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
          />
          <button type="button" onClick={() => setShowPwd(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
            {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Confirmer le mot de passe
        </label>
        <input
          type={showPwd ? 'text' : 'password'}
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="••••••••"
          required
          className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      {/* Rules */}
      {password.length > 0 && (
        <ul className="space-y-1.5">
          {rules.map(r => (
            <li key={r.label} className="flex items-center gap-2 text-xs">
              <span className={r.ok ? 'text-emerald-400' : 'text-text-muted'}>
                {r.ok ? '✓' : '○'}
              </span>
              <span className={r.ok ? 'text-emerald-400' : 'text-text-muted'}>{r.label}</span>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading || !allOk}
        className="w-full bg-accent hover:bg-accent-dark disabled:opacity-50 text-background font-semibold py-3 rounded-xl transition-colors"
      >
        {loading ? 'Mise à jour...' : 'Changer le mot de passe'}
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-accent/10 border border-accent/30 rounded-2xl mb-4">
            <span className="text-accent font-bold text-2xl">F</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Nouveau mot de passe</h1>
          <p className="text-text-muted text-sm mt-1">Choisissez un mot de passe sécurisé</p>
        </div>
        <Suspense fallback={<div className="text-center text-text-muted text-sm">Chargement...</div>}>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  )
}
