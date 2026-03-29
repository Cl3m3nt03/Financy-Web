'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    try {
      await fetch('/api/auth/forgot-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      setSent(true)
    } catch {
      setError('Une erreur est survenue. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-accent/10 border border-accent/30 rounded-2xl mb-4">
            <span className="text-accent font-bold text-2xl">F</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Mot de passe oublié</h1>
          <p className="text-text-muted text-sm mt-1">
            {sent ? 'Email envoyé !' : 'Entrez votre email pour recevoir un lien de réinitialisation'}
          </p>
        </div>

        {sent ? (
          <div className="bg-surface border border-emerald-500/30 rounded-2xl p-8 text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle className="w-12 h-12 text-emerald-400" />
            </div>
            <p className="text-text-primary font-semibold">Vérifiez votre boîte mail</p>
            <p className="text-text-muted text-sm leading-relaxed">
              Si un compte existe pour <span className="text-text-primary font-medium">{email}</span>,
              vous recevrez un email avec un lien valable <strong>1 heure</strong>.
            </p>
            <p className="text-text-muted text-xs">
              Pensez à vérifier vos spams.
            </p>
            <Link href="/login" className="block mt-4 text-accent hover:text-accent-dark text-sm font-medium transition-colors">
              ← Retour à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-2xl p-8 space-y-5">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Adresse email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  required
                  className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full bg-accent hover:bg-accent-dark disabled:opacity-50 text-background font-semibold py-3 rounded-xl transition-colors"
            >
              {loading ? 'Envoi...' : 'Envoyer le lien'}
            </button>

            <div className="text-center">
              <Link href="/login" className="inline-flex items-center gap-1.5 text-text-muted hover:text-text-primary text-sm transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" />
                Retour à la connexion
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
