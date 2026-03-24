export type AssetType = 'BANK_ACCOUNT' | 'SAVINGS' | 'REAL_ESTATE' | 'STOCK' | 'CRYPTO' | 'PEA' | 'CTO' | 'OTHER'

export interface SearchResult {
  symbol: string
  name: string
  exchange?: string
  isin?: string
  coinId?: string
  marketCapRank?: number
  thumb?: string
}

export interface Asset {
  id: string
  userId: string
  name: string
  type: AssetType
  institution?: string | null
  value: number
  currency: string
  notes?: string | null
  createdAt: string
  updatedAt: string
  holdings?: Holding[]
}

export interface Holding {
  id: string
  assetId: string
  symbol: string
  name: string
  quantity: number
  avgBuyPrice: number
  currency: string
  currentPrice?: number
  currentValue?: number
  pnl?: number
  pnlPercent?: number
}

export interface Transaction {
  id: string
  userId: string
  holdingId?: string | null
  type: 'BUY' | 'SELL' | 'DEPOSIT' | 'WITHDRAWAL' | 'DIVIDEND'
  symbol?: string | null
  quantity?: number | null
  price: number
  fees: number
  currency: string
  date: string
  notes?: string | null
  tags?: string | null
}

export interface PortfolioSnapshot {
  id: string
  userId: string
  totalValue: number
  breakdown: AssetBreakdown
  date: string
}

export interface AssetBreakdown {
  BANK_ACCOUNT: number
  SAVINGS: number
  REAL_ESTATE: number
  STOCK: number
  CRYPTO: number
  PEA: number
  CTO: number
  OTHER: number
}

export interface PriceData {
  symbol: string
  price: number
  change24h: number
  changePercent24h: number
}

export interface PortfolioStats {
  totalValue: number
  totalInvested: number
  totalPnl: number
  totalPnlPercent: number
  breakdown: AssetBreakdown
  history: HistoryPoint[]
}

export interface HistoryPoint {
  date: string
  value: number
}
