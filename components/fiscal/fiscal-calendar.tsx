'use client'

import { CalendarDays, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FiscalEvent {
  date: string   // MM-DD
  label: string
  detail: string
  category: 'declaration' | 'paiement' | 'info'
  important?: boolean
}

const FISCAL_EVENTS: FiscalEvent[] = [
  // Déclarations revenus
  { date: '04-01', label: 'Ouverture déclaration revenus', detail: 'La déclaration en ligne des revenus N-1 ouvre début avril sur impots.gouv.fr', category: 'declaration' },
  { date: '05-20', label: 'Clôture déclaration (zone 1)', detail: 'Délais pour les départements 01–19 et non-résidents', category: 'declaration', important: true },
  { date: '05-27', label: 'Clôture déclaration (zone 2)', detail: 'Délais pour les départements 20–54', category: 'declaration', important: true },
  { date: '06-03', label: 'Clôture déclaration (zone 3)', detail: 'Délais pour les départements 55–976', category: 'declaration', important: true },

  // PFU / acomptes
  { date: '02-15', label: 'Acompte de PFU — 1er terme', detail: 'Premier acompte de prélèvement forfaitaire unique sur dividendes et intérêts', category: 'paiement' },
  { date: '11-15', label: 'Acompte de PFU — 2e terme', detail: 'Deuxième acompte de prélèvement forfaitaire unique', category: 'paiement' },

  // Impôt sur le revenu
  { date: '09-15', label: 'Solde impôt sur le revenu', detail: 'Paiement du solde de l\'IR N-1 ou mise à jour du prélèvement à la source', category: 'paiement', important: true },

  // IFI
  { date: '06-15', label: 'Déclaration IFI', detail: 'Dépôt de la déclaration IFI si patrimoine net taxable > 1,3M€ (dans la déclaration IR)', category: 'declaration' },

  // Clôture PEA
  { date: '01-01', label: 'Anniversaire PEA 5 ans', detail: 'Après 5 ans : retraits sans impôt sur les plus-values (hors prélèvements sociaux)', category: 'info' },

  // Plus-values
  { date: '01-31', label: 'Relevé fiscal courtier', detail: 'Réception de l\'IFU (Imprimé Fiscal Unique) par votre courtier', category: 'info' },

  // Prélèvements sociaux cryptos
  { date: '05-20', label: 'Déclaration plus-values crypto', detail: 'Formulaire 2086 à joindre à la déclaration de revenus', category: 'declaration' },
]

function getMonthLabel(month: number) {
  return new Date(2024, month - 1).toLocaleDateString('fr-FR', { month: 'long' })
}

export function FiscalCalendar({ year }: { year: number }) {
  const today = new Date()
  const todayMMDD = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const CATEGORY_STYLES = {
    declaration: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', dot: '#3B82F6', label: 'Déclaration' },
    paiement:    { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', dot: '#F59E0B', label: 'Paiement' },
    info:        { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', dot: '#10B981', label: 'Info' },
  }

  // Group by month
  const byMonth: Record<number, FiscalEvent[]> = {}
  for (const e of FISCAL_EVENTS) {
    const month = parseInt(e.date.split('-')[0])
    if (!byMonth[month]) byMonth[month] = []
    byMonth[month].push(e)
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(CATEGORY_STYLES).map(([key, style]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: style.dot }} />
            <span className="text-xs text-text-muted">{style.label}</span>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {Array.from({ length: 12 }, (_, i) => i + 1)
          .filter(m => byMonth[m])
          .map(month => (
            <div key={month}>
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 pl-1">
                {getMonthLabel(month)} {year}
              </h4>
              <div className="space-y-2">
                {(byMonth[month] ?? [])
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((event, i) => {
                    const style = CATEGORY_STYLES[event.category]
                    const eventMMDD = event.date
                    const isPast = eventMMDD < todayMMDD
                    const isToday = eventMMDD === todayMMDD
                    const isUpcoming = !isPast && !isToday

                    // Day of month
                    const day = event.date.split('-')[1]
                    const fullDate = `${day}/${String(month).padStart(2, '0')}/${year}`

                    return (
                      <div
                        key={i}
                        className={cn(
                          'flex items-start gap-3 p-3 rounded-xl border transition-all',
                          style.bg, style.border,
                          event.important && 'ring-1 ring-offset-0',
                          isPast && 'opacity-50'
                        )}
                        style={event.important ? { '--tw-ring-color': style.dot } as any : {}}
                      >
                        {/* Date badge */}
                        <div className={cn(
                          'shrink-0 w-10 h-10 rounded-xl flex flex-col items-center justify-center text-center',
                          style.bg, 'border', style.border
                        )}>
                          <span className="text-[10px] text-text-muted leading-none">{String(month).padStart(2, '0')}</span>
                          <span className={cn('text-base font-bold leading-tight', style.text)}>{day}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={cn('text-sm font-semibold', style.text)}>{event.label}</p>
                            {event.important && (
                              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase', style.bg, style.text, 'border', style.border)}>
                                Important
                              </span>
                            )}
                            {isPast && <CheckCircle2 className="w-3.5 h-3.5 text-text-muted opacity-60" />}
                            {isToday && <AlertCircle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />}
                          </div>
                          <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{event.detail}</p>
                          <p className="text-[10px] text-text-muted opacity-60 mt-1 font-mono">{fullDate}</p>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          ))}
      </div>

      <p className="text-xs text-text-muted opacity-50 text-right">
        Dates indicatives — vérifiez sur impots.gouv.fr pour les délais exacts
      </p>
    </div>
  )
}
