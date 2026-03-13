'use client'

import { useState, useMemo } from 'react'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, cn } from '@/lib/utils'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Plus, Trash2, Wallet, ShoppingCart, PiggyBank, TrendingUp, AlertCircle } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = 'needs' | 'wants' | 'savings'

interface BudgetItem {
  id: string
  label: string
  amount: number
  category: Category
}

const CATEGORY_CONFIG: Record<Category, { label: string; color: string; icon: React.ElementType; bg: string; target: number }> = {
  needs:   { label: 'Besoins',  color: '#C9A84C', icon: Wallet,       bg: 'bg-accent/10',        target: 50 },
  wants:   { label: 'Envies',   color: '#8B5CF6', icon: ShoppingCart, bg: 'bg-purple-500/10',    target: 30 },
  savings: { label: 'Épargne',  color: '#10B981', icon: PiggyBank,    bg: 'bg-emerald-500/10',   target: 20 },
}

const DEFAULT_ITEMS: BudgetItem[] = [
  { id: '1', label: 'Loyer / Crédit immo',  amount: 900,  category: 'needs'   },
  { id: '2', label: 'Alimentation',          amount: 350,  category: 'needs'   },
  { id: '3', label: 'Transport',             amount: 120,  category: 'needs'   },
  { id: '4', label: 'Factures & abonnements',amount: 80,   category: 'needs'   },
  { id: '5', label: 'Restaurants & sorties', amount: 150,  category: 'wants'   },
  { id: '6', label: 'Shopping & loisirs',    amount: 100,  category: 'wants'   },
  { id: '7', label: 'Vacances',              amount: 100,  category: 'wants'   },
  { id: '8', label: 'Épargne PEA',           amount: 200,  category: 'savings' },
  { id: '9', label: 'Livret A',              amount: 100,  category: 'savings' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function BudgetPage() {
  const [income, setIncome]   = useState(3000)
  const [items,  setItems]    = useState<BudgetItem[]>(DEFAULT_ITEMS)
  const [adding, setAdding]   = useState<Category | null>(null)
  const [newLabel,  setNewLabel]  = useState('')
  const [newAmount, setNewAmount] = useState('')

  // ── Calculations ─────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    const t: Record<Category, number> = { needs: 0, wants: 0, savings: 0 }
    for (const item of items) t[item.category] += item.amount
    return t
  }, [items])

  const totalExpenses = totals.needs + totals.wants + totals.savings
  const remaining     = income - totalExpenses
  const savingsRate   = income > 0 ? (totals.savings / income) * 100 : 0

  const pcts: Record<Category, number> = {
    needs:   income > 0 ? (totals.needs   / income) * 100 : 0,
    wants:   income > 0 ? (totals.wants   / income) * 100 : 0,
    savings: income > 0 ? (totals.savings / income) * 100 : 0,
  }

  const pieData = (Object.keys(CATEGORY_CONFIG) as Category[])
    .filter(c => totals[c] > 0)
    .map(c => ({ name: CATEGORY_CONFIG[c].label, value: totals[c], color: CATEGORY_CONFIG[c].color }))

  if (remaining > 0) {
    pieData.push({ name: 'Non alloué', value: remaining, color: '#3F3F46' })
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  function addItem() {
    if (!newLabel || !newAmount || !adding) return
    const item: BudgetItem = {
      id:       Date.now().toString(),
      label:    newLabel,
      amount:   parseFloat(newAmount),
      category: adding,
    }
    setItems(prev => [...prev, item])
    setNewLabel('')
    setNewAmount('')
    setAdding(null)
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  function updateAmount(id: string, val: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, amount: parseFloat(val) || 0 } : i))
  }

  const CATEGORIES: Category[] = ['needs', 'wants', 'savings']

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Budget" subtitle="R&egrave;gle des 50/30/20 et analyse de vos d&eacute;penses" />

      <div className="flex-1 p-6 space-y-6 max-w-5xl">

        {/* Income */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Revenu mensuel net (&euro;)
                </label>
                <input
                  type="number"
                  value={income}
                  min={0}
                  step={100}
                  onChange={e => setIncome(Number(e.target.value))}
                  className="w-full max-w-xs bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-xl font-mono font-bold text-text-primary focus:outline-none focus:border-accent"
                />
              </div>
              <div className="text-right">
                <p className="text-text-muted text-xs mb-1">Taux d&apos;&eacute;pargne</p>
                <p className={cn('text-3xl font-bold font-mono', savingsRate >= 20 ? 'text-emerald-400' : savingsRate >= 10 ? 'text-accent' : 'text-red-400')}>
                  {savingsRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 50/30/20 overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Pie chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">R&eacute;partition du budget</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                      dataKey="value" paddingAngle={2} strokeWidth={0}>
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#1C1C1E', border: '1px solid #2C2C2E', borderRadius: 12 }}
                      formatter={(val: number) => [formatCurrency(val), '']}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="flex-1 space-y-3">
                  {CATEGORIES.map(cat => {
                    const cfg = CATEGORY_CONFIG[cat]
                    const Icon = cfg.icon
                    const pct  = pcts[cat]
                    const diff = pct - cfg.target
                    return (
                      <div key={cat}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                            <span className="text-text-secondary text-xs font-medium">{cfg.label}</span>
                            <span className="text-text-muted text-xs">cible {cfg.target}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-text-primary font-mono text-xs font-semibold">{pct.toFixed(1)}%</span>
                            {Math.abs(diff) > 2 && (
                              <span className={cn('text-xs', diff > 0 ? 'text-red-400' : 'text-emerald-400')}>
                                {diff > 0 ? '+' : ''}{diff.toFixed(1)}pts
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(pct / cfg.target * 100, 100)}%`, background: cfg.color }} />
                        </div>
                      </div>
                    )
                  })}

                  <div className="pt-2 border-t border-border">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Total d&eacute;penses</span>
                      <span className="font-mono font-semibold text-text-primary">{formatCurrency(totalExpenses)}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-text-secondary">Non allou&eacute;</span>
                      <span className={cn('font-mono font-semibold', remaining >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {remaining >= 0 ? '+' : ''}{formatCurrency(remaining)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 50/30/20 rule explanation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">R&egrave;gle des 50/30/20</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {CATEGORIES.map(cat => {
                const cfg    = CATEGORY_CONFIG[cat]
                const Icon   = cfg.icon
                const target = (income * cfg.target) / 100
                const actual = totals[cat]
                const ok     = Math.abs(actual - target) < target * 0.15
                return (
                  <div key={cat} className={cn('flex items-center gap-3 p-3 rounded-xl border', cfg.bg,
                    ok ? 'border-transparent' : 'border-red-500/20')}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: cfg.color + '20' }}>
                      <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-text-primary text-sm font-semibold">{cfg.target}% — {cfg.label}</p>
                        <p className="font-mono text-sm font-bold" style={{ color: cfg.color }}>{formatCurrency(actual)}</p>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-text-muted text-xs">Cible : {formatCurrency(target)}</p>
                        {!ok && (
                          <span className="text-xs text-red-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {actual > target ? 'D&eacute;pass&eacute;' : 'Sous-utilis&eacute;'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>

        {/* Items by category */}
        {CATEGORIES.map(cat => {
          const cfg      = CATEGORY_CONFIG[cat]
          const Icon     = cfg.icon
          const catItems = items.filter(i => i.category === cat)

          return (
            <Card key={cat}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                    {cfg.label}
                    <span className="text-text-muted text-sm font-normal ml-1">
                      — {formatCurrency(totals[cat])} / mois
                    </span>
                  </CardTitle>
                  <button
                    onClick={() => setAdding(cat)}
                    className="text-xs flex items-center gap-1 border border-border hover:border-accent/50 text-text-muted hover:text-accent px-3 py-1.5 rounded-xl transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Ajouter
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {catItems.map(item => (
                  <div key={item.id} className="flex items-center gap-3 group">
                    <span className="flex-1 text-sm text-text-secondary">{item.label}</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={item.amount}
                        min={0}
                        step={10}
                        onChange={e => updateAmount(item.id, e.target.value)}
                        className="w-24 bg-surface-2 border border-border rounded-xl px-3 py-1.5 text-sm font-mono text-right text-text-primary focus:outline-none focus:border-accent"
                      />
                      <span className="text-text-muted text-xs">&euro;</span>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400 p-1 rounded-lg hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {/* Add form inline */}
                {adding === cat && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
                    <input
                      autoFocus
                      value={newLabel}
                      onChange={e => setNewLabel(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addItem()}
                      placeholder="Libellé..."
                      className="flex-1 bg-surface-2 border border-border rounded-xl px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
                    />
                    <input
                      type="number"
                      value={newAmount}
                      onChange={e => setNewAmount(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addItem()}
                      placeholder="0"
                      className="w-24 bg-surface-2 border border-border rounded-xl px-3 py-1.5 text-sm font-mono text-right text-text-primary focus:outline-none focus:border-accent"
                    />
                    <span className="text-text-muted text-xs">&euro;</span>
                    <button onClick={addItem}
                      className="px-3 py-1.5 bg-accent hover:bg-accent-dark text-background rounded-xl text-xs font-semibold transition-colors">
                      OK
                    </button>
                    <button onClick={() => { setAdding(null); setNewLabel(''); setNewAmount('') }}
                      className="px-3 py-1.5 border border-border text-text-muted hover:text-text-primary rounded-xl text-xs transition-colors">
                      Annuler
                    </button>
                  </div>
                )}

                {catItems.length === 0 && adding !== cat && (
                  <p className="text-text-muted text-sm text-center py-3">Aucun poste — cliquez sur Ajouter.</p>
                )}
              </CardContent>
            </Card>
          )
        })}

        {/* Savings suggestions */}
        {remaining > 0 && (
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-emerald-400 font-semibold text-sm mb-1">
                    Vous avez {formatCurrency(remaining)} non allou&eacute;s ce mois
                  </p>
                  <p className="text-text-muted text-xs">
                    Conseil : versez-les sur votre PEA ou Livret A. Sur 20 ans &agrave; 8%,
                    {' '}{formatCurrency(remaining)}/mois deviennent{' '}
                    <span className="text-emerald-400 font-semibold">
                      {formatCurrency(Math.round(remaining * ((Math.pow(1 + 0.08/12, 12*20) - 1) / (0.08/12))))}
                    </span>.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {remaining < 0 && (
          <Card className="border-red-500/20 bg-red-500/5">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">
                  Vos d&eacute;penses d&eacute;passent votre revenu de {formatCurrency(Math.abs(remaining))}.
                  Identifiez les postes &agrave; r&eacute;duire dans &quot;Envies&quot;.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  )
}
