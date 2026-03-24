'use client'

import { Wallet, TrendingUp, PiggyBank, BarChart3, ArrowUpRight, ArrowDownRight, FileDown } from 'lucide-react'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { StatCard } from '@/components/dashboard/stat-card'
import { AllocationChart } from '@/components/dashboard/allocation-chart'
import { WealthChart } from '@/components/dashboard/wealth-chart'
import { HoldingsTable } from '@/components/dashboard/holdings-table'
import { HealthScore } from '@/components/dashboard/health-score'
import { Onboarding } from '@/components/dashboard/onboarding'
import { SankeyChart } from '@/components/dashboard/sankey-chart'
import { WealthProjection } from '@/components/dashboard/wealth-projection'
import { PassiveIncome } from '@/components/dashboard/passive-income'
import { Milestones } from '@/components/dashboard/milestones'
import { useTransactions } from '@/hooks/use-transactions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePortfolioStats } from '@/hooks/use-portfolio'
import { useAssets } from '@/hooks/use-assets'
import { MOCK_PORTFOLIO_STATS, MOCK_ASSETS } from '@/services/mock-data'
import { formatCurrency, getAssetTypeLabel, getAssetTypeColor, cn } from '@/lib/utils'
import { Holding } from '@/types'

function SkeletonCard() {
  return (
    <div className="bg-surface border border-border rounded-2xl p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 bg-surface-2 rounded-xl" />
        <div className="w-14 h-5 bg-surface-2 rounded-lg" />
      </div>
      <div className="space-y-1.5">
        <div className="w-20 h-2.5 bg-surface-2 rounded" />
        <div className="w-32 h-6 bg-surface-2 rounded" />
      </div>
    </div>
  )
}

function MonthlyDelta({ history }: { history: { date: string; value: number }[] }) {
  if (history.length < 2) return null
  const prev  = history[history.length - 2]?.value ?? 0
  const curr  = history[history.length - 1]?.value ?? 0
  const delta = curr - prev
  const pct   = prev > 0 ? (delta / prev) * 100 : 0
  const isPos = delta >= 0
  const Icon  = isPos ? ArrowUpRight : ArrowDownRight
  return (
    <div className={cn(
      'inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border self-start',
      isPos ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-red-500/5 border-red-500/20 text-red-400'
    )}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>Ce mois&nbsp;: <span className="font-mono font-bold">{isPos ? '+' : ''}{formatCurrency(delta, 'EUR', true)}</span></span>
      <span className="opacity-70">({isPos ? '+' : ''}{pct.toFixed(1)}%)</span>
    </div>
  )
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = usePortfolioStats()
  const { data: assets } = useAssets()
  const { data: transactions } = useTransactions()

  const displayStats = stats ?? MOCK_PORTFOLIO_STATS
  const displayAssets = assets ?? MOCK_ASSETS

  // Gather all holdings
  const allHoldings: Holding[] = displayAssets.flatMap(a => a.holdings ?? [])
  const hasRealAssets = !!assets && assets.length > 0

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Tableau de bord"
        subtitle={today.charAt(0).toUpperCase() + today.slice(1)}
      >
        <Link
          href="/report"
          className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-2 border border-border text-text-secondary hover:text-text-primary hover:bg-surface transition-colors text-xs font-medium"
        >
          <FileDown className="w-3.5 h-3.5" />
          Export PDF
        </Link>
      </Header>

      {/* Onboarding si aucun actif réel */}
      {!statsLoading && !hasRealAssets && <Onboarding />}

      <div className={`flex-1 p-3 sm:p-6 space-y-4 sm:space-y-6 ${!hasRealAssets ? 'hidden' : ''}`}>

        {/* Résumé mensuel */}
        {!statsLoading && <MonthlyDelta history={displayStats.history} />}

        {/* Stat cards — 2×2 mobile, 4 colonnes desktop */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <StatCard
                title="Patrimoine net"
                value={displayStats.totalValue}
                change={displayStats.totalPnlPercent}
                changeLabel={`${displayStats.totalPnl >= 0 ? '+' : ''}${formatCurrency(displayStats.totalPnl)} vs. investi`}
                icon={Wallet}
                iconColor="text-amber-400"
              />
              <StatCard
                title="Montant investi"
                value={displayStats.totalInvested}
                icon={PiggyBank}
                iconColor="text-emerald-400"
                subtitle="Capital déployé"
              />
              <StatCard
                title="Plus-values"
                value={displayStats.totalPnl}
                change={displayStats.totalPnlPercent}
                icon={TrendingUp}
                iconColor={displayStats.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}
                subtitle={`${displayStats.totalPnlPercent.toFixed(2)}% rendement`}
              />
              <StatCard
                title="Bourse + Crypto"
                value={(displayStats.breakdown.STOCK ?? 0) + (displayStats.breakdown.CRYPTO ?? 0) +
                       (displayStats.breakdown.PEA ?? 0) + (displayStats.breakdown.CTO ?? 0)}
                icon={BarChart3}
                iconColor="text-purple-400"
                subtitle="Actifs financiers"
              />
            </>
          )}
        </div>

        {/* Graphique + score de santé + revenus passifs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <WealthChart data={displayStats.history} />
          </div>
          <div className="flex flex-col gap-4">
            <HealthScore breakdown={displayStats.breakdown} totalValue={displayStats.totalValue} />
            <PassiveIncome transactions={transactions ?? []} assets={displayAssets} />
          </div>
        </div>

        {/* Milestones patrimoniaux */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <span>Paliers patrimoniaux</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <Milestones totalWealth={displayStats.totalValue} />
          </CardContent>
        </Card>

        {/* Projection patrimoniale */}
        <WealthProjection currentValue={displayStats.totalValue} />

        {/* Sankey — flux patrimoniaux */}
        <SankeyChart assets={displayAssets} />

        {/* Allocation + actifs + positions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <AllocationChart breakdown={displayStats.breakdown} totalValue={displayStats.totalValue} />

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle>Mes actifs</CardTitle>
                <Link href="/assets" className="text-xs text-accent hover:underline">Tout voir</Link>
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="space-y-3">
                {displayAssets.slice(0, 5).map(asset => (
                  <div key={asset.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-1.5 h-7 rounded-full shrink-0" style={{ backgroundColor: getAssetTypeColor(asset.type) }} />
                      <div className="min-w-0">
                        <p className="text-text-primary text-sm font-medium leading-tight truncate">{asset.name}</p>
                        <p className="text-text-muted text-xs">{getAssetTypeLabel(asset.type)}</p>
                      </div>
                    </div>
                    <span className="text-text-primary font-semibold text-sm font-mono shrink-0 ml-2">
                      {formatCurrency(asset.value, asset.currency, true)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle>Positions ouvertes</CardTitle>
                <span className="text-xs text-text-muted">{allHoldings.length} pos.</span>
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              <HoldingsTable holdings={allHoldings.slice(0, 5)} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
