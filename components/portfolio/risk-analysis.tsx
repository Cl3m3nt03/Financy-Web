'use client'

import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Holding } from '@/types'
import { formatCurrency, cn } from '@/lib/utils'
import { ShieldAlert, ShieldCheck, Shield, TrendingUp, AlertTriangle } from 'lucide-react'

// ── Risk model ────────────────────────────────────────────────────────────────

// Annualised volatility estimates (σ) by symbol / sector
const SIGMA_MAP: Record<string, number> = {
  // Crypto
  BTC: 0.65, ETH: 0.75, SOL: 0.90, BNB: 0.70, ADA: 0.85, XRP: 0.80,
  DOGE: 0.95, DOT: 0.85, LINK: 0.80, AVAX: 0.85, MATIC: 0.90,
  // Tech US
  NVDA: 0.45, TSLA: 0.55, META: 0.38, GOOGL: 0.28, AAPL: 0.24, MSFT: 0.22,
  AMZN: 0.30, AMD: 0.50, INTC: 0.32,
  // French stocks
  'MC.PA': 0.22, 'RMS.PA': 0.22, 'AIR.PA': 0.28, 'BNP.PA': 0.30,
  'SAN.PA': 0.20, 'TTE.PA': 0.24,
  // ETF (low vol)
  SPY: 0.13, QQQ: 0.18, VT: 0.13, 'CW8.PA': 0.13, 'IWDA.AS': 0.13,
  'PANX.PA': 0.18, 'ESE.PA': 0.13, 'CAC.PA': 0.16,
}

// Beta vs market by sector
const BETA_MAP: Record<string, number> = {
  Technologie: 1.35, Finance: 1.10, Santé: 0.70, Luxe: 0.95,
  Énergie: 0.90, Commerce: 1.05, Automobile: 1.30, Industrie: 1.10,
  Cosmétiques: 0.80, Optique: 0.75, Chimie: 0.85, Aérospatiale: 1.20,
  Télécom: 0.65, Immobilier: 0.60, Crypto: 1.80,
  'ETF Monde': 1.00, 'ETF S&P500': 1.00, 'ETF NASDAQ': 1.15,
  'ETF CAC40': 1.00, 'ETF Émergents': 0.90, 'ETF Small Cap': 1.20,
  Autre: 1.00,
}

// Expected annual return
const RETURN_MAP: Record<string, number> = {
  CRYPTO: 0.20, STOCK: 0.09, PEA: 0.08, CTO: 0.09,
  SAVINGS: 0.025, BANK_ACCOUNT: 0.01, REAL_ESTATE: 0.05, OTHER: 0.04,
}

const RISK_FREE = 0.03 // Livret A

function getSigma(symbol: string, assetType: string): number {
  const clean = symbol.toUpperCase().replace(/\s+/g, '')
  return SIGMA_MAP[clean]
    ?? SIGMA_MAP[clean.split('.')[0]]
    ?? (assetType === 'CRYPTO' ? 0.75
      : assetType === 'SAVINGS' || assetType === 'BANK_ACCOUNT' ? 0.01
      : assetType === 'REAL_ESTATE' ? 0.08
      : 0.25)
}

