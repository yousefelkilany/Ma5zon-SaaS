import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { RouterProvider } from '@tanstack/react-router'
import { router } from '@/router'
import './App.css'
import './i18n'
import { queryClient } from './lib/query-client'
import { StrictMode } from 'react'
import { initializeCommandSystem } from './lib/commands'
import { logger } from './lib/logger'
import { loadUserPreferences } from './store/preferences-sync'
import { useUIStore } from './store/ui-store'
import i18n from './i18n'
import { cleanupOldFiles } from './lib/recovery'
import { AppInitializer } from './components/layout/AppInitializer'

if (import.meta.env.PROD) {
  document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('contextmenu', e => {
      e.preventDefault()
    })
  })
}

const initApp = async () => {
  logger.info('🚀 Frontend application starting up')

  initializeCommandSystem()
  logger.debug('Command system initialized')

  try {
    const loaded = await loadUserPreferences()
    useUIStore.getState().setUserPreferences(loaded)
    await i18n.changeLanguage(loaded.language)
    logger.info('User preferences loaded and i18n synced', {
      language: loaded.language,
    })
  } catch (error) {
    logger.warn('Failed to initialize language', { error })
  }

  try {
    await cleanupOldFiles()
  } catch (error) {
    logger.warn('Failed to cleanup old recovery files', { error })
  }

  useUIStore.getState().setAppReady(true)
}
initApp()

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <QueryClientProvider client={queryClient}>
    <StrictMode>
      <AppInitializer>
        <RouterProvider router={router} />
      </AppInitializer>
    </StrictMode>
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
)
