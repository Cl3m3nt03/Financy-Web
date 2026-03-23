'use client'

import { useState, useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import { HistoryPoint } from '@/types'
import { formatCurrency, cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

const PERIODS = [
  { label: '1M', months: 2 },
  { label: '3M', months: 3 },
  { label: '6M', months: 6 },
  { label: '1A', months: 12 },
  { label: 'MAX', months: Infinity },
]

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-border rounded-xl px-3 py-2.5 shadow-xl">
      <p className="text-text-muted text-xs mb-1">{label}</p>
      <p className="text-text-primary font-bold text-base font-mono">
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  )
}

export function WealthChart({ data }: { data: HistoryPoint[] }) {
  const [period, setPeriod] = useState('1A')

  const filtered = useMemo(() => {
    const p = PERIODS.find(p => p.label === period)
    if (!p || p.months === Infinity) return data
    return data.slice(-p.months)
  }, [data, period])

  const first = filtered[0]?.value ?? 0
  const last  = filtered[filtered.length - 1]?.value ?? 0
  const delta = last - first
  const deltaPct = first > 0 ? (delta / first) * 100 : 0
  const isPos = delta >= 0
  const color = isPos ? '#10B981' : '#EF4444'

  const minVal = Math.min(...filtered.map(d => d.value)) * 0.97
  const maxVal = Math.max(...filtered.map(d => d.value)) * 1.02

  const tickInterval = period === '1M' ? 0 : period === '3M' ? 0 : period === '6M' ? 1 : 2

  return (
    <Card className="overflow-hidden">
      <div className="px-4 pt-4 pb-2 sm:px-6 sm:pt-5">
        {/* Header: valeur + delta */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          <div>
            <p className="text-text-muted text-xs mb-1">Évolution du patrimoine</p>
            <p className="text-2xl sm:text-3xl font-bold text-text-primary font-mono leading-none">
              {formatCurrency(last)}
            </p>
            <div className={cn(
              'flex items-center gap-1.5 mt-2 text-sm font-semibold',
              isPos ? 'text-emerald-400' : 'text-red-400'
            )}>
              {isPos ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>{isPos ? '+' : ''}{deltaPct.toFixed(2)}%</span>
              <span className="text-xs font-normal opacity-70">
                ({isPos ? '+' : ''}{formatCurrency(delta, 'EUR', true)})
              </span>
            </div>
          </div>

          {/* Sélecteur de période */}
          <div className="flex gap-1 bg-surface-2 rounded-xl p-1 self-start">
            {PERIODS.map(p => (
              <button
                key={p.label}
                onClick={() => setPeriod(p.label)}
                className={cn(
                  'px-2.5 py-1.5 text-xs rounded-lg font-medium transition-all',
                  period === p.label
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-text-muted hover:text-text-primary hover:bg-surface'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <CardContent className="px-2 pt-0 pb-4">
        <div className="h-52 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filtered} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="wealthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={color} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={color} stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#71717A', fontSize: 10 }}
                interval={tickInterval}
              />
              <YAxis
                domain={[minVal, maxVal]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#71717A', fontSize: 10 }}
                tickFormatter={v => formatCurrency(v, 'EUR', true)}
                width={68}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2.5}
                fill="url(#wealthGrad)"
                dot={false}
                activeDot={{ r: 4, fill: color, stroke: '#09090B', strokeWidth: 2 }}
                animationDuration={400}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
