'use client'

import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Holding } from '@/types'
import { formatCurrency } from '@/lib/utils'

// Mapping symbol → secteur
const SECTOR_MAP: Record<string, string> = {
  // Tech US
  AAPL: 'Technologie', MSFT: 'Technologie', GOOGL: 'Technologie', GOOG: 'Technologie',
  NVDA: 'Technologie', META: 'Technologie', AVGO: 'Technologie', ORCL: 'Technologie',
  ADBE: 'Technologie', CRM: 'Technologie', INTC: 'Technologie', AMD: 'Technologie',
  // Commerce / Consommation
  AMZN: 'Commerce', TSLA: 'Automobile', NKE: 'Consommation', MCD: 'Consommation',
  SBUX: 'Consommation', WMT: 'Commerce', HD: 'Commerce', TGT: 'Commerce',
  // Finance
  V: 'Finance', MA: 'Finance', JPM: 'Finance', BAC: 'Finance', GS: 'Finance',
  MS: 'Finance', WFC: 'Finance', AXP: 'Finance', BRK: 'Finance',
  // Santé
  UNH: 'Santé', JNJ: 'Santé', LLY: 'Santé', PFE: 'Santé', MRK: 'Santé',
  ABBV: 'Santé', TMO: 'Santé', DHR: 'Santé',
  // Energie
  XOM: 'Énergie', CVX: 'Énergie',
  // Industrie
  BA: 'Industrie', CAT: 'Industrie', GE: 'Industrie', HON: 'Industrie',
  // Telecom
  T: 'Télécom', VZ: 'Télécom',
  // France CAC40
  'MC.PA': 'Luxe', 'RMS.PA': 'Luxe', 'KER.PA': 'Luxe', 'OR.PA': 'Cosmétiques',
  'EL.PA': 'Optique', 'TTE.PA': 'Énergie', 'SU.PA': 'Énergie',
  'AIR.PA': 'Aérospatiale', 'SAF.PA': 'Aérospatiale',
  'BNP.PA': 'Finance', 'ACA.PA': 'Finance', 'GLE.PA': 'Finance', 'AXA.PA': 'Finance',
  'SAN.PA': 'Santé', 'AI.PA': 'Chimie',
  'DSY.PA': 'Technologie', 'CAP.PA': 'Technologie', 'STM.PA': 'Technologie',
  'SGO.PA': 'Industrie', 'VIE.PA': 'Industrie', 'ML.PA': 'Industrie',
  'WLN.PA': 'Technologie', 'URW.PA': 'Immobilier',
  // ETF
  SPY: 'ETF S&P500', QQQ: 'ETF NASDAQ', VT: 'ETF Monde', VWO: 'ETF Émergents',
  'CW8.PA': 'ETF Monde', 'IWDA.AS': 'ETF Monde', 'PANX.PA': 'ETF NASDAQ',
  'ESE.PA': 'ETF S&P500', 'RS2K.PA': 'ETF Small Cap', 'PAEEM.PA': 'ETF Émergents',
  'CAC.PA': 'ETF CAC40',
  // Crypto
  BTC: 'Crypto', ETH: 'Crypto', BNB: 'Crypto', SOL: 'Crypto', ADA: 'Crypto',
  XRP: 'Crypto', DOGE: 'Crypto', DOT: 'Crypto', LINK: 'Crypto', AVAX: 'Crypto',
  MATIC: 'Crypto', UNI: 'Crypto', LTC: 'Crypto', ATOM: 'Crypto',
}

const SECTOR_COLORS: Record<string, string> = {
  'Technologie':   '#6366F1',
  'Finance':       '#10B981',
  'Santé':         '#EC4899',
  'Luxe':          '#C9A84C',
  'Énergie':       '#F59E0B',
  'Commerce':      '#3B82F6',
  'Automobile':    '#EF4444',
  'Industrie':     '#8B5CF6',
  'Cosmétiques':   '#F472B6',
  'Optique':       '#06B6D4',
  'Chimie':        '#84CC16',
  'Aérospatiale':  '#FB923C',
  'Télécom':       '#A78BFA',
  'Immobilier':    '#34D399',
  'Crypto':        '#F97316',
  'ETF Monde':     '#22D3EE',
  'ETF S&P500':    '#4ADE80',
  'ETF NASDAQ':    '#818CF8',
  'ETF CAC40':     '#FCD34D',
  'ETF Émergents': '#F87171',
  'ETF Small Cap': '#C084FC',
  'Autre':         '#71717A',
}

function getSector(symbol: string): string {
  const clean = symbol.toUpperCase().replace(/\s+/g, '')
  return SECTOR_MAP[clean] ?? SECTOR_MAP[clean.split('.')[0]] ?? 'Autre'
}

interface Props {
  holdings: (Holding & { currentValue?: number })[]
}

export function SectorBreakdown({ holdings }: Props) {
  const data = useMemo(() => {
    const map: Record<string, number> = {}
    for (const h of holdings) {
      const val = h.currentValue ?? h.quantity * h.avgBuyPrice
      if (val <= 0) continue
      const sector = getSector(h.symbol)
      map[sector] = (map[sector] ?? 0) + val
    }
    const total = Object.values(map).reduce((s, v) => s + v, 0)
    return Object.entries(map)
      .map(([name, value]) => ({ name, value, pct: total > 0 ? (value / total) * 100 : 0 }))
      .sort((a, b) => b.value - a.value)
  }, [holdings])

  const total = data.reduce((s, d) => s + d.value, 0)

  if (data.length === 0) {
    return (
      <p className="text-text-muted text-sm text-center py-8">
        Ajoutez des positions pour voir la répartition sectorielle.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Donut */}
      <div className="flex items-center justify-center">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={SECTOR_COLORS[entry.name] ?? SECTOR_COLORS['Autre']} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number) => formatCurrency(v, 'EUR')}
              contentStyle={{ background: '#18181B', border: '1px solid #3F3F46', borderRadius: 12 }}
              labelStyle={{ color: '#FAFAFA', fontSize: 12 }}
              itemStyle={{ color: '#A1A1AA', fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* List */}
      <div className="space-y-2 overflow-y-auto max-h-56">
        {data.map(d => (
          <div key={d.name} className="flex items-center gap-3">
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: SECTOR_COLORS[d.name] ?? SECTOR_COLORS['Autre'] }}
            />
            <span className="text-text-secondary text-sm flex-1">{d.name}</span>
            <span className="text-text-muted text-xs font-mono">{d.pct.toFixed(1)}%</span>
            <span className="text-text-primary text-sm font-mono">
              {formatCurrency(d.value, 'EUR', true)}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-3 pt-2 border-t border-border">
          <div className="w-2.5 h-2.5 shrink-0" />
          <span className="text-text-secondary text-sm flex-1 font-medium">Total</span>
          <span className="text-text-muted text-xs font-mono">100%</span>
          <span className="text-text-primary text-sm font-mono font-semibold">
            {formatCurrency(total, 'EUR', true)}
          </span>
        </div>
      </div>
    </div>
  )
}
