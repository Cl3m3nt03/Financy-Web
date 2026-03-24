'use client'

import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { HoldingsTable } from '@/components/dashboard/holdings-table'
import { RebalanceTool } from '@/components/portfolio/rebalance-tool'
import { SectorBreakdown } from '@/components/portfolio/sector-breakdown'
import { RiskAnalysis } from '@/components/portfolio/risk-analysis'
import { PerformanceChart } from '@/components/portfolio/performance-chart'
import { useAssets } from '@/hooks/use-assets'
import { useTransactions } from '@/hooks/use-transactions'
import { usePricesStream, LiveStatus } from '@/hooks/use-prices-stream'
import { MOCK_ASSETS } from '@/services/mock-data'
import { Holding } from '@/types'
import { formatCurrency, cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, RefreshCw, LineChart, Gift, Globe, LayoutGrid, Table2, Wifi, WifiOff, Loader2, ShieldAlert } from 'lucide-react'
import { CurrencyExposure } from '@/components/portfolio/currency-exposure'
import { Sparkline } from '@/components/portfolio/sparkline'
import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

// ─── Live status badge ────────────────────────────────────────────────────────

function LiveBadge({ status, updatedAt }: { status: LiveStatus; updatedAt: Date | null }) {
  if (status === 'live') {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        LIVE
        {updatedAt && (
          <span className="text-emerald-400/60 ml-1">
            {updatedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}
      </div>
    )
  }
  if (status === 'reconnecting') {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-medium">
        <WifiOff className="w-3 h-3" /> Reconnexion...
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-surface-2 border border-border text-text-muted text-xs font-medium">
      <Loader2 className="w-3 h-3 animate-spin" /> Connexion...
    </div>
  )
}

// ─── Visual P&L card ──────────────────────────────────────────────────────────

function PnlCard({ holding, assetType, flash }: { holding: any; assetType: string; flash?: 'up' | 'down' }) {
  const pnl      = holding.pnl ?? 0
  const pnlPct   = holding.pnlPercent ?? 0
  const invested = holding.quantity * holding.avgBuyPrice
  const current  = holding.currentValue ?? invested
  const isPos    = pnl >= 0

  // Bar: ratio current/max(invested, current) capped at 100%
  const maxVal   = Math.max(invested, current)
  const barInvested = maxVal > 0 ? (invested / maxVal) * 100 : 100
  const barCurrent  = maxVal > 0 ? (current  / maxVal) * 100 : 100

  const TYPE_COLORS: Record<string, string> = {
    PEA: '#C9A84C', CTO: '#A78BFA', STOCK: '#3B82F6', CRYPTO: '#F97316',
  }
  const typeColor = TYPE_COLORS[assetType] ?? '#C9A84C'

  // Flash ring color
  const flashStyle = flash === 'up'
    ? 'border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
    : flash === 'down'
    ? 'border-red-400 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
    : ''

  return (
    <div className={cn(
      'bg-surface-2 rounded-2xl p-4 border transition-all duration-300 group',
      flash ? flashStyle : 'border-border hover:border-accent/40'
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: typeColor + '20', color: typeColor }}>
            {holding.symbol.slice(0, 3)}
          </div>
          <div>
            <p className="text-text-primary font-semibold text-sm leading-tight">{holding.symbol}</p>
            <p className="text-text-muted text-xs truncate max-w-[120px]">{holding.name}</p>
          </div>
        </div>
        <div className={cn(
          'flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold shrink-0',
          isPos ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
        )}>
          {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {isPos ? '+' : ''}{pnlPct.toFixed(2)}%
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
        <div>
          <p className="text-text-muted mb-0.5">Qté</p>
          <p className="font-mono font-semibold text-text-primary">
            {holding.quantity < 1 ? holding.quantity.toFixed(4) : holding.quantity.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-text-muted mb-0.5">PRU</p>
          <p className="font-mono font-semibold text-text-primary">
            {formatCurrency(holding.avgBuyPrice, holding.currency)}
          </p>
        </div>
        <div>
          <p className="text-text-muted mb-0.5">Cours</p>
          <p className={cn(
            'font-mono font-semibold transition-colors duration-300',
            flash === 'up' ? 'text-emerald-400' : flash === 'down' ? 'text-red-400' : holding.currentPrice ? 'text-text-primary' : 'text-text-muted'
          )}>
            {holding.currentPrice ? formatCurrency(holding.currentPrice, holding.currency) : '—'}
          </p>
        </div>
      </div>

      {/* Visual bar */}
      <div className="mb-2">
        <div className="relative h-3 bg-surface rounded-full overflow-hidden">
          {/* Invested baseline */}
          <div className="absolute inset-y-0 left-0 rounded-full opacity-30"
            style={{ width: `${barInvested}%`, background: '#6B7280' }} />
          {/* Current value */}
          <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
            style={{ width: `${barCurrent}%`, background: isPos ? '#10B981' : '#EF4444' }} />
        </div>
        <div className="flex justify-between text-xs text-text-muted mt-1">
          <span>Investi&nbsp;: <span className="font-mono text-text-secondary">{formatCurrency(invested, holding.currency)}</span></span>
          <span>Valeur&nbsp;: <span className="font-mono text-text-secondary">{formatCurrency(current, holding.currency)}</span></span>
        </div>
      </div>

      {/* Sparkline 30j */}
      <div className="mt-2 -mx-1">
        <Sparkline symbol={holding.symbol} range="1mo" height={36} />
      </div>

      {/* P&L bottom */}
      <div className={cn(
        'flex items-center justify-center gap-1.5 py-2 rounded-xl font-mono font-bold text-sm mt-2',
        isPos ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
      )}>
        {isPos ? '+' : ''}{formatCurrency(pnl, holding.currency)}
        <span className="text-xs opacity-70">({isPos ? '+' : ''}{pnlPct.toFixed(2)}%)</span>
      </div>
    </div>
  )
}

const FINANCIAL_TYPES = ['STOCK', 'CRYPTO', 'PEA', 'CTO']

const TABS = [
  { id: 'positions',   label: 'Positions',       icon: LineChart   },
  { id: 'performance', label: 'Performance',      icon: TrendingUp  },
  { id: 'sectors',     label: 'Secteurs',         icon: LayoutGrid  },
  { id: 'risk',        label: 'Risque',            icon: ShieldAlert },
  { id: 'dividends',   label: 'Dividendes',       icon: Gift        },
  { id: 'currencies',  label: 'Devises',          icon: Globe       },
  { id: 'rebalance',   label: 'Rééquilibrage',    icon: RefreshCw   },
]

export default function PortfolioPage() {
  const [tab,  setTab]  = useState('positions')
  const [view, setView] = useState<'cards' | 'table'>('cards')
  const { data: assets } = useAssets()
  const { data: transactions } = useTransactions()
  const displayAssets = assets ?? MOCK_ASSETS

  const financialAssets = displayAssets.filter(a => FINANCIAL_TYPES.includes(a.type))
  const allHoldings: Holding[] = financialAssets.flatMap(a => a.holdings ?? [])

  const symbols = allHoldings.map(h => h.symbol)
  const { prices, status: liveStatus, updatedAt, flashing } = usePricesStream(symbols)

  const enrichedHoldings = allHoldings.map(h => {
    const priceData = prices?.find(p => p.symbol === h.symbol)
    if (priceData) {
      const currentValue = h.quantity * priceData.price
      const invested = h.quantity * h.avgBuyPrice
      const pnl = currentValue - invested
      const pnlPercent = (pnl / invested) * 100
      return { ...h, currentPrice: priceData.price, currentValue, pnl, pnlPercent }
    }
    return h
  })

  const totalInvested = enrichedHoldings.reduce((sum, h) => sum + h.quantity * h.avgBuyPrice, 0)
  const totalValue    = enrichedHoldings.reduce((sum, h) => sum + (h.currentValue ?? h.quantity * h.avgBuyPrice), 0)
  const totalPnl      = totalValue - totalInvested
  const totalPnlPct   = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0
  const isPositive    = totalPnl >= 0

  // Dividends
  const dividends = useMemo(() =>
    (transactions ?? []).filter(t => t.type === 'DIVIDEND'),
    [transactions]
  )
  const totalDividends = dividends.reduce((s, t) => s + t.price, 0)

  // Currency exposure
  const currencyMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const h of enrichedHoldings) {
      const val = h.currentValue ?? h.quantity * h.avgBuyPrice
      map[h.currency] = (map[h.currency] ?? 0) + val
    }
    return map
  }, [enrichedHoldings])
  const totalForCurrency = Object.values(currencyMap).reduce((s, v) => s + v, 0)

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Portefeuille" subtitle="Positions, performance et analyse">
        {allHoldings.length > 0 && <LiveBadge status={liveStatus} updatedAt={updatedAt} />}
      </Header>

      <div className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-8xl w-full overflow-x-hidden">

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-6">
              <p className="text-text-secondary text-sm mb-1">Valeur portefeuille</p>
              <p className="text-2xl font-bold text-text-primary font-mono">{formatCurrency(totalValue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-text-secondary text-sm mb-1">Capital investi</p>
              <p className="text-2xl font-bold text-text-primary font-mono">{formatCurrency(totalInvested)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-text-secondary text-sm mb-1">Plus-value latente</p>
              <div className="flex items-center gap-2">
                <p className={cn('text-2xl font-bold font-mono', isPositive ? 'text-emerald-400' : 'text-red-400')}>
                  {isPositive ? '+' : ''}{formatCurrency(totalPnl)}
                </p>
                <span className={cn('flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-lg', isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400')}>
                  {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(totalPnlPct).toFixed(2)}%
                </span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-text-secondary text-sm mb-1">Dividendes reçus</p>
              <p className="text-2xl font-bold font-mono text-accent">{formatCurrency(totalDividends)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs — scrollable sur mobile */}
        <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0 pb-1">
          <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 w-max">
            {TABS.map(t => {
              const Icon = t.icon
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
                    tab === t.id ? 'bg-accent/10 text-accent' : 'text-text-muted hover:text-text-primary')}>
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab: Positions */}
        {tab === 'positions' && allHoldings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-text-primary font-semibold mb-2">Aucune position</p>
            <p className="text-text-muted text-sm">Ajoutez des actifs Bourse / Crypto / PEA / CTO dans "Mes actifs".</p>
          </div>
        )}

        {tab === 'positions' && allHoldings.length > 0 && (
          <>
            {/* View toggle */}
            <div className="flex items-center justify-between">
              <p className="text-text-muted text-sm">{enrichedHoldings.length} position{enrichedHoldings.length > 1 ? 's' : ''}</p>
              <div className="flex gap-1 bg-surface border border-border rounded-xl p-1">
                <button onClick={() => setView('cards')}
                  className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    view === 'cards' ? 'bg-accent/10 text-accent' : 'text-text-muted hover:text-text-primary')}>
                  <LayoutGrid className="w-3.5 h-3.5" /> Cartes
                </button>
                <button onClick={() => setView('table')}
                  className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    view === 'table' ? 'bg-accent/10 text-accent' : 'text-text-muted hover:text-text-primary')}>
                  <Table2 className="w-3.5 h-3.5" /> Tableau
                </button>
              </div>
            </div>

            {/* Cards view */}
            {view === 'cards' && financialAssets.map(asset => {
              const assetHoldings = enrichedHoldings.filter(h => h.assetId === asset.id)
              if (assetHoldings.length === 0) return null
              const assetInvested = assetHoldings.reduce((s, h) => s + h.quantity * h.avgBuyPrice, 0)
              const assetValue    = assetHoldings.reduce((s, h) => s + (h.currentValue ?? h.quantity * h.avgBuyPrice), 0)
              const assetPnl      = assetValue - assetInvested
              const assetPnlPct   = assetInvested > 0 ? (assetPnl / assetInvested) * 100 : 0
              const isAssetPos    = assetPnl >= 0
              return (
                <div key={asset.id} className="space-y-3">
                  {/* Asset header */}
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-text-primary font-semibold text-sm">{asset.name}</h3>
                      <span className="text-xs text-text-muted bg-surface-2 px-2 py-0.5 rounded-lg">{asset.type}</span>
                      {asset.institution && <span className="text-xs text-text-muted">{asset.institution}</span>}
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-text-muted text-xs">
                        {formatCurrency(assetValue)} &nbsp;
                        <span className={cn('font-mono font-semibold', isAssetPos ? 'text-emerald-400' : 'text-red-400')}>
                          ({isAssetPos ? '+' : ''}{assetPnlPct.toFixed(2)}%)
                        </span>
                      </span>
                    </div>
                  </div>
                  {/* Holdings grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {assetHoldings.map(h => (
                      <PnlCard key={h.id} holding={h} assetType={asset.type} flash={flashing[h.symbol]} />
                    ))}
                  </div>
                </div>
              )
            })}

            {/* Table view */}
            {view === 'table' && financialAssets.map(asset => {
              const assetHoldings = enrichedHoldings.filter(h => h.assetId === asset.id)
              if (assetHoldings.length === 0) return null
              return (
                <Card key={asset.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{asset.name}</CardTitle>
                      {asset.institution && <span className="text-text-muted text-xs">{asset.institution}</span>}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <HoldingsTable holdings={assetHoldings} />
                  </CardContent>
                </Card>
              )
            })}
          </>
        )}

        {/* Tab: Performance */}
        {tab === 'performance' && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="w-4 h-4 text-accent" /> Performance vs indices</CardTitle></CardHeader>
            <CardContent><PerformanceChart /></CardContent>
          </Card>
        )}

        {/* Tab: Dividends */}
        {tab === 'dividends' && (() => {
          const now = new Date()
          const thisYear = now.getFullYear()
          const divThisYear = dividends.filter(d => new Date(d.date).getFullYear() === thisYear)
          const totalThisYear = divThisYear.reduce((s, d) => s + d.price, 0)
          const monthlyAvg = totalThisYear / 12

          // Group by month for chart (last 12 months)
          const byMonth: Record<string, number> = {}
          for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            byMonth[key] = 0
          }
          for (const d of dividends) {
            const dt = new Date(d.date)
            const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
            if (key in byMonth) byMonth[key] = (byMonth[key] ?? 0) + d.price
          }
          const chartData = Object.entries(byMonth).map(([k, v]) => ({
            month: new Date(k + '-01').toLocaleDateString('fr-FR', { month: 'short' }),
            value: v,
          }))

          return (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Cette année</p>
                    <p className="text-xl font-bold font-mono text-accent">{formatCurrency(totalThisYear)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Moy. mensuelle</p>
                    <p className="text-xl font-bold font-mono text-text-primary">{formatCurrency(monthlyAvg)}</p>
                  </CardContent>
                </Card>
                <Card className="hidden sm:block">
                  <CardContent className="pt-4 pb-3">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Total historique</p>
                    <p className="text-xl font-bold font-mono text-text-primary">{formatCurrency(totalDividends)}</p>
                  </CardContent>
                </Card>
              </div>

              {dividends.length === 0 ? (
                <Card><CardContent><p className="text-text-muted text-sm text-center py-8">Aucun dividende enregistré. Ajoutez-les dans Transactions.</p></CardContent></Card>
              ) : (
                <>
                  {/* Monthly chart */}
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Dividendes par mois (12 derniers mois)</CardTitle></CardHeader>
                    <CardContent className="px-2 pb-4">
                      <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 10 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 10 }}
                            tickFormatter={v => v === 0 ? '' : formatCurrency(v, 'EUR', true)} width={52} />
                          <Tooltip
                            contentStyle={{ background: '#1C1C1E', border: '1px solid #2C2C2E', borderRadius: 10 }}
                            formatter={(v: number) => [formatCurrency(v), 'Dividendes']}
                            labelStyle={{ color: '#A1A1AA', fontSize: 11 }}
                          />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, i) => (
                              <Cell key={i} fill={entry.value > 0 ? '#C9A84C' : '#27272A'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Table */}
                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Gift className="w-4 h-4 text-accent" /> Historique</CardTitle></CardHeader>
                    <CardContent className="p-0">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-text-muted text-xs">
                            <th className="text-left px-5 py-3 font-medium">Date</th>
                            <th className="text-left px-4 py-3 font-medium">Symbole</th>
                            <th className="text-right px-5 py-3 font-medium">Montant</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dividends.map(d => (
                            <tr key={d.id} className="border-b border-border/50 hover:bg-surface-2/50">
                              <td className="px-5 py-3 text-text-muted text-xs">{new Date(d.date).toLocaleDateString('fr-FR')}</td>
                              <td className="px-4 py-3 font-mono font-medium text-text-primary">{d.symbol ?? '—'}</td>
                              <td className="px-5 py-3 text-right font-mono font-semibold text-accent">+{formatCurrency(d.price, d.currency)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )
        })()}

        {/* Tab: Currencies */}
        {tab === 'currencies' && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Globe className="w-4 h-4 text-accent" /> Exposition par devise</CardTitle></CardHeader>
            <CardContent>
              <CurrencyExposure currencyMap={currencyMap} totalForCurrency={totalForCurrency} />
            </CardContent>
          </Card>
        )}

        {/* Tab: Sectors */}
        {tab === 'sectors' && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><LayoutGrid className="w-4 h-4 text-accent" /> Répartition sectorielle</CardTitle></CardHeader>
            <CardContent><SectorBreakdown holdings={enrichedHoldings} /></CardContent>
          </Card>
        )}

        {/* Tab: Risk */}
        {tab === 'risk' && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldAlert className="w-4 h-4 text-accent" /> Analyse de risque</CardTitle></CardHeader>
            <CardContent><RiskAnalysis holdings={enrichedHoldings.map(h => ({ ...h, assetType: financialAssets.find(a => a.holdings?.some(hh => hh.id === h.id))?.type }))} /></CardContent>
          </Card>
        )}

        {/* Tab: Rebalance */}
        {tab === 'rebalance' && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><RefreshCw className="w-4 h-4 text-accent" /> Outil de rééquilibrage</CardTitle></CardHeader>
            <CardContent><RebalanceTool /></CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
