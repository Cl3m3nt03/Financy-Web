'use client'

import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { HoldingsTable } from '@/components/dashboard/holdings-table'
import { useAssets } from '@/hooks/use-assets'
import { usePrices } from '@/hooks/use-prices'
import { MOCK_ASSETS } from '@/services/mock-data'
import { Holding } from '@/types'
import { formatCurrency, cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

export default function PortfolioPage() {
  const { data: assets } = useAssets()
  const displayAssets = assets ?? MOCK_ASSETS

  const stockCryptoAssets = displayAssets.filter(a => a.type === 'STOCK' || a.type === 'CRYPTO')
  const allHoldings: Holding[] = stockCryptoAssets.flatMap(a => a.holdings ?? [])

  const symbols = allHoldings.map(h => h.symbol)
  const { data: prices } = usePrices(symbols)

  // Enrich holdings with live prices if available
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
  const totalValue = enrichedHoldings.reduce((sum, h) => sum + (h.currentValue ?? h.quantity * h.avgBuyPrice), 0)
  const totalPnl = totalValue - totalInvested
  const totalPnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0
  const isPositive = totalPnl >= 0

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Portefeuille" subtitle="Bourse & Crypto — positions et performances" />

      <div className="flex-1 p-6 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-text-secondary text-sm mb-1">Valeur du portefeuille</p>
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
                  {Math.abs(totalPnlPercent).toFixed(2)}%
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Holdings by account */}
        {stockCryptoAssets.map(asset => {
          const assetHoldings = enrichedHoldings.filter(h => h.assetId === asset.id)
          if (assetHoldings.length === 0) return null

          return (
            <Card key={asset.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{asset.name}</CardTitle>
                  {asset.institution && (
                    <span className="text-text-muted text-xs">{asset.institution}</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <HoldingsTable holdings={assetHoldings} />
              </CardContent>
            </Card>
          )
        })}

        {allHoldings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-text-primary font-semibold mb-2">Aucune position</p>
            <p className="text-text-muted text-sm">Ajoutez des comptes Bourse ou Crypto avec des positions dans "Mes actifs".</p>
          </div>
        )}
      </div>
    </div>
  )
}
