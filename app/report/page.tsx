'use client'

import { useEffect } from 'react'
import { usePortfolioStats } from '@/hooks/use-portfolio'
import { useAssets } from '@/hooks/use-assets'
import { MOCK_PORTFOLIO_STATS, MOCK_ASSETS } from '@/services/mock-data'
import { formatCurrency, getAssetTypeLabel } from '@/lib/utils'
import { Printer, X } from 'lucide-react'
import Link from 'next/link'

export default function ReportPage() {
  const { data: stats } = usePortfolioStats()
  const { data: assets } = useAssets()

  const s = stats ?? MOCK_PORTFOLIO_STATS
  const a = assets ?? MOCK_ASSETS

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const allHoldings = a.flatMap(asset => asset.holdings ?? [])

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Actions bar — hidden on print */}
      <div className="print:hidden flex items-center justify-between px-6 py-3 bg-zinc-900 border-b border-zinc-700">
        <span className="text-sm font-semibold text-white">Rapport patrimonial</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Printer className="w-4 h-4" />
            Télécharger PDF
          </button>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 px-3 py-2 text-zinc-400 hover:text-white text-sm transition-colors"
          >
            <X className="w-4 h-4" />
            Fermer
          </Link>
        </div>
      </div>

      {/* Report content */}
      <div className="max-w-3xl mx-auto px-8 py-10 print:py-6 print:px-6">

        {/* Header */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b border-zinc-200">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Rapport patrimonial</h1>
            <p className="text-zinc-500 text-sm mt-1">{today.charAt(0).toUpperCase() + today.slice(1)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Financy</p>
            <p className="text-xs text-zinc-400">Tableau de bord financier personnel</p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="border border-zinc-200 rounded-xl p-4">
            <p className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Patrimoine net</p>
            <p className="text-xl font-bold text-zinc-900 font-mono">{formatCurrency(s.totalValue)}</p>
          </div>
          <div className="border border-zinc-200 rounded-xl p-4">
            <p className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Capital investi</p>
            <p className="text-xl font-bold text-zinc-900 font-mono">{formatCurrency(s.totalInvested)}</p>
          </div>
          <div className={`border rounded-xl p-4 ${s.totalPnl >= 0 ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
            <p className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Plus-values</p>
            <p className={`text-xl font-bold font-mono ${s.totalPnl >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {s.totalPnl >= 0 ? '+' : ''}{formatCurrency(s.totalPnl)}
            </p>
            <p className={`text-xs mt-0.5 ${s.totalPnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {s.totalPnlPercent >= 0 ? '+' : ''}{s.totalPnlPercent.toFixed(2)}% rendement
            </p>
          </div>
        </div>

        {/* Allocation */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-3">
            Répartition par classe d'actif
          </h2>
          <div className="border border-zinc-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs text-zinc-500 font-medium">Classe</th>
                  <th className="text-right px-4 py-2.5 text-xs text-zinc-500 font-medium">Valeur</th>
                  <th className="text-right px-4 py-2.5 text-xs text-zinc-500 font-medium">Part</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {Object.entries(s.breakdown)
                  .filter(([, v]) => v > 0)
                  .sort(([, a], [, b]) => b - a)
                  .map(([key, value]) => {
                    const pct = s.totalValue > 0 ? (value / s.totalValue) * 100 : 0
                    return (
                      <tr key={key}>
                        <td className="px-4 py-2.5 text-zinc-700">{getAssetTypeLabel(key as any)}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-zinc-900">{formatCurrency(value)}</td>
                        <td className="px-4 py-2.5 text-right text-zinc-500">{pct.toFixed(1)}%</td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Assets */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-3">
            Mes actifs
          </h2>
          <div className="border border-zinc-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs text-zinc-500 font-medium">Nom</th>
                  <th className="text-left px-4 py-2.5 text-xs text-zinc-500 font-medium">Type</th>
                  <th className="text-right px-4 py-2.5 text-xs text-zinc-500 font-medium">Valeur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {a.map(asset => (
                  <tr key={asset.id}>
                    <td className="px-4 py-2.5 text-zinc-700 font-medium">{asset.name}</td>
                    <td className="px-4 py-2.5 text-zinc-500">{getAssetTypeLabel(asset.type)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-zinc-900">{formatCurrency(asset.value, asset.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Holdings */}
        {allHoldings.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-3">
              Positions ouvertes
            </h2>
            <div className="border border-zinc-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs text-zinc-500 font-medium">Titre</th>
                    <th className="text-right px-4 py-2.5 text-xs text-zinc-500 font-medium">Qté</th>
                    <th className="text-right px-4 py-2.5 text-xs text-zinc-500 font-medium">PRU</th>
                    <th className="text-right px-4 py-2.5 text-xs text-zinc-500 font-medium">Valeur</th>
                    <th className="text-right px-4 py-2.5 text-xs text-zinc-500 font-medium">P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {allHoldings.map(h => {
                    const cp     = h.currentPrice ?? h.avgBuyPrice
                    const pnl    = (cp - h.avgBuyPrice) * h.quantity
                    const pnlPct = h.avgBuyPrice > 0 ? ((cp - h.avgBuyPrice) / h.avgBuyPrice) * 100 : 0
                    return (
                      <tr key={h.id}>
                        <td className="px-4 py-2.5 text-zinc-700 font-medium">{h.symbol}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-zinc-500">{h.quantity}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-zinc-500">{formatCurrency(h.avgBuyPrice)}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-zinc-900">{formatCurrency((h.currentPrice ?? h.avgBuyPrice) * h.quantity)}</td>
                        <td className={`px-4 py-2.5 text-right font-mono font-semibold ${pnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {pnl >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Evolution history */}
        {s.history.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-3">
              Évolution mensuelle
            </h2>
            <div className="border border-zinc-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs text-zinc-500 font-medium">Période</th>
                    <th className="text-right px-4 py-2.5 text-xs text-zinc-500 font-medium">Valeur</th>
                    <th className="text-right px-4 py-2.5 text-xs text-zinc-500 font-medium">Variation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {s.history.slice(-12).map((point, i, arr) => {
                    const prev  = arr[i - 1]?.value ?? point.value
                    const delta = point.value - prev
                    const pct   = prev > 0 && i > 0 ? (delta / prev) * 100 : 0
                    return (
                      <tr key={point.date}>
                        <td className="px-4 py-2.5 text-zinc-700">{point.date}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-zinc-900">{formatCurrency(point.value)}</td>
                        <td className={`px-4 py-2.5 text-right font-mono text-xs ${i === 0 ? 'text-zinc-400' : delta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {i === 0 ? '—' : `${delta >= 0 ? '+' : ''}${pct.toFixed(2)}%`}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-zinc-200 flex items-center justify-between text-xs text-zinc-400">
          <span>Généré par Financy</span>
          <span>{new Date().toLocaleDateString('fr-FR')}</span>
        </div>
      </div>
    </div>
  )
}
