import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/mobile-auth'
import { AssetBreakdown, PortfolioStats } from '@/types'
import { MOCK_PORTFOLIO_STATS } from '@/services/mock-data'
import { getStockPrice, getCryptoPrice, getCoinId } from '@/services/prices'

const CRYPTO_SYMBOLS = new Set(['BTC', 'ETH', 'SOL', 'BNB', 'ADA', 'XRP', 'MATIC', 'DOT', 'AVAX', 'LINK'])
const FINANCIAL_TYPES = new Set(['STOCK', 'CRYPTO', 'PEA', 'CTO'])

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = user.id
  const assets = await prisma.asset.findMany({ where: { userId }, include: { holdings: true } })

  if (assets.length === 0) {
    return NextResponse.json(MOCK_PORTFOLIO_STATS)
  }

  // Fetch live prices for financial assets with holdings
  const financialAssets = assets.filter(a => FINANCIAL_TYPES.has(a.type) && a.holdings.length > 0)
  const priceMap: Record<string, number> = {}
  if (financialAssets.length > 0) {
    const allSymbols = Array.from(new Set(financialAssets.flatMap(a => a.holdings.map(h => h.symbol))))
    const priceResults = await Promise.all(
      allSymbols.map(sym =>
        CRYPTO_SYMBOLS.has(sym.toUpperCase())
          ? getCryptoPrice(getCoinId(sym))
          : getStockPrice(sym)
      )
    )
    for (const p of priceResults) {
      if (p) priceMap[p.symbol] = p.price
    }
  }

  const breakdown: AssetBreakdown = {
    BANK_ACCOUNT: 0, SAVINGS: 0, REAL_ESTATE: 0,
    STOCK: 0, CRYPTO: 0, PEA: 0, CTO: 0, OTHER: 0,
  }

  let totalValue = 0
  for (const asset of assets) {
    let value = asset.value
    // Override with live price × quantity for financial assets
    if (FINANCIAL_TYPES.has(asset.type) && asset.holdings.length > 0) {
      const liveValue = asset.holdings.reduce((sum, h) => {
        const price = priceMap[h.symbol] ?? h.avgBuyPrice
        return sum + price * h.quantity
      }, 0)
      if (liveValue > 0) value = liveValue
    }
    totalValue += value
    const key = asset.type as keyof AssetBreakdown
    if (key in breakdown) breakdown[key] += value
    else breakdown.OTHER += value
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
