'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, Plus, Trash2, RefreshCw, CheckCircle2, Clock, AlertCircle, ExternalLink, Loader2, X } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { useSearchParams } from 'next/navigation'

interface BankAccount {
  id:         string
  nordigenId: string
  iban?:      string | null
  name?:      string | null
  currency:   string
  balance:    number
  balanceType?: string | null
}

interface BankConnection {
  id:              string
  institutionName?: string | null
  status:           string
  lastSyncAt?:      string | null
  accounts:         BankAccount[]
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
  LINKED:  { label: 'Connecté',   icon: CheckCircle2, color: 'text-emerald-400' },
  PENDING: { label: 'En attente', icon: Clock,        color: 'text-amber-400'  },
  EXPIRED: { label: 'Expiré',     icon: AlertCircle,  color: 'text-red-400'    },
  ERROR:   { label: 'Erreur',     icon: AlertCircle,  color: 'text-red-400'    },
}

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  CHECKING:   'Compte courant',
  SAVINGS:    'Livret / Épargne',
  INVESTMENT: 'Investissement / PEA',
  LOAN:       'Crédit',
  MORTGAGE:   'Prêt immobilier',
  PENSION:    'Retraite',
  OTHER:      'Autre',
}

interface EBBank { name: string; country: string; bic?: string; logo?: string }

