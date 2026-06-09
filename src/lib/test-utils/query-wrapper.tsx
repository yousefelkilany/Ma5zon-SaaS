import type { ReactNode } from 'react'
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createTestQueryClient } from './create-test-query-client'

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
