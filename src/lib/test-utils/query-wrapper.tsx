import { type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })
}

interface QueryWrapperProps {
  children: ReactNode
  client?: QueryClient
}

export function QueryWrapper({
  children,
  client = createTestQueryClient(),
}: QueryWrapperProps) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
