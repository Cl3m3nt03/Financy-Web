'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, Plus, Trash2, TrendingUp, TrendingDown, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PriceAlert {
  id:        string
  symbol:    string
  name?:     string | null
  condition: 'above' | 'below'
  target:    number
  currency:  string
  triggered: boolean
}

function useAlerts() {
  return useQuery<PriceAlert[]>({
    queryKey: ['alerts'],
    queryFn:  () => fetch('/api/alerts').then(r => r.json()),
  })
}

export function PriceAlertsSection() {
  const { data: alerts } = useAlerts()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ symbol: '', name: '', condition: 'above', target: '', currency: 'EUR' })
  const [formError, setFormError] = useState('')

  const create = useMutation({
    mutationFn: (data: object) =>
      fetch('/api/alerts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['alerts'] }); setShowForm(false); setForm({ symbol: '', name: '', condition: 'above', target: '', currency: 'EUR' }) },
  })

  const remove = useMutation({
    mutationFn: (id: string) => fetch(`/api/alerts/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  })

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!form.symbol || !form.target) { setFormError('Symbole et prix cible requis.'); return }
    await create.mutateAsync({ ...form, target: parseFloat(form.target), name: form.name || form.symbol })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-text-muted text-sm">
          Soyez notifié quand un actif dépasse ou descend en dessous d&apos;un prix cible.
        </p>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 text-xs bg-surface-2 hover:bg-zinc-700 border border-border text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-xl transition-colors">
          {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showForm ? 'Annuler' : 'Ajouter'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-surface-2 border border-border rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Symbole</label>
              <input value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))}
                placeholder="AAPL, BTC…"
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent uppercase" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Nom (optionnel)</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Apple Inc."
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Condition</label>
              <select value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
                <option value="above">Au-dessus de</option>
                <option value="below">En dessous de</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Prix cible</label>
              <input type="number" step="any" min="0" value={form.target}
                onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
                placeholder="0.00"
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Devise</label>
              <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
                <option>EUR</option><option>USD</option><option>GBP</option>
              </select>
            </div>
          </div>
          {formError && <p className="text-red-400 text-xs">{formError}</p>}
          <button type="submit" disabled={create.isPending}
            className="w-full py-2 bg-accent hover:bg-accent-dark disabled:opacity-50 text-background rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
            {create.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Créer l&apos;alerte
          </button>
        </form>
      )}

      {/* Alerts list */}
      {(alerts ?? []).length === 0 && !showForm && (
        <p className="text-text-muted text-sm text-center py-4">Aucune alerte configurée.</p>
      )}
      <div className="space-y-2">
        {(alerts ?? []).map(a => (
          <div key={a.id} className={cn(
            'flex items-center justify-between px-4 py-3 rounded-xl border',
            a.triggered ? 'bg-accent/5 border-accent/30' : 'bg-surface-2 border-border'
          )}>
            <div className="flex items-center gap-3">
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center',
                a.condition === 'above' ? 'bg-emerald-500/10' : 'bg-red-500/10')}>
                {a.condition === 'above'
                  ? <TrendingUp className="w-4 h-4 text-emerald-400" />
                  : <TrendingDown className="w-4 h-4 text-red-400" />}
              </div>
              <div>
                <p className="text-text-primary text-sm font-medium">
                  <span className="font-mono">{a.symbol}</span>
                  <span className="text-text-muted font-normal"> {a.condition === 'above' ? '≥' : '≤'} </span>
                  <span className="font-mono">{a.target.toLocaleString('fr-FR')} {a.currency}</span>
                </p>
                {a.name && a.name !== a.symbol && (
                  <p className="text-text-muted text-xs">{a.name}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {a.triggered && (
                <span className="text-xs px-2 py-0.5 bg-accent/10 text-accent rounded-lg font-medium">Déclenchée</span>
              )}
              <button onClick={() => remove.mutate(a.id)}
                className="text-text-muted hover:text-red-400 p-1 rounded-lg hover:bg-red-500/10 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
