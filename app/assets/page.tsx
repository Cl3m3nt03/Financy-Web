'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Building2, Wallet, TrendingUp, Bitcoin, PiggyBank, Package, Home } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AssetForm } from '@/components/assets/asset-form'
import { useAssets, useDeleteAsset } from '@/hooks/use-assets'
import { MOCK_ASSETS } from '@/services/mock-data'
import { Asset } from '@/types'
import { formatCurrency, getAssetTypeLabel, getAssetTypeColor, cn } from '@/lib/utils'

const TYPE_ICONS: Record<string, any> = {
  BANK_ACCOUNT: Wallet,
  SAVINGS: PiggyBank,
  REAL_ESTATE: Building2,
  STOCK: TrendingUp,
  CRYPTO: Bitcoin,
  OTHER: Package,
}

const TYPE_BADGE_VARIANT: Record<string, any> = {
  BANK_ACCOUNT: 'info',
  SAVINGS: 'success',
  REAL_ESTATE: 'warning',
  STOCK: 'info',
  CRYPTO: 'warning',
  OTHER: 'default',
}

export default function AssetsPage() {
  const { data: assets } = useAssets()
  const deleteAsset = useDeleteAsset()
  const [showForm, setShowForm] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | undefined>()

  const displayAssets = assets ?? MOCK_ASSETS

  const total = displayAssets.reduce((sum, a) => sum + a.value, 0)

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cet actif ?')) return
    await deleteAsset.mutateAsync(id)
  }

  function handleEdit(asset: Asset) {
    setEditingAsset(asset)
    setShowForm(true)
  }

  function handleCloseForm() {
    setShowForm(false)
    setEditingAsset(undefined)
  }

  const grouped = displayAssets.reduce((acc, asset) => {
    if (!acc[asset.type]) acc[asset.type] = []
    acc[asset.type].push(asset)
    return acc
  }, {} as Record<string, Asset[]>)

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Mes actifs" subtitle={`${displayAssets.length} actifs · ${formatCurrency(total)}`} />

      <div className="flex-1 p-6 space-y-6">
        {/* Total + Add button */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-text-muted text-sm">Valeur totale</p>
            <p className="text-3xl font-bold text-text-primary font-mono">{formatCurrency(total)}</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-accent hover:bg-accent-dark text-obsidian px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Ajouter un actif
          </button>
        </div>

        {/* Assets by category */}
        {Object.entries(grouped).map(([type, typeAssets]) => {
          const Icon = TYPE_ICONS[type] ?? Package
          const typeTotal = typeAssets.reduce((sum, a) => sum + a.value, 0)
          const color = getAssetTypeColor(type)

          return (
            <div key={type}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '20', color }}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-text-primary font-semibold text-sm">{getAssetTypeLabel(type)}</h2>
                <div className="flex-1 h-px bg-border" />
                <span className="text-text-secondary text-sm font-mono">{formatCurrency(typeTotal)}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {typeAssets.map(asset => (
                  <Card key={asset.id} className="hover:border-zinc-700 transition-colors group">
                    <CardContent className="pt-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-text-primary font-semibold truncate">{asset.name}</p>
                          {asset.institution && (
                            <p className="text-text-muted text-xs mt-0.5">{asset.institution}</p>
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                          <button
                            onClick={() => handleEdit(asset)}
                            className="w-7 h-7 rounded-lg bg-surface-2 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDelete(asset.id)}
                            className="w-7 h-7 rounded-lg bg-surface-2 flex items-center justify-center text-text-secondary hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-end justify-between">
                        <p className="text-2xl font-bold text-text-primary font-mono">
                          {formatCurrency(asset.value, asset.currency, true)}
                        </p>
                        <Badge variant={TYPE_BADGE_VARIANT[type]}>
                          {getAssetTypeLabel(type)}
                        </Badge>
                      </div>

                      {asset.notes && (
                        <p className="text-text-muted text-xs mt-3 line-clamp-2">{asset.notes}</p>
                      )}

                      {/* Immobilier: rental yield */}
                      {asset.type === 'REAL_ESTATE' && (() => {
                        const rentMatch = asset.notes?.match(/loyer[:\s]+(\d[\d\s]*)/i)
                        const monthlyRent = rentMatch ? parseFloat(rentMatch[1].replace(/\s/g, '')) : null
                        const grossYield = monthlyRent && asset.value > 0
                          ? (monthlyRent * 12 / asset.value) * 100
                          : null
                        return (
                          <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                            <div className="flex items-center gap-1.5 text-[10px] text-text-muted mb-1">
                              <Home className="w-3 h-3" />
                              <span className="font-medium uppercase tracking-wider">Immobilier</span>
                            </div>
                            {monthlyRent ? (
                              <>
                                <div className="flex justify-between text-xs">
                                  <span className="text-text-muted">Loyer mensuel</span>
                                  <span className="font-mono font-semibold text-emerald-400">{formatCurrency(monthlyRent, asset.currency, true)}/mois</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-text-muted">Rendement brut</span>
                                  <span className="font-mono font-semibold text-accent">{grossYield?.toFixed(2)}%</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-text-muted">Revenu annuel</span>
                                  <span className="font-mono text-text-secondary">{formatCurrency(monthlyRent * 12, asset.currency, true)}</span>
                                </div>
                              </>
                            ) : (
                              <p className="text-[10px] text-text-muted italic">
                                Ajoutez &quot;loyer: XXX&quot; dans les notes pour voir le rendement.
                              </p>
                            )}
                          </div>
                        )
                      })()}

                      {/* Holdings mini list */}
                      {asset.holdings && asset.holdings.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-border space-y-1.5">
                          {asset.holdings.slice(0, 3).map(h => (
                            <div key={h.id} className="flex items-center justify-between text-xs">
                              <span className="text-text-secondary font-medium">{h.symbol}</span>
                              <span className={cn('font-semibold font-mono', (h.pnl ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                                {(h.pnlPercent ?? 0) >= 0 ? '+' : ''}{(h.pnlPercent ?? 0).toFixed(1)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )
        })}

        {displayAssets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
              <Wallet className="w-8 h-8 text-text-muted" />
            </div>
            <p className="text-text-primary font-semibold mb-2">Aucun actif enregistré</p>
            <p className="text-text-muted text-sm mb-6">Commencez par ajouter vos comptes, investissements ou biens immobiliers.</p>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-accent hover:bg-accent-dark text-obsidian px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" />
              Ajouter mon premier actif
            </button>
          </div>
        )}
      </div>

      {showForm && <AssetForm onClose={handleCloseForm} editAsset={editingAsset} />}
    </div>
  )
}
