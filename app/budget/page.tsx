'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, cn } from '@/lib/utils'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sankey } from 'recharts'
import { Plus, Trash2, Wallet, ShoppingCart, PiggyBank, TrendingUp, AlertCircle, Check, CalendarDays } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = 'needs' | 'wants' | 'savings'

interface BudgetItem {
  id:         string
  label:      string
  amount:     number
  category:   Category
  dayOfMonth: number | null
  recurring:  boolean
}

interface BudgetData {
  items:  BudgetItem[]
  income: number | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<Category, {
  label: string; color: string; icon: React.ElementType; bg: string; target: number
}> = {
  needs:   { label: 'Besoins',  color: '#C9A84C', icon: Wallet,       bg: 'bg-accent/10',      target: 50 },
  wants:   { label: 'Envies',   color: '#8B5CF6', icon: ShoppingCart, bg: 'bg-purple-500/10',  target: 30 },
  savings: { label: 'Epargne',  color: '#10B981', icon: PiggyBank,    bg: 'bg-emerald-500/10', target: 20 },
}

const CATEGORIES: Category[] = ['needs', 'wants', 'savings']

const DEFAULT_ITEMS: Omit<BudgetItem, 'id'>[] = [
  { label: 'Loyer / Credit immo',   amount: 900,  category: 'needs',   dayOfMonth: 1,  recurring: true },
  { label: 'Alimentation',           amount: 350,  category: 'needs',   dayOfMonth: null, recurring: true },
  { label: 'Transport',              amount: 120,  category: 'needs',   dayOfMonth: 5,  recurring: true },
  { label: 'Factures & abonnements', amount: 80,   category: 'needs',   dayOfMonth: 10, recurring: true },
  { label: 'Restaurants & sorties',  amount: 150,  category: 'wants',   dayOfMonth: null, recurring: true },
  { label: 'Shopping & loisirs',     amount: 100,  category: 'wants',   dayOfMonth: null, recurring: true },
  { label: 'Vacances',               amount: 100,  category: 'wants',   dayOfMonth: null, recurring: true },
  { label: 'Epargne PEA',            amount: 200,  category: 'savings', dayOfMonth: 25, recurring: true },
  { label: 'Livret A',               amount: 100,  category: 'savings', dayOfMonth: 25, recurring: true },
]

// ─── Sankey helpers ───────────────────────────────────────────────────────────

const CAT_COLORS: Record<Category, string> = {
  needs:   '#C9A84C',
  wants:   '#8B5CF6',
  savings: '#10B981',
}

function buildBudgetSankey(items: BudgetItem[], income: number) {
  const INCOME = 0
  const CAT_IDX: Record<Category, number> = { needs: 1, wants: 2, savings: 3 }
  const remaining = income - items.reduce((s, i) => s + i.amount, 0)
  const hasRemaining = remaining > 0

  const nodes: { name: string; color: string }[] = [
    { name: 'Revenus',  color: '#C9A84C' },
    { name: 'Besoins',  color: CAT_COLORS.needs   },
    { name: 'Envies',   color: CAT_COLORS.wants   },
    { name: 'Épargne',  color: CAT_COLORS.savings  },
    ...(hasRemaining ? [{ name: 'Non alloué', color: '#3F3F46' }] : []),
    ...items.map(i => ({ name: i.label, color: CAT_COLORS[i.category] })),
  ]

  const ITEM_START = hasRemaining ? 5 : 4

  const links = [
    // Revenus → catégories
    ...(['needs', 'wants', 'savings'] as Category[]).map(cat => {
      const total = items.filter(i => i.category === cat).reduce((s, i) => s + i.amount, 0)
      return total > 0 ? { source: INCOME, target: CAT_IDX[cat], value: total } : null
    }).filter(Boolean) as { source: number; target: number; value: number }[],
    // Revenus → non alloué
    ...(hasRemaining ? [{ source: INCOME, target: 4, value: remaining }] : []),
    // Catégories → postes
    ...items.map((item, idx) => ({
      source: CAT_IDX[item.category],
      target: ITEM_START + idx,
      value:  item.amount,
    })),
  ]

  return { nodes, links }
}

function SankeyNode({ x = 0, y = 0, width = 10, height = 0, payload }: any) {
  const color: string = payload?.color ?? '#C9A84C'
  const h = Math.max(height as number, 2)
  const label: string = payload?.name ?? ''
  const short = label.length > 20 ? label.slice(0, 18) + '…' : label
  return (
    <g>
      <rect x={x} y={y} width={width} height={h} fill={color} fillOpacity={0.9} rx={3} ry={3} />
      <text x={(x as number) + (width as number) + 8} y={(y as number) + h / 2} dy="0.35em"
        fontSize={11} fill="#A1A1AA" fontFamily="Inter, system-ui, sans-serif">
        {short}
      </text>
    </g>
  )
}

function SankeyTip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div className="bg-surface border border-border rounded-xl p-3 shadow-xl text-sm">
      {'source' in d
        ? <><p className="text-text-muted text-xs mb-1">{d.source?.name} → {d.target?.name}</p></>
        : <p className="text-text-muted text-xs mb-1">{d.name}</p>}
      <p className="text-text-primary font-bold font-mono">{formatCurrency(d.value)}</p>
    </div>
  )
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchBudget(): Promise<BudgetData> {
  const res = await fetch('/api/budget/items')
  if (!res.ok) throw new Error('fetch error')
  return res.json()
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BudgetPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery<BudgetData>({ queryKey: ['budget'], queryFn: fetchBudget })

  const [income, setIncome]     = useState(3000)
  const [savingIncome, setSavingIncome] = useState(false)
  const [savedIncome, setSavedIncome]   = useState(false)
  const [adding, setAdding]     = useState<Category | null>(null)
  const [newLabel, setNewLabel]  = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newDay, setNewDay]       = useState('')
  const [tab, setTab]             = useState<'budget' | 'flux'>('budget')

  // Sync income from DB
  useEffect(() => {
    if (data?.income != null) setIncome(data.income)
  }, [data?.income])

  // Seed defaults if empty
  const seeded = useQuery({
    queryKey: ['budget-seeded'],
    queryFn:  async () => {
      const d = await fetchBudget()
      if (d.items.length === 0) {
        await Promise.all(DEFAULT_ITEMS.map(item =>
          fetch('/api/budget/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
          })
        ))
        queryClient.invalidateQueries({ queryKey: ['budget'] })
      }
      return true
    },
    staleTime: Infinity,
  })

  const items: BudgetItem[] = data?.items ?? []

  // Save income (debounced)
  const saveIncome = useCallback(async (val: number) => {
    setSavingIncome(true)
    await fetch('/api/budget/income', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: val }),
    })
    setSavingIncome(false)
    setSavedIncome(true)
    setTimeout(() => setSavedIncome(false), 1500)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => saveIncome(income), 800)
    return () => clearTimeout(t)
  }, [income, saveIncome])

  // Mutations
  const addItem = useMutation({
    mutationFn: (item: object) =>
      fetch('/api/budget/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budget'] }),
  })

  const updateItem = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) =>
      fetch(`/api/budget/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(r => r.json()),
    onMutate: async ({ id, data: patch }) => {
      await queryClient.cancelQueries({ queryKey: ['budget'] })
      const prev = queryClient.getQueryData<BudgetData>(['budget'])
      queryClient.setQueryData<BudgetData>(['budget'], old => old ? {
        ...old,
        items: old.items.map(i => i.id === id ? { ...i, ...patch } : i),
      } : old)
      return { prev }
    },
    onError: (_e, _v, ctx: any) => queryClient.setQueryData(['budget'], ctx?.prev),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['budget'] }),
  })

  const deleteItem = useMutation({
    mutationFn: (id: string) => fetch(`/api/budget/items/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budget'] }),
  })

  // ── Calculations ──────────────────────────────────────────────────────────
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

  const pieData = [
    ...CATEGORIES.filter(c => totals[c] > 0).map(c => ({
      name: CATEGORY_CONFIG[c].label, value: totals[c], color: CATEGORY_CONFIG[c].color,
    })),
    ...(remaining > 0 ? [{ name: 'Non alloue', value: remaining, color: '#3F3F46' }] : []),
  ]

  // ── Flux mensuel : items avec jour triés par dayOfMonth ───────────────────
  const fluxItems = useMemo(() =>
    [...items]
      .filter(i => i.dayOfMonth != null)
      .sort((a, b) => (a.dayOfMonth ?? 0) - (b.dayOfMonth ?? 0)),
    [items]
  )

  // Running balance par jour
  const fluxWithBalance = useMemo(() => {
    let balance = income
    return fluxItems.map(item => {
      balance -= item.amount
      return { ...item, balanceAfter: balance }
    })
  }, [fluxItems, income])

  // ── Add item handler ──────────────────────────────────────────────────────
  function handleAdd() {
    if (!newLabel || !newAmount || !adding) return
    addItem.mutate({
      label:      newLabel,
      amount:     parseFloat(newAmount),
      category:   adding,
      dayOfMonth: newDay ? parseInt(newDay) : null,
      recurring:  true,
    })
    setNewLabel(''); setNewAmount(''); setNewDay(''); setAdding(null)
  }

  // ── Amount update (optimistic + debounced) ────────────────────────────────
  function handleAmountChange(id: string, val: string) {
    const amount = parseFloat(val) || 0
    updateItem.mutate({ id, data: { amount } })
  }

  if (isLoading || seeded.isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header title="Budget" subtitle="Chargement..." />
        <div className="flex-1 flex items-center justify-center text-text-muted text-sm">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Budget" subtitle="Regle des 50/30/20 et flux mensuel" />

      <div className="flex-1 p-6 space-y-6 max-w-7xl w-full">

        {/* Income */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Revenu mensuel net (&euro;)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number" value={income} min={0} step={100}
                    onChange={e => setIncome(Number(e.target.value))}
                    className="w-full max-w-xs bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-xl font-mono font-bold text-text-primary focus:outline-none focus:border-accent"
                  />
                  {savingIncome && <span className="text-text-muted text-xs">Sauvegarde...</span>}
                  {savedIncome  && <span className="text-emerald-400 text-xs flex items-center gap-1"><Check className="w-3 h-3" /> Sauvegarde</span>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-text-muted text-xs mb-1">Taux d&apos;epargne</p>
                <p className={cn('text-3xl font-bold font-mono',
                  savingsRate >= 20 ? 'text-emerald-400' : savingsRate >= 10 ? 'text-accent' : 'text-red-400')}>
                  {savingsRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 w-fit">
          {[
            { id: 'budget', label: 'Repartition 50/30/20', icon: PiggyBank },
            { id: 'flux',   label: 'Flux mensuel',          icon: CalendarDays },
          ].map(t => {
            const Icon = t.icon
            return (
              <button key={t.id} onClick={() => setTab(t.id as any)}
                className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                  tab === t.id ? 'bg-accent/10 text-accent' : 'text-text-muted hover:text-text-primary')}>
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            )
          })}
        </div>

        {/* ── TAB: Budget 50/30/20 ─────────────────────────────────────────── */}
        {tab === 'budget' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie */}
              <Card>
                <CardHeader><CardTitle className="text-base">Repartition</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width={180} height={180}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                          dataKey="value" paddingAngle={2} strokeWidth={0}>
                          {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: '#1C1C1E', border: '1px solid #2C2C2E', borderRadius: 12 }}
                          formatter={(val: number) => [formatCurrency(val), '']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-3">
                      {CATEGORIES.map(cat => {
                        const cfg  = CATEGORY_CONFIG[cat]
                        const Icon = cfg.icon
                        const diff = pcts[cat] - cfg.target
                        return (
                          <div key={cat}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                                <span className="text-text-secondary text-xs font-medium">{cfg.label}</span>
                                <span className="text-text-muted text-xs">cible {cfg.target}%</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-text-primary font-mono text-xs font-semibold">{pcts[cat].toFixed(1)}%</span>
                                {Math.abs(diff) > 2 && (
                                  <span className={cn('text-xs', diff > 0 ? 'text-red-400' : 'text-emerald-400')}>
                                    {diff > 0 ? '+' : ''}{diff.toFixed(1)}pts
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(pcts[cat] / cfg.target * 100, 100)}%`, background: cfg.color }} />
                            </div>
                          </div>
                        )
                      })}
                      <div className="pt-2 border-t border-border space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-text-secondary">Total depenses</span>
                          <span className="font-mono font-semibold text-text-primary">{formatCurrency(totalExpenses)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-text-secondary">Non alloue</span>
                          <span className={cn('font-mono font-semibold', remaining >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                            {remaining >= 0 ? '+' : ''}{formatCurrency(remaining)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 50/30/20 targets */}
              <Card>
                <CardHeader><CardTitle className="text-base">Regle des 50/30/20</CardTitle></CardHeader>
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
                            <p className="text-text-primary text-sm font-semibold">{cfg.target}% &mdash; {cfg.label}</p>
                            <p className="font-mono text-sm font-bold" style={{ color: cfg.color }}>{formatCurrency(actual)}</p>
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <p className="text-text-muted text-xs">Cible : {formatCurrency(target)}</p>
                            {!ok && (
                              <span className="text-xs text-red-400 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {actual > target ? 'Depasse' : 'Sous-utilise'}
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
                          &mdash; {formatCurrency(totals[cat])} / mois
                        </span>
                      </CardTitle>
                      <button onClick={() => setAdding(cat)}
                        className="text-xs flex items-center gap-1 border border-border hover:border-accent/50 text-text-muted hover:text-accent px-3 py-1.5 rounded-xl transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Ajouter
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1.5">
                    {catItems.map(item => (
                      <div key={item.id} className="flex items-center gap-3 group px-1 py-1 rounded-xl hover:bg-surface-2/50 transition-colors">
                        <span className="flex-1 text-sm text-text-secondary">{item.label}</span>
                        {item.dayOfMonth && (
                          <span className="text-text-muted text-xs font-mono bg-surface-2 px-2 py-0.5 rounded-lg">
                            J-{item.dayOfMonth}
                          </span>
                        )}
                        <div className="flex items-center gap-1">
                          <input
                            type="number" defaultValue={item.amount} min={0} step={10}
                            onBlur={e => handleAmountChange(item.id, e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAmountChange(item.id, (e.target as HTMLInputElement).value)}
                            className="w-24 bg-surface-2 border border-border rounded-xl px-3 py-1.5 text-sm font-mono text-right text-text-primary focus:outline-none focus:border-accent"
                          />
                          <span className="text-text-muted text-xs">&euro;</span>
                        </div>
                        <button onClick={() => deleteItem.mutate(item.id)}
                          className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400 p-1 rounded-lg hover:bg-red-500/10 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {adding === cat && (
                      <div className="flex items-center gap-2 pt-2 mt-1 border-t border-border">
                        <input autoFocus value={newLabel} onChange={e => setNewLabel(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleAdd()}
                          placeholder="Libelle..."
                          className="flex-1 bg-surface-2 border border-border rounded-xl px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent" />
                        <input type="number" value={newAmount} onChange={e => setNewAmount(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleAdd()}
                          placeholder="Montant"
                          className="w-24 bg-surface-2 border border-border rounded-xl px-3 py-1.5 text-sm font-mono text-right text-text-primary focus:outline-none focus:border-accent" />
                        <input type="number" value={newDay} onChange={e => setNewDay(e.target.value)}
                          placeholder="Jour" min={1} max={31}
                          className="w-16 bg-surface-2 border border-border rounded-xl px-3 py-1.5 text-sm font-mono text-center text-text-primary focus:outline-none focus:border-accent" />
                        <span className="text-text-muted text-xs">&euro;</span>
                        <button onClick={handleAdd}
                          className="px-3 py-1.5 bg-accent hover:bg-accent-dark text-background rounded-xl text-xs font-semibold transition-colors">
                          OK
                        </button>
                        <button onClick={() => { setAdding(null); setNewLabel(''); setNewAmount(''); setNewDay('') }}
                          className="px-3 py-1.5 border border-border text-text-muted hover:text-text-primary rounded-xl text-xs transition-colors">
                          Annuler
                        </button>
                      </div>
                    )}

                    {catItems.length === 0 && adding !== cat && (
                      <p className="text-text-muted text-sm text-center py-3">Aucun poste &mdash; cliquez sur Ajouter.</p>
                    )}
                  </CardContent>
                </Card>
              )
            })}

            {remaining > 0 && (
              <Card className="border-emerald-500/20 bg-emerald-500/5">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-emerald-400 font-semibold text-sm mb-1">
                        {formatCurrency(remaining)} non alloues ce mois
                      </p>
                      <p className="text-text-muted text-xs">
                        Sur 20 ans a 8%, {formatCurrency(remaining)}/mois deviennent{' '}
                        <span className="text-emerald-400 font-semibold">
                          {formatCurrency(Math.round(remaining * ((Math.pow(1 + 0.08 / 12, 12 * 20) - 1) / (0.08 / 12))))}
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
                      Vos depenses depassent votre revenu de {formatCurrency(Math.abs(remaining))}.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* ── TAB: Flux mensuel ────────────────────────────────────────────── */}
        {tab === 'flux' && (
          <div className="space-y-6">
            {/* Sankey */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarDays className="w-4 h-4 text-accent" />
                  Flux de trésorerie mensuel
                </CardTitle>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <p className="text-text-muted text-sm text-center py-12">
                    Ajoutez des postes de budget pour visualiser le flux.
                  </p>
                ) : (
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <Sankey
                        data={buildBudgetSankey(items, income)}
                        node={<SankeyNode />}
                        link={{ stroke: '#C9A84C', fill: '#C9A84C', fillOpacity: 0.08 }}
                        nodePadding={14}
                        nodeWidth={14}
                        margin={{ top: 8, right: 200, bottom: 8, left: 8 }}
                      >
                        <Tooltip content={<SankeyTip />} />
                      </Sankey>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cashflow table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-text-secondary">
                  Échéancier mensuel
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="flex items-center gap-4 px-4 py-3 bg-accent/10 border border-accent/30 rounded-xl mb-3">
                  <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                    <span className="text-accent text-xs font-bold">J-1</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-text-primary text-sm font-semibold">Salaire / Revenus</p>
                    <p className="text-text-muted text-xs">Début du mois</p>
                  </div>
                  <p className="font-mono font-bold text-accent text-sm">+{formatCurrency(income)}</p>
                  <p className="font-mono font-bold text-text-primary text-sm w-28 text-right">{formatCurrency(income)}</p>
                </div>

                {fluxWithBalance.length === 0 && (
                  <p className="text-text-muted text-sm text-center py-6">
                    Ajoutez un jour de prélèvement (&quot;Jour&quot;) dans vos postes pour les voir ici.
                  </p>
                )}

                {fluxWithBalance.map((item, i) => {
                  const cfg  = CATEGORY_CONFIG[item.category]
                  const Icon = cfg.icon
                  return (
                    <div key={item.id} className="flex items-center gap-4 px-4 py-2.5 rounded-xl hover:bg-surface-2/50 transition-colors border border-transparent hover:border-border">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: cfg.color + '20', color: cfg.color }}>
                        {item.dayOfMonth}
                      </div>
                      <Icon className="w-4 h-4 shrink-0" style={{ color: cfg.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary text-sm font-medium truncate">{item.label}</p>
                        <p className="text-text-muted text-xs">{cfg.label}</p>
                      </div>
                      <p className="font-mono text-sm text-red-400 font-semibold w-28 text-right shrink-0">
                        -{formatCurrency(item.amount)}
                      </p>
                      <div className="w-32 text-right shrink-0">
                        <p className={cn('font-mono text-sm font-bold',
                          item.balanceAfter >= 0 ? 'text-text-primary' : 'text-red-400')}>
                          {formatCurrency(item.balanceAfter)}
                        </p>
                        {item.balanceAfter < 0 && (
                          <p className="text-red-400 text-xs">Découvert !</p>
                        )}
                      </div>
                    </div>
                  )
                })}

                {fluxWithBalance.length > 0 && (
                  <div className="flex items-center gap-4 px-4 py-3 mt-3 bg-surface-2 rounded-xl border border-border">
                    <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center">
                      <span className="text-text-muted text-xs font-bold">Fin</span>
                    </div>
                    <p className="flex-1 text-text-secondary text-sm font-semibold">Solde fin de mois</p>
                    <p className="w-28" />
                    <p className={cn('font-mono font-bold text-sm w-32 text-right',
                      remaining >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                      {remaining >= 0 ? '+' : ''}{formatCurrency(remaining)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </div>
  )
}
