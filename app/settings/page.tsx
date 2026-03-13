'use client'

import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Key, Database, Shield, Lock, Eye, EyeOff, Check, AlertCircle, Loader2, QrCode } from 'lucide-react'

export default function SettingsPage() {
  const { data: session } = useSession()

  // Password change state
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError]   = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)
  const [showPw, setShowPw]     = useState(false)

  // 2FA state
  const [tfaStep, setTfaStep]   = useState<'idle' | 'setup' | 'verify' | 'disable'>('idle')
  const [tfaEnabled, setTfaEnabled] = useState(false)
  const [qrCode, setQrCode]     = useState('')
  const [tfaCode, setTfaCode]   = useState('')
  const [tfaLoading, setTfaLoading] = useState(false)
  const [tfaError, setTfaError] = useState('')
  const [tfaSuccess, setTfaSuccess] = useState('')

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    if (pwForm.next !== pwForm.confirm) {
      setPwError('Les mots de passe ne correspondent pas.')
      return
    }
    setPwLoading(true)
    const res = await fetch('/api/auth/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
    })
    setPwLoading(false)
    if (!res.ok) {
      const data = await res.json()
      setPwError(data.error ?? 'Erreur lors du changement.')
    } else {
      setPwSuccess(true)
      setPwForm({ current: '', next: '', confirm: '' })
      setTimeout(() => setPwSuccess(false), 3000)
    }
  }

  async function handleSetup2FA() {
    setTfaLoading(true)
    setTfaError('')
    const res = await fetch('/api/auth/2fa/setup', { method: 'POST' })
    setTfaLoading(false)
    if (!res.ok) {
      setTfaError('Erreur lors de la configuration.')
      return
    }
    const data = await res.json()
    setQrCode(data.qrCode)
    setTfaStep('setup')
  }

  async function handleVerify2FA(e: React.FormEvent) {
    e.preventDefault()
    setTfaLoading(true)
    setTfaError('')
    const res = await fetch('/api/auth/2fa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: tfaCode }),
    })
    setTfaLoading(false)
    if (!res.ok) {
      const data = await res.json()
      setTfaError(data.error ?? 'Code incorrect.')
      return
    }
    setTfaEnabled(true)
    setTfaStep('idle')
    setTfaCode('')
    setTfaSuccess('2FA activé avec succès !')
    setTimeout(() => setTfaSuccess(''), 4000)
  }

  async function handleDisable2FA(e: React.FormEvent) {
    e.preventDefault()
    setTfaLoading(true)
    setTfaError('')
    const res = await fetch('/api/auth/2fa/disable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: tfaCode }),
    })
    setTfaLoading(false)
    if (!res.ok) {
      const data = await res.json()
      setTfaError(data.error ?? 'Code incorrect.')
      return
    }
    setTfaEnabled(false)
    setTfaStep('idle')
    setTfaCode('')
    setTfaSuccess('2FA désactivé.')
    setTimeout(() => setTfaSuccess(''), 3000)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Paramètres" />
      <div className="flex-1 p-6 space-y-6 max-w-2xl">

        {/* ── 2FA ─────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-text-muted" />
                <CardTitle>Double authentification (2FA)</CardTitle>
              </div>
              <span className={`text-xs px-2 py-1 rounded-lg font-medium ${tfaEnabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-700 text-zinc-400'}`}>
                {tfaEnabled ? '✓ Activé' : 'Désactivé'}
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {tfaSuccess && (
              <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                <Check className="w-4 h-4" /> {tfaSuccess}
              </div>
            )}
            {tfaError && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4" /> {tfaError}
              </div>
            )}

            {tfaStep === 'idle' && (
              <>
                <p className="text-text-muted text-sm">
                  Protégez votre compte avec Google Authenticator, Authy ou toute app TOTP compatible.
                </p>
                {!tfaEnabled ? (
                  <button onClick={handleSetup2FA} disabled={tfaLoading}
                    className="flex items-center gap-2 bg-accent hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
                    {tfaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                    Activer le 2FA
                  </button>
                ) : (
                  <button onClick={() => { setTfaStep('disable'); setTfaError('') }}
                    className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2.5 rounded-xl text-sm font-semibold border border-red-500/20 transition-colors">
                    Désactiver le 2FA
                  </button>
                )}
              </>
            )}

            {tfaStep === 'setup' && (
              <div className="space-y-4">
                <p className="text-text-secondary text-sm">
                  <strong>1.</strong> Scannez ce QR code avec votre application d&apos;authentification.
                </p>
                {qrCode && (
                  <div className="flex justify-center bg-white rounded-xl p-4 w-fit mx-auto">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrCode} alt="QR Code 2FA" className="w-48 h-48" />
                  </div>
                )}
                <p className="text-text-secondary text-sm">
                  <strong>2.</strong> Entrez le code à 6 chiffres pour confirmer.
                </p>
                <form onSubmit={handleVerify2FA} className="flex gap-3">
                  <input
                    type="text"
                    value={tfaCode}
                    onChange={e => setTfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="flex-1 bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-text-primary text-center text-xl font-mono tracking-widest focus:outline-none focus:border-accent"
                    placeholder="000000"
                    maxLength={6}
                    required
                  />
                  <button type="submit" disabled={tfaLoading || tfaCode.length < 6}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors">
                    {tfaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmer'}
                  </button>
                  <button type="button" onClick={() => { setTfaStep('idle'); setTfaCode('') }}
                    className="px-4 py-2.5 border border-border text-text-secondary hover:text-text-primary rounded-xl text-sm transition-colors">
                    Annuler
                  </button>
                </form>
              </div>
            )}

            {tfaStep === 'disable' && (
              <form onSubmit={handleDisable2FA} className="space-y-3">
                <p className="text-text-secondary text-sm">Entrez votre code 2FA actuel pour confirmer la désactivation.</p>
                <div className="flex gap-3">
                  <input type="text" value={tfaCode} onChange={e => setTfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="flex-1 bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-text-primary text-center text-xl font-mono tracking-widest focus:outline-none focus:border-accent"
                    placeholder="000000" maxLength={6} required />
                  <button type="submit" disabled={tfaLoading || tfaCode.length < 6}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors">
                    {tfaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Désactiver'}
                  </button>
                  <button type="button" onClick={() => { setTfaStep('idle'); setTfaCode('') }}
                    className="px-4 py-2.5 border border-border text-text-secondary hover:text-text-primary rounded-xl text-sm transition-colors">
                    Annuler
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* ── Password change ─────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-text-muted" />
              <CardTitle>Changer le mot de passe</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Mot de passe actuel</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={pwForm.current}
                    onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                    className="w-full bg-surface-2 border border-border rounded-xl px-4 py-2.5 pr-12 text-text-primary text-sm focus:outline-none focus:border-accent"
                    required />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Nouveau mot de passe</label>
                  <input type="password" value={pwForm.next} onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
                    className="w-full bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent"
                    placeholder="Min. 8 car. + majuscule + chiffre" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Confirmer</label>
                  <input type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                    className="w-full bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent"
                    required />
                </div>
              </div>
              {pwError && <p className="text-red-400 text-sm">{pwError}</p>}
              {pwSuccess && <p className="text-emerald-400 text-sm flex items-center gap-1"><Check className="w-4 h-4" /> Mot de passe mis à jour !</p>}
              <button type="submit" disabled={pwLoading}
                className="flex items-center gap-2 bg-surface-2 hover:bg-zinc-700 border border-border text-text-primary px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
                {pwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Mettre à jour le mot de passe
              </button>
            </form>
          </CardContent>
        </Card>

        {/* ── API Keys ─────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-text-muted" />
              <CardTitle>Clés API</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <p className="text-text-muted text-sm">
              Ces clés permettent de récupérer les cours en temps réel.
              Sans clés, l&apos;application utilise des données simulées.
            </p>
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
              <p className="text-amber-400 text-xs">
                <strong>Note :</strong> Configurez vos clés dans le fichier{' '}
                <code className="bg-surface-2 px-1 rounded">.env</code> puis redémarrez le serveur.
                Clés actuellement : <span className="font-mono">Alpha Vantage ✓</span> ·{' '}
                <span className="font-mono">CoinGecko ✓</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── Data ─────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-text-muted" />
              <CardTitle>Données</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <p className="text-text-muted text-sm">
              Base de données SQLite locale — vos données ne quittent jamais votre machine.
            </p>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
