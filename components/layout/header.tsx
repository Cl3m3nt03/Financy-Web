'use client'

import { useSession } from 'next-auth/react'
import { Bell, RefreshCw } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

interface HeaderProps {
  title: string
  subtitle?: string
  children?: React.ReactNode
}

export function Header({ title, subtitle, children }: HeaderProps) {
  const { data: session } = useSession()
  const queryClient = useQueryClient()

  function handleRefresh() {
    queryClient.invalidateQueries()
  }

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface/50 backdrop-blur-sm">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
        {subtitle && <p className="text-sm text-text-secondary mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {children}
        <button
          onClick={handleRefresh}
          className="w-9 h-9 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <button className="w-9 h-9 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface transition-colors relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent" />
        </button>
        <div className="flex items-center gap-2 pl-3 border-l border-border">
          <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center">
            <span className="text-xs font-semibold text-accent">
              {session?.user?.name?.[0]?.toUpperCase() ?? 'U'}
            </span>
          </div>
          <span className="text-sm text-text-secondary hidden sm:block">
            {session?.user?.name ?? session?.user?.email}
          </span>
        </div>
      </div>
    </header>
  )
}
