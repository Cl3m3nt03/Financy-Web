'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { useCreateTransaction } from '@/hooks/use-transactions'
import { useAssets } from '@/hooks/use-assets'

const TX_TYPES = [
  { value: 'BUY',        label: 'Achat',      color: 'text-emerald-400' },
  { value: 'SELL',       label: 'Vente',      color: 'text-red-400' },
  { value: 'DEPOSIT',    label: 'Dépôt',      color: 'text-blue-400' },
  { value: 'WITHDRAWAL', label: 'Retrait',    color: 'text-orange-400' },
  { value: 'DIVIDEND',   label: 'Dividende',  color: 'text-accent' },
]

const FINANCIAL_TYPES = ['STOCK', 'CRYPTO', 'PEA', 'CTO']

interface Props { onClose: () => void }

export function TransactionForm({ onClose }: Props) {
  const { data: assets } = useAssets()
  const createTx = useCreateTransaction()

  const [form, setForm] = useState({
    type:      'BUY',
    symbol:    '',
    holdingId: '',
    quantity:  '',
    price:     '',
    fees:      '0',
    currency:  'EUR',
    date:      new Date().toISOString().split('T')[0],
    notes:     '',
  })
  const [error, setError] = useState('')

  const needsPosition = form.type === 'BUY' || form.type === 'SELL' || form.type === 'DIVIDEND'
  const financialAssets = assets?.filter(a => FINANCIAL_TYPES.includes(a.type)) ?? []
  const allHoldings = financialAssets.flatMap(a =>
    (a.holdings ?? []).map(h => ({ ...h, assetName: a.name }))
  )

  const selectedHolding = allHoldings.find(h => h.id === form.holdingId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (needsPosition && !form.symbol) { setError('Symbole requis.'); return }
    if ((form.type === 'BUY' || form.type === 'SELL') && !form.quantity) {
      setError('Quantité requise.'); return
    }

    try {
      await createTx.mutateAsync({
        type:      form.type as any,
        symbol:    form.symbol || undefined,
        holdingId: form.holdingId || undefined,
        quantity:  form.quantity ? parseFloat(form.quantity) : undefined,
        price:     parseFloat(form.price),
        fees:      parseFloat(form.fees) || 0,
        currency:  form.currency,
        date:      form.date,
        notes:     form.notes || undefined,
      })
      onClose()
    } catch {
      setError('Erreur lors de l\'enregistrement.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-text-primary font-semibold">Nouvelle transaction</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Type */}
          <div className="grid grid-cols-5 gap-2">
            {TX_TYPES.map(t => (
              <button key={t.value} type="button"
                onClick={() => setForm(f => ({ ...f, type: t.value }))}
                className={`py-2 rounded-xl text-xs font-semibold border transition-colors ${
                  form.type === t.value
                    ? 'bg-accent/10 border-accent text-accent'
                    : 'bg-surface-2 border-border text-text-muted hover:border-accent/40'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Symbol + holding */}
          {needsPosition && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Symbole</label>
                <input
                  value={form.symbol}
                  onChange={e => setForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))}
                  placeholder="AAPL, BTC…"
                  className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Position (optionnel)</label>
                <select
                  value={form.holdingId}
                  onChange={e => {
                    const h = allHoldings.find(h => h.id === e.target.value)
                    setForm(f => ({ ...f, holdingId: e.target.value, symbol: h?.symbol ?? f.symbol }))
                  }}
                  className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
                  <option value="">Aucune</option>
                  {allHoldings.map(h => (
                    <option key={h.id} value={h.id}>{h.symbol} — {h.assetName}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Quantity + Price */}
          <div className="grid grid-cols-2 gap-3">
            {(form.type === 'BUY' || form.type === 'SELL') && (
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Quantité</label>
                <input type="number" step="any" min="0"
                  value={form.quantity}
                  onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                  placeholder="0"
                  className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
                />
              </div>
            )}
            <div className={form.type === 'BUY' || form.type === 'SELL' ? '' : 'col-span-2'}>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                {form.type === 'BUY' || form.type === 'SELL' ? 'Prix unitaire' : 'Montant'} ({form.currency})
              </label>
              <input type="number" step="any" min="0"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                placeholder="0.00"
                required
                className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Fees + Currency + Date */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Frais</label>
              <input type="number" step="any" min="0"
                value={form.fees}
                onChange={e => setForm(f => ({ ...f, fees: e.target.value }))}
                className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Devise</label>
              <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent">
                <option>EUR</option><option>USD</option><option>GBP</option><option>CHF</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Date</label>
              <input type="date" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                required
                className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Notes (optionnel)</label>
            <input value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Ordre limite, courtier…"
              className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
            />
          </div>

          {/* Total preview */}
          {form.type === 'BUY' || form.type === 'SELL' ? (
            <div className="bg-surface-2 rounded-xl px-4 py-2.5 flex justify-between text-sm">
              <span className="text-text-muted">Total</span>
              <span className="text-text-primary font-mono font-semibold">
                {((parseFloat(form.quantity) || 0) * (parseFloat(form.price) || 0) + (parseFloat(form.fees) || 0)).toLocaleString('fr-FR', { style: 'currency', currency: form.currency })}
              </span>
            </div>
          ) : null}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-border text-text-secondary hover:text-text-primary rounded-xl text-sm transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={createTx.isPending}
              className="flex-1 py-2.5 bg-accent hover:bg-accent-dark disabled:opacity-50 text-background rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
              {createTx.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
