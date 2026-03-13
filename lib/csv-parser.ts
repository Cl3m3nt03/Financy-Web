/**
 * Universal CSV parser for bank/broker exports.
 * Supports: Revolut, N26, Boursorama, Fortuneo, generic CSV
 */

export interface ParsedTransaction {
  type:     'BUY' | 'SELL' | 'DEPOSIT' | 'WITHDRAWAL' | 'DIVIDEND'
  symbol?:  string
  quantity?: number
  price:    number
  fees:     number
  currency: string
  date:     string
  notes?:   string
}

type BankFormat = 'revolut' | 'n26' | 'boursorama' | 'fortuneo' | 'generic'

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseAmount(str: string): number {
  if (!str) return 0
  return parseFloat(str.replace(/\s/g, '').replace(',', '.').replace(/[^0-9.\-]/g, '')) || 0
}

function parseDate(str: string): string {
  if (!str) return new Date().toISOString().split('T')[0]
  // DD/MM/YYYY
  const dmy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
  // YYYY-MM-DD already
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10)
  // MM/DD/YYYY
  const mdy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`
  return new Date().toISOString().split('T')[0]
}

function detectType(label: string): ParsedTransaction['type'] {
  const l = label.toLowerCase()
  if (/achat|buy|purchase|acquisition/.test(l)) return 'BUY'
  if (/vente|sell|sale|cession/.test(l)) return 'SELL'
  if (/dividende|dividend/.test(l)) return 'DIVIDEND'
  if (/retrait|withdrawal|virement sortant|paiement/.test(l)) return 'WITHDRAWAL'
  return 'DEPOSIT'
}

// ── Format detection ──────────────────────────────────────────────────────────

function detectFormat(headers: string[]): BankFormat {
  const h = headers.map(s => s.toLowerCase())
  if (h.includes('started date') || h.includes('completed date') || h.includes('balance'))
    return 'revolut'
  if (h.includes('valutadatum') || h.includes('betrag'))
    return 'n26'
  if (h.some(x => x.includes('libellé') || x.includes('libelle')))
    return 'boursorama'
  if (h.some(x => x.includes('mnémo') || x.includes('mnemo')))
    return 'fortuneo'
  return 'generic'
}

// ── Format parsers ────────────────────────────────────────────────────────────

function parseRevolut(rows: Record<string, string>[]): ParsedTransaction[] {
  return rows.map(r => {
    const amount = parseAmount(r['Amount'] ?? r['amount'] ?? '0')
    const type   = detectType(r['Type'] ?? r['Description'] ?? '')
    return {
      type,
      price:    Math.abs(amount),
      fees:     parseAmount(r['Fee'] ?? '0'),
      currency: (r['Currency'] ?? 'EUR').trim(),
      date:     parseDate(r['Completed Date'] ?? r['Started Date'] ?? ''),
      notes:    r['Description'] ?? undefined,
    }
  })
}

function parseN26(rows: Record<string, string>[]): ParsedTransaction[] {
  return rows.map(r => {
    const amount = parseAmount(r['Betrag'] ?? r['Amount (EUR)'] ?? '0')
    const type: ParsedTransaction['type'] = amount >= 0 ? 'DEPOSIT' : 'WITHDRAWAL'
    return {
      type,
      price:    Math.abs(amount),
      fees:     0,
      currency: 'EUR',
      date:     parseDate(r['Datum'] ?? r['Date'] ?? ''),
      notes:    r['Empfänger'] ?? r['Verwendungszweck'] ?? undefined,
    }
  })
}

function parseBoursorama(rows: Record<string, string>[]): ParsedTransaction[] {
  return rows.map(r => {
    const label  = r['libellé'] ?? r['Libellé'] ?? r['LIBELLE'] ?? ''
    const amount = parseAmount(r['montant'] ?? r['Montant'] ?? r['MONTANT'] ?? '0')
    return {
      type:     detectType(label),
      price:    Math.abs(amount),
      fees:     parseAmount(r['commission'] ?? r['Commission'] ?? '0'),
      currency: r['devise'] ?? r['Devise'] ?? 'EUR',
      date:     parseDate(r['dateOp'] ?? r['Date'] ?? ''),
      notes:    label || undefined,
    }
  })
}

function parseFortuneo(rows: Record<string, string>[]): ParsedTransaction[] {
  return rows.map(r => {
    const mnemo    = r['Mnémo'] ?? r['Mnemo'] ?? r['mnemo'] ?? ''
    const qty      = parseAmount(r['Qté'] ?? r['Quantite'] ?? '0')
    const price    = parseAmount(r['Cours'] ?? r['Prix'] ?? '0')
    const label    = r['Libellé'] ?? r['Libelle'] ?? r['Operation'] ?? ''
    const fees     = parseAmount(r['Commission'] ?? r['Frais'] ?? '0')
    return {
      type:      detectType(label),
      symbol:    mnemo || undefined,
      quantity:  qty || undefined,
      price:     price || parseAmount(r['Montant'] ?? '0'),
      fees,
      currency:  r['Devise'] ?? 'EUR',
      date:      parseDate(r['Date'] ?? ''),
      notes:     label || undefined,
    }
  })
}

function parseGeneric(rows: Record<string, string>[]): ParsedTransaction[] {
  return rows.map(r => {
    const keys   = Object.keys(r)
    const amtKey = keys.find(k => /amount|montant|value|valeur|debit|credit/i.test(k)) ?? keys[1] ?? ''
    const datKey = keys.find(k => /date/i.test(k)) ?? keys[0] ?? ''
    const labKey = keys.find(k => /label|libel|desc|notes|memo/i.test(k)) ?? ''
    const symKey = keys.find(k => /symbol|ticker|mnemo|isin/i.test(k)) ?? ''
    const amount = parseAmount(r[amtKey] ?? '0')
    const label  = r[labKey] ?? ''
    return {
      type:    detectType(label),
      symbol:  symKey ? r[symKey] || undefined : undefined,
      price:   Math.abs(amount),
      fees:    0,
      currency:'EUR',
      date:    parseDate(r[datKey] ?? ''),
      notes:   label || undefined,
    }
  })
}

// ── Main export ───────────────────────────────────────────────────────────────

export function parseCSV(csvText: string): ParsedTransaction[] {
  // Detect separator
  const firstLine = csvText.split('\n')[0] ?? ''
  const sep = firstLine.includes(';') ? ';' : ','

  const lines = csvText.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []

  // Parse headers
  const headers = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g, ''))
  const format  = detectFormat(headers)

  // Parse rows
  const rows: Record<string, string>[] = lines.slice(1)
    .filter(l => l.trim())
    .map(line => {
      const vals = line.split(sep).map(v => v.trim().replace(/^"|"$/g, ''))
      const obj: Record<string, string> = {}
      headers.forEach((h, i) => { obj[h] = vals[i] ?? '' })
      return obj
    })

  const parsers: Record<BankFormat, (rows: Record<string, string>[]) => ParsedTransaction[]> = {
    revolut:    parseRevolut,
    n26:        parseN26,
    boursorama: parseBoursorama,
    fortuneo:   parseFortuneo,
    generic:    parseGeneric,
  }

  const results = parsers[format](rows)
  // Filter out rows with 0 price
  return results.filter(t => t.price > 0)
}
