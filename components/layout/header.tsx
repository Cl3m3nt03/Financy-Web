'use client'

import { useSession } from 'next-auth/react'
import { Bell, RefreshCw } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

interface HeaderProps {
  title: string
  subtitle?: string
  children?: React.ReactNode
  alertCount?: number
}

export function Header({ title, subtitle, children, alertCount }: HeaderProps) {
  const { data: session } = useSession()
  const queryClient = useQueryClient()

  function handleRefresh() {
    queryClient.invalidateQueries()
  }

  return (
    <header className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface/60 backdrop-blur-md sticky top-0 z-40">
      <div>
        <h1 className="text-lg font-semibold text-text-primary tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2">
        {children}

        <button
          onClick={handleRefresh}
          title="Actualiser"
          className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-secondary hover:text-accent hover:border-accent/30 transition-all duration-150"
        >
          <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>

        <button
          className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-secondary hover:text-accent hover:border-accent/30 transition-all duration-150 relative"
          title="Notifications"
        >
          <Bell className="w-3.5 h-3.5" strokeWidth={1.5} />
          {(alertCount ?? 0) > 0 ? (
            <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-0.5 rounded-full bg-ruby text-white text-[8px] font-bold flex items-center justify-center">
              {alertCount}
            </span>
          ) : (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent" />
          )}
        </button>

        <div className="flex items-center gap-2 pl-2 border-l border-border">
          <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
            <span className="text-[11px] font-semibold text-accent font-mono">
              {session?.user?.name?.[0]?.toUpperCase() ?? 'U'}
            </span>
          </div>
          <span className="text-xs text-text-secondary hidden sm:block font-medium">
            {session?.user?.name ?? session?.user?.email}
          </span>
        </div>
      </div>
    </header>
  )
}
