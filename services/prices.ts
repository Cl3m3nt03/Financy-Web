import { PriceData } from '@/types'
import { MOCK_PRICES } from './mock-data'

const COINGECKO_KEY = process.env.COINGECKO_API_KEY

// Alias : symboles incorrects → symboles Yahoo Finance corrects
const SYMBOL_ALIASES: Record<string, string> = {
  'IWPE.PA': 'WPEA.PA', // iShares MSCI World Swap PEA — vrai ticker Yahoo Finance
}

// ── Stocks & ETFs via Yahoo Finance (gratuit, sans limite) ───────────────────
async function fetchYahoo(symbol: string, host: string): Promise<PriceData | null> {
  const res = await fetch(
    `https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible)',
        'Accept': 'application/json',
      },
      cache: 'no-store',
    }
  )
  if (!res.ok) return null
  const data = await res.json()
  const meta = data?.chart?.result?.[0]?.meta
  if (!meta?.regularMarketPrice) return null

  const price: number = meta.regularMarketPrice
  const prevClose: number = meta.chartPreviousClose ?? meta.previousClose ?? price
  const change = price - prevClose
  const changePercent = prevClose ? (change / prevClose) * 100 : 0

  return { symbol, price, change24h: change, changePercent24h: changePercent, changePct24h: changePercent }
}

export async function getStockPrice(symbol: string): Promise<PriceData | null> {
  try {
    const resolved = SYMBOL_ALIASES[symbol] ?? symbol
    // Try query1 first, then query2 as fallback (query2 often works better for European ETFs)
    const result = await fetchYahoo(resolved, 'query1.finance.yahoo.com')
      ?? await fetchYahoo(resolved, 'query2.finance.yahoo.com')
    // Return with original symbol so it matches the holding in DB
    return result ? { ...result, symbol } : MOCK_PRICES.find(p => p.symbol === symbol) ?? null
  } catch {
    return MOCK_PRICES.find(p => p.symbol === symbol) ?? null
  }
}

// ── Crypto via CoinGecko ─────────────────────────────────────────────────────
export async function getCryptoPrice(coinId: string): Promise<PriceData | null> {
  try {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (COINGECKO_KEY) headers['x-cg-demo-api-key'] = COINGECKO_KEY

    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=eur&include_24hr_change=true`,
      { headers, cache: 'no-store' }
    )
    const data = await res.json()
    const coinData = data[coinId]
    if (!coinData) return null

    const price: number = coinData.eur
    const changePercent: number = coinData.eur_24h_change
    const change = (price * changePercent) / 100

    const symbolMap: Record<string, string> = {
      bitcoin: 'BTC',
      ethereum: 'ETH',
      solana: 'SOL',
      binancecoin: 'BNB',
      cardano: 'ADA',
      ripple: 'XRP',
    }

    return {
      symbol: symbolMap[coinId] ?? coinId.toUpperCase(),
      price,
      change24h: change,
      changePercent24h: changePercent,
      changePct24h: changePercent,
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
  MATIC: 'matic-network',
  DOT: 'polkadot',
  AVAX: 'avalanche-2',
  LINK: 'chainlink',
}

export function getCoinId(symbol: string): string {
  return COIN_IDS[symbol.toUpperCase()] ?? symbol.toLowerCase()
}
