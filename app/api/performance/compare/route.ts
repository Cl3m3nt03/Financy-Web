import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

const BENCHMARKS: Record<string, string> = {
  'CW8.PA':  'Amundi MSCI World',
  'SPY5.PA': 'S&P 500',
  'PANX.PA': 'Nasdaq 100',
}

async function fetchDailyHistory(symbol: string, range: string): Promise<{ ts: number; close: number }[]> {
  const hosts = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com']
  for (const host of hosts) {
    try {
      const res = await fetch(
        `https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${range}`,
        { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' }, cache: 'no-store' }
      )
      if (!res.ok) continue
      const data = await res.json()
      const result = data?.chart?.result?.[0]
      if (!result) continue

      const timestamps: number[] = result.timestamp ?? []
      const closes: number[] = result.indicators?.adjclose?.[0]?.adjclose
        ?? result.indicators?.quote?.[0]?.close
        ?? []

      return timestamps
        .map((ts, i) => ({ ts: ts * 1000, close: closes[i] }))
        .filter(p => p.close != null && p.close > 0)
    } catch { continue }
  }
  return []
}

function normalize(
  series: { ts: number; close: number }[],
  sinceMs: number,
  amount: number,
): { date: string; value: number }[] {
  // Find closest point at or after sinceMs
  const startIdx = series.findIndex(p => p.ts >= sinceMs)
  if (startIdx === -1) return []
  const basePrice = series[startIdx].close
  if (!basePrice) return []

  return series.slice(startIdx).map(p => ({
    date:  new Date(p.ts).toISOString().slice(0, 10),
    value: Math.round(((p.close / basePrice) * amount) * 100) / 100,
  }))
}

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol')
  const since  = searchParams.get('since')   // ISO date string e.g. "2024-03-15"
  const amount = parseFloat(searchParams.get('amount') ?? '1000')

  if (!symbol || !since) {
    return NextResponse.json({ error: 'symbol and since required' }, { status: 400 })
  }

  const sinceMs   = new Date(since).getTime()
  const nowMs     = Date.now()
  const daysSince = (nowMs - sinceMs) / (1000 * 60 * 60 * 24)

  // Pick Yahoo Finance range based on how old the purchase is
  const range = daysSince <= 90  ? '3mo'
              : daysSince <= 180 ? '6mo'
              : daysSince <= 365 ? '1y'
              : daysSince <= 730 ? '2y'
              : '5y'

  // Fetch all symbols in parallel
  const symbols = [symbol, ...Object.keys(BENCHMARKS)]
  const allSeries = await Promise.all(symbols.map(s => fetchDailyHistory(s, range)))

  const result: Record<string, { label: string; data: { date: string; value: number }[] }> = {}

  for (let i = 0; i < symbols.length; i++) {
    const sym   = symbols[i]
    const label = i === 0 ? sym : BENCHMARKS[sym]
    const norm  = normalize(allSeries[i], sinceMs, amount)
    if (norm.length > 0) {
      result[sym] = { label, data: norm }
    }
  }

  return NextResponse.json(result)
}
