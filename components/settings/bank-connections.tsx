'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, Plus, Trash2, RefreshCw, CheckCircle2, Clock, AlertCircle, ExternalLink, Search, X, Loader2 } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { useSearchParams } from 'next/navigation'

interface BankAccount {
  id:          string
  nordigenId:  string
  iban?:       string | null
  name?:       string | null
  currency:    string
  balance:     number
}

interface BankConnection {
  id:              string
  institutionName: string
  status:          string
  lastSyncAt?:     string | null
  accounts:        BankAccount[]
}

interface Institution {
  id:   string
  name: string
  logo: string
  bic:  string
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
  LINKED:   { label: 'Connecté',  icon: CheckCircle2, color: 'text-emerald-400' },
  PENDING:  { label: 'En attente', icon: Clock,        color: 'text-amber-400'  },
  EXPIRED:  { label: 'Expiré',    icon: AlertCircle,  color: 'text-red-400'    },
  ERROR:    { label: 'Erreur',    icon: AlertCircle,  color: 'text-red-400'    },
}

export function BankConnections() {
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const [showAdd, setShowAdd]       = useState(false)
  const [search, setSearch]         = useState('')
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [searching, setSearching]   = useState(false)
  const [connecting, setConnecting] = useState<string | null>(null)

  const { data: connections = [], isLoading } = useQuery<BankConnection[]>({
    queryKey: ['bank-connections'],
    queryFn: () => fetch('/api/bank/sync').then(r => r.json()),
  })

  // Auto-sync after OAuth redirect
  useEffect(() => {
    if (searchParams.get('bank') !== 'linked') return
    const pending = connections.find(c => c.status === 'PENDING')
    if (!pending) return
    fetch('/api/bank/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requisitionId: pending.requisitionId }),
    }).then(() => queryClient.invalidateQueries({ queryKey: ['bank-connections'] }))
  }, [searchParams, connections])

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
    mutationFn: (requisitionId: string) =>
      fetch('/api/bank/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requisitionId }),
      }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bank-connections'] }),
  })

  async function searchBanks(q: string) {
    if (q.length < 2) { setInstitutions([]); return }
    setSearching(true)
    try {
      const res = await fetch(`/api/bank/institutions?q=${encodeURIComponent(q)}&country=FR`)
      const data = await res.json()
      setInstitutions(Array.isArray(data) ? data : [])
    } catch {
      setInstitutions([])
    } finally {
      setSearching(false)
    }
  }

  async function connectBank(institution: Institution) {
    setConnecting(institution.id)
    try {
      const res = await fetch('/api/bank/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institutionId: institution.id }),
      })
      const data = await res.json()
      if (data.link) {
        window.location.href = data.link
      }
    } catch (e) {
      console.error(e)
    } finally {
      setConnecting(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-text-muted text-sm">
          Connectez vos comptes bancaires pour synchroniser vos soldes automatiquement.
        </p>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-1.5 text-xs bg-surface-2 hover:bg-zinc-700 border border-border text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-xl transition-colors"
        >
          {showAdd ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showAdd ? 'Annuler' : 'Ajouter une banque'}
        </button>
      </div>

      {/* Add bank search */}
      {showAdd && (
        <div className="border border-border rounded-xl p-4 bg-surface-2/30 space-y-3">
          <p className="text-xs font-semibold text-text-secondary">Rechercher votre banque</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); searchBanks(e.target.value) }}
              placeholder="Revolut, Boursorama, BNP Paribas..."
              className="w-full bg-surface border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
            />
            {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-text-muted" />}
          </div>

          {institutions.length > 0 && (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {institutions.map(inst => (
                <button
                  key={inst.id}
                  onClick={() => connectBank(inst)}
                  disabled={!!connecting}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface transition-colors text-left group"
                >
                  {inst.logo ? (
                    <img src={inst.logo} alt={inst.name} className="w-8 h-8 rounded-lg object-contain bg-white p-0.5 shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-text-muted" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{inst.name}</p>
                    {inst.bic && <p className="text-xs text-text-muted">{inst.bic}</p>}
                  </div>
                  {connecting === inst.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-accent shrink-0" />
                  ) : (
                    <ExternalLink className="w-3.5 h-3.5 text-text-muted group-hover:text-accent shrink-0 transition-colors" />
                  )}
                </button>
              ))}
            </div>
          )}

          {search.length >= 2 && !searching && institutions.length === 0 && (
            <p className="text-xs text-text-muted text-center py-4">Aucune banque trouvée pour "{search}"</p>
          )}

          <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-400/80 leading-relaxed">
              Vous serez redirigé vers votre banque pour autoriser la lecture des soldes (lecture seule, aucune transaction possible).
            </p>
          </div>
        </div>
      )}

      {/* Connections list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-text-muted gap-2 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Chargement...
        </div>
      ) : connections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Building2 className="w-10 h-10 text-text-muted mb-3 opacity-40" />
          <p className="text-text-muted text-sm">Aucun compte bancaire connecté</p>
          <p className="text-text-muted text-xs mt-1">Supporté : Revolut, Boursorama, BNP, Société Générale, +2300 banques européennes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {connections.map(conn => {
            const cfg = STATUS_CONFIG[conn.status] ?? STATUS_CONFIG.PENDING
            const Icon = cfg.icon
            const totalBalance = conn.accounts.reduce((s, a) => s + a.balance, 0)
            return (
              <div key={conn.id} className="border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-text-muted" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{conn.institutionName}</p>
                      <div className={cn('flex items-center gap-1 text-xs', cfg.color)}>
                        <Icon className="w-3 h-3" />
                        <span>{cfg.label}</span>
                        {conn.lastSyncAt && (
                          <span className="text-text-muted ml-1">
                            · {new Date(conn.lastSyncAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {conn.status === 'LINKED' && (
                      <button
                        onClick={() => syncMutation.mutate((conn as any).requisitionId)}
                        disabled={syncMutation.isPending}
                        className="w-7 h-7 rounded-lg bg-surface-2 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                        title="Synchroniser"
                      >
                        <RefreshCw className={cn('w-3.5 h-3.5', syncMutation.isPending && 'animate-spin')} />
                      </button>
                    )}
                    <button
                      onClick={() => deleteMutation.mutate(conn.id)}
                      className="w-7 h-7 rounded-lg bg-surface-2 flex items-center justify-center text-text-muted hover:text-red-400 transition-colors"
                      title="Déconnecter"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {conn.accounts.length > 0 && (
                  <div className="space-y-1.5 pt-3 border-t border-border">
                    {conn.accounts.map(acc => (
                      <div key={acc.id} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="text-text-secondary">{acc.name ?? 'Compte'}</span>
                          {acc.iban && <span className="text-text-muted text-xs ml-2">{acc.iban.slice(0, 8)}…</span>}
                        </div>
                        <span className={cn('font-mono font-semibold', acc.balance >= 0 ? 'text-text-primary' : 'text-red-400')}>
                          {formatCurrency(acc.balance, acc.currency)}
                        </span>
                      </div>
                    ))}
                    {conn.accounts.length > 1 && (
                      <div className="flex justify-between text-xs pt-1 border-t border-border/50">
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
    </div>
  )
}
