'use client'

import { useState, useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, LineChart, ComposedChart, Legend,
} from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import { HistoryPoint } from '@/types'
import { formatCurrency, cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

const PERIODS = [
  { label: '1M', months: 2,  range: '1mo'  },
  { label: '3M', months: 3,  range: '3mo'  },
  { label: '6M', months: 6,  range: '6mo'  },
  { label: '1A', months: 12, range: '1y'   },
  { label: 'MAX', months: Infinity, range: '5y' },
]

const BENCHMARKS = [
  { id: 'sp500', label: 'S&P 500', color: '#3B82F6' },
  { id: 'cac40', label: 'CAC 40',  color: '#A855F7' },
  { id: 'world', label: 'MSCI World', color: '#F59E0B' },
]

function CustomTooltip({ active, payload, label, normalized }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-border rounded-xl px-3 py-2.5 shadow-xl min-w-[140px]">
      <p className="text-text-muted text-xs mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-3 mb-0.5">
          <span className="text-xs text-text-secondary">{p.name}</span>
          <span className="text-xs font-mono font-semibold" style={{ color: p.color }}>
            {normalized
              ? `${p.value?.toFixed(1)}%`
              : formatCurrency(p.value)
            }
          </span>
        </div>
      ))}
    </div>
  )
}

export function WealthChart({ data }: { data: HistoryPoint[] }) {
  const [period, setPeriod] = useState('1A')
  const [activeIndices, setActiveIndices] = useState<Set<string>>(new Set())

  const periodConfig = PERIODS.find(p => p.label === period)!

  const { data: benchmarkData } = useQuery({
    queryKey: ['benchmark', periodConfig.range],
    queryFn: async () => {
      const res = await fetch(`/api/benchmark?range=${periodConfig.range}`)
      if (!res.ok) return []
      return res.json() as Promise<{ id: string; label: string; data: { date: string; value: number }[] }[]>
    },
    staleTime: 3600_000,
    enabled: activeIndices.size > 0,
  })

  const filtered = useMemo(() => {
    if (periodConfig.months === Infinity) return data
    return data.slice(-periodConfig.months)
  }, [data, periodConfig])

  const first = filtered[0]?.value ?? 0
  const last  = filtered[filtered.length - 1]?.value ?? 0
  const delta = last - first
  const deltaPct = first > 0 ? (delta / first) * 100 : 0
  const isPos = delta >= 0
  const color = isPos ? '#10B981' : '#EF4444'

  const tickInterval = period === '1M' ? 0 : period === '3M' ? 0 : period === '6M' ? 1 : 2

  // Build merged chart data: normalize wealth to base 100 when benchmarks are active
  const showNormalized = activeIndices.size > 0
  const chartData = useMemo(() => {
    if (!showNormalized) return filtered

    const wealthFirst = filtered[0]?.value ?? 1
    const base = filtered.map(d => ({
      date: d.date,
      value: (d.value / wealthFirst) * 100,
    }))

    // Merge benchmark data by date
    const byDate: Record<string, any> = {}
    base.forEach(d => { byDate[d.date] = { date: d.date, value: d.value } })

    if (benchmarkData) {
      benchmarkData.forEach(idx => {
        if (!activeIndices.has(idx.id)) return
        idx.data.forEach(pt => {
          if (byDate[pt.date]) {
            byDate[pt.date][idx.id] = pt.value
          }
        })
      })
    }

    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
  }, [filtered, showNormalized, benchmarkData, activeIndices])

  const minVal = showNormalized
    ? Math.min(...chartData.map((d: any) => {
        const vals = [d.value, ...BENCHMARKS.filter(b => activeIndices.has(b.id)).map(b => d[b.id]).filter(Boolean)]
        return Math.min(...vals)
      })) * 0.97
    : Math.min(...filtered.map(d => d.value)) * 0.97

  const maxVal = showNormalized
    ? Math.max(...chartData.map((d: any) => {
        const vals = [d.value, ...BENCHMARKS.filter(b => activeIndices.has(b.id)).map(b => d[b.id]).filter(Boolean)]
        return Math.max(...vals)
      })) * 1.03
    : Math.max(...filtered.map(d => d.value)) * 1.02

  function toggleIndex(id: string) {
    setActiveIndices(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <Card className="overflow-hidden">
      <div className="px-4 pt-4 pb-2 sm:px-6 sm:pt-5">
        {/* Header */}
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

          {/* Période + indices */}
          <div className="flex flex-col items-end gap-2 self-start">
            <div className="flex gap-1 bg-surface-2 rounded-xl p-1">
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
            {/* Toggle indices */}
            <div className="flex gap-1.5">
              {BENCHMARKS.map(b => (
                <button
                  key={b.id}
                  onClick={() => toggleIndex(b.id)}
                  className={cn(
                    'px-2 py-1 text-xs rounded-lg font-medium border transition-all',
                    activeIndices.has(b.id)
                      ? 'text-white border-transparent'
                      : 'text-text-muted bg-transparent border-border hover:border-text-muted'
                  )}
                  style={activeIndices.has(b.id) ? { backgroundColor: b.color, borderColor: b.color } : {}}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {showNormalized && (
          <p className="text-text-muted text-xs mb-2 opacity-60">Base 100 — comparaison normalisée</p>
        )}
      </div>

      <CardContent className="px-2 pt-0 pb-4">
        <div className="h-52 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
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
                tickFormatter={v => showNormalized ? `${v.toFixed(0)}` : formatCurrency(v, 'EUR', true)}
                width={showNormalized ? 40 : 68}
              />
              <Tooltip content={<CustomTooltip normalized={showNormalized} />} />
              <Area
                type="monotone"
                dataKey="value"
                name="Patrimoine"
                stroke={color}
                strokeWidth={2.5}
                fill="url(#wealthGrad)"
                dot={false}
                activeDot={{ r: 4, fill: color, stroke: '#09090B', strokeWidth: 2 }}
                animationDuration={400}
              />
              {BENCHMARKS.filter(b => activeIndices.has(b.id)).map(b => (
                <Line
                  key={b.id}
                  type="monotone"
                  dataKey={b.id}
                  name={b.label}
                  stroke={b.color}
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3, fill: b.color }}
                  strokeDasharray="4 2"
                  animationDuration={400}
                  connectNulls
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
