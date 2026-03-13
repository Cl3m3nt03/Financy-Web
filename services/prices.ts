import { PriceData } from '@/types'
import { MOCK_PRICES } from './mock-data'

const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_API_KEY
const COINGECKO_KEY = process.env.COINGECKO_API_KEY

export async function getStockPrice(symbol: string): Promise<PriceData | null> {
  if (!ALPHA_VANTAGE_KEY) {
    return MOCK_PRICES.find(p => p.symbol === symbol) ?? null
  }

  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`
    const res = await fetch(url, { next: { revalidate: 300 } })
    const data = await res.json()
    const quote = data['Global Quote']

    if (!quote || !quote['05. price']) return null

    const price = parseFloat(quote['05. price'])
    const change = parseFloat(quote['09. change'])
    const changePercent = parseFloat(quote['10. change percent'].replace('%', ''))

    return { symbol, price, change24h: change, changePercent24h: changePercent }
  } catch {
    return MOCK_PRICES.find(p => p.symbol === symbol) ?? null
  }
}

export async function getCryptoPrice(coinId: string): Promise<PriceData | null> {
  try {
    const headers: Record<string, string> = { 'Accept': 'application/json' }
    if (COINGECKO_KEY) headers['x-cg-demo-api-key'] = COINGECKO_KEY

    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=eur&include_24hr_change=true`,
      { headers, next: { revalidate: 60 } }
    )
    const data = await res.json()
    const coinData = data[coinId]

    if (!coinData) return null

    const price = coinData.eur
    const changePercent = coinData.eur_24h_change
    const change = (price * changePercent) / 100

    const symbolMap: Record<string, string> = {
      bitcoin: 'BTC',
      ethereum: 'ETH',
      solana: 'SOL',
    }

    return {
      symbol: symbolMap[coinId] ?? coinId.toUpperCase(),
      price,
      change24h: change,
      changePercent24h: changePercent,
    }
  } catch {
    return MOCK_PRICES.find(p => p.symbol === coinId.toUpperCase()) ?? null
  }
}

const COIN_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  BNB: 'binancecoin',
  ADA: 'cardano',
  XRP: 'ripple',
}

export function getCoinId(symbol: string): string {
  return COIN_IDS[symbol.toUpperCase()] ?? symbol.toLowerCase()
}
