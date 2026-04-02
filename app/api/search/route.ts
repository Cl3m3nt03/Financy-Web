import { NextRequest, NextResponse } from 'next/server'
import type { SearchResult } from '@/types'

const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_API_KEY
const COINGECKO_KEY = process.env.COINGECKO_API_KEY

// ─── Fallback lists ────────────────────────────────────────────────────────────

const POPULAR_CRYPTOS: SearchResult[] = [
  { symbol: 'BTC',  name: 'Bitcoin',           coinId: 'bitcoin',       marketCapRank: 1 },
  { symbol: 'ETH',  name: 'Ethereum',           coinId: 'ethereum',      marketCapRank: 2 },
  { symbol: 'BNB',  name: 'BNB',                coinId: 'binancecoin',   marketCapRank: 3 },
  { symbol: 'XRP',  name: 'XRP',                coinId: 'ripple',        marketCapRank: 4 },
  { symbol: 'SOL',  name: 'Solana',             coinId: 'solana',        marketCapRank: 5 },
  { symbol: 'ADA',  name: 'Cardano',            coinId: 'cardano',       marketCapRank: 6 },
  { symbol: 'AVAX', name: 'Avalanche',          coinId: 'avalanche-2',   marketCapRank: 7 },
  { symbol: 'DOT',  name: 'Polkadot',           coinId: 'polkadot',      marketCapRank: 8 },
  { symbol: 'LINK', name: 'Chainlink',          coinId: 'chainlink',     marketCapRank: 9 },
  { symbol: 'MATIC',name: 'Polygon',            coinId: 'matic-network', marketCapRank: 10 },
  { symbol: 'DOGE', name: 'Dogecoin',           coinId: 'dogecoin',      marketCapRank: 11 },
  { symbol: 'LTC',  name: 'Litecoin',           coinId: 'litecoin',      marketCapRank: 12 },
  { symbol: 'ATOM', name: 'Cosmos',             coinId: 'cosmos',        marketCapRank: 13 },
  { symbol: 'UNI',  name: 'Uniswap',            coinId: 'uniswap',       marketCapRank: 14 },
  { symbol: 'XLM',  name: 'Stellar',            coinId: 'stellar',       marketCapRank: 15 },
]

