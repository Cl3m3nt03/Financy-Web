import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/mobile-auth'


import { prisma } from '@/lib/db'

// ─── Cards — pokemontcg.io (CardMarket trendPrice → averageSellPrice → TCGPlayer market) ─
// Règle Zalu: all sources are real completed-sale prices, not listings
async function fetchCardPrice(cardApiId: string): Promise<number | null> {
  const apiKey = process.env.POKEMON_TCG_API_KEY
  const headers: Record<string, string> = {}
  if (apiKey) headers['X-Api-Key'] = apiKey

  // Fetch both cardmarket AND tcgplayer data
  const url = `https://api.pokemontcg.io/v2/cards/${encodeURIComponent(cardApiId)}?select=cardmarket,tcgplayer`
  const res = await fetch(url, { headers, cache: 'no-store' })
  if (!res.ok) return null

  const json = await res.json()
  const cm = json.data?.cardmarket?.prices
  const tcp = json.data?.tcgplayer?.prices

  // 1. CardMarket trendPrice (EUR, avg of recent completed CardMarket sales) ✓
  if (cm?.trendPrice) return cm.trendPrice

  // 2. CardMarket averageSellPrice (EUR, direct avg of completed sales) ✓
  if (cm?.averageSellPrice) return cm.averageSellPrice

  // 3. TCGPlayer market price (USD→EUR, avg of completed TCGPlayer sales) ✓
  // Try holofoil, then reverseHolofoil, then normal — convert USD→EUR (rate ~0.92)
  const tcgPrice =
    tcp?.holofoil?.market ??
    tcp?.reverseHolofoil?.market ??
    tcp?.normal?.market ??
    tcp?.['1stEditionHolofoil']?.market ??
    null
  if (tcgPrice) return Math.round(tcgPrice * 0.92 * 100) / 100

  return null
}

// ─── Sealed — PriceCharting new-price (avg completed eBay/Amazon sales) ──────
async function fetchSealedPriceById(pricechartingId: string): Promise<number | null> {
  const apiKey = process.env.PRICECHARTING_API_KEY
  const params = new URLSearchParams({ id: pricechartingId })
  if (apiKey) params.set('key', apiKey)

  const url = `https://www.pricecharting.com/api/product?${params.toString()}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return null

  const json = await res.json()
  // new-price is in cents
  return json['new-price'] ? Math.round(json['new-price']) / 100 : null
}

// ─── Auto-discover PriceCharting ID for a sealed item by name ────────────────
// Used when an item was added via pokemontcg.io sets (no pricechartingId yet).
// PriceCharting free API works without a key with basic rate limits.
async function discoverSealedPrice(name: string): Promise<{ id: string; price: number } | null> {
  const apiKey = process.env.PRICECHARTING_API_KEY
  const params = new URLSearchParams({ q: name })
  if (apiKey) params.set('id', apiKey)

  const url = `https://www.pricecharting.com/api/products?${params.toString()}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return null

  const json = await res.json()
  const products: any[] = json.products ?? []

  // Find best match: must be a Pokemon product (console-name) with a new-price
  const match = products.find((p: any) => {
    const consoleName = (p['console-name'] ?? '').toLowerCase()
    return (consoleName.includes('pokemon') || consoleName.includes('pokémon')) && p['new-price']
  })

  if (!match) return null

  return {
    id: String(match.id),
    price: Math.round(match['new-price']) / 100,
  }
}

// ─── POST /api/pokemon/price — refresh all item prices ───────────────────────
export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const items = await prisma.pokemonItem.findMany({
    where: { userId: user.id },
  })

  let updated = 0

  for (const item of items) {
    let price: number | null = null

    if (item.itemType === 'card' && item.cardApiId) {
      price = await fetchCardPrice(item.cardApiId)

    } else if (item.itemType === 'sealed') {
      if (item.pricechartingId) {
        // Already have the PriceCharting ID — fetch directly
        price = await fetchSealedPriceById(item.pricechartingId)
      } else if (item.name) {
        // No ID yet (added via pokemontcg.io sets) — auto-discover from PriceCharting
        const discovered = await discoverSealedPrice(item.name)
        if (discovered) {
          // Persist the discovered ID so future refreshes are instant
          await prisma.pokemonItem.update({
            where: { id: item.id },
            data: { pricechartingId: discovered.id },
          })
          price = discovered.price
        }
      }
    }

    if (price !== null) {
      await prisma.pokemonItem.update({
        where: { id: item.id },
        data: { currentPrice: price, lastPriceAt: new Date() },
      })
      updated++
    }
  }

  return NextResponse.json({ updated })
}

// ─── GET /api/pokemon/price — fetch price for a single item on demand ─────────
export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const cardId = searchParams.get('cardId')
  const sealedName = searchParams.get('sealedName')
  const sealedId = searchParams.get('sealedId')

  try {
    if (cardId) {
      const price = await fetchCardPrice(cardId)
      return NextResponse.json({ price })
    }
    if (sealedId) {
      const price = await fetchSealedPriceById(sealedId)
      return NextResponse.json({ price })
    }
    if (sealedName) {
      const discovered = await discoverSealedPrice(sealedName)
      return NextResponse.json({ price: discovered?.price ?? null, pricechartingId: discovered?.id ?? null })
    }
    return NextResponse.json({ price: null })
  } catch (err) {
    console.error('[pokemon/price]', err)
    return NextResponse.json({ price: null })
  }
}
