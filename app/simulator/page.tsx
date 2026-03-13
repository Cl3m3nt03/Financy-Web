'use client'

import { useState, useMemo } from 'react'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, cn } from '@/lib/utils'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, Info } from 'lucide-react'

// Vf = Vi × (1 + ρ/n)^(n×t)  +  versements périodiques
function compound(
  Vi: number,      // capital initial
  monthly: number, // versement mensuel
  rho: number,     // taux annuel en %
  t: number,       // durée en années
  n: number,       // fréquence de capitalisation par an
): Array<{ year: number; value: number; invested: number }> {
  const rate = rho / 100
  const points: Array<{ year: number; value: number; invested: number }> = []

  for (let y = 0; y <= t; y++) {
    // Vf = Vi × (1 + ρ/n)^(n×y)
    const capitalGrowth = Vi * Math.pow(1 + rate / n, n * y)

    // Versements : chaque versement mensuel croît comme (1 + ρ/n)^(n×temps_restant)
    // On approche avec n capitalisations par an et 12 versements/an
    let versementsValue = 0
    const totalMonths = y * 12
    for (let m = 0; m < totalMonths; m++) {
      const yearsRemaining = (totalMonths - m) / 12
      versementsValue += monthly * Math.pow(1 + rate / n, n * yearsRemaining)
    }

    const Vf = capitalGrowth + versementsValue
    points.push({
      year: y,
      value: Math.round(Vf),
      invested: Math.round(Vi + monthly * 12 * y),
    })
  }
  return points
}

const PRESETS = [
  { label: 'Livret A',     rate: 3,    n: 1  },
  { label: 'Fonds euro',   rate: 2.5,  n: 1  },
  { label: 'ETF World',    rate: 8,    n: 12 },
  { label: 'S&P 500',      rate: 10,   n: 12 },
  { label: 'Immo locatif', rate: 5,    n: 1  },
]

const FREQUENCIES = [
  { value: 1,   label: 'Annuelle'      },
  { value: 4,   label: 'Trimestrielle' },
  { value: 12,  label: 'Mensuelle'     },
  { value: 365, label: 'Quotidienne'   },
]

