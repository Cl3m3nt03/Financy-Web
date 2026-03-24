'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard, Wallet, LineChart, Target, MoreHorizontal,
  ArrowLeftRight, PiggyBank, Receipt, Calculator, Settings, LogOut, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/theme-toggle'

const MAIN_NAV = [
  { href: '/dashboard',    icon: LayoutDashboard, label: 'Accueil'   },
  { href: '/assets',       icon: Wallet,          label: 'Actifs'    },
  { href: '/portfolio',    icon: LineChart,        label: 'Bourse'    },
  { href: '/goals',        icon: Target,          label: 'Objectifs' },
]

const MORE_NAV = [
  { href: '/transactions', icon: ArrowLeftRight, label: 'Transactions'  },
  { href: '/budget',       icon: PiggyBank,      label: 'Budget'        },
  { href: '/fiscal',       icon: Receipt,        label: 'Rapport fiscal' },
  { href: '/simulator',    icon: Calculator,     label: 'Simulateur'    },
  { href: '/settings',     icon: Settings,       label: 'Paramètres'    },
]

export function BottomNav() {
  const pathname  = usePathname()
  const [open, setOpen] = useState(false)

  const isMoreActive = MORE_NAV.some(
    item => pathname === item.href || pathname.startsWith(item.href + '/')
  )

  return (
    <>
      {/* Bottom bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-surface border-t border-border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex h-14">
          {MAIN_NAV.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-1 flex-col items-center justify-end pb-2 gap-1 text-[10px] font-medium transition-colors',
                  isActive ? 'text-accent' : 'text-text-muted'
                )}
              >
                <item.icon className={cn('w-5 h-5 transition-transform', isActive && 'scale-110')} strokeWidth={1.5} />
                <span>{item.label}</span>
              </Link>
            )
          })}

          {/* More button */}
          <button
            onClick={() => setOpen(true)}
            className={cn(
              'flex flex-1 flex-col items-center justify-end pb-2 gap-1 text-[10px] font-medium transition-colors',
              isMoreActive ? 'text-accent' : 'text-text-muted'
            )}
          >
            <div className="relative">
              <MoreHorizontal className={cn('w-5 h-5', isMoreActive && 'scale-110')} strokeWidth={1.5} />
              {isMoreActive && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-accent" />
              )}
            </div>
            <span>Plus</span>
          </button>
        </div>
      </nav>

      {/* Drawer backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer panel */}
      <div className={cn(
        'fixed bottom-0 left-0 right-0 z-[70] lg:hidden bg-surface border-t border-border rounded-t-2xl transition-transform duration-300 ease-out',
        open ? 'translate-y-0' : 'translate-y-full'
      )}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Handle */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
          <span className="text-sm font-semibold text-text-primary">Navigation</span>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center text-text-secondary hover:text-text-primary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-1">
          {MORE_NAV.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                  isActive
                    ? 'bg-accent/10 text-accent border border-accent/20'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-2 border border-transparent'
                )}
              >
                <item.icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-accent' : 'text-text-muted')} strokeWidth={1.5} />
                {item.label}
              </Link>
            )
          })}
        </div>

        {/* Footer: theme + logout */}
        <div className="px-4 pb-4 pt-1 border-t border-border space-y-1">
          <ThemeToggle />
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-medium text-text-secondary hover:text-ruby hover:bg-ruby/8 border border-transparent transition-all"
          >
            <LogOut className="w-4 h-4 shrink-0" strokeWidth={1.5} />
            Déconnexion
          </button>
        </div>
      </div>
    </>
  )
}
