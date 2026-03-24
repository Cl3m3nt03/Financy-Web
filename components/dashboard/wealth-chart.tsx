'use client'

import { useState, useMemo } from 'react'
import {
  Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, ComposedChart,
} from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import { HistoryPoint } from '@/types'
import { formatCurrency, cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

// ── Obsidian Diamond palette ───────────────────────────────────────────────
const DIAMOND_BLUE = '#BDEFFF'
const SAPPHIRE     = '#3D5A80'
const RUBY         = '#E55C5C'
const RUBY_DIM     = '#7A2525'

const PERIODS = [
  { label: '1M',  months: 2,        range: '1mo' },
  { label: '3M',  months: 3,        range: '3mo' },
  { label: '6M',  months: 6,        range: '6mo' },
  { label: '1A',  months: 12,       range: '1y'  },
  { label: 'MAX', months: Infinity, range: '5y'  },
]

const BENCHMARKS = [
  { id: 'sp500', label: 'S&P 500',    color: '#60A5FA' },
  { id: 'cac40', label: 'CAC 40',     color: '#A78BFA' },
  { id: 'world', label: 'MSCI World', color: '#34D399' },
]

function CustomTooltip({ active, payload, label, normalized }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-border rounded-xl px-3 py-2.5 shadow-xl min-w-[150px]">
      <p className="text-text-muted text-[11px] mb-2 font-mono">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 mb-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: p.color }} />
            <span className="text-[11px] text-text-secondary">{p.name}</span>
          </div>
          <span className="text-[11px] font-mono font-semibold" style={{ color: p.color }}>
            {normalized ? `${p.value?.toFixed(1)}` : formatCurrency(p.value)}
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

  const first    = filtered[0]?.value ?? 0
  const last     = filtered[filtered.length - 1]?.value ?? 0
  const delta    = last - first
  const deltaPct = first > 0 ? (delta / first) * 100 : 0
  const isPos    = delta >= 0

  // Couleurs Obsidian Diamond
  const lineColor   = isPos ? DIAMOND_BLUE : RUBY
  const gradTop     = isPos ? DIAMOND_BLUE : RUBY
  const gradBottom  = isPos ? SAPPHIRE     : RUBY_DIM

  const tickInterval = period === '1M' ? 0 : period === '3M' ? 0 : period === '6M' ? 1 : 2
  const showNormalized = activeIndices.size > 0

  const chartData = useMemo(() => {
    if (!showNormalized) return filtered

    const wealthFirst = filtered[0]?.value ?? 1
    const base = filtered.map(d => ({
      date: d.date,
      value: (d.value / wealthFirst) * 100,
    }))

    const byDate: Record<string, any> = {}
    base.forEach(d => { byDate[d.date] = { date: d.date, value: d.value } })

    if (benchmarkData) {
      benchmarkData.forEach(idx => {
        if (!activeIndices.has(idx.id)) return
        idx.data.forEach(pt => {
          if (byDate[pt.date]) byDate[pt.date][idx.id] = pt.value
        })
      })
    }

    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
  }, [filtered, showNormalized, benchmarkData, activeIndices])

  const allValues = chartData.flatMap((d: any) => {
    const vals = [d.value]
    BENCHMARKS.filter(b => activeIndices.has(b.id)).forEach(b => {
      if (d[b.id]) vals.push(d[b.id])
    })
    return vals
  }).filter(Boolean)

  const minVal = (Math.min(...allValues) * 0.97) || 0
  const maxVal = (Math.max(...allValues) * 1.03) || 1

  function toggleIndex(id: string) {
    setActiveIndices(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  return (
    <Card className="overflow-hidden">
      <div className="px-5 pt-5 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          {/* Chiffres */}
          <div>
            <p className="text-text-muted text-[11px] uppercase tracking-widest mb-1.5 font-medium">
              Évolution du patrimoine
            </p>
            <p className="text-3xl sm:text-4xl font-bold text-text-primary font-mono leading-none tracking-tight">
              {formatCurrency(last)}
            </p>
            <div className={cn(
              'flex items-center gap-1.5 mt-2 text-sm font-semibold',
              isPos ? 'text-accent' : 'text-ruby'
            )}>
              {isPos
                ? <TrendingUp  className="w-4 h-4" strokeWidth={1.5} />
                : <TrendingDown className="w-4 h-4" strokeWidth={1.5} />
              }
              <span>{isPos ? '+' : ''}{deltaPct.toFixed(2)}%</span>
              <span className="text-xs font-normal opacity-60">
                ({isPos ? '+' : ''}{formatCurrency(delta, 'EUR', true)})
              </span>
            </div>
          </div>

          {/* Contrôles */}
          <div className="flex flex-col items-end gap-2 self-start">
            {/* Périodes */}
            <div className="flex gap-0.5 bg-surface-2 rounded-lg p-0.5 border border-border">
              {PERIODS.map(p => (
                <button
                  key={p.label}
                  onClick={() => setPeriod(p.label)}
                  className={cn(
                    'px-2.5 py-1.5 text-[11px] rounded-md font-medium transition-all',
                    period === p.label
                      ? 'bg-accent/10 text-accent border border-accent/20'
                      : 'text-text-muted hover:text-text-primary'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Indices */}
            <div className="flex gap-1.5 flex-wrap justify-end">
              {BENCHMARKS.map(b => (
                <button
                  key={b.id}
                  onClick={() => toggleIndex(b.id)}
                  className={cn(
                    'px-2 py-1 text-[10px] rounded-md font-medium border transition-all',
                    activeIndices.has(b.id)
                      ? 'text-obsidian border-transparent'
                      : 'text-text-muted bg-transparent border-border hover:border-steel'
                  )}
                  style={activeIndices.has(b.id)
                    ? { backgroundColor: b.color, borderColor: b.color }
                    : {}
                  }
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {showNormalized && (
          <p className="text-text-muted text-[10px] mb-1 opacity-50 tracking-wider uppercase">
            Base 100 — comparaison normalisée
          </p>
        )}
      </div>

      <CardContent className="px-2 pt-0 pb-4">
        <div className="h-52 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                {/* Dégradé Diamond Blue → Sapphire (positif) */}
                <linearGradient id="gradPos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={gradTop}    stopOpacity={0.25} />
                  <stop offset="60%"  stopColor={gradBottom} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={gradBottom} stopOpacity={0.02} />
                </linearGradient>
                {/* Dégradé Ruby (négatif) */}
                <linearGradient id="gradNeg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={RUBY}     stopOpacity={0.20} />
                  <stop offset="100%" stopColor={RUBY_DIM} stopOpacity={0.02} />
                </linearGradient>
              </defs>

              {/* Pas de grille visible — style radar/techno */}
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#5A6070', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                interval={tickInterval}
              />
              <YAxis
                domain={[minVal, maxVal]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#5A6070', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                tickFormatter={v => showNormalized ? `${v.toFixed(0)}` : formatCurrency(v, 'EUR', true)}
                width={showNormalized ? 36 : 68}
              />
              <Tooltip content={<CustomTooltip normalized={showNormalized} />} />

              {/* Zone patrimoine */}
              <Area
                type="monotoneX"
                dataKey="value"
                name="Patrimoine"
                stroke={lineColor}
                strokeWidth={2}
                fill={isPos ? 'url(#gradPos)' : 'url(#gradNeg)'}
                dot={false}
                activeDot={{ r: 4, fill: lineColor, stroke: '#08090A', strokeWidth: 2 }}
                animationDuration={500}
              />

              {/* Lignes indices */}
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
                  strokeDasharray="4 3"
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
