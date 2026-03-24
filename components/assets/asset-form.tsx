'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Search, Loader2, TrendingUp, TrendingDown, Check, ChevronRight } from 'lucide-react'
import { useCreateAsset, useUpdateAsset } from '@/hooks/use-assets'
import { Asset, AssetType, SearchResult, PriceData } from '@/types'
import { getAssetTypeLabel, formatCurrency, cn } from '@/lib/utils'

// ─── Presets ──────────────────────────────────────────────────────────────────

const SAVINGS_PRESETS = [
  { name: 'Livret A',       institution: "Caisse d'Épargne", notes: 'Taux réglementé : 3,00 %' },
  { name: 'LDDS',           institution: 'Crédit Mutuel',    notes: 'Taux réglementé : 3,00 %' },
  { name: 'LEP',            institution: 'La Banque Postale',notes: 'Taux réglementé : 6,10 %' },
  { name: 'PEL',            institution: 'BNP Paribas',      notes: 'Plan Épargne Logement : 2,25 %' },
  { name: 'CEL',            institution: '',                  notes: "Compte Épargne Logement : 2,00 %" },
  { name: 'Assurance Vie',  institution: '',                  notes: 'Contrat multisupport' },
  { name: 'PEA',            institution: 'Boursorama',        notes: 'Plan Épargne en Actions' },
  { name: "Compte à terme", institution: '',                  notes: '' },
]

const BANK_PRESETS = [
  'BNP Paribas', 'Société Générale', 'Crédit Agricole', 'Crédit Mutuel',
  "Caisse d'Épargne", 'La Banque Postale', 'LCL', 'CIC',
  'Boursorama', 'Fortuneo', 'Hello Bank!', 'N26', 'Revolut', 'Wise',
]

const REAL_ESTATE_PRESETS = [
  { name: 'Résidence principale', notes: "Estimation Meilleurs Agents / SeLoger" },
  { name: 'Investissement locatif', notes: '' },
  { name: 'SCPI',                   notes: 'Société Civile de Placement Immobilier' },
  { name: 'Local commercial',       notes: '' },
  { name: 'Terrain',                notes: '' },
  { name: 'Résidence secondaire',   notes: '' },
]

const ASSET_TYPES: AssetType[] = ['BANK_ACCOUNT', 'SAVINGS', 'REAL_ESTATE', 'STOCK', 'CRYPTO', 'PEA', 'CTO', 'OTHER']

const TYPE_ICONS: Record<string, string> = {
  BANK_ACCOUNT: '🏦',
  SAVINGS: '🐖',
  REAL_ESTATE: '🏠',
  STOCK: '📈',
  CRYPTO: '₿',
  PEA: '🇫🇷',
  CTO: '📊',
  OTHER: '📦',
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  name: string
  type: AssetType
  institution: string
  value: string
  currency: string
  notes: string
}

