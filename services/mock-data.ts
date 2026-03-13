import { Asset, PortfolioStats, PriceData, HistoryPoint } from '@/types'

export const MOCK_ASSETS: Asset[] = [
  {
    id: '1',
    userId: 'mock',
    name: 'Compte Courant BNP',
    type: 'BANK_ACCOUNT',
    institution: 'BNP Paribas',
    value: 8500,
    currency: 'EUR',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    userId: 'mock',
    name: 'Livret A',
    type: 'SAVINGS',
    institution: "Caisse d'Épargne",
    value: 22950,
    currency: 'EUR',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    userId: 'mock',
    name: 'LDDS',
    type: 'SAVINGS',
    institution: "Caisse d'Épargne",
    value: 12000,
    currency: 'EUR',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '4',
    userId: 'mock',
    name: 'Appartement Paris 11e',
    type: 'REAL_ESTATE',
    institution: undefined,
    value: 320000,
    currency: 'EUR',
    notes: 'Résidence principale. Estimation SeLoger.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '5',
    userId: 'mock',
    name: 'PEA Boursorama',
    type: 'STOCK',
    institution: 'Boursorama',
    value: 45200,
    currency: 'EUR',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    holdings: [
      { id: 'h1', assetId: '5', symbol: 'AAPL', name: 'Apple Inc.', quantity: 15, avgBuyPrice: 145, currency: 'USD', currentPrice: 189.3, currentValue: 2839.5, pnl: 663, pnlPercent: 30.5 },
      { id: 'h2', assetId: '5', symbol: 'MSFT', name: 'Microsoft Corp.', quantity: 10, avgBuyPrice: 280, currency: 'USD', currentPrice: 415.5, currentValue: 4155, pnl: 1355, pnlPercent: 48.4 },
      { id: 'h3', assetId: '5', symbol: 'MC.PA', name: 'LVMH', quantity: 5, avgBuyPrice: 750, currency: 'EUR', currentPrice: 680, currentValue: 3400, pnl: -350, pnlPercent: -9.3 },
      { id: 'h4', assetId: '5', symbol: 'AIR.PA', name: 'Airbus SE', quantity: 20, avgBuyPrice: 120, currency: 'EUR', currentPrice: 162, currentValue: 3240, pnl: 840, pnlPercent: 35 },
    ],
  },
  {
    id: '6',
    userId: 'mock',
    name: 'Crypto Ledger',
    type: 'CRYPTO',
    institution: undefined,
    value: 18750,
    currency: 'EUR',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    holdings: [
      { id: 'h5', assetId: '6', symbol: 'BTC', name: 'Bitcoin', quantity: 0.25, avgBuyPrice: 32000, currency: 'EUR', currentPrice: 52000, currentValue: 13000, pnl: 5000, pnlPercent: 62.5 },
      { id: 'h6', assetId: '6', symbol: 'ETH', name: 'Ethereum', quantity: 2.5, avgBuyPrice: 1800, currency: 'EUR', currentPrice: 2300, currentValue: 5750, pnl: 1250, pnlPercent: 27.8 },
    ],
  },
]

function generateHistory(): HistoryPoint[] {
  const points: HistoryPoint[] = []
  const now = new Date()
  let value = 310000

  for (let i = 23; i >= 0; i--) {
    const date = new Date(now)
    date.setMonth(date.getMonth() - i)

    const trend = 1 + (Math.random() * 0.04 - 0.01)
    value = value * trend

    points.push({
      date: date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
      value: Math.round(value),
    })
  }

  // Set final value to match current total
  points[points.length - 1].value = 427400
  return points
}

export const MOCK_PORTFOLIO_STATS: PortfolioStats = {
  totalValue: 427400,
  totalInvested: 380000,
  totalPnl: 47400,
  totalPnlPercent: 12.47,
  breakdown: {
    BANK_ACCOUNT: 8500,
    SAVINGS: 34950,
    REAL_ESTATE: 320000,
    STOCK: 45200,
    CRYPTO: 18750,
    OTHER: 0,
  },
  history: generateHistory(),
}

export const MOCK_PRICES: PriceData[] = [
  { symbol: 'AAPL', price: 189.3, change24h: 2.1, changePercent24h: 1.12 },
  { symbol: 'MSFT', price: 415.5, change24h: -1.5, changePercent24h: -0.36 },
  { symbol: 'MC.PA', price: 680, change24h: -12, changePercent24h: -1.73 },
  { symbol: 'AIR.PA', price: 162, change24h: 3.2, changePercent24h: 2.01 },
  { symbol: 'BTC', price: 52000, change24h: 1200, changePercent24h: 2.36 },
  { symbol: 'ETH', price: 2300, change24h: -45, changePercent24h: -1.92 },
]

export function getMockAssetById(id: string): Asset | undefined {
  return MOCK_ASSETS.find(a => a.id === id)
}
