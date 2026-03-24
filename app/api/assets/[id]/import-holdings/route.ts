import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// ── Known ISIN → Yahoo Finance symbol (same list as search route) ───────────
const ISIN_MAP: Record<string, { symbol: string; name: string }> = {
  'IE0002XZSHO1': { symbol: 'IWPE.PA',  name: 'iShares MSCI World Swap PEA UCITS ETF' },
  'IE00B4L5Y983': { symbol: 'IWDA.AS',  name: 'iShares Core MSCI World UCITS ETF' },
  'LU1681043599': { symbol: 'CW8.PA',   name: 'Amundi MSCI World UCITS ETF' },
  'FR0011869353': { symbol: 'EWLD.PA',  name: 'Lyxor MSCI World UCITS ETF' },
  'LU1792117779': { symbol: 'WPEA.PA',  name: 'Amundi MSCI World SRI PAB UCITS ETF PEA' },
  'LU0996182563': { symbol: 'SPXS.PA',  name: 'Amundi S&P 500 UCITS ETF' },
  'FR0011550185': { symbol: 'ESE.PA',   name: 'BNP Paribas Easy S&P 500 UCITS ETF' },
  'IE00B5BMR087': { symbol: 'SPY5.PA',  name: 'iShares Core S&P 500 UCITS ETF' },
  'LU1829221024': { symbol: 'PANX.PA',  name: 'Amundi NASDAQ-100 UCITS ETF' },
  'LU1681045370': { symbol: 'PAEEM.PA', name: 'Amundi MSCI Emerging Markets UCITS ETF' },
  'LU1681038672': { symbol: 'RS2K.PA',  name: 'Amundi Russell 2000 UCITS ETF' },
  // French large caps
  'FR0000131104': { symbol: 'BNP.PA',   name: 'BNP Paribas' },
  'FR0000131757': { symbol: 'CAP.PA',   name: 'Capgemini' },
  'FR0000120628': { symbol: 'ACA.PA',   name: 'Crédit Agricole' },
  'FR0000120172': { symbol: 'OR.PA',    name: "L'Oréal" },
  'FR0000121014': { symbol: 'MC.PA',    name: 'LVMH' },
  'FR0000120321': { symbol: 'SAN.PA',   name: 'Sanofi' },
  'FR0000120271': { symbol: 'TTE.PA',   name: 'TotalEnergies' },
  'FR0000125338': { symbol: 'GLE.PA',   name: 'Société Générale' },
  'FR0000127771': { symbol: 'AI.PA',    name: 'Air Liquide' },
  'FR0000131920': { symbol: 'SGO.PA',   name: 'Saint-Gobain' },
}

// Fallback: try OpenFIGI for unknown ISINs
async function resolveIsin(isin: string): Promise<{ symbol: string; name?: string } | null> {
  // 1. Local map first
  if (ISIN_MAP[isin]) return ISIN_MAP[isin]

  // 2. OpenFIGI
  try {
    const res = await fetch('https://api.openfigi.com/v3/mapping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ idType: 'ID_ISIN', idValue: isin }]),
    })
    if (!res.ok) return null
    const data = await res.json()
    const match = data[0]?.data?.[0]
    if (!match?.ticker) return null

    const SUFFIX: Record<string, string> = {
      EPA: '.PA', EAM: '.AS', EBR: '.BR', ETR: '.DE', XETRA: '.DE',
      LSE: '.L', SWX: '.SW', MIL: '.MI',
    }
    const suffix = SUFFIX[(match.exchCode ?? '').toUpperCase()] ?? ''
    const symbol = match.ticker.includes('.') ? match.ticker : `${match.ticker}${suffix}`
    return { symbol, name: match.name }
  } catch {
    return null
  }
}

// ── CSV parsers ─────────────────────────────────────────────────────────────

function parseNumber(s: string): number {
  // Handle French format: "1 234,56" or "1234,56" or "1234.56"
  return parseFloat(s.replace(/\s/g, '').replace(',', '.')) || 0
}

interface RawRow {
  name: string
  isin?: string
  symbol?: string
  quantity: number
  avgBuyPrice: number
  currency: string
}

