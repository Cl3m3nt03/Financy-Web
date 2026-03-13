import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, currency = 'EUR', compact = false): string {
  if (compact && Math.abs(value) >= 1000) {
    const formatter = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    })
    return formatter.format(value)
  }
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: 'always',
  }).format(value / 100)
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function getAssetTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    BANK_ACCOUNT: 'Compte bancaire',
    SAVINGS: 'Épargne',
    REAL_ESTATE: 'Immobilier',
    STOCK: 'Bourse',
    CRYPTO: 'Crypto',
    OTHER: 'Autre',
  }
  return labels[type] ?? type
}

export function getAssetTypeColor(type: string): string {
  const colors: Record<string, string> = {
    BANK_ACCOUNT: '#3B82F6',
    SAVINGS: '#10B981',
    REAL_ESTATE: '#F59E0B',
    STOCK: '#8B5CF6',
    CRYPTO: '#F97316',
    OTHER: '#6B7280',
  }
  return colors[type] ?? '#6B7280'
}

export function getPnlColor(value: number): string {
  if (value > 0) return 'text-emerald-400'
  if (value < 0) return 'text-red-400'
  return 'text-zinc-400'
}

export function getPnlPrefix(value: number): string {
  return value >= 0 ? '+' : ''
}
