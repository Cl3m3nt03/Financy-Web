'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'

interface ParsedRow {
  name: string
  isin?: string
  quantity: number
  avgBuyPrice: number
}

interface Props {
  assetId:   string
  assetName: string
  onClose:   () => void
}

function parseNumber(s: string): number {
  // "1 234,56" → 1234.56  |  "1234.56" → 1234.56
  return parseFloat(s.replace(/\s/g, '').replace(',', '.')) || 0
}

function quickParse(csv: string): ParsedRow[] {
  // Remove BOM if present
  const text = csv.replace(/^\uFEFF/, '')
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []

  const sep = lines[0].split(';').length > lines[0].split(',').length ? ';' : ','
  const headers = lines[0].split(sep).map(h =>
    h.replace(/^["'\s]+|["'\s]+$/g, '').toLowerCase()
  )

  // Normalize accented chars for comparison
  const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

  function findCol(...candidates: string[]): number {
    for (const c of candidates) {
      const idx = headers.findIndex(h => norm(h).includes(norm(c)))
      if (idx >= 0) return idx
    }
    return -1
  }

  // More specific matchers first, generic last
  const colName = findCol('libelle', 'designation', 'instrument', 'name', 'titre')
  const colIsin = findCol('isin')  // Just "isin" — very targeted
  const colQty  = findCol('quantite', 'qte', 'nb titres', 'quantity', 'shares', 'nombre')
  const colPru  = findCol('pru', 'prix revient', 'cout moyen', 'average cost', 'avg price')

  // Debug: log headers + detected cols
  console.log('[CSV Import] headers:', headers)
  console.log('[CSV Import] cols → name:', colName, 'isin:', colIsin, 'qty:', colQty, 'pru:', colPru)

  const rows: ParsedRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(sep).map(p => p.replace(/^["'\s]+|["'\s]+$/g, '').trim())
    if (parts.length < 2) continue

    const name = colName >= 0 ? parts[colName] : parts[0]
    const rawIsin = colIsin >= 0 ? parts[colIsin] : undefined
    const qty  = colQty  >= 0 ? parseNumber(parts[colQty])  : 0
    const pru  = colPru  >= 0 ? parseNumber(parts[colPru])  : 0

    if (!name || norm(name).includes('total') || qty === 0) continue

    const cleanIsin = rawIsin?.toUpperCase().replace(/\s/g, '')
    const validIsin = cleanIsin && /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(cleanIsin) ? cleanIsin : undefined

    rows.push({ name, isin: validIsin, quantity: qty, avgBuyPrice: pru })
  }
  return rows
}

// Try reading a file with multiple encodings
function readFileWithFallback(file: File): Promise<string> {
  const encodings = ['UTF-8', 'windows-1252', 'ISO-8859-1']

  return new Promise((resolve, reject) => {
    let idx = 0

    function tryNext() {
      if (idx >= encodings.length) { reject(new Error('Cannot decode file')); return }
      const enc = encodings[idx++]
      const reader = new FileReader()
      reader.onload = e => {
        const text = e.target?.result as string
        // Heuristic: if we see common replacement char or gibberish on first line, try next
        const firstLine = text.split('\n')[0] ?? ''
        if (enc !== 'UTF-8' || !firstLine.includes('\uFFFD')) {
          resolve(text)
        } else {
          tryNext()
        }
      }
      reader.onerror = tryNext
      reader.readAsText(file, enc)
    }
    tryNext()
  })
}

export function HoldingsCsvImport({ assetId, assetName, onClose }: Props) {
  const [csvText,    setCsvText]    = useState<string | null>(null)
  const [fileName,   setFileName]   = useState<string | null>(null)
  const [preview,    setPreview]    = useState<ParsedRow[]>([])
  const [parseWarn,  setParseWarn]  = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [mode,       setMode]       = useState<'replace' | 'merge'>('replace')
  const [status,     setStatus]     = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [resultMsg,  setResultMsg]  = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  async function loadFile(file: File) {
    if (!file.name.match(/\.(csv|txt|tsv)$/i)) {
      setResultMsg('Fichier non supporté — utilisez un export .csv')
      setStatus('error')
      return
    }
    setFileName(file.name)
    setStatus('idle')
    setParseWarn(null)

    try {
      const text = await readFileWithFallback(file)
      setCsvText(text)
      const rows = quickParse(text)
      setPreview(rows)
      if (rows.length === 0) {
        setParseWarn('Aucune position détectée. Vérifiez que le fichier contient des colonnes : Libellé, ISIN, Quantité, PRU.')
      } else if (rows.some(r => !r.isin)) {
        setParseWarn(`${rows.filter(r => !r.isin).length} position(s) sans ISIN — le ticker sera déduit du nom.`)
      }
    } catch {
      setStatus('error')
      setResultMsg('Impossible de lire le fichier.')
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) loadFile(file)
    e.target.value = ''
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) loadFile(file)
  }, [])

  async function handleImport() {
    if (!csvText || preview.length === 0) return
    setStatus('loading')
    try {
      const res = await fetch(`/api/assets/${assetId}/import-holdings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: csvText, mode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Erreur ${res.status}`)
      setResultMsg(`${data.imported} position${data.imported > 1 ? 's' : ''} importée${data.imported > 1 ? 's' : ''} avec succès`)
      setStatus('success')
      queryClient.invalidateQueries({ queryKey: ['assets'] })
    } catch (err: any) {
      setResultMsg(err.message ?? 'Erreur lors de l\'import')
      setStatus('error')
    }
  }

  function reset() {
    setCsvText(null); setFileName(null); setPreview([])
    setStatus('idle'); setParseWarn(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian/80 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-text-primary font-semibold">Import CSV — {assetName}</h2>
            <p className="text-text-muted text-xs mt-0.5">Boursobank · Degiro · ou tout CSV standard</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-surface-2 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Guide */}
          <div className="bg-accent/5 border border-accent/15 rounded-xl p-3.5">
            <p className="text-accent text-xs font-semibold mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" strokeWidth={1.5} />
              Comment exporter depuis Boursobank
            </p>
            <ol className="text-text-muted text-xs space-y-0.5 list-decimal list-inside leading-relaxed">
              <li>Boursobank → <strong className="text-text-secondary">Mon PEA</strong> → <strong className="text-text-secondary">Portefeuille</strong></li>
              <li>Cliquez sur l'icône <strong className="text-text-secondary">téléchargement / Exporter</strong></li>
              <li>Choisissez <strong className="text-text-secondary">CSV</strong> — le fichier doit contenir Libellé, ISIN, Quantité, PRU</li>
            </ol>
          </div>

          {/* Drop zone */}
          {!csvText ? (
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all select-none',
                isDragging ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/40 hover:bg-surface-2'
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                <Upload className="w-5 h-5 text-accent" strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <p className="text-text-primary font-medium text-sm">Glissez votre fichier CSV ici</p>
                <p className="text-text-muted text-xs mt-1">ou cliquez pour sélectionner · .csv .txt</p>
              </div>
              <input ref={fileRef} type="file" accept=".csv,.txt,.tsv" className="hidden" onChange={onFileChange} />
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-surface-2 rounded-xl border border-border">
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-accent shrink-0" strokeWidth={1.5} />
                <span className="text-text-primary text-sm font-medium truncate">{fileName}</span>
                <span className="text-text-muted text-xs shrink-0">· {preview.length} position{preview.length > 1 ? 's' : ''}</span>
              </div>
              <button onClick={reset} className="text-text-muted hover:text-text-primary transition-colors ml-2 shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Parse warning */}
          {parseWarn && (
            <div className="flex items-start gap-2.5 p-3 bg-warning/8 border border-warning/20 rounded-xl">
              <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" strokeWidth={1.5} />
              <p className="text-warning text-xs leading-relaxed">{parseWarn}</p>
            </div>
          )}

          {/* Preview table */}
          {preview.length > 0 && (
            <div>
              <p className="text-text-muted text-[11px] uppercase tracking-wider font-medium mb-2">
                Aperçu · {preview.length} positions détectées
              </p>
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-surface-2">
                      <th className="text-left px-4 py-2.5 text-text-muted font-medium">Libellé</th>
                      <th className="text-left px-3 py-2.5 text-text-muted font-medium">ISIN</th>
                      <th className="text-right px-3 py-2.5 text-text-muted font-medium">Qté</th>
                      <th className="text-right px-4 py-2.5 text-text-muted font-medium">PRU</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 12).map((row, i) => (
                      <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-surface-2/50">
                        <td className="px-4 py-2.5 text-text-primary font-medium max-w-[160px] truncate">{row.name}</td>
                        <td className="px-3 py-2.5 font-mono">
                          {row.isin
                            ? <span className="text-accent">{row.isin}</span>
                            : <span className="text-text-muted text-[10px]">non détecté</span>
                          }
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-text-primary">
                          {row.quantity.toLocaleString('fr-FR', { maximumFractionDigits: 4 })}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-text-secondary">
                          {row.avgBuyPrice > 0 ? `${row.avgBuyPrice.toLocaleString('fr-FR', { maximumFractionDigits: 4 })} €` : '—'}
                        </td>
                      </tr>
                    ))}
                    {preview.length > 12 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-2 text-center text-text-muted text-[11px]">
                          + {preview.length - 12} autres…
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Mode */}
          {csvText && preview.length > 0 && (
            <div className="flex gap-2">
              {(['replace', 'merge'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn(
                    'flex-1 py-2.5 rounded-lg text-xs font-medium border transition-all',
                    mode === m
                      ? 'bg-accent/8 border-accent/20 text-accent'
                      : 'border-border text-text-muted hover:text-text-primary hover:bg-surface-2'
                  )}
                >
                  {m === 'replace' ? '🔄 Remplacer toutes les positions' : '➕ Ajouter aux existantes'}
                </button>
              ))}
            </div>
          )}

          {/* Result */}
          {status === 'success' && (
            <div className="flex items-center gap-2.5 p-3 bg-positive/10 border border-positive/20 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-positive shrink-0" strokeWidth={1.5} />
              <p className="text-positive text-sm font-medium">{resultMsg}</p>
            </div>
          )}
          {status === 'error' && (
            <div className="flex items-center gap-2.5 p-3 bg-ruby/10 border border-ruby/20 rounded-xl">
              <AlertCircle className="w-4 h-4 text-ruby shrink-0" strokeWidth={1.5} />
              <p className="text-ruby text-sm">{resultMsg}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex items-center justify-between gap-3">
          <p className="text-[11px] text-text-muted opacity-50">
            Cours live via Yahoo Finance après import
          </p>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-2 border border-border transition-all"
            >
              {status === 'success' ? 'Fermer' : 'Annuler'}
            </button>
            {status !== 'success' && (
              <button
                onClick={handleImport}
                disabled={!csvText || preview.length === 0 || status === 'loading'}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-accent hover:bg-accent-dark text-obsidian disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {status === 'loading'
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Import…</>
                  : <><Upload className="w-3.5 h-3.5" strokeWidth={1.5} /> Importer</>
                }
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