function getRiskLabel(sigma: number): { label: string; color: string; level: 0|1|2|3 } {
  if (sigma <= 0.05) return { label: 'Très faible', color: '#10B981', level: 0 }
  if (sigma <= 0.18) return { label: 'Faible',      color: '#6EE7B7', level: 1 }
  if (sigma <= 0.40) return { label: 'Modéré',      color: '#F59E0B', level: 2 }
  return                    { label: 'Élevé',        color: '#EF4444', level: 3 }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface EnrichedHolding extends Holding {
  currentValue?: number
  assetType?: string
}

interface Props {
  holdings: EnrichedHolding[]
}

export function RiskAnalysis({ holdings }: Props) {
  const analysis = useMemo(() => {
    if (holdings.length === 0) return null

    const rows = holdings.map(h => {
      const value   = h.currentValue ?? h.quantity * h.avgBuyPrice
      const sigma   = getSigma(h.symbol, h.assetType ?? 'STOCK')
      const risk    = getRiskLabel(sigma)
      // 1-day VaR 95% = value * sigma / sqrt(252) * 1.645
      const var95   = value * (sigma / Math.sqrt(252)) * 1.645
      return { ...h, value, sigma, risk, var95 }
    })

    const totalValue = rows.reduce((s, r) => s + r.value, 0)

    // Weighted portfolio sigma
    const wSigma = totalValue > 0
      ? rows.reduce((s, r) => s + (r.value / totalValue) * r.sigma, 0)
      : 0

    // Portfolio VaR (simplified, ignoring correlation)
    const portfolioVar95 = rows.reduce((s, r) => s + r.var95, 0)

    // Weighted beta
    const wBeta = totalValue > 0
      ? rows.reduce((s, r) => {
          const sector = 'Autre'
          return s + (r.value / totalValue) * (BETA_MAP[sector] ?? 1.0)
        }, 0)
      : 1.0

    // Portfolio expected return (weighted by asset type)
    const wReturn = totalValue > 0
      ? rows.reduce((s, r) => s + (r.value / totalValue) * (RETURN_MAP[r.assetType ?? 'STOCK'] ?? 0.09), 0)
      : 0.09

    // Sharpe ratio
    const sharpe = wSigma > 0 ? (wReturn - RISK_FREE) / wSigma : 0

    // Risk distribution
    const dist: Record<string, number> = { 'Très faible': 0, Faible: 0, Modéré: 0, Élevé: 0 }
    for (const r of rows) dist[r.risk.label] = (dist[r.risk.label] ?? 0) + r.value
    const distData = Object.entries(dist)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value, pct: totalValue > 0 ? (value / totalValue) * 100 : 0 }))

    return { rows, totalValue, wSigma, portfolioVar95, wBeta, sharpe, wReturn, distData }
  }, [holdings])

  if (!analysis || analysis.rows.length === 0) {
    return <p className="text-text-muted text-sm text-center py-8">Ajoutez des positions pour voir l'analyse de risque.</p>
  }

  const { rows, wSigma, portfolioVar95, wBeta, sharpe, distData } = analysis

  const DIST_COLORS: Record<string, string> = {
    'Très faible': '#10B981', Faible: '#6EE7B7', Modéré: '#F59E0B', Élevé: '#EF4444'
  }

  const sharpeColor = sharpe >= 1 ? 'text-emerald-400' : sharpe >= 0.5 ? 'text-amber-400' : 'text-red-400'
  const sharpeLabel = sharpe >= 1 ? 'Excellent' : sharpe >= 0.5 ? 'Correct' : 'Faible'

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface-2 rounded-xl p-4">
          <p className="text-text-muted text-xs mb-1">Volatilité portefeuille</p>
          <p className="text-xl font-bold font-mono text-text-primary">{(wSigma * 100).toFixed(1)}%</p>
          <p className="text-text-muted text-xs mt-0.5">{getRiskLabel(wSigma).label}</p>
        </div>
        <div className="bg-surface-2 rounded-xl p-4">
          <p className="text-text-muted text-xs mb-1">Ratio de Sharpe</p>
          <p className={cn('text-xl font-bold font-mono', sharpeColor)}>{sharpe.toFixed(2)}</p>
          <p className="text-text-muted text-xs mt-0.5">{sharpeLabel}</p>
        </div>
        <div className="bg-surface-2 rounded-xl p-4">
          <p className="text-text-muted text-xs mb-1">VaR 95% (1 jour)</p>
          <p className="text-xl font-bold font-mono text-red-400">-{formatCurrency(portfolioVar95, 'EUR', true)}</p>
          <p className="text-text-muted text-xs mt-0.5">Perte max probable/jour</p>
        </div>
        <div className="bg-surface-2 rounded-xl p-4">
          <p className="text-text-muted text-xs mb-1">Bêta estimé</p>
          <p className="text-xl font-bold font-mono text-text-primary">{wBeta.toFixed(2)}</p>
          <p className="text-text-muted text-xs mt-0.5">vs. marché</p>
        </div>
      </div>

      {/* Risk distribution + per-position */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Donut distribution */}
        <div>
          <p className="text-sm font-medium text-text-secondary mb-3">Répartition par niveau de risque</p>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={120} height={120}>
              <PieChart>
                <Pie data={distData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={2} dataKey="value">
                  {distData.map((d, i) => (
                    <Cell key={i} fill={DIST_COLORS[d.name] ?? '#71717A'} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 flex-1">
              {distData.map(d => (
                <div key={d.name} className="flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: DIST_COLORS[d.name] }} />
                  <span className="text-text-secondary flex-1">{d.name}</span>
                  <span className="font-mono text-text-muted">{d.pct.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Per-position risk */}
        <div>
          <p className="text-sm font-medium text-text-secondary mb-3">Risque par position</p>
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {rows.sort((a, b) => b.sigma - a.sigma).map(r => (
              <div key={r.id} className="flex items-center gap-2.5">
                <div className={cn('w-1.5 h-8 rounded-full shrink-0')} style={{ background: r.risk.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-text-primary text-xs font-medium font-mono">{r.symbol}</span>
                    <span className="text-text-muted text-xs font-mono">{(r.sigma * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1 bg-surface rounded-full mt-1 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(r.sigma * 100, 100)}%`, background: r.risk.color }} />
                  </div>
                </div>
                <span className="text-[10px] text-text-muted w-16 text-right shrink-0">{r.risk.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 text-xs text-text-muted bg-surface-2 rounded-xl px-4 py-3">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
        <span>Estimations basées sur des volatilités historiques moyennes. Ne constitue pas un conseil en investissement.</span>
      </div>
    </div>
  )
}