const POPULAR_STOCKS: SearchResult[] = [
  // USA
  { symbol: 'AAPL',  name: 'Apple Inc.',           exchange: 'NASDAQ' },
  { symbol: 'MSFT',  name: 'Microsoft Corp.',       exchange: 'NASDAQ' },
  { symbol: 'GOOGL', name: 'Alphabet (Google)',     exchange: 'NASDAQ' },
  { symbol: 'AMZN',  name: 'Amazon.com',            exchange: 'NASDAQ' },
  { symbol: 'NVDA',  name: 'NVIDIA Corp.',          exchange: 'NASDAQ' },
  { symbol: 'META',  name: 'Meta Platforms',        exchange: 'NASDAQ' },
  { symbol: 'TSLA',  name: 'Tesla Inc.',            exchange: 'NASDAQ' },
  { symbol: 'JPM',   name: 'JPMorgan Chase',        exchange: 'NYSE'   },
  { symbol: 'V',     name: 'Visa Inc.',             exchange: 'NYSE'   },
  { symbol: 'UNH',   name: 'UnitedHealth Group',   exchange: 'NYSE'   },
  // France / CAC 40
  { symbol: 'MC.PA',  name: 'LVMH',                 exchange: 'Euronext Paris' },
  { symbol: 'TTE.PA', name: 'TotalEnergies',        exchange: 'Euronext Paris' },
  { symbol: 'AIR.PA', name: 'Airbus SE',            exchange: 'Euronext Paris' },
  { symbol: 'BNP.PA', name: 'BNP Paribas',          exchange: 'Euronext Paris' },
  { symbol: 'SAN.PA', name: 'Sanofi',               exchange: 'Euronext Paris' },
  { symbol: 'AI.PA',  name: 'Air Liquide',          exchange: 'Euronext Paris' },
  { symbol: 'OR.PA',  name: "L'Oréal",              exchange: 'Euronext Paris' },
  { symbol: 'RMS.PA', name: 'Hermès International', exchange: 'Euronext Paris' },
  { symbol: 'DSY.PA', name: 'Dassault Systèmes',    exchange: 'Euronext Paris' },
  { symbol: 'CAP.PA', name: 'Capgemini',            exchange: 'Euronext Paris' },
  { symbol: 'SU.PA',  name: 'Schneider Electric',   exchange: 'Euronext Paris' },
  { symbol: 'EL.PA',  name: 'EssilorLuxottica',     exchange: 'Euronext Paris' },
  { symbol: 'KER.PA', name: 'Kering',               exchange: 'Euronext Paris' },
  { symbol: 'SGO.PA', name: 'Saint-Gobain',         exchange: 'Euronext Paris' },
  { symbol: 'WLN.PA', name: 'Worldline',            exchange: 'Euronext Paris' },
  // ETF World / PEA éligibles
  { symbol: 'WPEA.PA', name: 'iShares MSCI World Swap PEA UCITS ETF EUR (Acc)', exchange: 'Euronext Paris', isin: 'IE0002XZSHO1' },
  { symbol: 'IWDA.AS', name: 'iShares Core MSCI World UCITS ETF USD (Acc)',     exchange: 'Euronext Amsterdam', isin: 'IE00B4L5Y983' },
  { symbol: 'SWRD.PA', name: 'SPDR MSCI World UCITS ETF',                       exchange: 'Euronext Paris', isin: 'IE00BFY0GT14' },
  { symbol: 'MWRD.PA', name: 'iShares MSCI World UCITS ETF EUR Hedged (Acc)',   exchange: 'Euronext Paris', isin: 'IE00B441G979' },
  { symbol: 'LCWD.PA', name: 'Lyxor Core MSCI World UCITS ETF (DR)',            exchange: 'Euronext Paris', isin: 'LU1781541179' },
  { symbol: 'BNPE.PA', name: 'BNP Paribas Easy MSCI World SRI PAB UCITS ETF',  exchange: 'Euronext Paris', isin: 'LU1291109621' },
  { symbol: 'CW8.PA',  name: 'Amundi MSCI World UCITS ETF (C)',                  exchange: 'Euronext Paris', isin: 'LU1681043599' },
  { symbol: 'EWLD.PA', name: 'Lyxor MSCI World UCITS ETF (Acc)',                 exchange: 'Euronext Paris', isin: 'FR0011869353' },
  { symbol: 'WPEA.PA', name: 'Amundi MSCI World SRI PAB UCITS ETF PEA (C)',      exchange: 'Euronext Paris', isin: 'LU1792117779' },
  // ETF S&P 500 / US
  { symbol: 'SPXS.PA', name: 'Amundi S&P 500 UCITS ETF (Acc)',                  exchange: 'Euronext Paris', isin: 'LU0996182563' },
  { symbol: 'ESE.PA',  name: 'BNP Paribas Easy S&P 500 UCITS ETF EUR',          exchange: 'Euronext Paris', isin: 'FR0011550185' },
  { symbol: 'SPY5.PA', name: 'iShares Core S&P 500 UCITS ETF USD (Acc)',         exchange: 'Euronext Paris', isin: 'IE00B5BMR087' },
  // ETF Nasdaq / Tech
  { symbol: 'PANX.PA', name: 'Amundi NASDAQ-100 UCITS ETF (Acc)',                exchange: 'Euronext Paris', isin: 'LU1829221024' },
  { symbol: 'QDVE.DE', name: 'iShares S&P 500 Information Technology ETF',       exchange: 'Xetra', isin: 'IE00B3WJKG14' },
  // ETF Emergents / Divers
  { symbol: 'PAEEM.PA',name: 'Amundi MSCI Emerging Markets UCITS ETF',           exchange: 'Euronext Paris', isin: 'LU1681045370' },
  { symbol: 'RS2K.PA', name: 'Amundi Russell 2000 UCITS ETF',                    exchange: 'Euronext Paris', isin: 'LU1681038672' },
  { symbol: 'CAC.PA',  name: 'Lyxor CAC 40 UCITS ETF',                           exchange: 'Euronext Paris' },
  // ETF US cotés USD
  { symbol: 'SPY',     name: 'SPDR S&P 500 ETF Trust',                           exchange: 'NYSE' },
  { symbol: 'QQQ',     name: 'Invesco QQQ Trust (NASDAQ-100)',                    exchange: 'NASDAQ' },
  { symbol: 'VT',      name: 'Vanguard Total World Stock ETF',                    exchange: 'NYSE' },
  { symbol: 'VWO',     name: 'Vanguard FTSE Emerging Markets ETF',                exchange: 'NYSE' },
]

// ─── ISIN detection & resolution ───────────────────────────────────────────────

const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/

// OpenFIGI exchCode → Yahoo Finance ticker suffix
const EXCHANGE_SUFFIX: Record<string, string> = {
  EPA: '.PA',   // Euronext Paris
  EAM: '.AS',   // Euronext Amsterdam
  EBR: '.BR',   // Euronext Bruxelles
  ELI: '.LS',   // Euronext Lisbonne
  ETR: '.DE',   // Xetra / Frankfurt
  XETRA: '.DE',
  LSE: '.L',    // London Stock Exchange
  SWX: '.SW',   // SIX Swiss Exchange
  MIL: '.MI',   // Borsa Italiana
  BME: '.MC',   // Madrid
  HEL: '.HE',   // Helsinki
  OSL: '.OL',   // Oslo
  CPH: '.CO',   // Copenhague
  STO: '.ST',   // Stockholm
  TSX: '.TO',   // Toronto
  ASX: '.AX',   // Australian Securities Exchange
  HKG: '.HK',   // Hong Kong
  TYO: '.T',    // Tokyo
}

