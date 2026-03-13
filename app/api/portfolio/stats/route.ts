import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { AssetBreakdown, PortfolioStats } from '@/types'
import { MOCK_PORTFOLIO_STATS } from '@/services/mock-data'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id
  const assets = await prisma.asset.findMany({ where: { userId } })

  if (assets.length === 0) {
    return NextResponse.json(MOCK_PORTFOLIO_STATS)
  }

  const breakdown: AssetBreakdown = {
    BANK_ACCOUNT: 0,
    SAVINGS: 0,
    REAL_ESTATE: 0,
    STOCK: 0,
    CRYPTO: 0,
    OTHER: 0,
  }

  let totalValue = 0
  for (const asset of assets) {
    totalValue += asset.value
    const key = asset.type as keyof AssetBreakdown
    if (key in breakdown) breakdown[key] += asset.value
    else breakdown.OTHER += asset.value
  }

  // Auto-snapshot: at most once per day
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const existingSnapshot = await prisma.portfolioSnapshot.findFirst({
    where: { userId, date: { gte: todayStart } },
  })

  if (!existingSnapshot && totalValue > 0) {
    await prisma.portfolioSnapshot.create({
      data: {
        userId,
        totalValue,
        breakdown: JSON.stringify(breakdown),
      },
    }).catch(() => {})
  }

  // Get history (last 24 months)
  const since = new Date()
  since.setMonth(since.getMonth() - 24)

  const snapshots = await prisma.portfolioSnapshot.findMany({
    where: { userId, date: { gte: since } },
    orderBy: { date: 'asc' },
  })

  // Group by month (keep last snapshot per month)
  const monthlyMap = new Map<string, number>()
  for (const s of snapshots) {
    const key = new Date(s.date).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
    monthlyMap.set(key, s.totalValue)
  }

  const history = Array.from(monthlyMap.entries()).map(([date, value]) => ({ date, value }))
  if (history.length === 0 || history[history.length - 1]?.value !== totalValue) {
    history.push({
      date: new Date().toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
      value: totalValue,
    })
  }

  const stats: PortfolioStats = {
    totalValue,
    totalInvested: totalValue,
    totalPnl: 0,
    totalPnlPercent: 0,
    breakdown,
    history,
  }

  return NextResponse.json(stats)
}
