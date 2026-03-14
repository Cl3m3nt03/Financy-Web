import { NextRequest } from 'next/server'
import { getStockPrice, getCryptoPrice, getCoinId } from '@/services/prices'
import { PriceData } from '@/types'

const CRYPTO_SYMBOLS = new Set([
  'BTC','ETH','SOL','BNB','ADA','XRP','MATIC','DOT','AVAX','LINK','DOGE','LTC','ATOM','UNI','XLM',
])
const POLL_MS  = 10_000   // fetch prices every 10s
const MAX_MS   = 55_000   // close before Vercel 60s timeout → client auto-reconnects

async function fetchPrices(symbols: string[]): Promise<PriceData[]> {
  const results = await Promise.all(
    symbols.map(s =>
      CRYPTO_SYMBOLS.has(s) ? getCryptoPrice(getCoinId(s)) : getStockPrice(s)
    )
  )
  return results.filter((p): p is PriceData => p !== null)
}

export async function GET(req: NextRequest) {
  const symbols = req.nextUrl.searchParams
    .get('symbols')
    ?.split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean) ?? []

  if (!symbols.length) return new Response('Missing symbols', { status: 400 })

  const encoder = new TextEncoder()
  let closed = false

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (payload: string) => {
        if (closed) return
        try { controller.enqueue(encoder.encode(payload)) } catch {}
      }

      const sendPrices = async () => {
        const prices = await fetchPrices(symbols)
        enqueue(`data: ${JSON.stringify(prices)}\n\n`)
      }

      // Send immediately
      await sendPrices()

      // Poll every 10s
      const pollInterval = setInterval(sendPrices, POLL_MS)

      // Keepalive comment every 20s (prevents proxies from closing the connection)
      const pingInterval = setInterval(() => enqueue(': ping\n\n'), 20_000)

      // Auto-close before Vercel timeout – EventSource will auto-reconnect
      const closeTimer = setTimeout(() => {
        closed = true
        clearInterval(pollInterval)
        clearInterval(pingInterval)
        try { controller.close() } catch {}
      }, MAX_MS)

      req.signal.addEventListener('abort', () => {
        closed = true
        clearInterval(pollInterval)
        clearInterval(pingInterval)
        clearTimeout(closeTimer)
        try { controller.close() } catch {}
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache, no-store',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no', // disable nginx buffering
    },
  })
}
