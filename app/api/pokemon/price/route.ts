import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Fetch real sold price for a card (pokemontcg.io trendPrice = CardMarket avg completed sales)
async function fetchCardPrice(cardApiId: string): Promise<number | null> {
  const apiKey = process.env.POKEMON_TCG_API_KEY
  const headers: Record<string, string> = {}
  if (apiKey) headers['X-Api-Key'] = apiKey

  const url = `https://api.pokemontcg.io/v2/cards/${encodeURIComponent(cardApiId)}?select=cardmarket`
  const res = await fetch(url, { headers, next: { revalidate: 3600 } })
  if (!res.ok) return null

  const json = await res.json()
  return json.data?.cardmarket?.prices?.trendPrice ?? null
}

// Fetch real sold price for sealed product (PriceCharting new-price = avg completed eBay sales)
async function fetchSealedPrice(pricechartingId: string): Promise<number | null> {
  const apiKey = process.env.PRICECHARTING_API_KEY
  const params = new URLSearchParams({ id: pricechartingId })
  if (apiKey) params.set('key', apiKey)

  const url = `https://www.pricecharting.com/api/product?${params.toString()}`
  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) return null

  const json = await res.json()
  // new-price is in cents
  return json['new-price'] ? Math.round(json['new-price']) / 100 : null
}

// POST /api/pokemon/price — refresh prices for all user items
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const items = await prisma.pokemonItem.findMany({
    where: { userId: session.user.id },
  })

  let updated = 0
  for (const item of items) {
    let price: number | null = null

    if (item.itemType === 'card' && item.cardApiId) {
      price = await fetchCardPrice(item.cardApiId)
    } else if (item.itemType === 'sealed' && item.pricechartingId) {
      price = await fetchSealedPrice(item.pricechartingId)
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

// GET /api/pokemon/price?cardId=xxx OR ?sealedId=xxx — fetch price for a single item
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const cardId = searchParams.get('cardId')
  const sealedId = searchParams.get('sealedId')

  try {
    if (cardId) {
      const price = await fetchCardPrice(cardId)
      return NextResponse.json({ price })
    }
    if (sealedId) {
      const price = await fetchSealedPrice(sealedId)
      return NextResponse.json({ price })
    }
    return NextResponse.json({ price: null })
  } catch (err) {
    console.error('[pokemon/price]', err)
    return NextResponse.json({ price: null })
  }
}
