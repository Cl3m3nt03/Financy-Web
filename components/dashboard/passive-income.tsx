'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import { Gift, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { Transaction, Asset } from '@/types'

interface Props {
  transactions: Transaction[]
  assets: Asset[]
}

export function PassiveIncome({ transactions, assets }: Props) {
  const now = new Date()
  const thisYear = now.getFullYear()

  const dividends = useMemo(
    () => transactions.filter(t => t.type === 'DIVIDEND'),
    [transactions]
  )

  const rentalMonthly = useMemo(() => {
    // Look for rent hint in notes: "loyer: 800" or "loyer 800"
    let total = 0
    for (const a of assets) {
      if (a.type !== 'REAL_ESTATE') continue
      const match = a.notes?.match(/loyer[:\s]+(\d+[\d\s]*)/i)
      if (match) total += parseFloat(match[1].replace(/\s/g, ''))
    }
    return total
  }, [assets])

  const divThisYear   = dividends.filter(d => new Date(d.date).getFullYear() === thisYear)
  const totalDivYear  = divThisYear.reduce((s, d) => s + d.price, 0)
  const rentalAnnual  = rentalMonthly * 12
  const totalPassive  = totalDivYear + rentalAnnual
  const monthlyAvg    = (totalDivYear + rentalMonthly * (now.getMonth() + 1)) / (now.getMonth() + 1)

  // Last 6 months bar data
  const chartData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d  = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const mo = d.getMonth()
      const yr = d.getFullYear()
      const divs = dividends
        .filter(t => { const dt = new Date(t.date); return dt.getMonth() === mo && dt.getFullYear() === yr })
        .reduce((s, t) => s + t.price, 0)
      return {
        month: d.toLocaleDateString('fr-FR', { month: 'short' }),
        value: divs + rentalMonthly,
      }
    })
  }, [dividends, rentalMonthly, now.getMonth()])

  if (totalPassive === 0 && rentalMonthly === 0 && dividends.length === 0) return null

  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-2 mb-4">
          <Gift className="w-4 h-4 text-accent" />
          <p className="text-sm font-semibold text-text-primary">Revenus passifs</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-surface-2 rounded-xl p-3">
            <p className="text-[10px] text-text-muted mb-0.5">Cette année</p>
            <p className="text-base font-bold font-mono text-accent leading-tight">{formatCurrency(totalDivYear + rentalMonthly * (now.getMonth() + 1), 'EUR', true)}</p>
          </div>
          <div className="bg-surface-2 rounded-xl p-3">
            <p className="text-[10px] text-text-muted mb-0.5">Moy. mensuelle</p>
            <p className="text-base font-bold font-mono text-text-primary leading-tight">{formatCurrency(monthlyAvg, 'EUR', true)}</p>
          </div>
        </div>

        {rentalMonthly > 0 && (
          <div className="flex items-center justify-between text-xs mb-3 px-1">
            <span className="text-text-muted">Loyers mensuels estimés</span>
            <span className="font-mono text-emerald-400 font-semibold">{formatCurrency(rentalMonthly, 'EUR', true)}/mois</span>
          </div>
        )}

        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 2, right: 2, left: 0, bottom: 0 }}>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 9 }} />
              <Tooltip
                contentStyle={{ background: '#1C1C1E', border: '1px solid #2C2C2E', borderRadius: 8 }}
                formatter={(v: number) => [formatCurrency(v, 'EUR', true), 'Revenus']}
                labelStyle={{ color: '#A1A1AA', fontSize: 10 }}
              />
              <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                {chartData.map((e, i) => (
                  <Cell key={i} fill={e.value > 0 ? '#C9A84C' : '#27272A'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
