'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  Wallet,
  Settings,
  LogOut,
  TrendingUpIcon,
  LineChart,
  Target,
  ArrowLeftRight,
  Receipt,
  Calculator,
  PiggyBank,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard',    icon: LayoutDashboard, label: 'Tableau de bord' },
  { href: '/assets',       icon: Wallet,          label: 'Mes actifs'      },
  { href: '/portfolio',    icon: LineChart,        label: 'Portefeuille'    },
  { href: '/transactions', icon: ArrowLeftRight,  label: 'Transactions'    },
  { href: '/fiscal',       icon: Receipt,         label: 'Rapport fiscal'  },
  { href: '/simulator',    icon: Calculator,      label: 'Simulateur'      },
  { href: '/budget',       icon: PiggyBank,       label: 'Budget'          },
  { href: '/goals',        icon: Target,          label: 'Objectifs'       },
  { href: '/settings',     icon: Settings,        label: 'Param\u00e8tres' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-surface border-r border-border flex flex-col z-50">
      <div className="flex items-center gap-3 px-6 py-6 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
          <TrendingUpIcon className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-text-primary">Wealth Tracker</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent/10 text-accent'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-border">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          D&eacute;connexion
        </button>
      </div>
    </aside>
  )
}
