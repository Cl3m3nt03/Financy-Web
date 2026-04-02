import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUser } from '@/lib/mobile-auth'

const PFU_RATE        = 0.30   // Prélèvement Forfaitaire Unique
const SOCIAL_RATE     = 0.172  // Prélèvements sociaux seuls
const IR_RATE         = 0.128  // IR seul dans PFU

// PEA exonération après 5 ans (seulement PS 17.2%)
const PEA_HOLD_YEARS  = 5

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = user.id

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))

  const yearStart = new Date(year, 0, 1)
  const yearEnd   = new Date(year, 11, 31, 23, 59, 59)

  // Get all SELL transactions for the year
  const sells = await prisma.transaction.findMany({
    where: { userId, type: 'SELL', date: { gte: yearStart, lte: yearEnd } },
    orderBy: { date: 'asc' },
  })

  // Get all DIVIDEND transactions for the year
  const dividends = await prisma.transaction.findMany({
    where: { userId, type: 'DIVIDEND', date: { gte: yearStart, lte: yearEnd } },
  })

  // Get assets to determine account types (PEA vs CTO vs STOCK)
  const assets = await prisma.asset.findMany({ where: { userId } })
  const holdings = await prisma.holding.findMany({
    where: { assetId: { in: assets.map(a => a.id) } },
  })

  // Build holding → asset type map
  const holdingAssetType: Record<string, string> = {}
  const holdingCreatedAt: Record<string, Date> = {}
  for (const h of holdings) {
    const asset = assets.find(a => a.id === h.assetId)
    if (asset) {
      holdingAssetType[h.id] = asset.type
      holdingCreatedAt[h.id] = h.createdAt
    }
  }

  // ── Plus-values ────────────────────────────────────────────────────────────
  let totalPlusValues    = 0
  let plusValuesCTO      = 0
  let plusValuesPEA      = 0
  let plusValuesExoneres = 0

  const plusValueLines = sells.map(tx => {
    const qty    = tx.quantity ?? 0
    const gross  = qty * tx.price - tx.fees
    // We need avg buy price — use holding if linked
    const holding  = tx.holdingId ? holdings.find(h => h.id === tx.holdingId) : null
    const avgBuy   = holding?.avgBuyPrice ?? tx.price  // fallback: break-even
    const costBasis = qty * avgBuy
    const pv       = gross - costBasis

    const accountType  = tx.holdingId ? (holdingAssetType[tx.holdingId] ?? 'CTO') : 'CTO'
    const openedAt     = tx.holdingId ? holdingCreatedAt[tx.holdingId] : null
    const holdYears    = openedAt ? (new Date(tx.date).getTime() - openedAt.getTime()) / (1000 * 60 * 60 * 24 * 365) : 0
    const isPeaExonere = accountType === 'PEA' && holdYears >= PEA_HOLD_YEARS

    if (isPeaExonere) plusValuesExoneres += pv
    else if (accountType === 'PEA') plusValuesPEA += pv
    else plusValuesCTO += pv

    totalPlusValues += pv

    return {
      date:         tx.date,
      symbol:       tx.symbol ?? '?',
      quantity:     qty,
      sellPrice:    tx.price,
      avgBuyPrice:  avgBuy,
      plusValue:    pv,
      accountType,
      exonere:      isPeaExonere,
    }
  })

  // ── Dividends ──────────────────────────────────────────────────────────────
  const totalDividends = dividends.reduce((s, t) => s + t.price, 0)

  // ── Tax calculation ────────────────────────────────────────────────────────
  const taxableBase    = plusValuesCTO + (plusValuesPEA > 0 ? plusValuesPEA : 0) + totalDividends
  const taxPFU         = Math.max(0, taxableBase) * PFU_RATE
  const taxPEAExonere  = Math.max(0, plusValuesExoneres) * SOCIAL_RATE  // seulement PS

  return NextResponse.json({
    year,
    plusValues: {
      total:    totalPlusValues,
      cto:      plusValuesCTO,
      pea:      plusValuesPEA,
      exoneres: plusValuesExoneres,
      lines:    plusValueLines,
    },
    dividends: {
      total: totalDividends,
      lines: dividends.map(d => ({ date: d.date, symbol: d.symbol, amount: d.price, currency: d.currency })),
    },
    tax: {
      taxableBase,
      pfuAmount:       taxPFU,
      pfuRate:         PFU_RATE,
      peaExonereAmount:taxPEAExonere,
      irAmount:        Math.max(0, taxableBase) * IR_RATE,
      socialAmount:    Math.max(0, taxableBase) * SOCIAL_RATE,
    },
  })
}
