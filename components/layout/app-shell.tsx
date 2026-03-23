'use client'

import { Sidebar } from './sidebar'
import { BottomNav } from './bottom-nav'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 lg:ml-64 flex flex-col min-h-screen pb-nav lg:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
