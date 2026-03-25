/**
 * Tink (by Visa) Bank Account Data API
 * Docs: https://docs.tink.com/api
 */

const BASE          = 'https://api.tink.com'
const CLIENT_ID     = process.env.TINK_CLIENT_ID?.trim() ?? ''
const CLIENT_SECRET = process.env.TINK_CLIENT_SECRET?.trim() ?? ''

// ── Client token (client_credentials) ────────────────────────────────────────

let _clientToken: string | null = null
let _clientTokenExpiry = 0

export async function getClientToken(): Promise<string> {
  if (_clientToken && Date.now() < _clientTokenExpiry) return _clientToken

  const res = await fetch(`${BASE}/api/v1/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scope:         'authorization:grant user:create',
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('[TINK AUTH FAIL]', res.status, err, '| id_len=', CLIENT_ID.length, '| secret_len=', CLIENT_SECRET.length)
    throw new Error(`Tink client auth failed: ${res.status} ${err}`)
  }
  const data = await res.json()
  _clientToken = data.access_token as string
  _clientTokenExpiry = Date.now() + (data.expires_in - 60) * 1000
  return _clientToken
}

// ── Tink Link URL (no pre-created user needed) ────────────────────────────────

export function buildTinkLinkUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id:    CLIENT_ID,
    redirect_uri: redirectUri,
    market:       'FR',
    locale:       'fr_FR',
    state,
  })
  return `https://link.tink.com/1.0/transactions/connect-accounts?${params}`
}

// ── Exchange code for user access token ──────────────────────────────────────

export interface TinkTokens {
  access_token:  string
  refresh_token: string
  expires_in:    number
}

export async function exchangeCode(code: string): Promise<TinkTokens> {
  const res = await fetch(`${BASE}/api/v1/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'authorization_code',
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Tink token exchange failed: ${res.status} ${err}`)
  }
  return res.json()
}

export async function refreshAccessToken(refreshToken: string): Promise<TinkTokens> {
  const res = await fetch(`${BASE}/api/v1/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
  })
  if (!res.ok) throw new Error(`Tink token refresh failed: ${res.status}`)
  return res.json()
}

// ── Accounts ──────────────────────────────────────────────────────────────────

export interface TinkAccount {
  id:   string
  name: string
  type: string  // CHECKING, SAVINGS, INVESTMENT, etc.
  identifiers?: { iban?: { iban?: string } }
  balances?: {
    booked?:    { amount: { currencyCode: string; value: { scale: number; unscaledValue: number } } }
    available?: { amount: { currencyCode: string; value: { scale: number; unscaledValue: number } } }
  }
  financialInstitution?: { id: string; name: string }
}

function parseAmount(val: { scale: number; unscaledValue: number }): number {
  return val.unscaledValue / Math.pow(10, val.scale)
}

export async function fetchAccounts(accessToken: string): Promise<TinkAccount[]> {
  const res = await fetch(`${BASE}/data/v2/accounts`, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error(`Tink accounts failed: ${res.status}`)
  const data = await res.json()
  return data.accounts ?? []
}

export function getAccountBalance(account: TinkAccount): { amount: number; currency: string } {
  const bal = account.balances?.available ?? account.balances?.booked
  if (!bal) return { amount: 0, currency: 'EUR' }
  return {
    amount:   parseAmount(bal.amount.value),
    currency: bal.amount.currencyCode,
  }
}
