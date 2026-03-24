import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Search Pokémon TCG cards via pokemontcg.io
// Returns real trendPrice from CardMarket completed sales
async function searchCards(query: string) {
  const apiKey = process.env.POKEMON_TCG_API_KEY
  const headers: Record<string, string> = {}
  if (apiKey) headers['X-Api-Key'] = apiKey

  const url = `https://api.pokemontcg.io/v2/cards?q=name:"${encodeURIComponent(query)}"&orderBy=-set.releaseDate&pageSize=20&select=id,name,number,rarity,set,images,cardmarket`
  const res = await fetch(url, { headers, next: { revalidate: 3600 } })
  if (!res.ok) return []

  const json = await res.json()
  return (json.data ?? []).map((card: any) => ({
    id: card.id,
    name: card.name,
    setName: card.set?.name ?? '',
    setId: card.set?.id ?? '',
    number: card.number ?? '',
    rarity: card.rarity ?? '',
    imageUrl: card.images?.small ?? '',
    // trendPrice = average of recent completed CardMarket sales (Règle Zalu ✓)
    trendPrice: card.cardmarket?.prices?.trendPrice ?? null,
    type: 'card' as const,
  }))
}

// Search sealed products via PriceCharting
// new-price = average of completed "new" condition eBay/Amazon sales (Règle Zalu ✓)
async function searchSealed(query: string) {
  const apiKey = process.env.PRICECHARTING_API_KEY
  const params = new URLSearchParams({ q: query })
  if (apiKey) params.set('id', apiKey)

  const url = `https://www.pricecharting.com/api/products?${params.toString()}`
  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) return []

  const json = await res.json()
  const products = json.products ?? []

  return products
    .filter((p: any) => {
      const title = (p['product-name'] ?? '').toLowerCase()
      return title.includes('pokemon') || title.includes('pokémon')
    })
    .slice(0, 20)
    .map((p: any) => ({
      id: String(p.id),
      name: p['product-name'] ?? '',
      setName: p['console-name'] ?? '',
      imageUrl: p['image-url'] ?? '',
      // new-price is in cents from completed "new" condition sales
      trendPrice: p['new-price'] ? Math.round(p['new-price']) / 100 : null,
      type: 'sealed' as const,
    }))
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')?.trim()
  const type = searchParams.get('type') ?? 'card' // 'card' | 'sealed'

  if (!query || query.length < 2) return NextResponse.json([])

  try {
    if (type === 'sealed') {
      const results = await searchSealed(query)
      return NextResponse.json(results)
    } else {
      const results = await searchCards(query)
      return NextResponse.json(results)
    }
  } catch (err) {
    console.error('[pokemon/search]', err)
    return NextResponse.json([])
  }
}
