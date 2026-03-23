'use client'

import { useState, useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'

interface Props {
  currentValue: number
}

const PRESETS = [
  { label: '5 ans',  years: 5  },
  { label: '10 ans', years: 10 },
  { label: '20 ans', years: 20 },
  { label: '30 ans', years: 30 },
]

const RATE_PRESETS = [
  { label: 'Livret A',  rate: 3   },
  { label: 'ETF World', rate: 8   },
  { label: 'S&P 500',   rate: 10  },
  { label: 'Custom',    rate: null },
]

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const projected  = payload.find((p: any) => p.dataKey === 'projected')?.value ?? 0
  const invested   = payload.find((p: any) => p.dataKey === 'invested')?.value ?? 0
  const gain       = projected - invested
  return (
    <div className="bg-surface border border-border rounded-xl px-3 py-2.5 shadow-xl text-xs space-y-1.5">
      <p className="text-text-muted font-medium">{label}</p>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
        <span className="text-text-secondary">Patrimoine</span>
        <span className="font-mono font-bold text-text-primary ml-auto">{formatCurrency(projected, 'EUR', true)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
        <span className="text-text-secondary">Investi</span>
        <span className="font-mono text-text-secondary ml-auto">{formatCurrency(invested, 'EUR', true)}</span>
      </div>
      <div className="flex items-center gap-2 border-t border-border pt-1.5">
        <span className="text-text-muted">Plus-value</span>
        <span className="font-mono font-bold text-emerald-400 ml-auto">+{formatCurrency(gain, 'EUR', true)}</span>
      </div>
    </div>
  )
}

export function WealthProjection({ currentValue }: Props) {
  const [horizon, setHorizon]       = useState(10)
  const [monthly, setMonthly]       = useState(500)
  const [rateKey, setRateKey]       = useState('ETF World')
  const [customRate, setCustomRate] = useState(8)

  const rate = useMemo(() => {
    const p = RATE_PRESETS.find(r => r.label === rateKey)
    return p?.rate ?? customRate
  }, [rateKey, customRate])

  const data = useMemo(() => {
    const points: { year: string; projected: number; invested: number }[] = []
    const r = rate / 100 / 12 // monthly rate
    let balance = currentValue

    points.push({
      year:      'Auj.',
      projected: Math.round(currentValue),
      invested:  Math.round(currentValue),
    })

    for (let y = 1; y <= horizon; y++) {
      const months = y * 12
      // FV of current balance
      const fvCurrent = currentValue * Math.pow(1 + r, months)
      // FV of monthly annuity
      const fvAnnuity = r > 0 ? monthly * ((Math.pow(1 + r, months) - 1) / r) : monthly * months
      const projected = fvCurrent + fvAnnuity
      const invested  = currentValue + monthly * months
      points.push({
        year:      `${y} an${y > 1 ? 's' : ''}`,
        projected: Math.round(projected),
        invested:  Math.round(invested),
      })
    }
    return points
  }, [currentValue, horizon, monthly, rate])

  const finalValue  = data[data.length - 1]?.projected ?? 0
  const totalInvest = data[data.length - 1]?.invested  ?? 0
  const totalGain   = finalValue - totalInvest
  const gainPct     = totalInvest > 0 ? (totalGain / totalInvest) * 100 : 0

  return (
    <Card className="overflow-hidden">
      <div className="px-4 pt-4 pb-0 sm:px-6 sm:pt-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-accent" />
          <p className="text-sm font-semibold text-text-primary">Projection patrimoniale</p>
        </div>

        {/* Result highlight */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-surface-2 rounded-xl p-3">
            <p className="text-[10px] text-text-muted mb-0.5">Dans {horizon} ans</p>
            <p className="text-sm font-bold text-text-primary font-mono leading-tight">
              {formatCurrency(finalValue, 'EUR', true)}
            </p>
          </div>
          <div className="bg-surface-2 rounded-xl p-3">
            <p className="text-[10px] text-text-muted mb-0.5">Total investi</p>
            <p className="text-sm font-bold text-text-secondary font-mono leading-tight">
              {formatCurrency(totalInvest, 'EUR', true)}
            </p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
            <p className="text-[10px] text-emerald-400 mb-0.5">Plus-value</p>
            <p className="text-sm font-bold text-emerald-400 font-mono leading-tight">
              +{gainPct.toFixed(0)}%
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {/* Horizon */}
          <div>
            <p className="text-[10px] text-text-muted mb-1.5">Horizon</p>
            <div className="flex gap-1 bg-surface-2 rounded-xl p-1">
              {PRESETS.map(p => (
                <button
                  key={p.years}
                  onClick={() => setHorizon(p.years)}
                  className={cn(
                    'flex-1 py-1.5 text-xs rounded-lg font-medium transition-all',
                    horizon === p.years
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-text-muted hover:text-text-primary'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rate */}
          <div>
            <p className="text-[10px] text-text-muted mb-1.5">Rendement annuel</p>
            <div className="flex gap-1 bg-surface-2 rounded-xl p-1">
              {RATE_PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => setRateKey(p.label)}
                  className={cn(
                    'flex-1 py-1.5 text-[10px] rounded-lg font-medium transition-all',
                    rateKey === p.label
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-text-muted hover:text-text-primary'
                  )}
                >
                  {p.label === 'Custom' ? `${customRate}%` : p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Custom rate slider */}
        {rateKey === 'Custom' && (
          <div className="mb-4">
            <div className="flex justify-between text-[10px] text-text-muted mb-1">
              <span>Taux personnalisé</span>
              <span className="font-mono font-bold text-accent">{customRate}% / an</span>
            </div>
            <input
              type="range" min={1} max={20} step={0.5}
              value={customRate}
              onChange={e => setCustomRate(Number(e.target.value))}
              className="w-full accent-accent h-1.5 rounded-full cursor-pointer"
            />
          </div>
        )}

        {/* Monthly contribution slider */}
        <div className="mb-4">
          <div className="flex justify-between text-[10px] text-text-muted mb-1">
            <span>Épargne mensuelle</span>
            <span className="font-mono font-bold text-accent">{formatCurrency(monthly, 'EUR', true)} / mois</span>
          </div>
          <input
            type="range" min={0} max={3000} step={50}
            value={monthly}
            onChange={e => setMonthly(Number(e.target.value))}
            className="w-full accent-accent h-1.5 rounded-full cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-text-muted mt-0.5">
            <span>0€</span>
            <span>3 000€</span>
          </div>
        </div>
      </div>

      <CardContent className="px-2 pt-0 pb-4">
        <div className="h-44 sm:h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#C9A84C" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#C9A84C" stopOpacity={0}    />
                </linearGradient>
                <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
              <XAxis
                dataKey="year"
                axisLine={false} tickLine={false}
                tick={{ fill: '#71717A', fontSize: 10 }}
              />
              <YAxis
                axisLine={false} tickLine={false}
                tick={{ fill: '#71717A', fontSize: 10 }}
                tickFormatter={v => formatCurrency(v, 'EUR', true)}
                width={64}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone" dataKey="invested"
                stroke="#3B82F6" strokeWidth={1.5}
                fill="url(#invGrad)" dot={false}
                strokeDasharray="4 3"
              />
              <Area
                type="monotone" dataKey="projected"
                stroke="#C9A84C" strokeWidth={2.5}
                fill="url(#projGrad)" dot={false}
                activeDot={{ r: 4, fill: '#C9A84C', stroke: '#09090B', strokeWidth: 2 }}
                animationDuration={400}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 justify-center mt-2">
          <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
            <span className="w-5 h-px border-t-2 border-dashed border-blue-400 inline-block" />
            Capital investi
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
            <span className="w-5 h-0.5 bg-accent inline-block rounded-full" />
            Patrimoine projeté
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
