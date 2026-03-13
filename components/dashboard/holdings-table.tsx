import { Holding } from '@/types'
import { formatCurrency, formatNumber, cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface HoldingsTableProps {
  holdings: Holding[]
}

export function HoldingsTable({ holdings }: HoldingsTableProps) {
  if (holdings.length === 0) {
    return (
      <p className="text-text-muted text-sm text-center py-8">
        Aucune position enregistrée
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left text-xs font-medium text-text-muted pb-3 pr-4">Actif</th>
            <th className="text-right text-xs font-medium text-text-muted pb-3 px-4">Quantité</th>
            <th className="text-right text-xs font-medium text-text-muted pb-3 px-4">PRU</th>
            <th className="text-right text-xs font-medium text-text-muted pb-3 px-4">Prix actuel</th>
            <th className="text-right text-xs font-medium text-text-muted pb-3 px-4">Valeur</th>
            <th className="text-right text-xs font-medium text-text-muted pb-3 pl-4">+/- value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {holdings.map(holding => {
            const isPositive = (holding.pnl ?? 0) >= 0
            return (
              <tr key={holding.id} className="hover:bg-surface-2/50 transition-colors">
                <td className="py-3 pr-4">
                  <div>
                    <p className="text-text-primary font-medium text-sm">{holding.symbol}</p>
                    <p className="text-text-muted text-xs">{holding.name}</p>
                  </div>
                </td>
                <td className="text-right py-3 px-4 text-text-secondary text-sm font-mono">
                  {formatNumber(holding.quantity, holding.quantity < 1 ? 4 : 2)}
                </td>
                <td className="text-right py-3 px-4 text-text-secondary text-sm font-mono">
                  {formatCurrency(holding.avgBuyPrice, holding.currency)}
                </td>
                <td className="text-right py-3 px-4 text-text-primary text-sm font-mono">
                  {holding.currentPrice ? formatCurrency(holding.currentPrice, holding.currency) : '—'}
                </td>
                <td className="text-right py-3 px-4 text-text-primary font-semibold text-sm font-mono">
                  {holding.currentValue ? formatCurrency(holding.currentValue, holding.currency) : '—'}
                </td>
                <td className="text-right py-3 pl-4">
                  {holding.pnl !== undefined ? (
                    <div className={cn('flex flex-col items-end', isPositive ? 'text-emerald-400' : 'text-red-400')}>
                      <div className="flex items-center gap-1">
                        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        <span className="text-sm font-semibold font-mono">
                          {isPositive ? '+' : ''}{formatCurrency(holding.pnl, holding.currency)}
                        </span>
                      </div>
                      <span className="text-xs opacity-80">
                        {isPositive ? '+' : ''}{(holding.pnlPercent ?? 0).toFixed(2)}%
                      </span>
                    </div>
                  ) : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
