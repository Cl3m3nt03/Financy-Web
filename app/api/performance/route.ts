import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/mobile-auth'
import { prisma } from '@/lib/db'

// Fetch index data from Yahoo Finance
async function fetchIndexHistory(symbol: string, months = 24): Promise<Array<{ date: string; value: number }>> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1mo&range=${months}mo`,
      { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' }, next: { revalidate: 3600 } }
    )
    if (!res.ok) return []
    const data = await res.json()
    const result = data?.chart?.result?.[0]
    if (!result) return []

    const timestamps: number[] = result.timestamp ?? []
    const closes: number[] = result.indicators?.adjclose?.[0]?.adjclose ?? result.indicators?.quote?.[0]?.close ?? []
    const base = closes[0] ?? 1

    return timestamps.map((ts, i) => ({
      date:  new Date(ts * 1000).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
      value: closes[i] != null ? ((closes[i] - base) / base) * 100 : 0,
    }))
  } catch {
    return []
  }
}

export async function GET(req: NextRequest) {
  const _u = await getUser(req)
  if (!_u) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = _u.id

  const { searchParams } = new URL(req.url)
  const months = parseInt(searchParams.get('months') ?? '24')

  // Get portfolio snapshots
  const since = new Date()
  since.setMonth(since.getMonth() - months)

  const snapshots = await prisma.portfolioSnapshot.findMany({
    where: { userId, date: { gte: since } },
    orderBy: { date: 'asc' },
  })

  // Group by month
  const monthlyMap = new Map<string, number>()
  for (const s of snapshots) {
    const key = new Date(s.date).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
    monthlyMap.set(key, s.totalValue)
  }
  const portfolioHistory = Array.from(monthlyMap.entries()).map(([date, value]) => ({ date, value }))

  // Normalize portfolio to % change from first point
  const baseValue = portfolioHistory[0]?.value ?? 1
  const portfolioPerf = portfolioHistory.map(p => ({
    date:  p.date,
    value: ((p.value - baseValue) / baseValue) * 100,
  }))

  // Fetch indices in parallel
  const [cac40, sp500, msciWorld] = await Promise.all([
    fetchIndexHistory('^FCHI', months),
    fetchIndexHistory('^GSPC', months),
    fetchIndexHistory('IWDA.AS', months),
  ])

  return NextResponse.json({ portfolio: portfolioPerf, cac40, sp500, msciWorld })
}
