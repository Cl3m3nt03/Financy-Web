import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// ── ISIN → Yahoo Finance ticker ──────────────────────────────────────────────
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

async function resolveIsin(isin: string): Promise<{ symbol: string; name?: string } | null> {
  if (ISIN_MAP[isin]) return ISIN_MAP[isin]
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
      EPA: '.PA', EAM: '.AS', EBR: '.BR', ETR: '.DE', XETRA: '.DE', LSE: '.L', SWX: '.SW',
    }
    const suffix = SUFFIX[(match.exchCode ?? '').toUpperCase()] ?? ''
    const symbol = match.ticker.includes('.') ? match.ticker : `${match.ticker}${suffix}`
    return { symbol, name: match.name }
  } catch {
    return null
  }
}

// ── CSV parsing ───────────────────────────────────────────────────────────────

function parseNumber(s: string): number {
  return parseFloat(s.replace(/\s/g, '').replace(',', '.')) || 0
}

function norm(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

interface RawRow {
  name: string
  isin?: string
  symbol?: string
  quantity: number
  avgBuyPrice: number
}

function detectAndParse(csv: string): RawRow[] {
  const text = csv.replace(/^\uFEFF/, '')  // strip BOM
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []

  const sep = lines[0].split(';').length > lines[0].split(',').length ? ';' : ','
  const headers = lines[0].split(sep).map(h => norm(h.replace(/^["'\s]+|["'\s]+$/g, '')))

  function findCol(...candidates: string[]): number {
    for (const c of candidates) {
      const idx = headers.findIndex(h => h.includes(norm(c)))
      if (idx >= 0) return idx
    }
    return -1
  }

  // Specific matchers — avoid generic 'code' or 'valeur' alone
  const colName   = findCol('libelle', 'designation', 'instrument', 'nom du titre', 'titre', 'name')
  const colIsin   = findCol('isin')
  const colQty    = findCol('quantite', 'qte', 'nb titres', 'quantity', 'shares', 'nombre de titres')
  const colPru    = findCol('pru', 'prix de revient', 'cout moyen', 'coût moyen', 'average cost', 'avg price', 'pa')
  const colSymbol = findCol('ticker', 'symbole', 'symbol')

  const rows: RawRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(sep).map(p => p.replace(/^["'\s]+|["'\s]+$/g, '').trim())
    if (parts.length < 2) continue

    const name   = colName   >= 0 ? parts[colName]   : parts[0]
    const rawIsin = colIsin  >= 0 ? parts[colIsin]   : undefined
    const qty    = colQty    >= 0 ? parseNumber(parts[colQty])   : 0
    const pru    = colPru    >= 0 ? parseNumber(parts[colPru])   : 0
    const symbol = colSymbol >= 0 ? parts[colSymbol] : undefined

    if (!name || norm(name).includes('total') || qty === 0) continue

    const cleanIsin = rawIsin?.toUpperCase().replace(/\s/g, '')
    const validIsin = cleanIsin && /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(cleanIsin) ? cleanIsin : undefined

    rows.push({ name, isin: validIsin, symbol, quantity: qty, avgBuyPrice: pru })
  }
  return rows
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any).id

  const { id } = await params

  const asset = await prisma.asset.findUnique({ where: { id } })
  if (!asset || asset.userId !== userId)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const csvText: string = body.csv ?? ''
  const mode: 'replace' | 'merge' = body.mode ?? 'replace'

  if (!csvText) return NextResponse.json({ error: 'No CSV provided' }, { status: 400 })

  const rawRows = detectAndParse(csvText)
  if (rawRows.length === 0)
    return NextResponse.json({ error: 'Aucune position détectée dans le fichier. Vérifiez que le CSV contient les colonnes : Libellé, ISIN, Quantité, PRU.' }, { status: 422 })

  // Resolve ISINs → Yahoo Finance symbols
  const resolved: { symbol: string; name: string; quantity: number; avgBuyPrice: number }[] = []
  for (const row of rawRows) {
    let symbol = row.symbol
    let name   = row.name

    if (!symbol && row.isin) {
      const r = await resolveIsin(row.isin)
      if (r) { symbol = r.symbol; if (r.name) name = r.name }
    }
    if (!symbol) {
      // Use ISIN as symbol if available, otherwise sanitized name (won't get live price but won't crash)
      symbol = row.isin ?? row.name.toUpperCase().replace(/[^A-Z0-9.]/g, '').slice(0, 12)
    }

    if (row.quantity > 0) {
      resolved.push({ symbol, name, quantity: row.quantity, avgBuyPrice: row.avgBuyPrice })
    }
  }

  if (resolved.length === 0)
    return NextResponse.json({ error: 'Aucune position résolue' }, { status: 422 })

  // Replace mode: delete all existing holdings first
  if (mode === 'replace') {
    await prisma.holding.deleteMany({ where: { assetId: id } })
  }

  // Merge mode: delete existing holdings with same symbol to avoid duplicates
  if (mode === 'merge') {
    const symbols = resolved.map(r => r.symbol)
    await prisma.holding.deleteMany({ where: { assetId: id, symbol: { in: symbols } } })
  }

  // Create all holdings
  const created = await Promise.all(
    resolved.map(r =>
      prisma.holding.create({
        data: {
          assetId:     id,
          symbol:      r.symbol,
          name:        r.name,
          quantity:    r.quantity,
          avgBuyPrice: r.avgBuyPrice,
          currency:    'EUR',
        },
      })
    )
  )

  // Update asset value = sum(qty * pru)
  const totalValue = resolved.reduce((s, r) => s + r.quantity * r.avgBuyPrice, 0)
  await prisma.asset.update({
    where: { id },
    data:  { value: totalValue },
  })

  return NextResponse.json({ imported: created.length, totalValue })
}
