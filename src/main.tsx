import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { RouterProvider } from '@tanstack/react-router'
import { router } from '@/router'
import './i18n'
import { queryClient } from './lib/query-client'

if (import.meta.env.PROD) {
  document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('contextmenu', e => {
      e.preventDefault()
    })
  })
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} />
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
)