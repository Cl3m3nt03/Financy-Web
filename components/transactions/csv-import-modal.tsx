'use client'

import { useState, useRef } from 'react'
import { X, Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

interface Props { onClose: () => void }

const SUPPORTED_BANKS = ['Revolut', 'N26', 'Boursorama', 'Fortuneo', 'CSV générique']

export function CsvImportModal({ onClose }: Props) {
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ imported: number } | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f?.name.endsWith('.csv')) setFile(f)
    else setError('Seuls les fichiers .csv sont acceptés.')
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) { setFile(f); setError('') }
  }

  async function handleImport() {
    if (!file) return
    setLoading(true)
    setError('')
    setResult(null)

    const form = new FormData()
    form.append('file', file)

    try {
      const res = await fetch('/api/transactions/import', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erreur d\'import.'); return }
      setResult(data)
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    } catch {
      setError('Impossible d\'importer le fichier.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-text-primary font-semibold flex items-center gap-2">
            <Upload className="w-4 h-4 text-accent" /> Import CSV
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Supported banks */}
          <div className="flex flex-wrap gap-1.5">
            {SUPPORTED_BANKS.map(b => (
              <span key={b} className="text-xs px-2.5 py-1 bg-accent/10 text-accent rounded-lg font-medium">{b}</span>
            ))}
          </div>

          {/* Drop zone */}
          {!result && (
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
                dragging ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50 hover:bg-surface-2',
                file && 'border-accent/50 bg-accent/5'
              )}>
              <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="w-8 h-8 text-accent" />
                  <div className="text-left">
                    <p className="text-text-primary font-medium text-sm">{file.name}</p>
                    <p className="text-text-muted text-xs">{(file.size / 1024).toFixed(1)} Ko</p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-text-muted mx-auto mb-2" />
                  <p className="text-text-secondary text-sm font-medium">Glissez votre fichier CSV ici</p>
                  <p className="text-text-muted text-xs mt-1">ou cliquez pour parcourir</p>
                </>
              )}
            </div>
          )}

          {/* Success */}
          {result && (
            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
              <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <p className="text-emerald-400 font-semibold">{result.imported} transactions importées</p>
                <p className="text-text-muted text-xs mt-0.5">Retrouvez-les dans l'historique des transactions.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-2.5 border border-border text-text-secondary hover:text-text-primary rounded-xl text-sm transition-colors">
              {result ? 'Fermer' : 'Annuler'}
            </button>
            {!result && (
              <button onClick={handleImport} disabled={!file || loading}
                className="flex-1 py-2.5 bg-accent hover:bg-accent-dark disabled:opacity-40 text-background rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Importer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