function detectAndParse(csv: string): RawRow[] {
  const lines = csv.trim().split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []

  // Detect separator
  const sep = lines[0].includes(';') ? ';' : ','

  const rawHeaders = lines[0].split(sep).map(h =>
    h.replace(/^["']|["']$/g, '').toLowerCase().trim()
  )

  // Column index detection (multi-broker)
  function findCol(...candidates: string[]): number {
    for (const c of candidates) {
      const idx = rawHeaders.findIndex(h => h.includes(c))
      if (idx >= 0) return idx
    }
    return -1
  }

  const colName   = findCol('libellé', 'libelle', 'désignation', 'designation', 'valeur', 'name', 'instrument')
  const colIsin   = findCol('isin', 'code isin', 'code valeur', 'code', 'isin code')
  const colQty    = findCol('quantité', 'quantite', 'qté', 'qte', 'nb titres', 'quantity', 'shares')
  const colPru    = findCol('pru', 'prix revient', 'prix de revient', 'cout moyen', 'coût moyen', 'avg', 'average')
  const colSymbol = findCol('ticker', 'symbole', 'symbol')

  const rows: RawRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(sep).map(p => p.replace(/^["']|["']$/g, '').trim())
    if (parts.length < 2) continue

    const name   = colName   >= 0 ? parts[colName]   : parts[0]
    const isin   = colIsin   >= 0 ? parts[colIsin]   : undefined
    const qty    = colQty    >= 0 ? parseNumber(parts[colQty])    : 0
    const pru    = colPru    >= 0 ? parseNumber(parts[colPru])    : 0
    const symbol = colSymbol >= 0 ? parts[colSymbol] : undefined

    // Skip header-like rows, empty rows, total rows
    if (!name || name.toLowerCase().includes('total') || qty === 0) continue
    // Skip if ISIN looks invalid (not 12 chars starting with 2 letters)
    const cleanIsin = isin?.toUpperCase().replace(/\s/g, '')
    const validIsin = cleanIsin && /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(cleanIsin)
      ? cleanIsin
      : undefined

    rows.push({ name, isin: validIsin, symbol, quantity: qty, avgBuyPrice: pru, currency: 'EUR' })
  }

  return rows
}

// ── Route ───────────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  // Verify asset belongs to user
  const asset = await prisma.asset.findUnique({ where: { id: params.id } })
  if (!asset || asset.userId !== userId)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const csvText: string = body.csv ?? ''
  const mode: 'replace' | 'merge' = body.mode ?? 'replace'

  if (!csvText) return NextResponse.json({ error: 'No CSV provided' }, { status: 400 })

  const rawRows = detectAndParse(csvText)
  if (rawRows.length === 0)
    return NextResponse.json({ error: 'Aucune position détectée dans le fichier' }, { status: 422 })

  // Resolve symbols
  const resolved: { symbol: string; name: string; quantity: number; avgBuyPrice: number; currency: string }[] = []

  for (const row of rawRows) {
    let symbol = row.symbol
    let name   = row.name

    // 1. Try ISIN → symbol
    if (!symbol && row.isin) {
      const result = await resolveIsin(row.isin)
      if (result) {
        symbol = result.symbol
        if (result.name) name = result.name
      }
    }

    // 2. Use name as symbol if nothing else (will probably not get live price)
    if (!symbol) symbol = row.name.toUpperCase().slice(0, 10).replace(/\s+/g, '')

    if (row.quantity > 0) {
      resolved.push({ symbol, name, quantity: row.quantity, avgBuyPrice: row.avgBuyPrice, currency: row.currency })
    }
  }

  if (resolved.length === 0)
    return NextResponse.json({ error: 'Aucune position résolue' }, { status: 422 })

  // DB: replace or merge
  if (mode === 'replace') {
    await prisma.holding.deleteMany({ where: { assetId: params.id } })
  }

  const created = await Promise.all(resolved.map(r =>
    mode === 'replace'
      ? prisma.holding.create({
          data: {
            assetId:     params.id,
            symbol:      r.symbol,
            name:        r.name,
            quantity:    r.quantity,
            avgBuyPrice: r.avgBuyPrice,
            currency:    r.currency,
          },
        })
      : prisma.holding.upsert({
          where: { id: `${params.id}_${r.symbol}` },  // not real — will always create
          create: {
            assetId:     params.id,
            symbol:      r.symbol,
            name:        r.name,
            quantity:    r.quantity,
            avgBuyPrice: r.avgBuyPrice,
            currency:    r.currency,
          },
          update: {
            quantity:    r.quantity,
            avgBuyPrice: r.avgBuyPrice,
          },
        })
  ))

  // Update asset value = sum(qty * pru)
  const totalValue = resolved.reduce((s, r) => s + r.quantity * r.avgBuyPrice, 0)
  await prisma.asset.update({
    where: { id: params.id },
    data:  { value: totalValue, updatedAt: new Date() },
  })

  return NextResponse.json({
    imported: created.length,
    holdings: created,
    totalValue,
  })
}
