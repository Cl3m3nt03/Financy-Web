'use client'

import { useMemo } from 'react'
import { formatCurrency, cn } from '@/lib/utils'
import { Trophy } from 'lucide-react'

const MILESTONES = [
  { value: 1_000,     label: '1 000 €',       emoji: '🌱' },
  { value: 5_000,     label: '5 000 €',       emoji: '💡' },
  { value: 10_000,    label: '10 000 €',      emoji: '⭐' },
  { value: 25_000,    label: '25 000 €',      emoji: '🔥' },
  { value: 50_000,    label: '50 000 €',      emoji: '💎' },
  { value: 100_000,   label: '100 000 €',     emoji: '🏆' },
  { value: 250_000,   label: '250 000 €',     emoji: '🦁' },
  { value: 500_000,   label: '500 000 €',     emoji: '🚀' },
  { value: 1_000_000, label: '1 000 000 €',   emoji: '👑' },
]

interface Props {
  totalWealth: number
}

export function Milestones({ totalWealth }: Props) {
  const { achieved, next } = useMemo(() => {
    const achieved = MILESTONES.filter(m => totalWealth >= m.value)
    const next     = MILESTONES.find(m => totalWealth < m.value) ?? null
    return { achieved, next }
  }, [totalWealth])

  const lastAchieved = achieved[achieved.length - 1] ?? null
  const progressPct  = next && lastAchieved
    ? Math.min(((totalWealth - lastAchieved.value) / (next.value - lastAchieved.value)) * 100, 100)
    : next
    ? Math.min((totalWealth / next.value) * 100, 100)
    : 100

  return (
    <div className="space-y-4">
      {/* Current level */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium text-text-primary">
            {lastAchieved
              ? `Niveau ${achieved.length} — ${lastAchieved.emoji} ${lastAchieved.label}`
              : 'Commencez votre parcours'}
          </span>
        </div>
        <span className="text-xs text-text-muted font-mono">{formatCurrency(totalWealth, 'EUR', true)}</span>
      </div>

      {/* Progress to next milestone */}
      {next && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-text-muted">
            <span>Prochain : {next.emoji} {next.label}</span>
            <span>{progressPct.toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-text-muted">
            Plus que{' '}
            <span className="text-text-secondary font-mono font-medium">
              {formatCurrency(next.value - totalWealth, 'EUR', true)}
            </span>{' '}
            pour atteindre {next.label}
          </p>
        </div>
      )}

      {next === null && (
        <p className="text-xs text-accent font-medium">
          Félicitations, vous avez atteint tous les paliers ! 👑
        </p>
      )}

      {/* Milestone badges */}
      <div className="flex flex-wrap gap-2 pt-1">
        {MILESTONES.map(m => {
          const done = totalWealth >= m.value
          return (
            <div
              key={m.value}
              title={m.label}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border transition-all',
                done
                  ? 'bg-accent/10 border-accent/30 text-accent'
                  : 'bg-surface-2 border-border text-text-muted opacity-50'
              )}
            >
              <span>{m.emoji}</span>
              <span className="hidden sm:inline">{m.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
