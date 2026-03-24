'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Wallet, ArrowLeftRight, Target, Loader2 } from 'lucide-react'
import { cn, formatCurrency, getAssetTypeLabel } from '@/lib/utils'

interface SearchResults {
  assets:       { id: string; name: string; type: string; value: number; currency: string }[]
  transactions: { id: string; type: string; symbol: string | null; price: number; currency: string; date: string; notes: string | null }[]
  goals:        { id: string; name: string; targetValue: number; currency: string }[]
}

export function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen]       = useState(false)
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cmd+K / Ctrl+K listener
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(v => !v)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
      setResults(null)
    }
  }, [open])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); setLoading(false); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/global-search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data)
    } finally {
      setLoading(false)
    }
  }, [])

  function handleInput(val: string) {
    setQuery(val)
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => search(val), 250)
  }

  function navigate(href: string) {
    setOpen(false)
    router.push(href)
  }

  const hasResults = results && (
    results.assets.length + results.transactions.length + results.goals.length > 0
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
          <Search className="w-4 h-4 text-text-muted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => handleInput(e.target.value)}
            placeholder="Rechercher un actif, transaction, objectif…"
            className="flex-1 bg-transparent text-text-primary placeholder:text-text-muted text-sm outline-none"
          />
          {loading
            ? <Loader2 className="w-4 h-4 text-text-muted animate-spin shrink-0" />
            : query && (
              <button onClick={() => { setQuery(''); setResults(null) }}>
                <X className="w-4 h-4 text-text-muted hover:text-text-primary" />
              </button>
            )
          }
          <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 bg-surface-2 border border-border rounded text-[10px] text-text-muted font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {!query && (
            <p className="text-text-muted text-sm text-center py-8">
              Tapez pour rechercher dans vos données
            </p>
          )}

          {query.length >= 2 && !loading && !hasResults && (
            <p className="text-text-muted text-sm text-center py-8">
              Aucun résultat pour &quot;{query}&quot;
            </p>
          )}

          {hasResults && (
            <div className="py-2">
              {/* Assets */}
              {results.assets.length > 0 && (
                <div>
                  <p className="px-4 py-1.5 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Actifs</p>
                  {results.assets.map(a => (
                    <button
                      key={a.id}
                      onClick={() => navigate('/assets')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2 transition-colors text-left"
                    >
                      <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                        <Wallet className="w-3.5 h-3.5 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary text-sm font-medium truncate">{a.name}</p>
                        <p className="text-text-muted text-xs">{getAssetTypeLabel(a.type as any)}</p>
                      </div>
                      <span className="text-text-secondary text-sm font-mono shrink-0">
                        {formatCurrency(a.value, a.currency)}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Transactions */}
              {results.transactions.length > 0 && (
                <div>
                  <p className="px-4 py-1.5 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Transactions</p>
                  {results.transactions.map(t => (
                    <button
                      key={t.id}
                      onClick={() => navigate('/transactions')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2 transition-colors text-left"
                    >
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                        <ArrowLeftRight className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary text-sm font-medium truncate">
                          {t.symbol ?? t.type} — {t.notes ?? t.type}
                        </p>
                        <p className="text-text-muted text-xs">
                          {new Date(t.date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <span className="text-text-secondary text-sm font-mono shrink-0">
                        {formatCurrency(t.price, t.currency)}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Goals */}
              {results.goals.length > 0 && (
                <div>
                  <p className="px-4 py-1.5 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Objectifs</p>
                  {results.goals.map(g => (
                    <button
                      key={g.id}
                      onClick={() => navigate('/goals')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2 transition-colors text-left"
                    >
                      <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                        <Target className="w-3.5 h-3.5 text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary text-sm font-medium truncate">{g.name}</p>
                        <p className="text-text-muted text-xs">Objectif</p>
                      </div>
                      <span className="text-text-secondary text-sm font-mono shrink-0">
                        {formatCurrency(g.targetValue, g.currency)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer shortcut hint */}
        <div className="px-4 py-2 border-t border-border flex items-center gap-3 text-[10px] text-text-muted">
          <span><kbd className="font-mono bg-surface-2 border border-border rounded px-1">↑↓</kbd> naviguer</span>
          <span><kbd className="font-mono bg-surface-2 border border-border rounded px-1">↵</kbd> ouvrir</span>
          <span><kbd className="font-mono bg-surface-2 border border-border rounded px-1">⌘K</kbd> fermer</span>
        </div>
      </div>
    </div>
  )
}
