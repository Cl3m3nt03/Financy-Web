import { getUser } from '@/lib/mobile-auth'
import { NextResponse } from 'next/server'



// ─── Cards — pokemontcg.io ────────────────────────────────────────────────────
// trendPrice = average of recent CardMarket completed sales (Règle Zalu ✓)
async function searchCards(query: string) {
  const apiKey = process.env.POKEMON_TCG_API_KEY
  const headers: Record<string, string> = {}
  if (apiKey) headers['X-Api-Key'] = apiKey

  const url = `https://api.pokemontcg.io/v2/cards?q=name:"${encodeURIComponent(query)}"&orderBy=-set.releaseDate&pageSize=20&select=id,name,number,rarity,set,images,cardmarket,tcgplayer`
  const res = await fetch(url, { headers, next: { revalidate: 3600 } })
  if (!res.ok) return []

  const json = await res.json()
  return (json.data ?? []).map((card: any) => {
    const cm = card.cardmarket?.prices
    const tcp = card.tcgplayer?.prices
    // Best real sold price available (CardMarket EUR preferred, TCGPlayer USD fallback)
    const trendPrice =
      cm?.trendPrice ??
      cm?.averageSellPrice ??
      (tcp?.holofoil?.market ?? tcp?.reverseHolofoil?.market ?? tcp?.normal?.market
        ? Math.round((tcp?.holofoil?.market ?? tcp?.reverseHolofoil?.market ?? tcp?.normal?.market) * 0.92 * 100) / 100
        : null)
    return {
      id: card.id,
      name: card.name,
      setName: card.set?.name ?? '',
      number: card.number ?? '',
      rarity: card.rarity ?? '',
      imageUrl: card.images?.small ?? '',
      trendPrice,
      type: 'card' as const,
    }
  })
}

// ─── Sealed — pokemontcg.io sets (primary, free, no key needed) ───────────────
// Searches Pokémon sets by name (partial match). Sets represent sealed products.
// Note: pokemontcg.io has no sealed pricing — price comes from PriceCharting separately.
async function searchSealedViaSets(query: string) {
  const apiKey = process.env.POKEMON_TCG_API_KEY
  const headers: Record<string, string> = {}
  if (apiKey) headers['X-Api-Key'] = apiKey

  // pokemontcg.io supports partial name search via wildcard
  const url = `https://api.pokemontcg.io/v2/sets?q=name:*${encodeURIComponent(query)}*&orderBy=-releaseDate&pageSize=20`
  const res = await fetch(url, { headers, next: { revalidate: 3600 } })
  if (!res.ok) return []

  const json = await res.json()
  return (json.data ?? []).map((set: any) => ({
    id: `set-${set.id}`,
    name: set.name,
    setName: set.series ?? '',
    imageUrl: set.images?.logo ?? set.images?.symbol ?? '',
    trendPrice: null, // fetched separately via PriceCharting
    type: 'sealed' as const,
    setId: set.id,
  }))
}

// ─── Sealed — PriceCharting (secondary, needs API key for best results) ───────
// new-price = avg of completed "new" condition eBay sales (Règle Zalu ✓)
// Filter by console-name "Pokemon" (not product-name) — that's where Pokémon is tagged.
async function searchSealedViaPriceCharting(query: string) {
  const apiKey = process.env.PRICECHARTING_API_KEY
  if (!apiKey) return [] // skip if no key configured

  const params = new URLSearchParams({ q: query, id: apiKey })
  const url = `https://www.pricecharting.com/api/products?${params.toString()}`
  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) return []

  const json = await res.json()
  const products: any[] = json.products ?? []

  return products
    .filter((p: any) => {
      // Filter by console-name containing "Pokemon" (not product-name)
      const console = (p['console-name'] ?? '').toLowerCase()
      return console.includes('pokemon') || console.includes('pokémon')
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
  const _mobileUser = await getUser(req as any)
  if (!_mobileUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')?.trim()
  const type = searchParams.get('type') ?? 'card'

  if (!query || query.length < 2) return NextResponse.json([])

  try {
    if (type === 'sealed') {
      // Try PriceCharting first (has real sold prices), fallback to pokemontcg.io sets
      const [pc, sets] = await Promise.all([
        searchSealedViaPriceCharting(query),
        searchSealedViaSets(query),
      ])
      // Prefer PriceCharting results (have prices), append sets results deduplicated by name
      const combined = [...pc]
      const pcNames = new Set(pc.map((r: any) => r.name.toLowerCase()))
      for (const s of sets) {
        if (!pcNames.has(s.name.toLowerCase())) combined.push(s)
      }
      return NextResponse.json(combined.slice(0, 20))
    } else {
      const results = await searchCards(query)
      return NextResponse.json(results)
    }
  } catch (err) {
    console.error('[pokemon/search]', err)
    return NextResponse.json([])
  }
}