function toYahooSymbol(ticker: string, exchCode: string): string {
  if (!ticker) return ticker
  // Already has a suffix (e.g. MC.PA from Alpha Vantage)
  if (ticker.includes('.')) return ticker
  const suffix = EXCHANGE_SUFFIX[exchCode.toUpperCase()] ?? ''
  return suffix ? `${ticker}${suffix}` : ticker
}

async function resolveISIN(isin: string): Promise<SearchResult[]> {
  // 1. Check known list first (instant, no rate limit)
  const local = POPULAR_STOCKS.filter(s => s.isin === isin)
  if (local.length > 0) return local

  // 2. Try OpenFIGI
  try {
    const res = await fetch('https://api.openfigi.com/v3/mapping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ idType: 'ID_ISIN', idValue: isin }]),
      next: { revalidate: 0 },
    })
    if (!res.ok) throw new Error('OpenFIGI error')
    const data = await res.json()
    const matches: any[] = data[0]?.data ?? []
    if (matches.length === 0) throw new Error('No FIGI match')
    return matches.slice(0, 8).map((m: any) => ({
      symbol:   toYahooSymbol(m.ticker ?? '', m.exchCode ?? ''),
      name:     m.name     ?? isin,
      exchange: m.exchCode ?? '',
      isin,
    }))
  } catch {
    // 3. Last resort: Alpha Vantage or empty
    return searchStock(isin)
  }
}

// ─── Search handlers ────────────────────────────────────────────────────────────

async function searchCrypto(q: string): Promise<SearchResult[]> {
  try {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (COINGECKO_KEY) headers['x-cg-demo-api-key'] = COINGECKO_KEY

    const res = await fetch(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`,
      { headers, next: { revalidate: 0 } }
    )
    if (!res.ok) throw new Error('CoinGecko error')

    const data = await res.json()
    return (data.coins as any[]).slice(0, 8).map(c => ({
      symbol: c.symbol.toUpperCase(),
      name: c.name,
      coinId: c.id,
      marketCapRank: c.market_cap_rank,
      thumb: c.thumb,
    }))
  } catch {
    // Fallback: filter from popular list
    const lower = q.toLowerCase()
    return POPULAR_CRYPTOS.filter(
      c => c.symbol.toLowerCase().includes(lower) || c.name.toLowerCase().includes(lower)
    ).slice(0, 6)
  }
}

async function searchStock(q: string): Promise<SearchResult[]> {
  try {
    if (!ALPHA_VANTAGE_KEY) throw new Error('No API key')

    const res = await fetch(
      `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(q)}&apikey=${ALPHA_VANTAGE_KEY}`,
      { next: { revalidate: 0 } }
    )
    if (!res.ok) throw new Error('AlphaVantage error')

    const data = await res.json()
    if (!data.bestMatches?.length) throw new Error('No results')

    return (data.bestMatches as any[]).slice(0, 8).map((m: any) => ({
      symbol: m['1. symbol'],
      name: m['2. name'],
      exchange: m['4. region'],
    }))
  } catch {
    // Fallback: filter from popular list (symbol, name, ISIN)
    const lower = q.toLowerCase()
    return POPULAR_STOCKS.filter(
      s =>
        s.symbol.toLowerCase().includes(lower) ||
        s.name.toLowerCase().includes(lower) ||
        (s.isin ?? '').toLowerCase().includes(lower) ||
        (s.exchange ?? '').toLowerCase().includes(lower)
    ).slice(0, 8)
  }
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q    = searchParams.get('q')?.trim() ?? ''
  const type = searchParams.get('type') ?? 'STOCK'

  if (q.length < 1) return NextResponse.json([])

  // ISIN takes priority for stock/ETF types
  if ((type === 'STOCK' || type === 'PEA' || type === 'CTO') && ISIN_RE.test(q.toUpperCase())) {
    const results = await resolveISIN(q.toUpperCase())
    return NextResponse.json(results)
  }

  if (type === 'CRYPTO') {
    const results = await searchCrypto(q)
    return NextResponse.json(results)
  }

  if (type === 'STOCK' || type === 'PEA' || type === 'CTO') {
    const results = await searchStock(q)
    return NextResponse.json(results)
  }

  return NextResponse.json([])
}
