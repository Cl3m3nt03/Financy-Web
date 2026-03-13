'use client'

import { useState, useMemo } from 'react'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, cn } from '@/lib/utils'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Calculator, TrendingUp } from 'lucide-react'

function compound(
  initial: number,
  monthly: number,
  annualRate: number,
  years: number,
): Array<{ year: number; value: number; invested: number }> {
  const monthlyRate = annualRate / 100 / 12
  const points = []
  let value = initial
  for (let y = 0; y <= years; y++) {
    points.push({ year: y, value: Math.round(value), invested: Math.round(initial + monthly * 12 * y) })
    for (let m = 0; m < 12; m++) {
      value = (value + monthly) * (1 + monthlyRate)
    }
  }
  return points
}

const PRESETS = [
  { label: 'Livret A',    rate: 3   },
  { label: 'Fonds €',     rate: 2.5 },
  { label: 'ETF World',   rate: 8   },
  { label: 'S&P 500',     rate: 10  },
  { label: 'Immo locatif',rate: 5   },
]

export default function SimulatorPage() {
  const [initial,  setInitial]  = useState(10000)
  const [monthly,  setMonthly]  = useState(300)
  const [rate,     setRate]     = useState(8)
  const [years,    setYears]    = useState(20)

  const data = useMemo(
    () => compound(initial, monthly, rate, years),
    [initial, monthly, rate, years]
  )

  const final     = data[data.length - 1]
  const totalInvested = initial + monthly * 12 * years
  const gains     = (final?.value ?? 0) - totalInvested

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Simulateur" subtitle="Projection patrimoniale avec intérêts composés" />

      <div className="flex-1 p-6 space-y-6 max-w-4xl">

        {/* Presets */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-text-muted text-xs">Rendement prédéfini :</span>
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => setRate(p.rate)}
              className={cn('text-xs px-3 py-1.5 rounded-xl border transition-colors font-medium',
                rate === p.rate ? 'bg-accent/10 border-accent text-accent' : 'border-border text-text-muted hover:border-accent/40 hover:text-text-primary')}>
              {p.label} {p.rate}%
            </button>
          ))}
        </div>

        {/* Controls */}
        <Card>
          <CardContent className="pt-5 grid grid-cols-2 sm:grid-cols-4 gap-5">
            {[
              { label: 'Capital initial (€)', value: initial, set: setInitial, min: 0, max: 1000000, step: 500 },
              { label: 'Versement mensuel (€)', value: monthly, set: setMonthly, min: 0, max: 10000, step: 50 },
              { label: 'Rendement annuel (%)', value: rate, set: setRate, min: 0, max: 30, step: 0.5 },
              { label: 'Durée (années)', value: years, set: setYears, min: 1, max: 50, step: 1 },
            ].map(f => (
              <div key={f.label}>
                <label className="block text-xs font-medium text-text-secondary mb-2">{f.label}</label>
                <input type="number" value={f.value} min={f.min} max={f.max} step={f.step}
                  onChange={e => f.set(Number(e.target.value))}
                  className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:border-accent" />
                <input type="range" value={f.value} min={f.min} max={f.max} step={f.step}
                  onChange={e => f.set(Number(e.target.value))}
                  className="w-full mt-2 accent-[#C9A84C]" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Results */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-accent/30 bg-accent/5">
            <CardContent className="pt-5">
              <p className="text-text-muted text-xs mb-1">Valeur finale</p>
              <p className="text-2xl font-bold font-mono text-accent">{formatCurrency(final?.value ?? 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-text-muted text-xs mb-1">Capital investi</p>
              <p className="text-2xl font-bold font-mono text-text-primary">{formatCurrency(totalInvested)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-text-muted text-xs mb-1">Gains des intérêts</p>
              <p className="text-2xl font-bold font-mono text-emerald-400">+{formatCurrency(gains)}</p>
              <p className="text-text-muted text-xs mt-1">×{(((final?.value ?? 0) / Math.max(initial, 1))).toFixed(1)} votre mise</p>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-4 h-4 text-accent" /> Projection sur {years} ans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="simVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#C9A84C" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="simInv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6B7280" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6B7280" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="year" tickFormatter={v => `${v}a`} tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} width={45} />
                <Tooltip
                  contentStyle={{ background: '#1C1C1E', border: '1px solid #2C2C2E', borderRadius: 12 }}
                  labelStyle={{ color: '#A1A1AA' }}
                  formatter={(val: number, name: string) => [
                    formatCurrency(val),
                    name === 'value' ? 'Valeur' : 'Investi',
                  ]}
                  labelFormatter={v => `Année ${v}`}
                />
                <Area type="monotone" dataKey="invested" stroke="#6B7280" strokeWidth={1.5} fill="url(#simInv)" strokeDasharray="4 4" dot={false} />
                <Area type="monotone" dataKey="value"    stroke="#C9A84C" strokeWidth={2}   fill="url(#simVal)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
