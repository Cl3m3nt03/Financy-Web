import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol')
  const range  = req.nextUrl.searchParams.get('range') ?? '1mo'
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 })

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${range}&includeAdjustedClose=true`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return NextResponse.json({ prices: [] })

    const data = await res.json()
    const result = data?.chart?.result?.[0]
    if (!result) return NextResponse.json({ prices: [] })

    const timestamps: number[] = result.timestamp ?? []
    const closes: number[] = result.indicators?.adjclose?.[0]?.adjclose ?? result.indicators?.quote?.[0]?.close ?? []

    const prices = timestamps
      .map((ts, i) => closes[i] ?? null)
      .filter((v): v is number => v !== null && v > 0)

    return NextResponse.json({ prices })
  } catch {
    return NextResponse.json({ prices: [] })
  }
}
