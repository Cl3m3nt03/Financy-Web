import { NextResponse } from 'next/server'

// Open Exchange Rates (free, no key) — base EUR
export async function GET() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/EUR', {
      next: { revalidate: 3600 }, // cache 1h
    })
    if (!res.ok) throw new Error('Exchange rates fetch failed')
    const data = await res.json()

    // Return only relevant rates
    const CURRENCIES = ['USD', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'BTC', 'ETH']
    const rates: Record<string, number> = { EUR: 1 }
    for (const c of CURRENCIES) {
      if (data.rates[c]) rates[c] = data.rates[c]
    }

    return NextResponse.json({ base: 'EUR', rates, updated: data.time_last_update_utc })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch exchange rates' }, { status: 500 })
  }
}
