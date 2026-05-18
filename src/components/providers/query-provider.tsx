'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute — data is fresh for 1 min
            gcTime: 5 * 60 * 1000, // 5 minutes — cache kept for 5 min
            refetchOnWindowFocus: false, // Don't refetch when tab regains focus
            refetchOnReconnect: true, // Refetch when network reconnects
            retry: 1, // Only retry once on failure
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
