'use client'

import { useMemo } from 'react'
import { AssetBreakdown } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ShieldCheck, Droplets, TrendingUp, Info } from 'lucide-react'

interface HealthScoreProps {
  breakdown: AssetBreakdown
  totalValue: number
}

interface SubScore {
  label: string
  icon: React.ElementType
  score: number
  max: number
  detail: string
  color: string
}

function computeScores(breakdown: AssetBreakdown, total: number): SubScore[] {
  if (total === 0) return []

  // ── 1. Diversification (0–40) ─────────────────────────────────────────────
  const nonZeroTypes = Object.values(breakdown).filter(v => v > 0).length
  const maxSinglePct = Math.max(...Object.values(breakdown)) / total
  let diversScore = 0
  diversScore += Math.min(nonZeroTypes * 6, 24) // 6 pts par catégorie, max 24
  diversScore += maxSinglePct < 0.5 ? 16 : maxSinglePct < 0.7 ? 8 : 0 // concentration
  diversScore = Math.min(diversScore, 40)

  const diversDetail =
    maxSinglePct > 0.7
      ? 'Patrimoine trop concentré sur une seule classe'
      : nonZeroTypes < 3
      ? 'Peu de catégories d\'actifs'
      : 'Bonne répartition entre catégories'

  // ── 2. Liquidité (0–30) ───────────────────────────────────────────────────
  const liquid = (breakdown.BANK_ACCOUNT ?? 0) + (breakdown.SAVINGS ?? 0)
  const liquidPct = liquid / total
  let liquidScore = 0
  // Idéal : 5–20% en liquidités
  if (liquidPct >= 0.05 && liquidPct <= 0.2) liquidScore = 30
  else if (liquidPct >= 0.02 && liquidPct < 0.05) liquidScore = 18
  else if (liquidPct > 0.2 && liquidPct <= 0.4) liquidScore = 20
  else if (liquidPct < 0.02) liquidScore = 5
  else liquidScore = 10 // > 40% en liquidités = sous-investi

  const liquidDetail =
    liquidPct > 0.4
      ? 'Trop de liquidités, capital sous-investi'
      : liquidPct < 0.05
      ? 'Peu de réserves liquides (urgence)'
      : 'Niveau de liquidités optimal'

  // ── 3. Investissements (0–30) ─────────────────────────────────────────────
  const invested = (breakdown.STOCK ?? 0) + (breakdown.CRYPTO ?? 0) +
                   (breakdown.PEA ?? 0) + (breakdown.CTO ?? 0) +
                   (breakdown.REAL_ESTATE ?? 0)
  const investedPct = invested / total
  let investScore = 0
  if (investedPct >= 0.5) investScore = 30
  else if (investedPct >= 0.3) investScore = 20
  else if (investedPct >= 0.15) investScore = 12
  else investScore = 4

  const investDetail =
    investedPct < 0.15
      ? 'Très peu du patrimoine est investi'
      : investedPct < 0.3
      ? 'Patrimoine peu investi, potentiel de croissance limité'
      : investedPct >= 0.5
      ? 'Excellent ratio d\'investissement'
      : 'Bon niveau d\'investissement'

  return [
    { label: 'Diversification', icon: ShieldCheck, score: diversScore, max: 40, detail: diversDetail, color: '#C9A84C' },
    { label: 'Liquidité',       icon: Droplets,    score: liquidScore, max: 30, detail: liquidDetail, color: '#3B82F6' },
    { label: 'Investissements', icon: TrendingUp,  score: investScore, max: 30, detail: investDetail, color: '#10B981' },
  ]
}

function ScoreRing({ score }: { score: number }) {
  const r = 44
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - score / 100)
  const color =
    score >= 70 ? '#10B981'
    : score >= 45 ? '#F59E0B'
    : '#EF4444'
  const label =
    score >= 70 ? 'Excellent'
    : score >= 45 ? 'À améliorer'
    : 'Attention'

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#27272A" strokeWidth="9" />
          <circle
            cx="50" cy="50" r={r}
            fill="none"
            stroke={color}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-text-primary font-mono leading-none">{score}</span>
          <span className="text-[10px] text-text-muted">/100</span>
        </div>
      </div>
      <span className="text-xs font-semibold" style={{ color }}>{label}</span>
    </div>
  )
}

export function HealthScore({ breakdown, totalValue }: HealthScoreProps) {
  const subScores = useMemo(() => computeScores(breakdown, totalValue), [breakdown, totalValue])
  const total = subScores.reduce((s, x) => s + x.score, 0)

  if (subScores.length === 0) return null

  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-4 h-4 text-accent" />
          <p className="text-sm font-semibold text-text-primary">Score de santé</p>
          <div className="flex-1" />
          <button className="text-text-muted hover:text-text-secondary transition-colors" title="Score calculé sur la diversification, liquidité et niveau d'investissement">
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4">
          <ScoreRing score={total} />

          <div className="w-full space-y-3">
            {subScores.map(s => {
              const Icon = s.icon
              const pct = (s.score / s.max) * 100
              return (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                      <span className="text-xs text-text-secondary font-medium">{s.label}</span>
                    </div>
                    <span className="text-xs font-mono font-semibold text-text-primary">{s.score}/{s.max}</span>
                  </div>
                  <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: s.color }}
                    />
                  </div>
                  <p className="text-[10px] text-text-muted mt-0.5">{s.detail}</p>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
