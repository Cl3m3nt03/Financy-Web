'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface PerfPoint { date: string; value: number }
interface PerfData {
  portfolio: PerfPoint[]; cac40: PerfPoint[]; sp500: PerfPoint[]; msciWorld: PerfPoint[]
}

const SERIES = [
  { key: 'portfolio', label: 'Mon portefeuille', color: '#C9A84C' },
  { key: 'sp500',     label: 'S&P 500',          color: '#10B981' },
  { key: 'cac40',     label: 'CAC 40',           color: '#6366F1' },
  { key: 'msciWorld', label: 'MSCI World',        color: '#F97316' },
]

const MONTHS_OPTIONS = [
  { value: 6,  label: '6M'  },
  { value: 12, label: '1A'  },
  { value: 24, label: '2A'  },
  { value: 60, label: '5A'  },
]

export function PerformanceChart() {
  const [months, setMonths] = useState(12)
  const [visible, setVisible] = useState<Record<string, boolean>>({
    portfolio: true, sp500: true, cac40: false, msciWorld: true,
  })

  const { data, isLoading } = useQuery<PerfData>({
    queryKey: ['performance', months],
    queryFn:  () => fetch(`/api/performance?months=${months}`).then(r => r.json()),
    staleTime: 60 * 60 * 1000,
  })

  // Merge all series into one dataset by date
  const merged: Record<string, Record<string, number>> = {}
  if (data) {
    for (const s of SERIES) {
      const points: PerfPoint[] = (data as any)[s.key] ?? []
      for (const p of points) {
        if (!merged[p.date]) merged[p.date] = {}
        merged[p.date][s.key] = p.value
      }
    }
  }
  const chartData = Object.entries(merged)
    .map(([date, vals]) => ({ date, ...vals }))

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1.5">
          {MONTHS_OPTIONS.map(o => (
            <button key={o.value} onClick={() => setMonths(o.value)}
              className={cn('px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors',
                months === o.value ? 'bg-accent/10 border-accent text-accent' : 'border-border text-text-muted hover:border-accent/40')}>
              {o.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {SERIES.map(s => (
            <button key={s.key} onClick={() => setVisible(v => ({ ...v, [s.key]: !v[s.key] }))}
              className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors',
                visible[s.key] ? 'opacity-100' : 'opacity-40')}
              style={{ borderColor: s.color + '50', color: s.color, background: s.color + '15' }}>
              <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-text-muted gap-2 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Chargement des indices…
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <XAxis dataKey="date" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => `${v > 0 ? '+' : ''}${v.toFixed(0)}%`} tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} width={48} />
            <Tooltip
              contentStyle={{ background: '#1C1C1E', border: '1px solid #2C2C2E', borderRadius: 12 }}
              labelStyle={{ color: '#A1A1AA', fontSize: 11 }}
              formatter={(val: number, name: string) => {
                const s = SERIES.find(s => s.key === name)
                return [`${val > 0 ? '+' : ''}${val.toFixed(2)}%`, s?.label ?? name]
              }}
            />
            {SERIES.map(s => visible[s.key] && (
              <Line key={s.key} type="monotone" dataKey={s.key}
                stroke={s.color} strokeWidth={s.key === 'portfolio' ? 2.5 : 1.5}
                dot={false} connectNulls />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
      <p className="text-text-muted text-xs text-center">Performance en % depuis le début de la période. Indices : Yahoo Finance.</p>
    </div>
  )
}
