'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Trash2, Target, Calendar, TrendingUp, Sparkles } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { usePortfolioStats } from '@/hooks/use-portfolio'
import { MOCK_PORTFOLIO_STATS } from '@/services/mock-data'

interface Goal {
  id: string
  name: string
  targetValue: number
  currency: string
  targetDate: string | null
  notes: string | null
}

async function fetchGoals(): Promise<Goal[]> {
  const res = await fetch('/api/goals')
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

async function createGoal(data: Partial<Goal>): Promise<Goal> {
  const res = await fetch('/api/goals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

async function deleteGoal(id: string) {
  await fetch(`/api/goals/${id}`, { method: 'DELETE' })
}

export default function GoalsPage() {
  const queryClient = useQueryClient()
  const { data: goals = [], isLoading } = useQuery({ queryKey: ['goals'], queryFn: fetchGoals })
  const { data: stats } = usePortfolioStats()
  const totalValue = (stats ?? MOCK_PORTFOLIO_STATS).totalValue

  const createMutation = useMutation({
    mutationFn: createGoal,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  })
  const deleteMutation = useMutation({
    mutationFn: deleteGoal,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  })

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', targetValue: '', targetDate: '', notes: '' })

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    await createMutation.mutateAsync({
      name: form.name,
      targetValue: parseFloat(form.targetValue),
      currency: 'EUR',
      targetDate: form.targetDate ? new Date(form.targetDate).toISOString() : null,
      notes: form.notes || null,
    } as any)
    setForm({ name: '', targetValue: '', targetDate: '', notes: '' })
    setShowForm(false)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Objectifs" subtitle="Jalons patrimoniaux et projections" />

      <div className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-text-muted text-sm">Patrimoine actuel</p>
            <p className="text-2xl font-bold text-text-primary font-mono">{formatCurrency(totalValue)}</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-accent hover:bg-accent-dark text-obsidian px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouvel objectif
          </button>
        </div>

        {/* Goals list */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {goals.map(goal => {
            const progress = Math.min((totalValue / goal.targetValue) * 100, 100)
            const remaining = goal.targetValue - totalValue
            const isReached = totalValue >= goal.targetValue
            const daysLeft = goal.targetDate
              ? Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / 86400000)
              : null

            return (
              <Card key={goal.id} className={cn('hover:border-zinc-700 transition-colors', isReached && 'border-emerald-500/30')}>
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', isReached ? 'bg-emerald-500/10 text-emerald-400' : 'bg-accent/10 text-accent')}>
                        <Target className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-text-primary font-semibold text-sm">{goal.name}</p>
                        {daysLeft !== null && (
                          <p className={cn('text-xs', daysLeft < 0 ? 'text-red-400' : 'text-text-muted')}>
                            {daysLeft < 0 ? `Expiré` : `${daysLeft}j restants`}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteMutation.mutate(goal.id)}
                      className="text-text-muted hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-text-muted mb-1.5">
                      <span>{progress.toFixed(1)}% atteint</span>
                      <span>{formatCurrency(goal.targetValue, goal.currency, true)}</span>
                    </div>
                    <div className="w-full h-2 bg-surface-2 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', isReached ? 'bg-emerald-400' : 'bg-accent')}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-muted">Reste à atteindre</span>
                    <span className={cn('font-semibold font-mono', isReached ? 'text-emerald-400' : 'text-text-primary')}>
                      {isReached ? '✓ Objectif atteint !' : formatCurrency(remaining, goal.currency, true)}
                    </span>
                  </div>

                  {/* Monthly savings calculator */}
                  {!isReached && daysLeft !== null && daysLeft > 0 && (() => {
                    const months = Math.max(1, Math.round(daysLeft / 30))
                    const r = 0.07 / 12 // 7% annuel
                    const pv = totalValue
                    const fv = goal.targetValue
                    const rn = Math.pow(1 + r, months)
                    const pmt = r > 0 ? (fv - pv * rn) * r / (rn - 1) : (fv - pv) / months
                    if (pmt <= 0) return null
                    return (
                      <div className="mt-3 pt-3 border-t border-border flex items-start gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                        <p className="text-xs text-text-muted leading-relaxed">
                          À 7%/an, épargnez{' '}
                          <span className="font-semibold text-accent font-mono">{formatCurrency(pmt, goal.currency, true)}/mois</span>
                          {' '}pour atteindre cet objectif en {months} mois.
                        </p>
                      </div>
                    )
                  })()}

                  {goal.notes && (
                    <p className="text-text-muted text-xs mt-3 pt-3 border-t border-border">{goal.notes}</p>
                  )}
                </CardContent>
              </Card>
            )
          })}

          {goals.length === 0 && !isLoading && (
            <div className="col-span-3 flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
                <Target className="w-7 h-7 text-text-muted" />
              </div>
              <p className="text-text-primary font-semibold mb-2">Aucun objectif défini</p>
              <p className="text-text-muted text-sm">Fixez-vous des jalons : 100k€, retraite anticipée, achat immobilier...</p>
            </div>
          )}
        </div>
      </div>

      {/* Create form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <h2 className="text-lg font-semibold text-text-primary">Nouvel objectif</h2>
              <button onClick={() => setShowForm(false)} className="text-text-muted hover:text-text-primary">✕</button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Nom de l&apos;objectif</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent"
                  placeholder="Retraite à 45 ans, 500k€..." required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Montant cible (€)</label>
                  <input type="number" value={form.targetValue} onChange={e => setForm(f => ({ ...f, targetValue: e.target.value }))}
                    className="w-full bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent font-mono"
                    placeholder="500000" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Date cible</label>
                  <input type="date" value={form.targetDate} onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))}
                    className="w-full bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Notes (optionnel)</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent resize-none" rows={2}
                  placeholder="Épargne mensuelle de 2000€..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-text-secondary hover:text-text-primary text-sm font-medium transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={createMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-accent hover:bg-accent-dark disabled:opacity-50 text-obsidian text-sm font-semibold transition-colors">
                  {createMutation.isPending ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
