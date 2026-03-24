'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Bell, X, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PriceAlert {
  id:        string
  symbol:    string
  name?:     string | null
  condition: 'above' | 'below'
  target:    number
  currency:  string
  triggered: boolean
}

interface Toast {
  id:        string
  symbol:    string
  name?:     string | null
  condition: 'above' | 'below'
  target:    number
  price:     number
  currency:  string
}

async function fetchPrice(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(`/api/prices?symbols=${encodeURIComponent(symbol)}`)
    if (!res.ok) return null
    const data = await res.json()
    return data[0]?.price ?? null
  } catch {
    return null
  }
}

export function AlertsChecker() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const checked = useRef<Set<string>>(new Set())

  const checkAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts')
      if (!res.ok) return
      const alerts: PriceAlert[] = await res.json()
      const pending = alerts.filter(a => !a.triggered)
      if (pending.length === 0) return

      for (const alert of pending) {
        if (checked.current.has(alert.id)) continue
        const price = await fetchPrice(alert.symbol)
        if (price === null) continue

        const triggered =
          (alert.condition === 'above' && price >= alert.target) ||
          (alert.condition === 'below' && price <= alert.target)

        if (triggered) {
          // Mark as triggered server-side (+ envoie email)
          await fetch(`/api/alerts/${alert.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ triggered: true, price }),
          })
          checked.current.add(alert.id)

          const toast: Toast = {
            id: alert.id,
            symbol: alert.symbol,
            name: alert.name,
            condition: alert.condition,
            target: alert.target,
            price,
            currency: alert.currency,
          }
          setToasts(prev => [...prev.slice(-2), toast]) // keep max 3
        }
      }
    } catch {}
  }, [])

  // Check on mount then every 60s
  useEffect(() => {
    checkAlerts()
    const interval = setInterval(checkAlerts, 60_000)
    return () => clearInterval(interval)
  }, [checkAlerts])

  function dismiss(id: string) {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-20 lg:bottom-4 right-4 z-50 flex flex-col gap-2 max-w-xs w-full">
      {toasts.map(t => (
        <div
          key={t.id}
          className="flex items-start gap-3 bg-surface border border-accent/30 rounded-2xl p-3.5 shadow-xl animate-in slide-in-from-right-5"
        >
          <div className={cn(
            'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
            t.condition === 'above' ? 'bg-emerald-500/10' : 'bg-red-500/10'
          )}>
            {t.condition === 'above'
              ? <TrendingUp className="w-4 h-4 text-emerald-400" />
              : <TrendingDown className="w-4 h-4 text-red-400" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Bell className="w-3 h-3 text-accent" />
              <p className="text-xs font-semibold text-accent">Alerte déclenchée</p>
            </div>
            <p className="text-text-primary text-sm font-medium">
              <span className="font-mono">{t.symbol}</span>
              {t.name && t.name !== t.symbol && (
                <span className="text-text-muted font-normal"> · {t.name}</span>
              )}
            </p>
            <p className="text-text-secondary text-xs mt-0.5">
              {t.condition === 'above' ? 'Au-dessus de' : 'En dessous de'}{' '}
              <span className="font-mono font-medium">
                {t.target.toLocaleString('fr-FR')} {t.currency}
              </span>
              {' '}— cours actuel{' '}
              <span className="font-mono font-medium">
                {t.price.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {t.currency}
              </span>
            </p>
          </div>
          <button
            onClick={() => dismiss(t.id)}
            className="text-text-muted hover:text-text-primary shrink-0 mt-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
