import { NextRequest, NextResponse } from 'next/server'

// Yahoo Finance public API — no key required
async function fetchYahooHistory(symbol: string, range: string): Promise<{ date: string; close: number }[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1mo&range=${range}&includeAdjustedClose=true`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    next: { revalidate: 3600 }, // cache 1h
  })
  if (!res.ok) throw new Error(`Yahoo Finance error for ${symbol}`)
  const data = await res.json()
  const result = data?.chart?.result?.[0]
  if (!result) throw new Error('No data')
  const timestamps: number[] = result.timestamp ?? []
  const closes: number[] = result.indicators?.adjclose?.[0]?.adjclose ?? result.indicators?.quote?.[0]?.close ?? []
  return timestamps.map((ts, i) => ({
    date: new Date(ts * 1000).toISOString().slice(0, 7), // YYYY-MM
    close: closes[i] ?? 0,
  })).filter(d => d.close > 0)
}

export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get('range') ?? '2y'

  const INDICES = [
    { id: 'sp500',  symbol: 'SPY',     label: 'S&P 500'   },
    { id: 'cac40',  symbol: '^FCHI',   label: 'CAC 40'    },
    { id: 'world',  symbol: 'IWDA.AS', label: 'MSCI World' },
  ]

  const results = await Promise.allSettled(
    INDICES.map(async idx => {
      const history = await fetchYahooHistory(idx.symbol, range)
      // Normalize to 100 at first point
      const first = history[0]?.close ?? 1
      return {
        id:    idx.id,
        label: idx.label,
        data:  history.map(d => ({ date: d.date, value: (d.close / first) * 100 })),
      }
    })
  )

  const indices = results
    .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
    .map(r => r.value)

  return NextResponse.json(indices)
}
