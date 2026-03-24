'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Wallet, TrendingUp, Target, BarChart3,
  ChevronRight, Sparkles, Building2, Bitcoin, PiggyBank,
} from 'lucide-react'

const STEPS = [
  {
    icon: Wallet,
    color: '#3B82F6',
    title: 'Vos comptes bancaires',
    desc: 'Compte courant, Livret A, LDDS — ajoutez tous vos comptes pour avoir une vision complète.',
    href: '/assets',
  },
  {
    icon: TrendingUp,
    color: '#8B5CF6',
    title: 'Vos investissements',
    desc: 'PEA, CTO, actions, ETF — suivez vos positions et performances en temps réel.',
    href: '/portfolio',
  },
  {
    icon: Bitcoin,
    color: '#F97316',
    title: 'Crypto & autres actifs',
    desc: 'Bitcoin, Ethereum, NFT, métaux précieux — centralisez tout en un seul endroit.',
    href: '/assets',
  },
  {
    icon: Building2,
    color: '#F59E0B',
    title: 'Immobilier',
    desc: 'Résidence principale, investissements locatifs — estimez la valeur de votre patrimoine immobilier.',
    href: '/assets',
  },
]

export function Onboarding() {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const Icon = current.icon

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
      {/* Animated icon */}
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-lg"
        style={{ background: current.color + '20', border: `1px solid ${current.color}30` }}
      >
        <Icon className="w-10 h-10 transition-all duration-300" style={{ color: current.color }} />
      </div>

      {/* Sparkles badge */}
      <div className="flex items-center gap-1.5 px-3 py-1 bg-accent/10 border border-accent/20 rounded-full text-xs font-medium text-accent mb-4">
        <Sparkles className="w-3 h-3" />
        Bienvenue sur Finexa
      </div>

      <h1 className="text-2xl font-bold text-text-primary mb-2">
        {step === 0 ? 'Commencez par vos actifs' : current.title}
      </h1>
      <p className="text-text-muted text-sm max-w-sm leading-relaxed mb-8">
        {step === 0
          ? 'Finexa centralise tout votre patrimoine : comptes, investissements, immobilier et crypto. Commencez par ajouter vos premiers actifs.'
          : current.desc
        }
      </p>

      {/* Step dots */}
      <div className="flex gap-2 mb-8">
        {STEPS.map((_, i) => (
          <button
            key={i}
            onClick={() => setStep(i)}
            className="transition-all duration-300"
          >
            <span
              className={`block rounded-full transition-all duration-300 ${
                i === step ? 'w-6 h-2 bg-accent' : 'w-2 h-2 bg-surface-2'
              }`}
            />
          </button>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
        <Link
          href="/assets"
          className="flex-1 flex items-center justify-center gap-2 bg-accent hover:bg-blue-600 text-obsidian px-6 py-3 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-accent/20"
        >
          <Wallet className="w-4 h-4" />
          Ajouter mes actifs
        </Link>
        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            className="flex-1 flex items-center justify-center gap-2 bg-surface-2 hover:bg-surface border border-border text-text-secondary px-6 py-3 rounded-xl text-sm font-medium transition-colors"
          >
            Suivant
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <Link
            href="/assets"
            className="flex-1 flex items-center justify-center gap-2 bg-surface-2 hover:bg-surface border border-border text-text-secondary px-6 py-3 rounded-xl text-sm font-medium transition-colors"
          >
            <Target className="w-4 h-4" />
            Voir mes objectifs
          </Link>
        )}
      </div>

      {/* Quick links */}
      <div className="mt-10 grid grid-cols-2 gap-3 w-full max-w-sm">
        {[
          { icon: PiggyBank, label: 'Ajouter épargne', href: '/assets', color: '#10B981' },
          { icon: BarChart3, label: 'Mon portefeuille', href: '/portfolio', color: '#8B5CF6' },
          { icon: Target,    label: 'Mes objectifs',   href: '/goals',    color: '#C9A84C' },
          { icon: TrendingUp, label: 'Simulateur',     href: '/simulator', color: '#3B82F6' },
        ].map(({ icon: I, label, href, color }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2.5 p-3 bg-surface border border-border rounded-xl hover:border-zinc-600 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + '15' }}>
              <I className="w-4 h-4" style={{ color }} />
            </div>
            <span className="text-text-secondary text-xs font-medium">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
