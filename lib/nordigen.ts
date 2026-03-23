/**
 * GoCardless Bank Account Data (ex-Nordigen) API client
 * Docs: https://developer.gocardless.com/bank-account-data/overview
 */

const BASE = 'https://bankaccountdata.gocardless.com/api/v2'
const SECRET_ID  = process.env.NORDIGEN_SECRET_ID
const SECRET_KEY = process.env.NORDIGEN_SECRET_KEY

let _token: string | null = null
let _tokenExpiry = 0

export async function getNordigenToken(): Promise<string> {
  if (_token && Date.now() < _tokenExpiry) return _token

  if (!SECRET_ID || !SECRET_KEY) {
    throw new Error('NORDIGEN_SECRET_ID / NORDIGEN_SECRET_KEY manquants')
  }

  const res = await fetch(`${BASE}/token/new/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ secret_id: SECRET_ID, secret_key: SECRET_KEY }),
  })
  if (!res.ok) throw new Error(`Nordigen auth failed: ${res.status}`)
  const data = await res.json()
  _token = data.access as string
  _tokenExpiry = Date.now() + (data.access_expires - 60) * 1000
  return _token
}

async function get(path: string) {
  const token = await getNordigenToken()
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Nordigen ${path} → ${res.status}`)
  return res.json()
}

async function post(path: string, body: object) {
  const token = await getNordigenToken()
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Nordigen POST ${path} → ${res.status}: ${err}`)
  }
  return res.json()
}

// ── Institutions ─────────────────────────────────────────────────────────────

export interface NordigenInstitution {
  id:   string
  name: string
  bic:  string
  logo: string
  countries: string[]
}

export async function searchInstitutions(query: string, country = 'FR'): Promise<NordigenInstitution[]> {
  const data = await get(`/institutions/?country=${country}`)
  const q = query.toLowerCase()
  return (data as NordigenInstitution[]).filter(i =>
    i.name.toLowerCase().includes(q) || i.bic?.toLowerCase().includes(q)
  )
}

export async function getInstitution(id: string): Promise<NordigenInstitution> {
  return get(`/institutions/${id}/`)
}

// ── Requisitions (OAuth link flow) ───────────────────────────────────────────

export interface NordigenRequisition {
  id:            string
  status:        string
  link:          string
  accounts:      string[]
  institution_id: string
}

export async function createRequisition(
  institutionId: string,
  redirectUri: string,
  reference: string,
): Promise<NordigenRequisition> {
  return post('/requisitions/', {
    redirect:       redirectUri,
    institution_id: institutionId,
    reference,
    user_language:  'FR',
  })
}

export async function getRequisition(id: string): Promise<NordigenRequisition> {
  return get(`/requisitions/${id}/`)
}

// ── Accounts ─────────────────────────────────────────────────────────────────

export interface NordigenAccountDetails {
  id:       string
  iban?:    string
  currency: string
  name?:    string
  product?: string
  ownerName?: string
}

export interface NordigenBalance {
  balanceAmount: { amount: string; currency: string }
  balanceType:   string
}

export async function getAccountDetails(accountId: string): Promise<NordigenAccountDetails> {
  const data = await get(`/accounts/${accountId}/details/`)
  return data.account
}

export async function getAccountBalances(accountId: string): Promise<NordigenBalance[]> {
  const data = await get(`/accounts/${accountId}/balances/`)
  return data.balances ?? []
}