export function BankConnections() {
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const [connecting, setConnecting] = useState(false)
  const [feedback, setFeedback]     = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [bankQuery, setBankQuery]   = useState('')
  const [banks, setBanks]           = useState<EBBank[]>([])
  const [banksLoading, setBanksLoading] = useState(false)

  const { data: connections = [], isLoading } = useQuery<BankConnection[]>({
    queryKey: ['bank-connections'],
    queryFn: () => fetch('/api/bank/sync').then(r => r.json()),
  })

  // Handle redirect back from Tink
  useEffect(() => {
    const bank = searchParams.get('bank')
    if (bank === 'linked') {
      setFeedback({ type: 'success', msg: 'Compte connecté avec succès !' })
      queryClient.invalidateQueries({ queryKey: ['bank-connections'] })
    } else if (bank === 'error') {
      const reason = searchParams.get('reason') ?? 'unknown'
      setFeedback({ type: 'error', msg: `Échec de la connexion (${reason}). Réessayez.` })
    }
  }, [searchParams])

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch('/api/bank/sync', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bank-connections'] }),
  })

  const syncMutation = useMutation({
    mutationFn: (connectionId: string) =>
      fetch('/api/bank/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bank-connections'] }),
  })

  async function openPicker() {
    setShowPicker(true)
    setBankQuery('')
    setBanksLoading(true)
    try {
      const res  = await fetch('/api/bank/institutions?country=FR')
      const data = await res.json()
      setBanks(Array.isArray(data) ? data : [])
    } catch {
      setBanks([])
    } finally {
      setBanksLoading(false)
    }
  }

  async function handleBankSearch(q: string) {
    setBankQuery(q)
    setBanksLoading(true)
    try {
      const res  = await fetch(`/api/bank/institutions?country=FR&q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setBanks(Array.isArray(data) ? data : [])
    } catch {
      setBanks([])
    } finally {
      setBanksLoading(false)
    }
  }

  async function handleConnect(bankName: string) {
    setShowPicker(false)
    setConnecting(true)
    try {
      const res  = await fetch('/api/bank/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankName, country: 'FR' }),
      })
      const data = await res.json()
      if (data.link) {
        window.location.href = data.link
      } else {
        setFeedback({ type: 'error', msg: data.error ?? 'Erreur lors de la connexion' })
        setConnecting(false)
      }
    } catch {
      setFeedback({ type: 'error', msg: 'Erreur réseau' })
      setConnecting(false)
    }
  }

  return (
    <div className="space-y-4">

      {/* Feedback banner */}
      {feedback && (
        <div className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-xl border text-sm',
          feedback.type === 'success'
            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/5 border-red-500/20 text-red-400'
        )}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span className="flex-1">{feedback.msg}</span>
          <button onClick={() => setFeedback(null)}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-text-muted text-sm max-w-sm">
          Connectez vos comptes en lecture seule — Revolut, Boursorama, BNP, +2500 banques européennes.
        </p>
        <button
          onClick={openPicker}
          disabled={connecting}
          className="flex items-center gap-1.5 bg-accent hover:bg-amber-500 text-background font-semibold text-xs px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
        >
          {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          {connecting ? 'Redirection…' : 'Connecter une banque'}
        </button>
      </div>

      {/* Bank picker modal */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-1 border border-border rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text-primary">Choisissez votre banque</h3>
              <button onClick={() => setShowPicker(false)} className="text-text-muted hover:text-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              autoFocus
              type="text"
              value={bankQuery}
              onChange={e => handleBankSearch(e.target.value)}
              placeholder="Rechercher (ex: Revolut, BNP, Boursorama…)"
              className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent mb-3"
            />
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {banksLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-text-muted" /></div>
              ) : banks.length === 0 ? (
                <p className="text-center text-text-muted text-sm py-6">Aucune banque trouvée</p>
              ) : banks.map(bank => (
                <button
                  key={bank.name + bank.bic}
                  onClick={() => handleConnect(bank.name)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-2 transition-colors text-left"
                >
                  {bank.logo
                    ? <img src={bank.logo} alt="" className="w-7 h-7 rounded-lg object-contain bg-white p-0.5" />
                    : <div className="w-7 h-7 rounded-lg bg-surface-2 flex items-center justify-center"><Building2 className="w-3.5 h-3.5 text-text-muted" /></div>
                  }
                  <span className="text-sm text-text-primary font-medium">{bank.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Connections list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-text-muted gap-2 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Chargement...
        </div>
      ) : connections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-border rounded-xl">
          <Building2 className="w-10 h-10 text-text-muted mb-3 opacity-30" />
          <p className="text-text-secondary text-sm font-medium">Aucun compte connecté</p>
          <p className="text-text-muted text-xs mt-1">Cliquez sur "Connecter une banque" pour démarrer</p>
        </div>
      ) : (
        <div className="space-y-3">
          {connections.map(conn => {
            const cfg          = STATUS_CONFIG[conn.status] ?? STATUS_CONFIG.PENDING
            const StatusIcon   = cfg.icon
            const totalBalance = conn.accounts.reduce((s, a) => s + a.balance, 0)

            return (
              <div key={conn.id} className="border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-surface-2 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-text-muted" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">
                        {conn.institutionName ?? 'Connexion bancaire'}
                      </p>
                      <div className={cn('flex items-center gap-1 text-xs mt-0.5', cfg.color)}>
                        <StatusIcon className="w-3 h-3" />
                        <span>{cfg.label}</span>
                        {conn.lastSyncAt && (
                          <span className="text-text-muted ml-1">
                            · {new Date(conn.lastSyncAt).toLocaleDateString('fr-FR', {
                                day: '2-digit', month: 'short',
                                hour: '2-digit', minute: '2-digit',
                              })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {conn.status === 'LINKED' && (
                      <button
                        onClick={() => syncMutation.mutate(conn.id)}
                        disabled={syncMutation.isPending}
                        className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                        title="Synchroniser"
                      >
                        <RefreshCw className={cn('w-3.5 h-3.5', syncMutation.isPending && 'animate-spin')} />
                      </button>
                    )}
                    <button
                      onClick={() => deleteMutation.mutate(conn.id)}
                      className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center text-text-muted hover:text-red-400 transition-colors"
                      title="Déconnecter"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Accounts */}
                {conn.accounts.length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-border">
                    {conn.accounts.map(acc => (
                      <div key={acc.id} className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-sm text-text-secondary font-medium truncate">
                            {acc.name ?? ACCOUNT_TYPE_LABEL[acc.balanceType ?? ''] ?? 'Compte'}
                          </p>
                          {acc.iban && (
                            <p className="text-xs text-text-muted font-mono">
                              {acc.iban.replace(/(.{4})/g, '$1 ').trim().slice(0, 19)}…
                            </p>
                          )}
                        </div>
                        <span className={cn(
                          'font-mono font-semibold text-sm shrink-0 ml-4',
                          acc.balance >= 0 ? 'text-text-primary' : 'text-red-400'
                        )}>
                          {formatCurrency(acc.balance, acc.currency)}
                        </span>
                      </div>
                    ))}
                    {conn.accounts.length > 1 && (
                      <div className="flex justify-between text-xs pt-2 border-t border-border/50">
                        <span className="text-text-muted">Total</span>
                        <span className="font-mono font-bold text-accent">{formatCurrency(totalBalance)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <p className="text-xs text-text-muted">
        Connexion sécurisée en lecture seule via Enable Banking (PSD2). Aucune action de paiement possible.
      </p>
    </div>
  )
}
