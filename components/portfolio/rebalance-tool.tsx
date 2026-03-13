'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { formatCurrency, getAssetTypeLabel, cn } from '@/lib/utils'
import { RefreshCw, Loader2, TrendingUp, TrendingDown } from 'lucide-react'

const DEFAULT_TARGETS: Record<string, number> = {
  STOCK: 30, PEA: 20, CTO: 10, CRYPTO: 10,
  SAVINGS: 15, BANK_ACCOUNT: 10, REAL_ESTATE: 5, OTHER: 0,
}

interface Suggestion {
  type: string; currentValue: number; currentPct: number
  targetPct: number; targetValue: number; delta: number; deltaPct: number
}

interface RebalanceResult {
  totalValue: number; sumTargets: number; suggestions: Suggestion[]
}

export function RebalanceTool() {
  const [targets, setTargets] = useState<Record<string, number>>(DEFAULT_TARGETS)
  const [result, setResult] = useState<RebalanceResult | null>(null)

  const sumTargets = Object.values(targets).reduce((s, v) => s + v, 0)

  const calc = useMutation({
    mutationFn: () =>
      fetch('/api/rebalance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targets }),
      }).then(r => r.json()),
    onSuccess: setResult,
  })

  const TYPES = Object.keys(DEFAULT_TARGETS)

  return (
    <div className="space-y-5">
      {/* Target sliders */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        {TYPES.map(type => (
          <div key={type} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-text-secondary font-medium">{getAssetTypeLabel(type)}</span>
              <span className="text-text-primary font-mono">{targets[type] ?? 0}%</span>
            </div>
            <input type="range" min="0" max="100" step="5"
              value={targets[type] ?? 0}
              onChange={e => setTargets(t => ({ ...t, [type]: Number(e.target.value) }))}
              className="w-full accent-[#C9A84C]" />
          </div>
        ))}
      </div>

      {/* Total */}
      <div className={cn('text-center text-sm font-medium', sumTargets !== 100 ? 'text-red-400' : 'text-emerald-400')}>
        Total : {sumTargets}% {sumTargets !== 100 && '(doit être égal à 100%)'}
      </div>

      <button onClick={() => calc.mutate()} disabled={calc.isPending || sumTargets !== 100}
        className="w-full py-2.5 bg-accent hover:bg-accent-dark disabled:opacity-40 text-background rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
        {calc.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        Calculer le rééquilibrage
      </button>

      {/* Suggestions */}
      {result && result.suggestions.length > 0 && (
        <div className="space-y-2 pt-2">
          <p className="text-text-secondary text-sm font-medium">Ajustements recommandés</p>
          {result.suggestions.map(s => (
            <div key={s.type} className={cn(
              'flex items-center justify-between px-4 py-3 rounded-xl border',
              s.delta > 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'
            )}>
              <div>
                <p className="text-text-primary text-sm font-medium">{getAssetTypeLabel(s.type)}</p>
                <p className="text-text-muted text-xs">{s.currentPct.toFixed(1)}% → {s.targetPct}%</p>
              </div>
              <div className="text-right">
                <p className={cn('font-mono font-semibold text-sm', s.delta > 0 ? 'text-emerald-400' : 'text-red-400')}>
                  {s.delta > 0 ? '+' : ''}{formatCurrency(s.delta)}
                </p>
                <p className="text-text-muted text-xs">
                  {s.delta > 0 ? <TrendingUp className="inline w-3 h-3" /> : <TrendingDown className="inline w-3 h-3" />}
                  {' '}{s.deltaPct > 0 ? '+' : ''}{s.deltaPct.toFixed(1)} pts
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
      {result && result.suggestions.length === 0 && (
        <p className="text-emerald-400 text-sm text-center py-2">✓ Portefeuille déjà équilibré !</p>
      )}
    </div>
  )
}
