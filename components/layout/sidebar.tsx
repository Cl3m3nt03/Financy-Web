'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  Wallet,
  Settings,
  LogOut,
  Gem,
  LineChart,
  Target,
  ArrowLeftRight,
  Receipt,
  Calculator,
  PiggyBank,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/theme-toggle'

const navItems = [
  { href: '/dashboard',    icon: LayoutDashboard, label: 'Tableau de bord' },
  { href: '/assets',       icon: Wallet,          label: 'Mes actifs'      },
  { href: '/portfolio',    icon: LineChart,        label: 'Portefeuille'    },
  { href: '/transactions', icon: ArrowLeftRight,  label: 'Transactions'    },
  { href: '/fiscal',       icon: Receipt,         label: 'Rapport fiscal'  },
  { href: '/simulator',    icon: Calculator,      label: 'Simulateur'      },
  { href: '/budget',       icon: PiggyBank,       label: 'Budget'          },
  { href: '/goals',        icon: Target,          label: 'Objectifs'       },
  { href: '/settings',     icon: Settings,        label: 'Paramètres'      },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-surface border-r border-border hidden lg:flex flex-col z-50">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        <div className="w-8 h-8 shrink-0">
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
            <polygon points="16,2 28,11 16,30 4,11" fill="none" stroke="#BDEFFF" strokeWidth="0.8" strokeOpacity="0.6" />
            <polygon points="16,2 22,11 16,11" fill="#BDEFFF" fillOpacity="0.25" stroke="#BDEFFF" strokeWidth="0.5" strokeOpacity="0.5" />
            <polygon points="16,2 10,11 16,11" fill="#BDEFFF" fillOpacity="0.12" stroke="#BDEFFF" strokeWidth="0.5" strokeOpacity="0.5" />
            <polygon points="16,2 28,11 22,11" fill="#BDEFFF" fillOpacity="0.08" stroke="#BDEFFF" strokeWidth="0.5" strokeOpacity="0.4" />
            <polygon points="16,2 4,11 10,11" fill="#BDEFFF" fillOpacity="0.15" stroke="#BDEFFF" strokeWidth="0.5" strokeOpacity="0.4" />
            <polygon points="16,11 22,11 16,30" fill="#BDEFFF" fillOpacity="0.18" stroke="#BDEFFF" strokeWidth="0.5" strokeOpacity="0.4" />
            <polygon points="16,11 10,11 16,30" fill="#BDEFFF" fillOpacity="0.08" stroke="#BDEFFF" strokeWidth="0.5" strokeOpacity="0.3" />
            <polygon points="28,11 22,11 16,30" fill="#BDEFFF" fillOpacity="0.05" stroke="#BDEFFF" strokeWidth="0.5" strokeOpacity="0.3" />
            <polygon points="4,11 10,11 16,30" fill="#BDEFFF" fillOpacity="0.10" stroke="#BDEFFF" strokeWidth="0.5" strokeOpacity="0.3" />
            <line x1="4" y1="11" x2="28" y2="11" stroke="#BDEFFF" strokeWidth="0.8" strokeOpacity="0.5" />
          </svg>
        </div>
        <span className="font-semibold text-text-primary tracking-tight">Finexa</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-accent/8 text-accent border border-accent/12'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-2 border border-transparent'
              )}
            >
              <item.icon
                className={cn('w-4 h-4 shrink-0 transition-colors', isActive ? 'text-accent' : 'text-steel')}
                strokeWidth={1.5}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-border space-y-0.5">
        <ThemeToggle />
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-text-secondary hover:text-ruby hover:bg-ruby/8 border border-transparent transition-all duration-150"
        >
          <LogOut className="w-4 h-4 shrink-0" strokeWidth={1.5} />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
