import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { BrowserRouter } from 'react-router-dom'
import './i18n'
import App from './App'
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
    <BrowserRouter>
      <App />
    </BrowserRouter>
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
)
