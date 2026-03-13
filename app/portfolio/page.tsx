'use client'

import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { HoldingsTable } from '@/components/dashboard/holdings-table'
import { RebalanceTool } from '@/components/portfolio/rebalance-tool'
import { PerformanceChart } from '@/components/portfolio/performance-chart'
import { useAssets } from '@/hooks/use-assets'
import { useTransactions } from '@/hooks/use-transactions'
import { usePrices } from '@/hooks/use-prices'
import { MOCK_ASSETS } from '@/services/mock-data'
import { Holding } from '@/types'
import { formatCurrency, cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, RefreshCw, LineChart, Gift, Globe } from 'lucide-react'
import { useMemo, useState } from 'react'

const FINANCIAL_TYPES = ['STOCK', 'CRYPTO', 'PEA', 'CTO']

const TABS = [
  { id: 'positions',   label: 'Positions',       icon: LineChart   },
  { id: 'performance', label: 'Performance',      icon: TrendingUp  },
  { id: 'dividends',   label: 'Dividendes',       icon: Gift        },
  { id: 'currencies',  label: 'Devises',          icon: Globe       },
  { id: 'rebalance',   label: 'Rééquilibrage',    icon: RefreshCw   },
]

export default function PortfolioPage() {
  const [tab, setTab] = useState('positions')
  const { data: assets } = useAssets()
  const { data: transactions } = useTransactions()
  const displayAssets = assets ?? MOCK_ASSETS

  const financialAssets = displayAssets.filter(a => FINANCIAL_TYPES.includes(a.type))
  const allHoldings: Holding[] = financialAssets.flatMap(a => a.holdings ?? [])

  const symbols = allHoldings.map(h => h.symbol)
  const { data: prices } = usePrices(symbols)

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

  const CURRENCY_COLORS: Record<string, string> = {
    EUR: '#C9A84C', USD: '#10B981', GBP: '#6366F1', CHF: '#F97316', JPY: '#EC4899',
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Portefeuille" subtitle="Positions, performance et analyse" />

      <div className="flex-1 p-6 space-y-6">

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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

        {/* Tabs */}
        <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 w-fit">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                  tab === t.id ? 'bg-accent/10 text-accent' : 'text-text-muted hover:text-text-primary')}>
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            )
          })}
        </div>

        {/* Tab: Positions */}
        {tab === 'positions' && (
          financialAssets.map(asset => {
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
          })
        )}
        {tab === 'positions' && allHoldings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-text-primary font-semibold mb-2">Aucune position</p>
            <p className="text-text-muted text-sm">Ajoutez des actifs Bourse / Crypto / PEA / CTO dans "Mes actifs".</p>
          </div>
        )}

        {/* Tab: Performance */}
        {tab === 'performance' && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="w-4 h-4 text-accent" /> Performance vs indices</CardTitle></CardHeader>
            <CardContent><PerformanceChart /></CardContent>
          </Card>
        )}

        {/* Tab: Dividends */}
        {tab === 'dividends' && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Gift className="w-4 h-4 text-accent" /> Dividendes reçus</CardTitle></CardHeader>
            <CardContent className="p-0">
              {dividends.length === 0 ? (
                <p className="text-text-muted text-sm text-center py-10">Aucun dividende enregistré. Ajoutez-les dans Transactions.</p>
              ) : (
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
                    <tr className="bg-surface-2/30">
                      <td colSpan={2} className="px-5 py-3 text-text-secondary text-sm font-semibold">Total</td>
                      <td className="px-5 py-3 text-right font-mono font-bold text-accent">{formatCurrency(totalDividends)}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tab: Currencies */}
        {tab === 'currencies' && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Globe className="w-4 h-4 text-accent" /> Exposition par devise</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {totalForCurrency === 0 ? (
                <p className="text-text-muted text-sm">Aucune position.</p>
              ) : (
                Object.entries(currencyMap)
                  .sort((a, b) => b[1] - a[1])
                  .map(([currency, val]) => {
                    const pct = (val / totalForCurrency) * 100
                    const color = CURRENCY_COLORS[currency] ?? '#6B7280'
                    return (
                      <div key={currency}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono font-bold text-text-primary" style={{ color }}>{currency}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-mono text-text-primary">{formatCurrency(val)}</span>
                            <span className="text-text-muted text-xs ml-2">{pct.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: color }} />
                        </div>
                      </div>
                    )
                  })
              )}
            </CardContent>
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
