'use client'

import { useState, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Card, CardContent } from '@/components/ui/card'
import {
  Plus, Trash2, RefreshCw, Search, X, ChevronDown, TrendingUp, TrendingDown,
  Package, CreditCard, BarChart3, Sparkles, AlertCircle,
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { useDebounce } from '@/hooks/use-debounce'

// ─── Types ───────────────────────────────────────────────────────────────────

interface PokemonItem {
  id: string
  itemType: 'card' | 'sealed'
  name: string
  setName: string | null
  language: string
  imageUrl: string | null
  cardApiId: string | null
  cardNumber: string | null
  rarity: string | null
  condition: string | null
  isReverse: boolean
  isGraded: boolean
  gradeLabel: string | null
  sealedType: string | null
  pricechartingId: string | null
  quantity: number
  purchasePrice: number
  currentPrice: number | null
  lastPriceAt: string | null
  currency: string
  purchasedAt: string | null
  notes: string | null
}

interface SearchResult {
  id: string
  name: string
  setName: string
  number?: string
  rarity?: string
  imageUrl: string
  trendPrice: number | null
  type: 'card' | 'sealed'
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchItems(): Promise<PokemonItem[]> {
  const r = await fetch('/api/pokemon/items')
  if (!r.ok) throw new Error('Failed')
  return r.json()
}

async function createItem(data: Partial<PokemonItem>): Promise<PokemonItem> {
  const r = await fetch('/api/pokemon/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!r.ok) throw new Error('Failed')
  return r.json()
}

async function deleteItem(id: string) {
  await fetch(`/api/pokemon/items/${id}`, { method: 'DELETE' })
}

async function refreshPrices(): Promise<{ updated: number }> {
  const r = await fetch('/api/pokemon/price', { method: 'POST' })
  if (!r.ok) throw new Error('Failed')
  return r.json()
}

// ─── Stats ───────────────────────────────────────────────────────────────────

function computeStats(items: PokemonItem[]) {
  const totalCost = items.reduce((s, i) => s + i.purchasePrice * i.quantity, 0)
  const totalValue = items.reduce((s, i) => s + (i.currentPrice ?? i.purchasePrice) * i.quantity, 0)
  const pnl = totalValue - totalCost
  const pnlPct = totalCost > 0 ? (pnl / totalCost) * 100 : 0
  return { totalCost, totalValue, pnl, pnlPct, count: items.length }
}

// ─── Search component ─────────────────────────────────────────────────────────

function SearchDropdown({
  type,
  onSelect,
}: {
  type: 'card' | 'sealed'
  onSelect: (r: SearchResult) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const debouncedQuery = useDebounce(query, 400)

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['pokemon-search', type, debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery.length < 2) return []
      const r = await fetch(`/api/pokemon/search?q=${encodeURIComponent(debouncedQuery)}&type=${type}`)
      return r.json()
    },
    enabled: debouncedQuery.length >= 2,
  })

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-surface-2 border border-border rounded-xl px-3 py-2.5">
        <Search className="w-4 h-4 text-text-muted shrink-0" />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder={type === 'card' ? 'Rechercher une carte...' : 'Rechercher un produit scellé...'}
          className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
        />
        {query && (
          <button onClick={() => { setQuery(''); setOpen(false) }} className="text-text-muted hover:text-text-primary">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        {isFetching && <RefreshCw className="w-3.5 h-3.5 text-text-muted animate-spin shrink-0" />}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto">
          {results.map((r: SearchResult) => (
            <button
              key={r.id}
              onClick={() => { onSelect(r); setQuery(''); setOpen(false) }}
              className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-surface-2 transition-colors text-left"
            >
              {r.imageUrl ? (
                <img src={r.imageUrl} alt={r.name} className="w-8 h-10 object-contain rounded shrink-0" />
              ) : (
                <div className="w-8 h-10 bg-surface-2 rounded shrink-0 flex items-center justify-center">
                  <Package className="w-4 h-4 text-text-muted" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{r.name}</p>
                <p className="text-xs text-text-muted truncate">
                  {r.setName}{r.number ? ` · #${r.number}` : ''}{r.rarity ? ` · ${r.rarity}` : ''}
                </p>
              </div>
              {r.trendPrice !== null ? (
                <span className="text-xs font-mono font-semibold text-accent shrink-0">
                  {formatCurrency(r.trendPrice, 'EUR', true)}
                </span>
              ) : (
                <span className="text-xs text-text-muted shrink-0">N/A</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Add Item Modal ───────────────────────────────────────────────────────────

const CONDITIONS = ['MT', 'NM', 'EX', 'GD', 'LP', 'PL', 'PO']
const LANGUAGES = ['FR', 'EN', 'JP', 'DE', 'ES', 'IT', 'PT', 'KO', 'ZH']
const SEALED_TYPES = ['ETB', 'Display', 'Booster', 'Bundle', 'Coffret', 'Tin', 'Autre']

function AddModal({
  defaultType,
  onClose,
  onCreate,
}: {
  defaultType: 'card' | 'sealed'
  onClose: () => void
  onCreate: (data: Partial<PokemonItem>) => void
}) {
  const [itemType, setItemType] = useState<'card' | 'sealed'>(defaultType)
  const [selected, setSelected] = useState<SearchResult | null>(null)
  const [form, setForm] = useState({
    quantity: '1',
    purchasePrice: '',
    condition: 'NM',
    language: 'FR',
    isReverse: false,
    isGraded: false,
    gradeLabel: '',
    sealedType: 'ETB',
    purchasedAt: '',
    notes: '',
  })

  function handleSelect(r: SearchResult) {
    setSelected(r)
    if (r.trendPrice) setForm(f => ({ ...f, purchasePrice: String(r.trendPrice) }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    onCreate({
      itemType,
      name: selected.name,
      setName: selected.setName,
      imageUrl: selected.imageUrl,
      cardApiId: itemType === 'card' ? selected.id : null,
      cardNumber: selected.number ?? null,
      rarity: selected.rarity ?? null,
      pricechartingId: itemType === 'sealed' ? selected.id : null,
      condition: itemType === 'card' ? form.condition : null,
      language: form.language,
      isReverse: form.isReverse,
      isGraded: form.isGraded,
      gradeLabel: form.isGraded ? form.gradeLabel : null,
      sealedType: itemType === 'sealed' ? form.sealedType : null,
      quantity: parseInt(form.quantity) || 1,
      purchasePrice: parseFloat(form.purchasePrice) || 0,
      currentPrice: selected.trendPrice,
      lastPriceAt: selected.trendPrice ? new Date().toISOString() : null,
      purchasedAt: form.purchasedAt ? new Date(form.purchasedAt).toISOString() : null,
      notes: form.notes || null,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-surface border border-border rounded-t-2xl sm:rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-surface z-10">
          <h2 className="text-base font-semibold text-text-primary">Ajouter un item</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Type toggle */}
          <div className="flex gap-2">
            {(['card', 'sealed'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => { setItemType(t); setSelected(null) }}
                className={cn(
                  'flex-1 py-2 rounded-xl text-sm font-medium border transition-all',
                  itemType === t
                    ? 'bg-accent/10 text-accent border-accent/30'
                    : 'border-border text-text-secondary hover:bg-surface-2'
                )}
              >
                {t === 'card' ? (
                  <span className="flex items-center justify-center gap-1.5"><CreditCard className="w-3.5 h-3.5" />Carte</span>
                ) : (
                  <span className="flex items-center justify-center gap-1.5"><Package className="w-3.5 h-3.5" />Scellé</span>
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              {itemType === 'card' ? 'Chercher la carte' : 'Chercher le produit'}
            </label>
            <SearchDropdown type={itemType} onSelect={handleSelect} />
          </div>

          {/* Selected preview */}
          {selected && (
            <div className="flex items-center gap-3 p-3 bg-surface-2 rounded-xl border border-border">
              {selected.imageUrl && (
                <img src={selected.imageUrl} alt={selected.name} className="w-10 h-14 object-contain rounded shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary">{selected.name}</p>
                <p className="text-xs text-text-muted">{selected.setName}{selected.number ? ` · #${selected.number}` : ''}</p>
                {selected.trendPrice !== null && (
                  <p className="text-xs text-accent font-mono mt-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Prix tendance : {formatCurrency(selected.trendPrice, 'EUR', true)}
                  </p>
                )}
              </div>
              <button type="button" onClick={() => setSelected(null)} className="text-text-muted hover:text-text-primary shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Card-specific fields */}
          {itemType === 'card' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Langue</label>
                <select
                  value={form.language}
                  onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                >
                  {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">État</label>
                <select
                  value={form.condition}
                  onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                >
                  {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer col-span-2">
                <input
                  type="checkbox"
                  checked={form.isReverse}
                  onChange={e => setForm(f => ({ ...f, isReverse: e.target.checked }))}
                  className="w-4 h-4 accent-accent"
                />
                <span className="text-sm text-text-secondary">Reverse holo</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer col-span-2">
                <input
                  type="checkbox"
                  checked={form.isGraded}
                  onChange={e => setForm(f => ({ ...f, isGraded: e.target.checked }))}
                  className="w-4 h-4 accent-accent"
                />
                <span className="text-sm text-text-secondary">Gradée</span>
              </label>
              {form.isGraded && (
                <input
                  value={form.gradeLabel}
                  onChange={e => setForm(f => ({ ...f, gradeLabel: e.target.value }))}
                  placeholder="PSA 10, BGS 9.5..."
                  className="col-span-2 bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                />
              )}
            </div>
          )}

          {/* Sealed-specific */}
          {itemType === 'sealed' && (
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Type de produit</label>
              <select
                value={form.sealedType}
                onChange={e => setForm(f => ({ ...f, sealedType: e.target.value }))}
                className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
              >
                {SEALED_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}

          {/* Common fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Prix d&apos;achat (€)</label>
              <input
                type="number"
                step="0.01"
                value={form.purchasePrice}
                onChange={e => setForm(f => ({ ...f, purchasePrice: e.target.value }))}
                className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:border-accent"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Quantité</label>
              <input
                type="number"
                min="1"
                value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Date d&apos;achat</label>
            <input
              type="date"
              value={form.purchasedAt}
              onChange={e => setForm(f => ({ ...f, purchasedAt: e.target.value }))}
              className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Acheté à la release, lot de 3..."
              className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm text-text-primary resize-none focus:outline-none focus:border-accent"
            />
          </div>

          {!selected && (
            <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-xl px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              Cherchez et sélectionnez un item pour continuer
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-text-secondary hover:text-text-primary text-sm font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!selected}
              className="flex-1 py-2.5 rounded-xl bg-accent hover:bg-accent-dark disabled:opacity-40 text-obsidian text-sm font-semibold transition-colors"
            >
              Ajouter
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Item Card ────────────────────────────────────────────────────────────────

function ItemCard({ item, onDelete }: { item: PokemonItem; onDelete: () => void }) {
  const currentPrice = item.currentPrice ?? item.purchasePrice
  const totalCost = item.purchasePrice * item.quantity
  const totalValue = currentPrice * item.quantity
  const pnl = totalValue - totalCost
  const pnlPct = totalCost > 0 ? (pnl / totalCost) * 100 : 0
  const isPositive = pnl >= 0

  return (
    <Card className="hover:border-zinc-700 transition-colors group">
      <CardContent className="pt-4 pb-4">
        <div className="flex gap-3">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              className={cn('object-contain rounded shrink-0', item.itemType === 'card' ? 'w-12 h-16' : 'w-12 h-12 self-center')}
            />
          ) : (
            <div className={cn('bg-surface-2 rounded flex items-center justify-center shrink-0', item.itemType === 'card' ? 'w-12 h-16' : 'w-12 h-12')}>
              {item.itemType === 'card' ? <CreditCard className="w-5 h-5 text-text-muted" /> : <Package className="w-5 h-5 text-text-muted" />}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">{item.name}</p>
                <p className="text-xs text-text-muted truncate">
                  {item.setName ?? ''}
                  {item.cardNumber ? ` · #${item.cardNumber}` : ''}
                  {item.isReverse ? ' · Reverse' : ''}
                  {item.isGraded && item.gradeLabel ? ` · ${item.gradeLabel}` : ''}
                  {item.sealedType ? ` · ${item.sealedType}` : ''}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  {item.condition && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-surface-2 rounded text-text-muted font-mono">{item.condition}</span>
                  )}
                  <span className="text-[10px] px-1.5 py-0.5 bg-surface-2 rounded text-text-muted">{item.language}</span>
                  {item.quantity > 1 && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-accent/10 rounded text-accent font-mono">×{item.quantity}</span>
                  )}
                </div>
              </div>
              <button
                onClick={onDelete}
                className="text-text-muted hover:text-red-400 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-text-muted">Valeur totale</p>
                <p className="text-sm font-bold font-mono text-text-primary">{formatCurrency(totalValue, 'EUR', true)}</p>
              </div>
              <div className={cn(
                'flex items-center gap-1 text-xs font-semibold font-mono',
                isPositive ? 'text-emerald-400' : 'text-red-400'
              )}>
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {isPositive ? '+' : ''}{formatCurrency(pnl, 'EUR', true)} ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)
              </div>
            </div>

            {item.lastPriceAt && (
              <p className="text-[10px] text-text-muted mt-1">
                Prix réel (vendu) · mis à jour {new Date(item.lastPriceAt).toLocaleDateString('fr-FR')}
              </p>
            )}
            {!item.currentPrice && (
              <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-2.5 h-2.5" />
                Prix non encore récupéré
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'cards' | 'sealed' | 'stats'

export default function PokemonPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('cards')
  const [showAdd, setShowAdd] = useState(false)
  const [addType, setAddType] = useState<'card' | 'sealed'>('card')

  const { data: items = [], isLoading } = useQuery({ queryKey: ['pokemon-items'], queryFn: fetchItems })

  const createMutation = useMutation({
    mutationFn: createItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pokemon-items'] })
      setShowAdd(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pokemon-items'] }),
  })

  const refreshMutation = useMutation({
    mutationFn: refreshPrices,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pokemon-items'] }),
  })

  const cards = items.filter(i => i.itemType === 'card')
  const sealed = items.filter(i => i.itemType === 'sealed')
  const stats = computeStats(items)

  function openAdd(type: 'card' | 'sealed') {
    setAddType(type)
    setShowAdd(true)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Pokémon TCG" subtitle="Portfolio cartes & produits scellés" />

      <div className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-text-muted text-xs">Valeur totale (prix vendus)</p>
            <p className="text-2xl font-bold font-mono text-text-primary">{formatCurrency(stats.totalValue, 'EUR', true)}</p>
            <p className={cn('text-xs font-semibold font-mono mt-0.5', stats.pnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
              {stats.pnl >= 0 ? '+' : ''}{formatCurrency(stats.pnl, 'EUR', true)} ({stats.pnlPct >= 0 ? '+' : ''}{stats.pnlPct.toFixed(1)}%)
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => refreshMutation.mutate()}
              disabled={refreshMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-text-secondary hover:text-text-primary hover:bg-surface-2 text-xs font-medium transition-all disabled:opacity-50"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', refreshMutation.isPending && 'animate-spin')} />
              <span className="hidden sm:inline">Actualiser prix</span>
            </button>
            <button
              onClick={() => openAdd(tab === 'sealed' ? 'sealed' : 'card')}
              className="flex items-center gap-1.5 bg-accent hover:bg-accent-dark text-obsidian px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Ajouter
            </button>
          </div>
        </div>

        {/* Règle Zalu banner */}
        <div className="flex items-center gap-2 px-3 py-2 bg-accent/8 border border-accent/20 rounded-xl text-xs text-accent">
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span><strong>Règle Zalu</strong> — Prix basés uniquement sur les ventes réelles constatées (CardMarket trendPrice & PriceCharting new-price)</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-surface-2 p-1 rounded-xl w-fit">
          {([
            { id: 'cards', label: `Cartes (${cards.length})`, icon: CreditCard },
            { id: 'sealed', label: `Scellés (${sealed.length})`, icon: Package },
            { id: 'stats', label: 'Analyse', icon: BarChart3 },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                tab === t.id ? 'bg-surface text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary'
              )}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Cards tab */}
        {tab === 'cards' && (
          <div className="space-y-3">
            {cards.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
                  <CreditCard className="w-7 h-7 text-text-muted" />
                </div>
                <p className="text-text-primary font-semibold mb-2">Aucune carte</p>
                <p className="text-text-muted text-sm mb-4">Ajoutez vos premières cartes Pokémon</p>
                <button
                  onClick={() => openAdd('card')}
                  className="flex items-center gap-2 bg-accent hover:bg-accent-dark text-obsidian px-4 py-2 rounded-xl text-sm font-semibold"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter une carte
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {cards.map(item => (
                <ItemCard key={item.id} item={item} onDelete={() => deleteMutation.mutate(item.id)} />
              ))}
            </div>
          </div>
        )}

        {/* Sealed tab */}
        {tab === 'sealed' && (
          <div className="space-y-3">
            {sealed.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
                  <Package className="w-7 h-7 text-text-muted" />
                </div>
                <p className="text-text-primary font-semibold mb-2">Aucun scellé</p>
                <p className="text-text-muted text-sm mb-4">Ajoutez vos ETB, Displays, Boosters...</p>
                <button
                  onClick={() => openAdd('sealed')}
                  className="flex items-center gap-2 bg-accent hover:bg-accent-dark text-obsidian px-4 py-2 rounded-xl text-sm font-semibold"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter un scellé
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {sealed.map(item => (
                <ItemCard key={item.id} item={item} onDelete={() => deleteMutation.mutate(item.id)} />
              ))}
            </div>
          </div>
        )}

        {/* Stats tab */}
        {tab === 'stats' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Items total', value: String(stats.count), mono: false },
                { label: 'Coût total', value: formatCurrency(stats.totalCost, 'EUR', true), mono: true },
                { label: 'Valeur actuelle', value: formatCurrency(stats.totalValue, 'EUR', true), mono: true },
                {
                  label: 'P&L',
                  value: `${stats.pnl >= 0 ? '+' : ''}${formatCurrency(stats.pnl, 'EUR', true)}`,
                  mono: true,
                  color: stats.pnl >= 0 ? 'text-emerald-400' : 'text-red-400',
                },
              ].map(s => (
                <Card key={s.label}>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-text-muted mb-1">{s.label}</p>
                    <p className={cn('text-lg font-bold', s.mono && 'font-mono', s.color ?? 'text-text-primary')}>{s.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Breakdown by type */}
            {[
              { label: 'Cartes', items: cards },
              { label: 'Scellés', items: sealed },
            ].map(group => {
              const gs = computeStats(group.items)
              return (
                <Card key={group.label}>
                  <CardContent className="pt-4 pb-4">
                    <h3 className="text-sm font-semibold text-text-primary mb-3">{group.label} ({group.items.length})</h3>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-muted">Valeur</span>
                      <span className="font-mono font-semibold text-text-primary">{formatCurrency(gs.totalValue, 'EUR', true)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-text-muted">P&L</span>
                      <span className={cn('font-mono font-semibold', gs.pnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {gs.pnl >= 0 ? '+' : ''}{formatCurrency(gs.pnl, 'EUR', true)} ({gs.pnlPct >= 0 ? '+' : ''}{gs.pnlPct.toFixed(1)}%)
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            {/* Top performers */}
            {items.filter(i => i.currentPrice).length > 0 && (
              <Card>
                <CardContent className="pt-4 pb-2">
                  <h3 className="text-sm font-semibold text-text-primary mb-3">Top performances</h3>
                  {items
                    .filter(i => i.currentPrice)
                    .map(i => ({
                      ...i,
                      pnlPct: ((i.currentPrice! - i.purchasePrice) / i.purchasePrice) * 100,
                    }))
                    .sort((a, b) => b.pnlPct - a.pnlPct)
                    .slice(0, 5)
                    .map(i => (
                      <div key={i.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div className="min-w-0">
                          <p className="text-sm text-text-primary truncate">{i.name}</p>
                          <p className="text-xs text-text-muted">{i.setName ?? ''}</p>
                        </div>
                        <span className={cn('text-xs font-mono font-semibold shrink-0 ml-2', i.pnlPct >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                          {i.pnlPct >= 0 ? '+' : ''}{i.pnlPct.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {showAdd && (
        <AddModal
          defaultType={addType}
          onClose={() => setShowAdd(false)}
          onCreate={data => createMutation.mutate(data)}
        />
      )}
    </div>
  )
}
