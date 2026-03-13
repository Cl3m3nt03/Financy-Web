import { useQuery } from '@tanstack/react-query'
import { PriceData } from '@/types'

async function fetchPrices(symbols: string[]): Promise<PriceData[]> {
  const res = await fetch(`/api/prices?symbols=${symbols.join(',')}`)
  if (!res.ok) throw new Error('Failed to fetch prices')
  return res.json()
}

export function usePrices(symbols: string[]) {
  return useQuery({
    queryKey: ['prices', symbols.sort().join(',')],
    queryFn: () => fetchPrices(symbols),
    staleTime: 60 * 1000,
    enabled: symbols.length > 0,
  })
}
