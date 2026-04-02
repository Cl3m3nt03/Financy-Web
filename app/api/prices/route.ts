import { NextRequest, NextResponse } from 'next/server'
import { getStockPrice, getCryptoPrice, getCoinId } from '@/services/prices'
import { MOCK_PRICES } from '@/services/mock-data'
import { PriceData } from '@/types'

export const dynamic = 'force-dynamic'

const CRYPTO_SYMBOLS = new Set(['BTC', 'ETH', 'SOL', 'BNB', 'ADA', 'XRP', 'MATIC', 'DOT', 'AVAX', 'LINK'])

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbolsParam = searchParams.get('symbols')

  if (!symbolsParam) {
    return NextResponse.json(MOCK_PRICES)
  }

  const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase())

  const results = await Promise.all(
    symbols.map(async (symbol): Promise<PriceData | null> => {
      if (CRYPTO_SYMBOLS.has(symbol)) {
        return getCryptoPrice(getCoinId(symbol))
      } else {
        return getStockPrice(symbol)
      }
    })
  )

  const prices = results.filter((p): p is PriceData => p !== null)
  return NextResponse.json(prices)
}
