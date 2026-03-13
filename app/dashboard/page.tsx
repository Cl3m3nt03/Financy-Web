'use client'

import { Wallet, TrendingUp, PiggyBank, BarChart3 } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { StatCard } from '@/components/dashboard/stat-card'
import { AllocationChart } from '@/components/dashboard/allocation-chart'
import { WealthChart } from '@/components/dashboard/wealth-chart'
import { HoldingsTable } from '@/components/dashboard/holdings-table'
import { SankeyChart } from '@/components/dashboard/sankey-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePortfolioStats } from '@/hooks/use-portfolio'
import { useAssets } from '@/hooks/use-assets'
import { MOCK_PORTFOLIO_STATS, MOCK_ASSETS } from '@/services/mock-data'
import { formatCurrency, getAssetTypeLabel, getAssetTypeColor } from '@/lib/utils'
import { Holding } from '@/types'

function SkeletonCard() {
  return (
    <div className="bg-surface border border-border rounded-2xl p-6 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 bg-surface-2 rounded-xl" />
        <div className="w-16 h-6 bg-surface-2 rounded-lg" />
      </div>
      <div className="space-y-2">
        <div className="w-24 h-3 bg-surface-2 rounded" />
        <div className="w-36 h-7 bg-surface-2 rounded" />
        <div className="w-20 h-3 bg-surface-2 rounded" />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = usePortfolioStats()
  const { data: assets } = useAssets()

  const displayStats = stats ?? MOCK_PORTFOLIO_STATS
  const displayAssets = assets ?? MOCK_ASSETS

  // Gather all holdings
  const allHoldings: Holding[] = displayAssets.flatMap(a => a.holdings ?? [])

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Tableau de bord"
        subtitle={today.charAt(0).toUpperCase() + today.slice(1)}
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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
                subtitle="Capital total déployé"
              />
              <StatCard
                title="Plus-values latentes"
                value={displayStats.totalPnl}
                change={displayStats.totalPnlPercent}
                icon={TrendingUp}
                iconColor={displayStats.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}
                subtitle={`${displayStats.totalPnlPercent.toFixed(2)}% de rendement`}
              />
              <StatCard
                title="Actifs financiers"
                value={displayStats.breakdown.STOCK + displayStats.breakdown.CRYPTO}
                icon={BarChart3}
                iconColor="text-purple-400"
                subtitle="Bourse + Crypto"
              />
            </>
          )}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <WealthChart data={displayStats.history} />
          </div>
          <AllocationChart breakdown={displayStats.breakdown} totalValue={displayStats.totalValue} />
        </div>

        {/* Sankey — flux patrimoniaux */}
        <SankeyChart assets={displayAssets} />

        {/* Assets overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Quick assets list */}
          <Card>
            <CardHeader>
              <CardTitle>Mes actifs</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {displayAssets.slice(0, 6).map(asset => (
                  <div key={asset.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className="w-2 h-8 rounded-full shrink-0"
                        style={{ backgroundColor: getAssetTypeColor(asset.type) }}
                      />
                      <div>
                        <p className="text-text-primary text-sm font-medium leading-tight">{asset.name}</p>
                        <p className="text-text-muted text-xs">{getAssetTypeLabel(asset.type)}</p>
                      </div>
                    </div>
                    <span className="text-text-primary font-semibold text-sm font-mono">
                      {formatCurrency(asset.value, asset.currency, true)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Holdings performance */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle>Positions ouvertes</CardTitle>
                  <span className="text-xs text-text-muted">{allHoldings.length} positions</span>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <HoldingsTable holdings={allHoldings.slice(0, 6)} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
