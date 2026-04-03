import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/mobile-auth'
import { getStockPrice, getCryptoPrice, getCoinId } from '@/services/prices'

const CRYPTO_SYMBOLS = new Set(['BTC', 'ETH', 'SOL', 'BNB', 'ADA', 'XRP', 'MATIC', 'DOT', 'AVAX', 'LINK'])
const FINANCIAL_TYPES = new Set(['STOCK', 'CRYPTO', 'PEA', 'CTO'])

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const assets = await prisma.asset.findMany({
    where: { userId: user.id },
    include: { holdings: true },
    orderBy: { updatedAt: 'desc' },
  })

  // Compute live value for financial assets with holdings
  const financialAssets = assets.filter(a => FINANCIAL_TYPES.has(a.type) && a.holdings.length > 0)
  if (financialAssets.length > 0) {
    const allSymbols = Array.from(new Set(financialAssets.flatMap(a => a.holdings.map(h => h.symbol))))
    const priceResults = await Promise.all(
      allSymbols.map(sym =>
        CRYPTO_SYMBOLS.has(sym.toUpperCase())
          ? getCryptoPrice(getCoinId(sym))
          : getStockPrice(sym)
      )
    )
    const priceMap: Record<string, number> = {}
    for (const p of priceResults) {
      if (p) priceMap[p.symbol] = p.price
    }

    // Update each financial asset's value in-memory and persist to DB
    await Promise.all(financialAssets.map(async asset => {
      const liveValue = asset.holdings.reduce((sum, h) => {
        const price = priceMap[h.symbol] ?? h.avgBuyPrice
        return sum + price * h.quantity
      }, 0)
      if (liveValue > 0) {
        asset.value = liveValue
        await prisma.asset.update({ where: { id: asset.id }, data: { value: liveValue } }).catch(() => {})
      }
    }))
  }

  return NextResponse.json(assets)
}

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const FINANCIAL = ['STOCK', 'CRYPTO', 'PEA', 'CTO']
  const isFinancial = FINANCIAL.includes(body.type)

  const asset = await prisma.asset.create({
    data: {
      userId:      user.id,
      name:        body.name,
      type:        body.type,
      institution: body.institution ?? null,
      value:       parseFloat(body.value) || 0,
      currency:    body.currency ?? 'EUR',
      notes:       body.notes ?? null,
    },
    include: { holdings: true },
  })

  if (isFinancial && body.symbol && body.quantity && body.avgBuyPrice) {
    await prisma.holding.create({
      data: {
        assetId:     asset.id,
        symbol:      body.symbol,
        name:        body.name,
        quantity:    parseFloat(body.quantity),
        avgBuyPrice: parseFloat(body.avgBuyPrice),
        currency:    body.currency ?? 'EUR',
      },
    })
  }

  const full = await prisma.asset.findUnique({
    where: { id: asset.id },
    include: { holdings: true },
  })
  return NextResponse.json(full, { status: 201 })
}
