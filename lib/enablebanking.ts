/**
 * Enable Banking API
 * Free — no verification — 2500+ European banks via PSD2
 * Docs: https://enablebanking.com/docs/api/reference/
 */

import { createSign } from 'crypto'

const BASE   = 'https://api.enablebanking.com'
const APP_ID = process.env.ENABLEBANKING_APP_ID?.trim() ?? ''

// Decode base64-encoded PEM private key
function getPrivateKey(): string {
  const b64 = process.env.ENABLEBANKING_PRIVATE_KEY_B64?.trim() ?? ''
  if (!b64) throw new Error('ENABLEBANKING_PRIVATE_KEY_B64 not set')
  return Buffer.from(b64, 'base64').toString('utf8')
}

// ── JWT signing (RS256) ───────────────────────────────────────────────────────

function makeJwt(): string {
  const privateKey = getPrivateKey()
  const now = Math.floor(Date.now() / 1000)

  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: APP_ID })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ iss: APP_ID, aud: 'api.enablebanking.com', iat: now, exp: now + 3600 })).toString('base64url')
  const input   = `${header}.${payload}`

  const sign = createSign('RSA-SHA256')
  sign.update(input)
  const sig = sign.sign(privateKey, 'base64url')

  return `${input}.${sig}`
}

function authHeaders() {
  return {
    Authorization:  `Bearer ${makeJwt()}`,
    'Content-Type': 'application/json',
  }
}

// ── ASPSPs (banks) ────────────────────────────────────────────────────────────

export interface EBBank {
  name:        string
  country:     string
  bic?:        string
  logo?:       string
}

export async function listBanks(country = 'FR'): Promise<EBBank[]> {
  const res = await fetch(`${BASE}/aspsps?country=${country}`, {
    headers: authHeaders(),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`EnableBanking listBanks failed: ${res.status} ${err}`)
  }
  const data = await res.json()
  return data.aspsps ?? []
}

// ── Auth session (= connection request) ──────────────────────────────────────

export interface EBSession {
  url:      string  // redirect user here
  session?: string  // session ID for later retrieval
}

export async function createAuthSession(
  bankName:    string,
  country:     string,
  redirectUri: string,
  state:       string,
): Promise<EBSession> {
  const validUntil = new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString()

  const res = await fetch(`${BASE}/auth`, {
    method:  'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      access: { valid_until: validUntil },
      aspsp: { name: bankName, country },
      state,
      redirect_url: redirectUri,
      psu_type:     'personal',
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`EnableBanking createAuthSession failed: ${res.status} ${err}`)
  }
  return res.json()
}

// ── After callback: get accounts from session ─────────────────────────────────

export interface EBAccount {
  uid:          string
  account_id?:  { iban?: string; bban?: string }
  name?:        string
  currency?:    string
  details?:     string
}

export async function getSessionAccounts(authCode: string): Promise<EBAccount[]> {
  const res = await fetch(`${BASE}/sessions/${encodeURIComponent(authCode)}/accounts`, {
    headers: authHeaders(),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`EnableBanking getSessionAccounts failed: ${res.status} ${err}`)
  }
  const data = await res.json()
  return data.accounts ?? []
}

// ── Balances ──────────────────────────────────────────────────────────────────

export interface EBBalance {
  balance_amount:  { amount: string; currency: string }
  balance_type:    string
}

export async function getAccountBalances(accountUid: string): Promise<EBBalance[]> {
  const res = await fetch(`${BASE}/accounts/${encodeURIComponent(accountUid)}/balances`, {
    headers: authHeaders(),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`EnableBanking getBalances failed: ${res.status} ${err}`)
  }
  const data = await res.json()
  return data.balances ?? []
}

export function pickBalance(balances: EBBalance[]): { amount: number; currency: string; type: string } {
  const preferred = balances.find(b => b.balance_type === 'interimAvailable')
    ?? balances.find(b => b.balance_type === 'closingBooked')
    ?? balances[0]
  if (!preferred) return { amount: 0, currency: 'EUR', type: 'unknown' }
  return {
    amount:   parseFloat(preferred.balance_amount.amount),
    currency: preferred.balance_amount.currency,
    type:     preferred.balance_type,
  }
}
