'use client'

import { useQuery } from '@tanstack/react-query'
import { Globe, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'

interface Props {
  currencyMap: Record<string, number>
  totalForCurrency: number
}

const CURRENCY_COLORS: Record<string, string> = {
  EUR: '#C9A84C', USD: '#10B981', GBP: '#6366F1', CHF: '#F97316', JPY: '#EC4899',
  CAD: '#06B6D4', AUD: '#84CC16', BTC: '#F97316', ETH: '#A855F7',
}

const CURRENCY_FLAGS: Record<string, string> = {
  EUR: '🇪🇺', USD: '🇺🇸', GBP: '🇬🇧', CHF: '🇨🇭', JPY: '🇯🇵',
  CAD: '🇨🇦', AUD: '🇦🇺', BTC: '₿', ETH: 'Ξ',
}

export function CurrencyExposure({ currencyMap, totalForCurrency }: Props) {
  const { data: fxData, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['exchange-rates'],
    queryFn: async () => {
      const res = await fetch('/api/exchange-rates')
      if (!res.ok) throw new Error('FX fetch failed')
      return res.json() as Promise<{ base: string; rates: Record<string, number>; updated: string }>
    },
    staleTime: 3600_000,
  })

  const rates = fxData?.rates ?? {}

  // Convert each currency exposure to EUR equivalent using live rates
  const entries = Object.entries(currencyMap).sort((a, b) => b[1] - a[1])

  // Total in EUR using live rates
  const totalInEur = entries.reduce((sum, [currency, val]) => {
    if (currency === 'EUR') return sum + val
    const rate = rates[currency]
    if (!rate) return sum + val
    return sum + val / rate
  }, 0)

  return (
    <div className="space-y-4">
      {/* Live rates banner */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <Globe className="w-3.5 h-3.5" />
          <span>Taux de change en direct (base EUR)</span>
          {dataUpdatedAt > 0 && (
            <span className="opacity-60">
              · mis à jour {new Date(dataUpdatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <button
          onClick={() => refetch()}
          className="text-text-muted hover:text-text-primary transition-colors"
          title="Actualiser"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
        </button>
      </div>

      {/* FX rate pills */}
      {fxData && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(rates)
            .filter(([c]) => c !== 'EUR')
            .map(([currency, rate]) => (
              <div
                key={currency}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-2 rounded-xl border border-border"
              >
                <span className="text-xs">{CURRENCY_FLAGS[currency] ?? currency}</span>
                <span className="text-xs font-mono font-semibold text-text-primary">{currency}</span>
                <span className="text-xs text-text-muted">= 1/{rate.toFixed(4)} EUR</span>
              </div>
            ))}
        </div>
      )}

      {/* Exposure bars */}
      {totalForCurrency === 0 ? (
        <p className="text-text-muted text-sm">Aucune position.</p>
      ) : (
        <div className="space-y-3">
          {entries.map(([currency, val]) => {
            const pct = (val / totalForCurrency) * 100
            const color = CURRENCY_COLORS[currency] ?? '#6B7280'
            const rate = rates[currency]
            const valInEur = currency === 'EUR' ? val : rate ? val / rate : null
            const eurPct = totalInEur > 0 && valInEur != null ? (valInEur / totalInEur) * 100 : null

            return (
              <div key={currency}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{CURRENCY_FLAGS[currency] ?? '🌐'}</span>
                    <span className="text-sm font-mono font-bold" style={{ color }}>{currency}</span>
                    {rate && currency !== 'EUR' && (
                      <span className="text-xs text-text-muted bg-surface-2 px-1.5 py-0.5 rounded-lg font-mono">
                        1 {currency} = {(1 / rate).toFixed(4)} EUR
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-mono text-text-primary">{formatCurrency(val, currency)}</span>
                    {valInEur != null && currency !== 'EUR' && (
                      <span className="text-xs text-text-muted ml-1.5">
                        ≈ {formatCurrency(valInEur)}
                      </span>
                    )}
                    <span className="text-text-muted text-xs ml-2">{pct.toFixed(1)}%</span>
                    {eurPct != null && currency !== 'EUR' && (
                      <span className="text-text-muted text-xs ml-1">
                        ({eurPct.toFixed(1)}% EUR)
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {fxData && (
        <p className="text-xs text-text-muted opacity-50 text-right">
          Source : Open Exchange Rates · {fxData.updated}
        </p>
      )}
    </div>
  )
}
