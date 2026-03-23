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
    <div className="overflow-x-auto -mx-1">
      <table className="w-full min-w-0">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left text-xs font-medium text-text-muted pb-3 pr-3">Actif</th>
            <th className="text-right text-xs font-medium text-text-muted pb-3 px-3 hidden sm:table-cell">Quantité</th>
            <th className="text-right text-xs font-medium text-text-muted pb-3 px-3 hidden sm:table-cell">PRU</th>
            <th className="text-right text-xs font-medium text-text-muted pb-3 px-3 hidden md:table-cell">Prix actuel</th>
            <th className="text-right text-xs font-medium text-text-muted pb-3 px-3">Valeur</th>
            <th className="text-right text-xs font-medium text-text-muted pb-3 pl-3">+/- value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {holdings.map(holding => {
            const isPositive = (holding.pnl ?? 0) >= 0
            return (
              <tr key={holding.id} className="hover:bg-surface-2/50 transition-colors">
                <td className="py-3 pr-3">
                  <div>
                    <p className="text-text-primary font-medium text-sm">{holding.symbol}</p>
                    <p className="text-text-muted text-xs truncate max-w-[90px] sm:max-w-none">{holding.name}</p>
                  </div>
                </td>
                <td className="text-right py-3 px-3 text-text-secondary text-sm font-mono hidden sm:table-cell">
                  {formatNumber(holding.quantity, holding.quantity < 1 ? 4 : 2)}
                </td>
                <td className="text-right py-3 px-3 text-text-secondary text-sm font-mono hidden sm:table-cell">
                  {formatCurrency(holding.avgBuyPrice, holding.currency)}
                </td>
                <td className="text-right py-3 px-3 text-text-primary text-sm font-mono hidden md:table-cell">
                  {holding.currentPrice ? formatCurrency(holding.currentPrice, holding.currency) : '—'}
                </td>
                <td className="text-right py-3 px-3 text-text-primary font-semibold text-sm font-mono">
                  {holding.currentValue ? formatCurrency(holding.currentValue, holding.currency) : '—'}
                </td>
                <td className="text-right py-3 pl-3">
                  {holding.pnl !== undefined ? (
                    <div className={cn('flex flex-col items-end', isPositive ? 'text-emerald-400' : 'text-red-400')}>
                      <div className="flex items-center gap-1">
                        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        <span className="text-xs font-semibold font-mono">
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