export default function SimulatorPage() {
  const [Vi,      setVi]      = useState(10000)
  const [monthly, setMonthly] = useState(300)
  const [rho,     setRho]     = useState(8)
  const [years,   setYears]   = useState(20)
  const [n,       setN]       = useState(12)

  const data = useMemo(
    () => compound(Vi, monthly, rho, years, n),
    [Vi, monthly, rho, years, n]
  )

  const final        = data[data.length - 1]
  const totalInvested = Vi + monthly * 12 * years
  const gains         = (final?.value ?? 0) - totalInvested
  const multiplier    = final?.value ? final.value / Math.max(Vi + monthly * 12, 1) : 1

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Simulateur" subtitle="Projection avec la formule Vf = Vi × (1 + ρ/n)^(n×t)" />

      <div className="flex-1 p-6 space-y-6 max-w-4xl">

        {/* Formule */}
        <Card className="border-accent/20 bg-accent/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="text-accent font-mono text-sm font-semibold mb-1">
                  Vf = Vi &times; (1 + &rho;/n)^(n&times;t)
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-6 gap-y-1 text-xs text-text-muted mt-2">
                  <span><span className="text-text-primary font-mono">Vf</span> — valeur finale</span>
                  <span><span className="text-text-primary font-mono">Vi</span> — capital initial</span>
                  <span><span className="text-text-primary font-mono">&rho;</span> — taux annuel</span>
                  <span><span className="text-text-primary font-mono">n</span> — fr&eacute;quence capitalisation</span>
                  <span><span className="text-text-primary font-mono">t</span> — dur&eacute;e (ann&eacute;es)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Presets */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-text-muted text-xs">Pr&eacute;d&eacute;finis :</span>
          {PRESETS.map(p => (
            <button key={p.label}
              onClick={() => { setRho(p.rate); setN(p.n) }}
              className={cn(
                'text-xs px-3 py-1.5 rounded-xl border transition-colors font-medium',
                rho === p.rate && n === p.n
                  ? 'bg-accent/10 border-accent text-accent'
                  : 'border-border text-text-muted hover:border-accent/40 hover:text-text-primary'
              )}>
              {p.label} &mdash; {p.rate}%
            </button>
          ))}
        </div>

        {/* Controls */}
        <Card>
          <CardContent className="pt-5 space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
              {[
                { label: 'Vi — Capital initial (€)',    value: Vi,      set: setVi,      min: 0,   max: 500000, step: 500  },
                { label: 'Versement mensuel (€)',        value: monthly, set: setMonthly, min: 0,   max: 10000,  step: 50   },
                { label: 'ρ — Taux annuel (%)',          value: rho,     set: setRho,     min: 0,   max: 30,     step: 0.5  },
                { label: 't — Durée (années)',           value: years,   set: setYears,   min: 1,   max: 50,     step: 1    },
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
            </div>

            {/* Frequency n */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">
                n — Fr&eacute;quence de capitalisation par an
              </label>
              <div className="flex gap-2">
                {FREQUENCIES.map(f => (
                  <button key={f.value} onClick={() => setN(f.value)}
                    className={cn(
                      'flex-1 py-2 rounded-xl text-xs font-medium border transition-colors',
                      n === f.value
                        ? 'bg-accent/10 border-accent text-accent'
                        : 'border-border text-text-muted hover:border-accent/40 hover:text-text-primary'
                    )}>
                    {f.label}<br />
                    <span className="font-mono text-xs opacity-70">n={f.value}</span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-accent/30 bg-accent/5">
            <CardContent className="pt-5">
              <p className="text-text-muted text-xs mb-1">Vf — Valeur finale</p>
              <p className="text-2xl font-bold font-mono text-accent">{formatCurrency(final?.value ?? 0)}</p>
              <p className="text-text-muted text-xs mt-1">&times;{multiplier.toFixed(1)} votre investissement total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-text-muted text-xs mb-1">Capital investi</p>
              <p className="text-2xl font-bold font-mono text-text-primary">{formatCurrency(totalInvested)}</p>
              <p className="text-text-muted text-xs mt-1">{formatCurrency(Vi)} + {monthly}&nbsp;&euro;/mois</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-text-muted text-xs mb-1">Int&eacute;r&ecirc;ts composés</p>
              <p className="text-2xl font-bold font-mono text-emerald-400">+{formatCurrency(gains)}</p>
              <p className="text-text-muted text-xs mt-1">
                {totalInvested > 0 ? ((gains / totalInvested) * 100).toFixed(1) : '0'}% de rendement total
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-4 h-4 text-accent" />
              Projection sur {years} ans &mdash; capitalisation {FREQUENCIES.find(f => f.value === n)?.label.toLowerCase()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="simVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#C9A84C" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#C9A84C" stopOpacity={0}    />
                  </linearGradient>
                  <linearGradient id="simInv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6B7280" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6B7280" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <XAxis dataKey="year" tickFormatter={v => `${v}a`}
                  tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                  tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} width={45} />
                <Tooltip
                  contentStyle={{ background: '#1C1C1E', border: '1px solid #2C2C2E', borderRadius: 12 }}
                  labelStyle={{ color: '#A1A1AA' }}
                  formatter={(val: number, name: string) => [
                    formatCurrency(val),
                    name === 'value' ? 'Vf (valeur)' : 'Investi',
                  ]}
                  labelFormatter={v => `Ann\u00e9e ${v}`}
                />
                <Area type="monotone" dataKey="invested" stroke="#6B7280" strokeWidth={1.5}
                  fill="url(#simInv)" strokeDasharray="4 4" dot={false} />
                <Area type="monotone" dataKey="value"    stroke="#C9A84C" strokeWidth={2.5}
                  fill="url(#simVal)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
            <p className="text-text-muted text-xs text-center mt-3">
              Zone dor&eacute;e = int&eacute;r&ecirc;ts compos&eacute;s &mdash; zone grise = capital investi
            </p>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
