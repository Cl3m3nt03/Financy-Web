'use client'

import { useState, useEffect, useRef } from 'react'
import {
  X, Search, Loader2, TrendingUp, TrendingDown, Check, ChevronRight,
  FileUp, AlertCircle, ArrowLeft,
} from 'lucide-react'
import { useCreateAsset, useUpdateAsset } from '@/hooks/use-assets'
import { Asset, AssetType, SearchResult, PriceData } from '@/types'
import { getAssetTypeLabel, formatCurrency, cn } from '@/lib/utils'

// ─── CSV helpers (client-side preview) ────────────────────────────────────────

function normStr(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}
function parseNum(s: string): number {
  return parseFloat(s.replace(/\s/g, '').replace(',', '.')) || 0
}
interface CsvRow { name: string; quantity: number; avgBuyPrice: number; isin?: string }

function quickParseCsv(csv: string): CsvRow[] {
  const text = csv.replace(/^\uFEFF/, '')
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []
  const sep = lines[0].split(';').length > lines[0].split(',').length ? ';' : ','
  const headers = lines[0].split(sep).map(h => normStr(h.replace(/^["'\s]+|["'\s]+$/g, '')))
  function findCol(...cands: string[]): number {
    for (const c of cands) {
      const idx = headers.findIndex(h => h.includes(normStr(c)))
      if (idx >= 0) return idx
    }
    return -1
  }
  const colName = findCol('libelle', 'designation', 'instrument', 'nom du titre', 'titre', 'name')
  const colIsin = findCol('isin')
  const colQty  = findCol('quantite', 'qte', 'nb titres', 'quantity', 'shares', 'nombre de titres')
  const colPru  = findCol('buyingprice', 'buying price', 'pru', 'prix de revient', 'cout moyen', 'average cost', 'avg price', 'pa')
  const rows: CsvRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(sep).map(p => p.replace(/^["'\s]+|["'\s]+$/g, '').trim())
    if (parts.length < 2) continue
    const name = colName >= 0 ? parts[colName] : parts[0]
    const qty  = colQty  >= 0 ? parseNum(parts[colQty])  : 0
    const pru  = colPru  >= 0 ? parseNum(parts[colPru])  : 0
    const isin = colIsin >= 0 ? parts[colIsin]?.toUpperCase().replace(/\s/g, '') : undefined
    if (!name || normStr(name).includes('total') || qty === 0) continue
    rows.push({ name, quantity: qty, avgBuyPrice: pru, isin })
  }
  return rows
}

function readFileWithFallback(file: File): Promise<string> {
  const encodings = ['UTF-8', 'windows-1252', 'ISO-8859-1']
  let idx = 0
  return new Promise((resolve, reject) => {
    function tryNext() {
      if (idx >= encodings.length) { reject(new Error('Cannot read file')); return }
      const reader = new FileReader()
      const enc = encodings[idx++]
      reader.onload = () => {
        const result = reader.result as string
        if (result.includes('\uFFFD') && idx < encodings.length) { tryNext(); return }
        resolve(result)
      }
      reader.onerror = tryNext
      reader.readAsText(file, enc)
    }
    tryNext()
  })
}

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
  { name: 'Résidence principale',  notes: "Estimation Meilleurs Agents / SeLoger" },
  { name: 'Investissement locatif', notes: '' },
  { name: 'SCPI',                   notes: 'Société Civile de Placement Immobilier' },
  { name: 'Local commercial',       notes: '' },
  { name: 'Terrain',                notes: '' },
  { name: 'Résidence secondaire',   notes: '' },
]

const ASSET_TYPES: AssetType[] = ['BANK_ACCOUNT', 'SAVINGS', 'REAL_ESTATE', 'STOCK', 'CRYPTO', 'PEA', 'CTO', 'OTHER']

const TYPE_ICONS: Record<string, string> = {
  BANK_ACCOUNT: '🏦', SAVINGS: '🐖', REAL_ESTATE: '🏠', STOCK: '📈',
  CRYPTO: '₿', PEA: '🇫🇷', CTO: '📊', OTHER: '📦',
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'type' | 'method' | 'form'

interface FormState {
  name: string; type: AssetType; institution: string
  value: string; currency: string; notes: string
}

interface AssetFormProps { onClose: () => void; editAsset?: Asset }

// ─── Component ────────────────────────────────────────────────────────────────

export function AssetForm({ onClose, editAsset }: AssetFormProps) {
  const [phase, setPhase] = useState<Phase>(editAsset ? 'form' : 'type')

  const [form, setForm] = useState<FormState>({
    name:        editAsset?.name        ?? '',
    type:        editAsset?.type        ?? 'BANK_ACCOUNT',
    institution: editAsset?.institution ?? '',
    value:       editAsset?.value?.toString() ?? '',
    currency:    editAsset?.currency    ?? 'EUR',
    notes:       editAsset?.notes       ?? '',
  })

  // Search state
  const [searchQuery, setSearchQuery]       = useState('')
  const [searchResults, setSearchResults]   = useState<SearchResult[]>([])
  const [isSearching, setIsSearching]       = useState(false)
  const [showDropdown, setShowDropdown]     = useState(false)
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null)

  // Price state
  const [unitPrice, setUnitPrice]           = useState('')
  const [quantity, setQuantity]             = useState('')
  const [priceChange, setPriceChange]       = useState<number | null>(null)
  const [isFetchingPrice, setIsFetchingPrice] = useState(false)
  const [dropdownPrices, setDropdownPrices] = useState<Record<string, PriceData>>({})

  // CSV state
  const [csvMode, setCsvMode]         = useState(false)
  const [csvText, setCsvText]         = useState('')
  const [csvPreview, setCsvPreview]   = useState<CsvRow[]>([])
  const [csvFileName, setCsvFileName] = useState('')
  const [isImporting, setIsImporting] = useState(false)

  const searchRef   = useRef<HTMLDivElement>(null)
  const createAsset = useCreateAsset()
  const updateAsset = useUpdateAsset()
  const isPending   = createAsset.isPending || updateAsset.isPending

  const isFinancial   = ['STOCK', 'CRYPTO', 'PEA', 'CTO'].includes(form.type)
  const isPeaCto      = form.type === 'PEA' || form.type === 'CTO'
  const totalValue    = isFinancial
    ? ((parseFloat(quantity) || 0) * (parseFloat(unitPrice) || 0))
    : parseFloat(form.value) || 0
  const ISIN_RE       = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/i
  const isISIN        = ISIN_RE.test(searchQuery.trim())

  // ── Outside click closes dropdown
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowDropdown(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // ── Debounced symbol search
  useEffect(() => {
    if (!isFinancial || csvMode || searchQuery.length < 1) {
      setSearchResults([]); setShowDropdown(false); return
    }
    const t = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res  = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&type=${form.type}`)
        const data: SearchResult[] = await res.json()
        setSearchResults(data); setShowDropdown(true)
      } catch { setSearchResults([]) }
      finally { setIsSearching(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [searchQuery, form.type, isFinancial, csvMode])

  // ── Prices for dropdown
  useEffect(() => {
    if (searchResults.length === 0) { setDropdownPrices({}); return }
    fetch(`/api/prices?symbols=${searchResults.map(r => r.symbol).join(',')}`)
      .then(r => r.json())
      .then((prices: PriceData[]) => {
        const map: Record<string, PriceData> = {}
        prices.forEach(p => { map[p.symbol] = p })
        setDropdownPrices(map)
      })
      .catch(() => {})
  }, [searchResults])

  // ── Type change
  function handleTypeChange(type: AssetType) {
    setForm(f => ({ ...f, type, name: '', institution: '', notes: '' }))
    setSearchQuery(''); setSearchResults([]); setSelectedResult(null)
    setUnitPrice(''); setQuantity(''); setPriceChange(null)
    setCsvMode(false); setCsvText(''); setCsvPreview([]); setCsvFileName('')
    if ((type === 'PEA' || type === 'CTO') && !editAsset) {
      setPhase('method')
    } else {
      setPhase('form')
    }
  }

  // ── Method choice (phase 'method')
  function handleMethodChoice(method: 'csv' | 'manual') {
    setCsvMode(method === 'csv')
    setPhase('form')
  }

  // ── Back navigation
  function handleBack() {
    if (phase === 'form')   { isPeaCto && !editAsset ? setPhase('method') : setPhase('type') }
    if (phase === 'method') setPhase('type')
  }

  // ── CSV file pick
  async function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvFileName(file.name)
    try {
      const text = await readFileWithFallback(file)
      setCsvText(text)
      setCsvPreview(quickParseCsv(text))
    } catch { setCsvPreview([]) }
  }

  // ── Select search result
  async function handleSelectResult(result: SearchResult) {
    setSelectedResult(result); setShowDropdown(false)
    setSearchQuery(`${result.symbol} — ${result.name}`)
    setForm(f => ({ ...f, name: result.name, institution: result.exchange ?? f.institution }))
    setIsFetchingPrice(true)
    try {
      const res    = await fetch(`/api/prices?symbols=${result.symbol}`)
      const prices = await res.json()
      if (prices[0]) {
        setUnitPrice(prices[0].price.toString())
        setPriceChange(prices[0].changePercent24h ?? null)
        setForm(f => ({ ...f, currency: result.coinId ? 'EUR' : 'USD' }))
      }
    } catch { }
    finally { setIsFetchingPrice(false) }
  }

  // ── Submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (csvMode && isPeaCto && !editAsset) {
      setIsImporting(true)
      try {
        const newAsset = await createAsset.mutateAsync({
          name: form.name, type: form.type,
          institution: form.institution || null,
          value: 0, currency: form.currency,
          notes: form.notes || null,
        }) as any
        await fetch(`/api/assets/${newAsset.id}/import-holdings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ csv: csvText, mode: 'replace' }),
        })
      } finally { setIsImporting(false) }
      onClose(); return
    }

    const payload: Record<string, any> = {
      name:        form.name,
      type:        form.type,
      institution: form.institution || null,
      value:       isFinancial ? totalValue : parseFloat(form.value),
      currency:    form.currency,
      notes:       form.notes || null,
    }
    if (isFinancial && selectedResult) {
      payload.symbol      = selectedResult.symbol
      payload.quantity    = parseFloat(quantity)  || 0
      payload.avgBuyPrice = parseFloat(unitPrice) || 0
    }
    if (editAsset) {
      await updateAsset.mutateAsync({ id: editAsset.id, data: payload })
    } else {
      await createAsset.mutateAsync(payload)
    }
    onClose()
  }

  // ─── Phase titles ─────────────────────────────────────────────────────────

  const phaseTitle =
    editAsset           ? "Modifier l'actif"    :
    phase === 'type'    ? 'Ajouter un actif'    :
    phase === 'method'  ? `Nouveau ${getAssetTypeLabel(form.type)}` :
    csvMode             ? `Importer le ${getAssetTypeLabel(form.type)}` :
                          `Nouveau ${getAssetTypeLabel(form.type)}`

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            {phase !== 'type' && !editAsset && (
              <button
                type="button"
                onClick={handleBack}
                className="w-7 h-7 rounded-lg bg-surface-2 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            )}
            <h2 className="text-lg font-semibold text-text-primary">{phaseTitle}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── PHASE: type selection ── */}
        {phase === 'type' && (
          <div className="p-6">
            <p className="text-sm font-medium text-text-secondary mb-3">Quel type d'actif ?</p>
            <div className="grid grid-cols-3 gap-2">
              {ASSET_TYPES.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleTypeChange(type)}
                  className={cn(
                    'py-3 px-3 rounded-xl text-xs font-medium transition-all border flex flex-col items-center gap-1.5',
                    form.type === type
                      ? 'bg-accent/10 border-accent text-accent'
                      : 'bg-surface-2 border-border text-text-secondary hover:text-text-primary hover:border-zinc-600'
                  )}
                >
                  <span className="text-base">{TYPE_ICONS[type]}</span>
                  {getAssetTypeLabel(type)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── PHASE: method choice (PEA / CTO) ── */}
        {phase === 'method' && (
          <div className="p-6 space-y-4">
            <p className="text-sm text-text-secondary">
              Avez-vous un fichier d'export de vos positions ?
            </p>

            <button
              type="button"
              onClick={() => handleMethodChoice('csv')}
              className="w-full flex items-start gap-4 p-4 rounded-xl border border-border bg-surface-2 hover:border-accent/50 hover:bg-accent/5 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-accent/20 transition-colors">
                <FileUp className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary mb-0.5">Importer un CSV</p>
                <p className="text-xs text-text-muted">
                  Glissez l'export de Boursobank, Fortuneo, Bourse Direct ou tout autre courtier — toutes vos positions en un clic.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleMethodChoice('manual')}
              className="w-full flex items-start gap-4 p-4 rounded-xl border border-border bg-surface-2 hover:border-zinc-600 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center shrink-0 mt-0.5">
                <Search className="w-5 h-5 text-text-secondary group-hover:text-text-primary transition-colors" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary mb-0.5">Saisie manuelle</p>
                <p className="text-xs text-text-muted">
                  Recherchez chaque titre par nom, symbole ou ISIN et saisissez votre quantité et prix d'achat.
                </p>
              </div>
            </button>
          </div>
        )}

        {/* ── PHASE: form ── */}
        {phase === 'form' && (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto">
            <div className="p-6 space-y-5">

              {/* Type selector (edit mode or non PEA/CTO) */}
              {(editAsset || (!isPeaCto)) && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Type d'actif</label>
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
              )}

              {/* ── CSV import section ── */}
              {csvMode && isPeaCto && !editAsset && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-text-secondary">
                    Fichier CSV
                  </label>
                  <label className="flex flex-col items-center justify-center gap-2 w-full h-24 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-accent/50 transition-colors bg-surface-2">
                    <FileUp className="w-5 h-5 text-text-muted" />
                    <span className="text-xs text-text-secondary text-center px-4">
                      {csvFileName || 'Cliquer pour sélectionner votre export CSV'}
                    </span>
                    <input type="file" accept=".csv,.txt" onChange={handleCsvFile} className="hidden" />
                  </label>

                  {csvPreview.length > 0 && (
                    <div className="bg-surface-2 border border-border rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                        <span className="text-xs font-semibold text-text-secondary">
                          {csvPreview.length} position{csvPreview.length > 1 ? 's' : ''} détectée{csvPreview.length > 1 ? 's' : ''}
                        </span>
                        <span className="text-xs text-accent font-mono">
                          {csvPreview.reduce((s, r) => s + r.quantity * r.avgBuyPrice, 0)
                            .toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                        </span>
                      </div>
                      <div className="max-h-36 overflow-y-auto">
                        {csvPreview.slice(0, 10).map((row, i) => (
                          <div key={i} className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 last:border-0">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-text-primary truncate">{row.name}</p>
                              {row.isin && <p className="text-[10px] font-mono text-text-muted">{row.isin}</p>}
                            </div>
                            <div className="text-right shrink-0 ml-2">
                              <p className="text-xs font-mono text-text-secondary">
                                {row.quantity} × {row.avgBuyPrice.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        ))}
                        {csvPreview.length > 10 && (
                          <p className="text-xs text-text-muted text-center py-2">+{csvPreview.length - 10} autres</p>
                        )}
                      </div>
                    </div>
                  )}

                  {csvFileName && csvPreview.length === 0 && (
                    <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      Aucune position détectée. Vérifiez que le fichier contient les colonnes : Libellé, ISIN, Quantité, PRU.
                    </div>
                  )}
                </div>
              )}

              {/* ── Manual: symbol search + price ── */}
              {isFinancial && !csvMode && (
                <div className="space-y-4">
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
                        onChange={e => { setSearchQuery(e.target.value); if (selectedResult) setSelectedResult(null) }}
                        className="w-full bg-surface-2 border border-border rounded-xl pl-10 pr-10 py-2.5 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent"
                        placeholder={form.type === 'CRYPTO' ? 'Bitcoin, ETH, Solana...' : 'Apple, AAPL, MC.PA, FR0000131104…'}
                      />
                      {isSearching && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted animate-spin" />}
                      {selectedResult && !isSearching && <Check className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />}
                    </div>

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
                                  <span className="text-xs font-bold text-text-muted">{result.symbol[0]}</span>
                                </div>
                              )}
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-text-primary text-sm font-semibold">{result.symbol}</span>
                                  {result.marketCapRank && (
                                    <span className="text-xs text-text-muted bg-surface-2 px-1.5 py-0.5 rounded">#{result.marketCapRank}</span>
                                  )}
                                  {(result as any).isin && (
                                    <span className="text-xs text-accent bg-accent/10 px-1.5 py-0.5 rounded font-mono">{(result as any).isin}</span>
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
                                  <p className={cn('text-xs font-semibold', dropdownPrices[result.symbol].changePercent24h >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                                    {dropdownPrices[result.symbol].changePercent24h >= 0 ? '+' : ''}{dropdownPrices[result.symbol].changePercent24h.toFixed(2)}%
                                  </p>
                                </div>
                              ) : result.exchange && (
                                <span className="text-xs text-text-muted hidden sm:block">{result.exchange}</span>
                              )}
                              <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

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
                        <p className="text-text-primary font-bold font-mono text-lg">{formatCurrency(parseFloat(unitPrice), form.currency)}</p>
                      </div>
                      {priceChange !== null && (
                        <div className={cn('flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-semibold', priceChange >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400')}>
                          {priceChange >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                          {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                        </div>
                      )}
                    </div>
                  )}

                  {selectedResult && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Quantité détenue</label>
                        <input
                          type="number"
                          value={quantity}
                          onChange={e => setQuantity(e.target.value)}
                          className="w-full bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent font-mono"
                          placeholder="0.00" step="any" min="0" required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Prix unitaire</label>
                        <input
                          type="number"
                          value={unitPrice}
                          onChange={e => setUnitPrice(e.target.value)}
                          className="w-full bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent font-mono"
                          placeholder="0.00" step="any" min="0"
                        />
                      </div>
                    </div>
                  )}

                  {selectedResult && quantity && unitPrice && (
                    <div className="bg-accent/5 border border-accent/20 rounded-xl px-4 py-3 flex items-center justify-between">
                      <span className="text-text-secondary text-sm">Valeur totale calculée</span>
                      <span className="text-accent font-bold font-mono text-lg">{formatCurrency(totalValue, form.currency)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* ── SAVINGS presets ── */}
              {form.type === 'SAVINGS' && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Choisir un produit d'épargne</label>
                  <div className="grid grid-cols-2 gap-2">
                    {SAVINGS_PRESETS.map(preset => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, name: preset.name, institution: preset.institution, notes: preset.notes }))}
                        className={cn('flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-all text-left', form.name === preset.name ? 'bg-accent/10 border-accent text-accent' : 'bg-surface-2 border-border text-text-secondary hover:text-text-primary hover:border-zinc-600')}
                      >
                        <span className="font-medium">{preset.name}</span>
                        {form.name === preset.name && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── BANK chips ── */}
              {form.type === 'BANK_ACCOUNT' && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Banque</label>
                  <div className="flex flex-wrap gap-2">
                    {BANK_PRESETS.map(bank => (
                      <button
                        key={bank}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, institution: bank }))}
                        className={cn('px-3 py-1.5 rounded-lg border text-xs font-medium transition-all', form.institution === bank ? 'bg-accent/10 border-accent text-accent' : 'bg-surface-2 border-border text-text-secondary hover:text-text-primary')}
                      >
                        {bank}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── REAL ESTATE presets ── */}
              {form.type === 'REAL_ESTATE' && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Type de bien</label>
                  <div className="grid grid-cols-2 gap-2">
                    {REAL_ESTATE_PRESETS.map(preset => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, name: preset.name, notes: preset.notes }))}
                        className={cn('flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-all text-left', form.name === preset.name ? 'bg-accent/10 border-accent text-accent' : 'bg-surface-2 border-border text-text-secondary hover:text-text-primary hover:border-zinc-600')}
                      >
                        <span className="font-medium">{preset.name}</span>
                        {form.name === preset.name && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Name ── */}
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
                    form.type === 'REAL_ESTATE' ? '12 rue de la Paix, Paris 75001' :
                    form.type === 'SAVINGS'      ? 'Livret A, PEL...' :
                    form.type === 'PEA'          ? 'Mon PEA Boursorama' :
                    form.type === 'CTO'          ? 'Mon CTO Fortuneo' :
                    (isFinancial && !csvMode)    ? 'Rempli automatiquement...' :
                    'Nom du compte'
                  }
                  required
                />
              </div>

              {/* ── Institution ── */}
              {(!isFinancial || csvMode) && (
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
                      form.type === 'REAL_ESTATE'  ? 'Cabinet Immobilier Dupont...' :
                      form.type === 'PEA'          ? 'Boursorama, Fortuneo...' :
                      form.type === 'CTO'          ? 'Degiro, Interactive Brokers...' :
                      'Institution financière...'
                    }
                  />
                </div>
              )}

              {/* ── Value + currency (non-financial) ── */}
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
                      placeholder="0.00" step="0.01" min="0" required
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

              {/* Currency for financial (manual, after selection) */}
              {isFinancial && !csvMode && selectedResult && (
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

              {/* ── Notes ── */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Notes <span className="text-text-muted font-normal">(optionnel)</span>
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

            {/* Footer */}
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
                disabled={
                  isPending || isImporting ||
                  (csvMode && isPeaCto
                    ? csvPreview.length === 0 || !form.name
                    : isFinancial && !selectedResult && !editAsset)
                }
                className="flex-1 py-2.5 rounded-xl bg-accent hover:bg-accent-dark disabled:opacity-40 disabled:cursor-not-allowed text-obsidian text-sm font-semibold transition-colors"
              >
                {isPending || isImporting
                  ? (csvMode ? 'Import en cours...' : 'Enregistrement...')
                  : editAsset
                  ? 'Mettre à jour'
                  : csvMode
                  ? `Créer et importer (${csvPreview.length})`
                  : 'Ajouter'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