interface AssetFormProps {
  onClose: () => void
  editAsset?: Asset
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AssetForm({ onClose, editAsset }: AssetFormProps) {
  const [form, setForm] = useState<FormState>({
    name:        editAsset?.name        ?? '',
    type:        editAsset?.type        ?? 'BANK_ACCOUNT',
    institution: editAsset?.institution ?? '',
    value:       editAsset?.value?.toString() ?? '',
    currency:    editAsset?.currency    ?? 'EUR',
    notes:       editAsset?.notes       ?? '',
  })

  // Search state (STOCK / CRYPTO)
  const [searchQuery, setSearchQuery]     = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching]     = useState(false)
  const [showDropdown, setShowDropdown]   = useState(false)
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null)

  // Price state (STOCK / CRYPTO)
  const [unitPrice, setUnitPrice]         = useState('')
  const [quantity, setQuantity]           = useState('')
  const [priceChange, setPriceChange]     = useState<number | null>(null)
  const [isFetchingPrice, setIsFetchingPrice] = useState(false)
  const [dropdownPrices, setDropdownPrices] = useState<Record<string, PriceData>>({})

  const searchRef  = useRef<HTMLDivElement>(null)
  const createAsset = useCreateAsset()
  const updateAsset = useUpdateAsset()
  const isPending   = createAsset.isPending || updateAsset.isPending

  const isFinancial = form.type === 'STOCK' || form.type === 'CRYPTO' || form.type === 'PEA' || form.type === 'CTO'

  // Computed total for financial assets
  const totalValue = isFinancial
    ? ((parseFloat(quantity) || 0) * (parseFloat(unitPrice) || 0))
    : parseFloat(form.value) || 0

  // ── Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/i
  const isISIN  = ISIN_RE.test(searchQuery.trim())

  // ── Debounced search
  useEffect(() => {
    if (!isFinancial || searchQuery.length < 1) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }
    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(searchQuery)}&type=${form.type}`
        )
        const data: SearchResult[] = await res.json()
        setSearchResults(data)
        setShowDropdown(true)
      } catch {
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, form.type, isFinancial])

  // ── Fetch prices for all search results to show in dropdown
  useEffect(() => {
    if (searchResults.length === 0) { setDropdownPrices({}); return }
    const symbols = searchResults.map(r => r.symbol).join(',')
    fetch(`/api/prices?symbols=${symbols}`)
      .then(r => r.json())
      .then((prices: PriceData[]) => {
        const map: Record<string, PriceData> = {}
        prices.forEach(p => { map[p.symbol] = p })
        setDropdownPrices(map)
      })
      .catch(() => {})
  }, [searchResults])

  // ── Reset smart fields when type changes
  function handleTypeChange(type: AssetType) {
    setForm(f => ({ ...f, type, name: '', institution: '', notes: '' }))
    setSearchQuery('')
    setSearchResults([])
    setSelectedResult(null)
    setUnitPrice('')
    setQuantity('')
    setPriceChange(null)
  }

  // ── Select a search result + fetch price
  async function handleSelectResult(result: SearchResult) {
    setSelectedResult(result)
    setShowDropdown(false)
    setSearchQuery(`${result.symbol} — ${result.name}`)
    setForm(f => ({
      ...f,
      name: result.name,
      institution: result.exchange ?? f.institution,
    }))

    setIsFetchingPrice(true)
    try {
      const res = await fetch(`/api/prices?symbols=${result.symbol}`)
      const prices = await res.json()
      if (prices[0]) {
        setUnitPrice(prices[0].price.toString())
        setPriceChange(prices[0].changePercent24h ?? null)
        setForm(f => ({ ...f, currency: result.coinId ? 'EUR' : 'USD' }))
      }
    } catch {
      // ignore
    } finally {
      setIsFetchingPrice(false)
    }
  }

  // ── Apply savings preset
  function applyPreset(preset: { name: string; institution: string; notes: string }) {
    setForm(f => ({ ...f, name: preset.name, institution: preset.institution, notes: preset.notes }))
  }

  // ── Submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload: Record<string, any> = {
      name:        form.name,
      type:        form.type,
      institution: form.institution || null,
      value:       isFinancial ? totalValue : parseFloat(form.value),
      currency:    form.currency,
      notes:       form.notes || null,
    }
    // Pass holding fields so the API can create the Holding record
    if (isFinancial && selectedResult) {
      payload.symbol      = selectedResult.symbol
      payload.quantity    = parseFloat(quantity)    || 0
      payload.avgBuyPrice = parseFloat(unitPrice)   || 0
    }
    if (editAsset) {
      await updateAsset.mutateAsync({ id: editAsset.id, data: payload })
    } else {
      await createAsset.mutateAsync(payload)
    }
    onClose()
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
          <h2 className="text-lg font-semibold text-text-primary">
            {editAsset ? "Modifier l'actif" : 'Ajouter un actif'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">

            {/* ── Type selector */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Type d'actif
              </label>
              <div className="grid grid-cols-3 gap-2">
                {ASSET_TYPES.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleTypeChange(type)}
                    className={cn(
                      'py-2.5 px-3 rounded-xl text-xs font-medium transition-all border flex items-center gap-1.5 justify-center',
                      form.type === type
                        ? 'bg-accent/10 border-accent text-accent'
                        : 'bg-surface-2 border-border text-text-secondary hover:text-text-primary hover:border-zinc-600'
                    )}
                  >
                    <span>{TYPE_ICONS[type]}</span>
                    {getAssetTypeLabel(type)}
                  </button>
                ))}
              </div>
            </div>

            {/* ── STOCK / CRYPTO: search + price ────────────────────────── */}
            {isFinancial && (
              <div className="space-y-4">
                {/* Symbol search */}
                <div ref={searchRef} className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-text-secondary">
                      {form.type === 'CRYPTO' ? 'Rechercher une crypto-monnaie' : 'Rechercher un titre boursier'}
                    </label>
                    {isISIN && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-accent/10 text-accent border border-accent/30">
                        ISIN détecté
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => {
                        setSearchQuery(e.target.value)
                        if (selectedResult) setSelectedResult(null)
                      }}
                      className="w-full bg-surface-2 border border-border rounded-xl pl-10 pr-10 py-2.5 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent"
                      placeholder={
                        form.type === 'CRYPTO'
                          ? 'Bitcoin, ETH, Solana...'
                          : 'Apple, AAPL, MC.PA, FR0000131104…'
                      }
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted animate-spin" />
                    )}
                    {selectedResult && !isSearching && (
                      <Check className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                    )}
                  </div>

                  {/* Dropdown results */}
                  {showDropdown && searchResults.length > 0 && (
                    <div className="absolute z-10 top-full mt-1.5 w-full bg-surface border border-border rounded-xl shadow-xl overflow-hidden">
                      {searchResults.map((result, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSelectResult(result)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-2 transition-colors text-left border-b border-border last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            {result.thumb ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={result.thumb} alt="" className="w-6 h-6 rounded-full" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-surface-2 border border-border flex items-center justify-center">
                                <span className="text-xs font-bold text-text-muted">
                                  {result.symbol[0]}
                                </span>
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-text-primary text-sm font-semibold">
                                  {result.symbol}
                                </span>
                                {result.marketCapRank && (
                                  <span className="text-xs text-text-muted bg-surface-2 px-1.5 py-0.5 rounded">
                                    #{result.marketCapRank}
                                  </span>
                                )}
                                {(result as any).isin && (
                                  <span className="text-xs text-accent bg-accent/10 px-1.5 py-0.5 rounded font-mono">
                                    {(result as any).isin}
                                  </span>
                                )}
                              </div>
                              <span className="text-text-muted text-xs">{result.name}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {dropdownPrices[result.symbol] ? (
                              <div className="text-right">
                                <p className="text-text-primary text-xs font-mono font-semibold">
                                  {formatCurrency(dropdownPrices[result.symbol].price, result.coinId ? 'EUR' : 'USD')}
                                </p>
                                <p className={cn(
                                  'text-xs font-semibold',
                                  dropdownPrices[result.symbol].changePercent24h >= 0 ? 'text-emerald-400' : 'text-red-400'
                                )}>
                                  {dropdownPrices[result.symbol].changePercent24h >= 0 ? '+' : ''}
                                  {dropdownPrices[result.symbol].changePercent24h.toFixed(2)}%
                                </p>
                              </div>
                            ) : (
                              result.exchange && (
                                <span className="text-xs text-text-muted hidden sm:block">
                                  {result.exchange}
                                </span>
                              )
                            )}
                            <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Price card (shown after selection) */}
                {isFetchingPrice && (
                  <div className="flex items-center gap-2 text-text-muted text-sm bg-surface-2 rounded-xl px-4 py-3">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Récupération du cours en temps réel...
                  </div>
                )}

                {selectedResult && unitPrice && !isFetchingPrice && (
                  <div className="bg-surface-2 border border-border rounded-xl px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-text-muted text-xs mb-0.5">Cours actuel</p>
                      <p className="text-text-primary font-bold font-mono text-lg">
                        {formatCurrency(parseFloat(unitPrice), form.currency)}
                      </p>
                    </div>
                    {priceChange !== null && (
                      <div className={cn(
                        'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-semibold',
                        priceChange >= 0
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-red-500/10 text-red-400'
                      )}>
                        {priceChange >= 0
                          ? <TrendingUp className="w-3.5 h-3.5" />
                          : <TrendingDown className="w-3.5 h-3.5" />}
                        {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                      </div>
                    )}
                  </div>
                )}

                {/* Quantity + unit price */}
                {selectedResult && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        Quantité détenue
                      </label>
                      <input
                        type="number"
                        value={quantity}
                        onChange={e => setQuantity(e.target.value)}
                        className="w-full bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent font-mono"
                        placeholder="0.00"
                        step="any"
                        min="0"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        Prix unitaire
                      </label>
                      <input
                        type="number"
                        value={unitPrice}
                        onChange={e => setUnitPrice(e.target.value)}
                        className="w-full bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent font-mono"
                        placeholder="0.00"
                        step="any"
                        min="0"
                      />
                    </div>
                  </div>
                )}

                {/* Computed total */}
                {selectedResult && quantity && unitPrice && (
                  <div className="bg-accent/5 border border-accent/20 rounded-xl px-4 py-3 flex items-center justify-between">
                    <span className="text-text-secondary text-sm">Valeur totale calculée</span>
                    <span className="text-accent font-bold font-mono text-lg">
                      {formatCurrency(totalValue, form.currency)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* ── SAVINGS: presets ────────────────────────────────────────── */}
            {form.type === 'SAVINGS' && (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Choisir un produit d'épargne
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SAVINGS_PRESETS.map(preset => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className={cn(
                        'flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-all text-left',
                        form.name === preset.name
                          ? 'bg-accent/10 border-accent text-accent'
                          : 'bg-surface-2 border-border text-text-secondary hover:text-text-primary hover:border-zinc-600'
                      )}
                    >
                      <span className="font-medium">{preset.name}</span>
                      {form.name === preset.name && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── BANK: bank chips ─────────────────────────────────────────── */}
            {form.type === 'BANK_ACCOUNT' && (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Banque
                </label>
                <div className="flex flex-wrap gap-2">
                  {BANK_PRESETS.map(bank => (
                    <button
                      key={bank}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, institution: bank }))}
                      className={cn(
                        'px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                        form.institution === bank
                          ? 'bg-accent/10 border-accent text-accent'
                          : 'bg-surface-2 border-border text-text-secondary hover:text-text-primary'
                      )}
                    >
                      {bank}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── REAL ESTATE: presets ─────────────────────────────────────── */}
            {form.type === 'REAL_ESTATE' && (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Type de bien
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {REAL_ESTATE_PRESETS.map(preset => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, name: preset.name, notes: preset.notes }))}
                      className={cn(
                        'flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-all text-left',
                        form.name === preset.name
                          ? 'bg-accent/10 border-accent text-accent'
                          : 'bg-surface-2 border-border text-text-secondary hover:text-text-primary hover:border-zinc-600'
                      )}
                    >
                      <span className="font-medium">{preset.name}</span>
                      {form.name === preset.name && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Name ─────────────────────────────────────────────────────── */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                {form.type === 'REAL_ESTATE' ? 'Adresse / Nom du bien' : 'Nom du compte'}
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent"
                placeholder={
                  form.type === 'REAL_ESTATE'
                    ? '12 rue de la Paix, Paris 75001'
                    : form.type === 'SAVINGS'
                    ? 'Livret A, PEL...'
                    : form.type === 'STOCK' || form.type === 'CRYPTO'
                    ? 'Rempli automatiquement...'
                    : 'Nom du compte'
                }
                required
              />
            </div>

            {/* ── Institution (hidden for financial assets which auto-fill it) */}
            {!isFinancial && (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  {form.type === 'REAL_ESTATE' ? 'Notaire / Agence' : 'Institution'}
                  <span className="text-text-muted font-normal ml-1">(optionnel)</span>
                </label>
                <input
                  type="text"
                  value={form.institution}
                  onChange={e => setForm(f => ({ ...f, institution: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent"
                  placeholder={
                    form.type === 'BANK_ACCOUNT' ? 'Sélectionner ci-dessus ou saisir...' :
                    form.type === 'REAL_ESTATE' ? 'Cabinet Immobilier Dupont...' :
                    'Institution financière...'
                  }
                />
              </div>
            )}

            {/* ── Value + Currency (not for financial assets using qty×price) */}
            {!isFinancial && (
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    {form.type === 'REAL_ESTATE' ? 'Valeur estimée' : 'Solde / Valeur actuelle'}
                  </label>
                  <input
                    type="number"
                    value={form.value}
                    onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                    className="w-full bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent font-mono"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Devise</label>
                  <select
                    value={form.currency}
                    onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                    className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent"
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                    <option value="CHF">CHF</option>
                  </select>
                </div>
              </div>
            )}

            {/* Currency selector for financial assets */}
            {isFinancial && selectedResult && (
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2" />
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Devise</label>
                  <select
                    value={form.currency}
                    onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                    className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent"
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                    <option value="CHF">CHF</option>
                  </select>
                </div>
              </div>
            )}

            {/* ── Notes ────────────────────────────────────────────────────── */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Notes
                <span className="text-text-muted font-normal ml-1">(optionnel)</span>
              </label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent resize-none"
                placeholder="Informations complémentaires..."
                rows={2}
              />
            </div>
          </div>

          {/* ── Footer ─────────────────────────────────────────────────────── */}
          <div className="flex gap-3 px-6 pb-6 pt-2 shrink-0 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-text-secondary hover:text-text-primary hover:bg-surface-2 text-sm font-medium transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending || (isFinancial && !selectedResult && !editAsset)}
              className="flex-1 py-2.5 rounded-xl bg-accent hover:bg-accent-dark disabled:opacity-40 disabled:cursor-not-allowed text-obsidian text-sm font-semibold transition-colors"
            >
              {isPending
                ? 'Enregistrement...'
                : editAsset
                ? 'Mettre à jour'
                : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
