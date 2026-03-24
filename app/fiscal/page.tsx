'use client'

import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, cn } from '@/lib/utils'
import { Receipt, TrendingUp, ChevronDown, ChevronUp, Info, Download, FileText, Copy, Check, CalendarDays } from 'lucide-react'
import { FiscalCalendar } from '@/components/fiscal/fiscal-calendar'

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
  const [copiedCase, setCopiedCase] = useState<string | null>(null)

  const copyValue = useCallback((caseId: string, value: number) => {
    navigator.clipboard.writeText(value.toFixed(2).replace('.', ','))
    setCopiedCase(caseId)
    setTimeout(() => setCopiedCase(null), 2000)
  }, [])

  const { data, isLoading } = useQuery<FiscalData>({
    queryKey: ['fiscal', year],
    queryFn: () => fetch(`/api/fiscal?year=${year}`).then(r => r.json()),
  })

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Rapport fiscal" subtitle="Plus-values, dividendes et estimations d'impot" />

      <div className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-8xl">

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-text-secondary text-sm shrink-0">Année</span>
            <div className="overflow-x-auto">
              <div className="flex gap-1.5 w-max">
                {years.map(y => (
                  <button
                    key={y}
                    onClick={() => setYear(y)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-sm font-medium transition-colors border whitespace-nowrap',
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
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 border border-border hover:border-accent/50 text-text-secondary hover:text-accent px-3 py-2 rounded-xl text-sm font-medium transition-colors print:hidden shrink-0"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exporter PDF</span>
            <span className="sm:hidden">PDF</span>
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

            {/* 2042-C Helper */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="w-4 h-4 text-accent" />
                  Guide déclaration 2042-C — cases à remplir
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-text-muted text-xs">
                  Copiez les montants directement dans votre déclaration en ligne (impots.gouv.fr).
                </p>
                <div className="space-y-2">
                  {[
                    {
                      id: '3VG',
                      label: 'Case 3VG — Plus-values et gains imposables (CTO)',
                      value: Math.max(0, data.plusValues.cto),
                      desc: 'Plus-values nettes réalisées sur votre CTO',
                      highlight: data.plusValues.cto > 0,
                    },
                    {
                      id: '3VH',
                      label: 'Case 3VH — Moins-values',
                      value: Math.abs(Math.min(0, data.plusValues.cto)),
                      desc: 'Moins-values nettes (si votre CTO est en perte)',
                      highlight: data.plusValues.cto < 0,
                    },
                    {
                      id: '2DC',
                      label: 'Case 2DC — Dividendes bruts',
                      value: data.dividends.total,
                      desc: 'Dividendes perçus hors PEA',
                      highlight: data.dividends.total > 0,
                    },
                    {
                      id: '2CG',
                      label: 'Case 2CG — CSG déductible',
                      value: data.dividends.total * 0.068,
                      desc: '6,8% des dividendes (si option barème progressif)',
                      highlight: false,
                    },
                  ].map(row => (
                    <div
                      key={row.id}
                      className={cn(
                        'flex items-center justify-between px-4 py-3 rounded-xl border transition-colors',
                        row.highlight && row.value > 0
                          ? 'bg-accent/5 border-accent/20'
                          : 'bg-surface-2 border-border'
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary text-sm font-medium">{row.label}</p>
                        <p className="text-text-muted text-xs mt-0.5">{row.desc}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        <span className={cn(
                          'font-mono font-bold text-sm',
                          row.value > 0 ? 'text-accent' : 'text-text-muted'
                        )}>
                          {row.value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                        </span>
                        <button
                          onClick={() => copyValue(row.id, row.value)}
                          className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors px-2 py-1 rounded-lg hover:bg-surface border border-border"
                        >
                          {copiedCase === row.id
                            ? <><Check className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">Copié</span></>
                            : <><Copy className="w-3 h-3" /><span>Copier</span></>
                          }
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl px-4 py-3 space-y-1.5">
                  <p className="text-blue-400 text-xs font-semibold">PEA — rien à déclarer</p>
                  <p className="text-text-muted text-xs">
                    Les plus-values et dividendes du PEA sont exonérés d&apos;IR après 5 ans.
                    Seuls les prélèvements sociaux (17,2%) s&apos;appliquent lors des retraits.
                    {data.plusValues.pea > 0 && ` Vos plus-values PEA de ${formatCurrency(data.plusValues.pea)} restent hors déclaration.`}
                  </p>
                </div>
                <div className="flex items-start gap-2 text-xs text-text-muted bg-surface-2 rounded-xl px-4 py-3">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-accent" />
                  <span>Estimation indicative. Votre établissement financier vous enverra un IFU (Imprimé Fiscal Unique) en février avec les montants officiels.</span>
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

        {/* Calendrier fiscal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="w-4 h-4 text-accent" />
              Calendrier fiscal {year}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FiscalCalendar year={year} />
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
