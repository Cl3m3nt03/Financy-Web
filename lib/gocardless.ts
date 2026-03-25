/**
 * GoCardless Bank Account Data API (ex-Nordigen)
 * Free — no verification required — 2300+ European banks
 * Docs: https://bankaccountdata.gocardless.com/api/v2/
 */

const BASE = 'https://bankaccountdata.gocardless.com/api/v2'

// ── Token cache ───────────────────────────────────────────────────────────────

let _accessToken: string | null = null
let _refreshToken: string | null = null
let _tokenExpiry = 0

export async function getAccessToken(): Promise<string> {
  if (_accessToken && Date.now() < _tokenExpiry) return _accessToken

  if (_refreshToken) {
    try {
      const res = await fetch(`${BASE}/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: _refreshToken }),
      })
      if (res.ok) {
        const data = await res.json()
        _accessToken = data.access
        _tokenExpiry = Date.now() + (data.access_expires - 60) * 1000
        return _accessToken!
      }
    } catch {}
  }

  const SECRET_ID  = process.env.GOCARDLESS_SECRET_ID?.trim() ?? ''
  const SECRET_KEY = process.env.GOCARDLESS_SECRET_KEY?.trim() ?? ''

  const res = await fetch(`${BASE}/token/new/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret_id: SECRET_ID, secret_key: SECRET_KEY }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`GoCardless auth failed: ${res.status} ${err}`)
  }
  const data = await res.json()
  _accessToken  = data.access
  _refreshToken = data.refresh
  _tokenExpiry  = Date.now() + (data.access_expires - 60) * 1000
  return _accessToken!
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

// ── Institutions ──────────────────────────────────────────────────────────────

export interface GCInstitution {
  id:   string
  name: string
  bic:  string
  logo: string
}

export async function listInstitutions(country = 'FR'): Promise<GCInstitution[]> {
  const token = await getAccessToken()
  const res = await fetch(`${BASE}/institutions/?country=${country}`, {
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error(`GoCardless institutions failed: ${res.status}`)
  return res.json()
}

// ── Requisitions (= connection request) ──────────────────────────────────────

export interface GCRequisition {
  id:             string
  status:         string  // CR | LN | RJ | ER | EX | SU | UA | GA | SA
  link:           string  // redirect URL to send user to
  accounts:       string[]
  institution_id: string
}

export async function createRequisition(
  institutionId: string,
  redirectUri:   string,
  reference:     string,
): Promise<GCRequisition> {
  const token = await getAccessToken()
  const res = await fetch(`${BASE}/requisitions/`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      institution_id: institutionId,
      redirect:       redirectUri,
      reference,
      account_selection: false,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`GoCardless requisition failed: ${res.status} ${err}`)
  }
  return res.json()
}

export async function getRequisition(requisitionId: string): Promise<GCRequisition> {
  const token = await getAccessToken()
  const res = await fetch(`${BASE}/requisitions/${requisitionId}/`, {
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error(`GoCardless get requisition failed: ${res.status}`)
  return res.json()
}

// ── Accounts ──────────────────────────────────────────────────────────────────

export interface GCAccount {
  id:             string
  iban?:          string
  name?:          string
  currency?:      string
  institution_id: string
}

export interface GCBalance {
  balanceAmount:  { amount: string; currency: string }
  balanceType:    string  // closingBooked | interimAvailable
}

export async function getAccountDetails(accountId: string): Promise<GCAccount> {
  const token = await getAccessToken()
  const res = await fetch(`${BASE}/accounts/${accountId}/details/`, {
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error(`GoCardless account details failed: ${res.status}`)
  const data = await res.json()
  return { id: accountId, ...data.account }
}

export async function getAccountBalances(accountId: string): Promise<GCBalance[]> {
  const token = await getAccessToken()
  const res = await fetch(`${BASE}/accounts/${accountId}/balances/`, {
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error(`GoCardless balances failed: ${res.status}`)
  const data = await res.json()
  return data.balances ?? []
}

export function pickBalance(balances: GCBalance[]): { amount: number; currency: string; type: string } {
  // Prefer interimAvailable > closingBooked
  const preferred = balances.find(b => b.balanceType === 'interimAvailable')
    ?? balances.find(b => b.balanceType === 'closingBooked')
    ?? balances[0]
  if (!preferred) return { amount: 0, currency: 'EUR', type: 'unknown' }
  return {
    amount:   parseFloat(preferred.balanceAmount.amount),
    currency: preferred.balanceAmount.currency,
    type:     preferred.balanceType,
  }
}
