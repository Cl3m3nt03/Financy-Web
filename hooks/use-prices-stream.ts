'use client'

import { useState, useEffect, useRef } from 'react'
import { PriceData } from '@/types'

export type LiveStatus = 'connecting' | 'live' | 'reconnecting'

export function usePricesStream(symbols: string[]) {
  const [prices,    setPrices]    = useState<PriceData[]>([])
  const [status,    setStatus]    = useState<LiveStatus>('connecting')
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [flashing,  setFlashing]  = useState<Record<string, 'up' | 'down'>>({})

  const prevRef   = useRef<Record<string, number>>({})
  const esRef     = useRef<EventSource | null>(null)
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  const key = symbols.slice().sort().join(',')

  useEffect(() => {
    if (!symbols.length) return

    const connect = () => {
      setStatus('connecting')

      const es = new EventSource(`/api/prices/stream?symbols=${encodeURIComponent(key)}`)
      esRef.current = es

      es.onmessage = (e: MessageEvent) => {
        const incoming: PriceData[] = JSON.parse(e.data)

        // Detect direction changes for flash animation
        const newFlash: Record<string, 'up' | 'down'> = {}
        for (const p of incoming) {
          const prev = prevRef.current[p.symbol]
          if (prev !== undefined && Math.abs(prev - p.price) > 0.001) {
            newFlash[p.symbol] = p.price > prev ? 'up' : 'down'
          }
          prevRef.current[p.symbol] = p.price
        }

        if (Object.keys(newFlash).length > 0) {
          setFlashing(newFlash)
          setTimeout(() => setFlashing({}), 1200)
        }

        setPrices(incoming)
        setStatus('live')
        setUpdatedAt(new Date())
      }

      // SSE closed (server closed after 55s or network error) → reconnect
      es.onerror = () => {
        setStatus('reconnecting')
        es.close()
        timerRef.current = setTimeout(connect, 2000)
      }
    }

    connect()

    return () => {
      esRef.current?.close()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { prices, status, updatedAt, flashing }
}
