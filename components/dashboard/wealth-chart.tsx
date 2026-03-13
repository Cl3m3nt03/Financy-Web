'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { HistoryPoint } from '@/types'
import { formatCurrency } from '@/lib/utils'

interface WealthChartProps {
  data: HistoryPoint[]
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-surface border border-border rounded-xl p-3 shadow-xl">
      <p className="text-text-muted text-xs mb-1">{label}</p>
      <p className="text-text-primary font-bold text-lg font-mono">
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  )
}

export function WealthChart({ data }: WealthChartProps) {
  const minValue = Math.min(...data.map(d => d.value)) * 0.95
  const maxValue = Math.max(...data.map(d => d.value)) * 1.02

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle>Évolution du patrimoine</CardTitle>
          <div className="flex gap-1">
            {['3M', '6M', '1A', '2A'].map(period => (
              <button
                key={period}
                className="px-2.5 py-1 text-xs rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors first:bg-surface-2 first:text-text-primary"
              >
                {period}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="wealthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#71717A', fontSize: 11 }}
                interval={3}
              />
              <YAxis
                domain={[minValue, maxValue]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#71717A', fontSize: 11 }}
                tickFormatter={(v) => formatCurrency(v, 'EUR', true)}
                width={75}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#C9A84C"
                strokeWidth={2}
                fill="url(#wealthGradient)"
                dot={false}
                activeDot={{ r: 4, fill: '#C9A84C', stroke: '#09090B', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
