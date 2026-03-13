import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: number
  subtitle?: string
  change?: number
  changeLabel?: string
  icon: LucideIcon
  iconColor?: string
  format?: 'currency' | 'percent' | 'number'
  currency?: string
}

export function StatCard({
  title,
  value,
  subtitle,
  change,
  changeLabel,
  icon: Icon,
  iconColor = 'text-accent',
  format = 'currency',
  currency = 'EUR',
}: StatCardProps) {
  const isPositive = (change ?? 0) >= 0
  const TrendIcon = isPositive ? TrendingUp : TrendingDown

  const formattedValue =
    format === 'currency'
      ? formatCurrency(value, currency, true)
      : format === 'percent'
      ? `${value.toFixed(2)}%`
      : value.toLocaleString('fr-FR')

  return (
    <Card className="hover:border-zinc-700 transition-colors">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className={cn('w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center', iconColor)}>
            <Icon className="w-5 h-5" />
          </div>
          {change !== undefined && (
            <div className={cn(
              'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg',
              isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
            )}>
              <TrendIcon className="w-3 h-3" />
              {Math.abs(change).toFixed(2)}%
            </div>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-text-secondary text-sm">{title}</p>
          <p className="text-2xl font-bold text-text-primary font-mono">{formattedValue}</p>
          {subtitle && <p className="text-text-muted text-xs">{subtitle}</p>}
          {changeLabel && (
            <p className={cn('text-xs font-medium', isPositive ? 'text-emerald-400' : 'text-red-400')}>
              {changeLabel}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
