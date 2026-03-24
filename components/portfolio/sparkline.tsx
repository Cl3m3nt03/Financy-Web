'use client'

import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'

interface Props {
  symbol: string
  range?: '5d' | '1mo' | '3mo'
  color?: string
  height?: number
}

export function Sparkline({ symbol, range = '1mo', color = '#10B981', height = 40 }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['sparkline', symbol, range],
    queryFn: async () => {
      const res = await fetch(`/api/sparkline?symbol=${encodeURIComponent(symbol)}&range=${range}`)
      if (!res.ok) return { prices: [] }
      return res.json() as Promise<{ prices: number[] }>
    },
    staleTime: 3600_000,
  })

  const prices = data?.prices ?? []

  if (isLoading || prices.length < 2) {
    return <div className="animate-pulse h-10 rounded bg-surface-2" style={{ height }} />
  }

  const first = prices[0]
  const last  = prices[prices.length - 1]
  const isPos = last >= first
  const lineColor = isPos ? '#10B981' : '#EF4444'

  const chartData = prices.map((p, i) => ({ i, v: p }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={lineColor}
          strokeWidth={1.5}
          dot={false}
          animationDuration={300}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            return (
              <div className="bg-surface border border-border rounded-lg px-2 py-1 text-xs font-mono text-text-primary shadow-lg">
                {payload[0].value?.toFixed(2)}
              </div>
            )
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
