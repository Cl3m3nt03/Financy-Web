'use client'

import { useState, useMemo } from 'react'
import { Header } from '@/components/layout/header'
import { Card, CardContent } from '@/components/ui/card'
import { TransactionForm } from '@/components/transactions/transaction-form'
import { useTransactions, useDeleteTransaction } from '@/hooks/use-transactions'
import { formatCurrency } from '@/lib/utils'
import { Plus, Trash2, TrendingUp, TrendingDown, ArrowDownCircle, ArrowUpCircle, Gift, Filter, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CsvImportModal } from '@/components/transactions/csv-import-modal'

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  BUY:        { label: 'Achat',     icon: TrendingUp,      color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  SELL:       { label: 'Vente',     icon: TrendingDown,    color: 'text-red-400',     bg: 'bg-red-500/10'     },
  DEPOSIT:    { label: 'Dépôt',     icon: ArrowDownCircle, color: 'text-blue-400',    bg: 'bg-blue-500/10'    },
  WITHDRAWAL: { label: 'Retrait',   icon: ArrowUpCircle,   color: 'text-orange-400',  bg: 'bg-orange-500/10'  },
  DIVIDEND:   { label: 'Dividende', icon: Gift,            color: 'text-accent',      bg: 'bg-accent/10'      },
}

const ALL_TYPES = ['ALL', 'BUY', 'SELL', 'DEPOSIT', 'WITHDRAWAL', 'DIVIDEND']

export default function TransactionsPage() {
  const { data: transactions, isLoading } = useTransactions()
  const deleteTx = useDeleteTransaction()
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [filter, setFilter] = useState('ALL')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const filtered = useMemo(() =>
    (transactions ?? []).filter(t => filter === 'ALL' || t.type === filter),
    [transactions, filter]
  )

  // Stats
  const totalBuy      = (transactions ?? []).filter(t => t.type === 'BUY').reduce((s, t) => s + (t.quantity ?? 0) * t.price + t.fees, 0)
  const totalSell     = (transactions ?? []).filter(t => t.type === 'SELL').reduce((s, t) => s + (t.quantity ?? 0) * t.price - t.fees, 0)
  const totalDividend = (transactions ?? []).filter(t => t.type === 'DIVIDEND').reduce((s, t) => s + t.price, 0)
  const totalFees     = (transactions ?? []).reduce((s, t) => s + t.fees, 0)

  async function confirmDelete(id: string) {
    await deleteTx.mutateAsync(id)
    setDeleteId(null)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Transactions" subtitle="Historique de toutes vos opérations" />

      <div className="flex-1 p-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total investi',    value: totalBuy,      color: 'text-emerald-400' },
            { label: 'Total retiré',     value: totalSell,     color: 'text-red-400'     },
            { label: 'Dividendes reçus', value: totalDividend, color: 'text-accent'      },
            { label: 'Frais payés',      value: totalFees,     color: 'text-zinc-400'    },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="pt-5">
                <p className="text-text-muted text-xs mb-1">{s.label}</p>
                <p className={cn('text-xl font-bold font-mono', s.color)}>{formatCurrency(s.value)}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Filters */}
          <div className="flex items-center gap-1.5 bg-surface border border-border rounded-xl p-1">
            <Filter className="w-3.5 h-3.5 text-text-muted ml-2" />
            {ALL_TYPES.map(t => (
              <button key={t} onClick={() => setFilter(t)}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  filter === t ? 'bg-accent text-background' : 'text-text-muted hover:text-text-primary'
                )}>
                {t === 'ALL' ? 'Tout' : TYPE_CONFIG[t]?.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setShowImport(true)}
              className="flex items-center gap-2 border border-border hover:border-accent/50 text-text-secondary hover:text-accent px-4 py-2 rounded-xl text-sm font-medium transition-colors">
              <Upload className="w-4 h-4" /> Import CSV
            </button>
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-accent hover:bg-accent-dark text-background px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
              <Plus className="w-4 h-4" /> Nouvelle transaction
            </button>
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-text-muted text-sm">Chargement…</div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-text-primary font-semibold mb-1">Aucune transaction</p>
                <p className="text-text-muted text-sm">Cliquez sur « Nouvelle transaction » pour commencer.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-text-muted text-xs">
                      <th className="text-left px-5 py-3 font-medium">Type</th>
                      <th className="text-left px-4 py-3 font-medium">Symbole</th>
                      <th className="text-right px-4 py-3 font-medium">Quantité</th>
                      <th className="text-right px-4 py-3 font-medium">Prix</th>
                      <th className="text-right px-4 py-3 font-medium">Frais</th>
                      <th className="text-right px-4 py-3 font-medium">Total</th>
                      <th className="text-left px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(tx => {
                      const cfg = TYPE_CONFIG[tx.type]
                      const Icon = cfg?.icon
                      const total = tx.quantity
                        ? tx.quantity * tx.price + (tx.type === 'SELL' ? -tx.fees : tx.fees)
                        : tx.price
                      return (
                        <tr key={tx.id} className="border-b border-border/50 hover:bg-surface-2/50 transition-colors">
                          <td className="px-5 py-3.5">
                            <span className={cn('flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-lg text-xs font-medium', cfg?.bg, cfg?.color)}>
                              {Icon && <Icon className="w-3 h-3" />} {cfg?.label}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-mono font-medium text-text-primary">{tx.symbol ?? '—'}</span>
                          </td>
                          <td className="px-4 py-3.5 text-right text-text-secondary font-mono">
                            {tx.quantity != null ? tx.quantity.toLocaleString('fr-FR') : '—'}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono text-text-primary">
                            {formatCurrency(tx.price, tx.currency)}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono text-text-muted">
                            {tx.fees > 0 ? formatCurrency(tx.fees, tx.currency) : '—'}
                          </td>
                          <td className={cn('px-4 py-3.5 text-right font-mono font-semibold', cfg?.color)}>
                            {tx.type === 'SELL' || tx.type === 'WITHDRAWAL' ? '-' : '+'}{formatCurrency(Math.abs(total), tx.currency)}
                          </td>
                          <td className="px-4 py-3.5 text-text-muted text-xs">
                            {new Date(tx.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3.5">
                            {deleteId === tx.id ? (
                              <div className="flex gap-1.5">
                                <button onClick={() => confirmDelete(tx.id)}
                                  className="text-xs px-2 py-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors">
                                  Confirmer
                                </button>
                                <button onClick={() => setDeleteId(null)}
                                  className="text-xs px-2 py-1 border border-border text-text-muted hover:text-text-primary rounded-lg transition-colors">
                                  Annuler
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => setDeleteId(tx.id)}
                                className="text-text-muted hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-500/10">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showForm   && <TransactionForm   onClose={() => setShowForm(false)} />}
      {showImport && <CsvImportModal    onClose={() => setShowImport(false)} />}
    </div>
  )
}
