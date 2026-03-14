'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, cn } from '@/lib/utils'
import { Receipt, TrendingUp, ChevronDown, ChevronUp, Info, Download } from 'lucide-react'

interface FiscalLine {
  date: string
  symbol: string
  quantity: number
  sellPrice: number
  avgBuyPrice: number
  plusValue: number
  accountType: string
  exonere: boolean
}

interface DividendLine {
  date: string
  symbol: string | null
  amount: number
  currency: string
}

interface FiscalData {
  year: number
  plusValues: {
    total: number
    cto: number
    pea: number
    exoneres: number
    lines: FiscalLine[]
  }
  dividends: {
    total: number
    lines: DividendLine[]
  }
  tax: {
    taxableBase: number
    pfuAmount: number
    pfuRate: number
    peaExonereAmount: number
    irAmount: number
    socialAmount: number
  }
}

export default function FiscalPage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [showLines, setShowLines] = useState(false)

  const { data, isLoading } = useQuery<FiscalData>({
    queryKey: ['fiscal', year],
    queryFn: () => fetch(`/api/fiscal?year=${year}`).then(r => r.json()),
  })

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Rapport fiscal" subtitle="Plus-values, dividendes et estimations d'impot" />

      <div className="flex-1 p-6 space-y-6 max-w-8xl">

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-text-secondary text-sm">Ann&#233;e fiscale</span>
            <div className="flex gap-1.5">
              {years.map(y => (
                <button
                  key={y}
                  onClick={() => setYear(y)}
                  className={cn(
                    'px-3.5 py-1.5 rounded-xl text-sm font-medium transition-colors border',
                    year === y
                      ? 'bg-accent/10 border-accent text-accent'
                      : 'border-border text-text-muted hover:text-text-primary hover:border-accent/40'
                  )}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 border border-border hover:border-accent/50 text-text-secondary hover:text-accent px-4 py-2 rounded-xl text-sm font-medium transition-colors print:hidden"
          >
            <Download className="w-4 h-4" />
            Exporter PDF
          </button>
        </div>

        {isLoading && (
          <div className="text-text-muted text-sm">Calcul en cours...</div>
        )}

        {!isLoading && data && (
          <div className="space-y-6">

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-accent/30 bg-accent/5">
                <CardContent className="pt-5">
                  <p className="text-text-muted text-xs mb-1">Imp&ocirc;t estim&eacute; (PFU 30%)</p>
                  <p className="text-2xl font-bold font-mono text-accent">{formatCurrency(data.tax.pfuAmount)}</p>
                  <p className="text-text-muted text-xs mt-1">Base imposable : {formatCurrency(data.tax.taxableBase)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5">
                  <p className="text-text-muted text-xs mb-1">Plus-values r&eacute;alis&eacute;es</p>
                  <p className={cn('text-2xl font-bold font-mono', data.plusValues.total >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {data.plusValues.total >= 0 ? '+' : ''}{formatCurrency(data.plusValues.total)}
                  </p>
                  <p className="text-text-muted text-xs mt-1">
                    CTO : {formatCurrency(data.plusValues.cto)} &middot; PEA : {formatCurrency(data.plusValues.pea)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5">
                  <p className="text-text-muted text-xs mb-1">Dividendes per&ccedil;us</p>
                  <p className="text-2xl font-bold font-mono text-emerald-400">{formatCurrency(data.dividends.total)}</p>
                  <p className="text-text-muted text-xs mt-1">PEA exon&eacute;r&eacute;s (PS) : {formatCurrency(data.plusValues.exoneres)}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Receipt className="w-4 h-4 text-accent" />
                  D&eacute;composition du PFU
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-surface-2 rounded-xl p-4 space-y-2.5">
                  {[
                    { label: 'IR (12,8%)', val: data.tax.irAmount },
                    { label: 'Pr&eacute;l&egrave;vements sociaux (17,2%)', val: data.tax.socialAmount },
                    { label: 'PS PEA exon&eacute;r&eacute; IR', val: data.tax.peaExonereAmount },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between text-sm">
                      <span className="text-text-secondary" dangerouslySetInnerHTML={{ __html: r.label }} />
                      <span className="font-mono text-text-primary font-medium">{formatCurrency(r.val)}</span>
                    </div>
                  ))}
                  <div className="border-t border-border pt-2 flex justify-between text-sm font-semibold">
                    <span className="text-text-primary">Total estim&eacute;</span>
                    <span className="font-mono text-accent">{formatCurrency(data.tax.pfuAmount + data.tax.peaExonereAmount)}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-xs text-text-muted bg-surface-2 rounded-xl px-4 py-3">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-accent" />
                  <span>
                    Estimation indicative bas&eacute;e sur le PFU 30%.
                    Consultez un conseiller fiscal pour votre d&eacute;claration officielle.
                  </span>
                </div>
              </CardContent>
            </Card>

            {data.plusValues.lines.length > 0 && (
              <Card>
                <CardHeader>
                  <button
                    onClick={() => setShowLines(v => !v)}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <CardTitle className="flex items-center gap-2 text-base">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      D&eacute;tail des cessions ({data.plusValues.lines.length})
                    </CardTitle>
                    {showLines
                      ? <ChevronUp className="w-4 h-4 text-text-muted" />
                      : <ChevronDown className="w-4 h-4 text-text-muted" />
                    }
                  </button>
                </CardHeader>
                {showLines && (
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-text-muted text-xs">
                            <th className="text-left px-5 py-3 font-medium">Date</th>
                            <th className="text-left px-4 py-3 font-medium">Symbole</th>
                            <th className="text-left px-4 py-3 font-medium">Compte</th>
                            <th className="text-right px-4 py-3 font-medium">Qt&eacute;</th>
                            <th className="text-right px-4 py-3 font-medium">PRU</th>
                            <th className="text-right px-4 py-3 font-medium">Prix vente</th>
                            <th className="text-right px-5 py-3 font-medium">Plus-value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.plusValues.lines.map((l, i) => (
                            <tr key={i} className="border-b border-border/50 hover:bg-surface-2/50">
                              <td className="px-5 py-3 text-text-muted text-xs">
                                {new Date(l.date).toLocaleDateString('fr-FR')}
                              </td>
                              <td className="px-4 py-3 font-mono font-medium text-text-primary">{l.symbol}</td>
                              <td className="px-4 py-3">
                                <span className={cn(
                                  'text-xs px-2 py-0.5 rounded-lg font-medium',
                                  l.accountType === 'PEA' ? 'bg-accent/10 text-accent' : 'bg-purple-500/10 text-purple-400'
                                )}>
                                  {l.exonere ? 'PEA OK' : l.accountType}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-text-secondary">
                                {l.quantity.toLocaleString('fr-FR')}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-text-secondary">
                                {formatCurrency(l.avgBuyPrice)}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-text-secondary">
                                {formatCurrency(l.sellPrice)}
                              </td>
                              <td className={cn(
                                'px-5 py-3 text-right font-mono font-semibold',
                                l.plusValue >= 0 ? 'text-emerald-400' : 'text-red-400'
                              )}>
                                {l.plusValue >= 0 ? '+' : ''}{formatCurrency(l.plusValue)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                )}
              </Card>
            )}

            {data.dividends.lines.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Receipt className="w-4 h-4 text-accent" />
                    Dividendes per&ccedil;us
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-text-muted text-xs">
                        <th className="text-left px-5 py-3 font-medium">Date</th>
                        <th className="text-left px-4 py-3 font-medium">Symbole</th>
                        <th className="text-right px-5 py-3 font-medium">Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.dividends.lines.map((d, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-surface-2/50">
                          <td className="px-5 py-3 text-text-muted text-xs">
                            {new Date(d.date).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="px-4 py-3 font-mono font-medium text-text-primary">
                            {d.symbol ?? '-'}
                          </td>
                          <td className="px-5 py-3 text-right font-mono font-semibold text-accent">
                            +{formatCurrency(d.amount, d.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

            {data.plusValues.lines.length === 0 && data.dividends.lines.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-text-primary font-semibold mb-1">Aucune op&eacute;ration fiscale en {year}</p>
                <p className="text-text-muted text-sm">
                  Enregistrez vos ventes et dividendes dans les transactions.
                </p>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  )
}
