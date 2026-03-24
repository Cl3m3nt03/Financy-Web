'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { SessionProvider, useSession } from 'next-auth/react'
import { useState } from 'react'
import { FinanceAssistant } from '@/components/assistant/finance-assistant'
import { AlertsChecker } from '@/components/alerts-checker'

function AssistantGate() {
  const { data: session } = useSession()
  if (!session?.user) return null
  return (
    <>
      <FinanceAssistant />
      <AlertsChecker />
    </>
  )
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <AssistantGate />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </SessionProvider>
  )
}
