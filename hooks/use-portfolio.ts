import { useQuery } from '@tanstack/react-query'
import { PortfolioStats } from '@/types'

async function fetchPortfolioStats(): Promise<PortfolioStats> {
  const res = await fetch('/api/portfolio/stats')
  if (!res.ok) throw new Error('Failed to fetch portfolio stats')
  return res.json()
}

export function usePortfolioStats() {
  return useQuery({
    queryKey: ['portfolio', 'stats'],
    queryFn: fetchPortfolioStats,
    staleTime: 5 * 60 * 1000,
  })
}
