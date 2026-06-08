import { createRouter, createRoute, createRootRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { EntityWorkspace } from '@/components/entity'
import { DashboardContent, NewTabContent } from '@/components/tabs'
import { ThemeProvider } from '@/components/ThemeProvider'
import { SplashScreen } from '@/components/splash'
import { MainWindow } from '@/components/layout/MainWindow'
import { initializeCommandSystem } from '@/lib/commands'
import { loadUserPreferences } from '@/store/preferences-sync'
import { useUIStore } from '@/store/ui-store'
import i18n from '@/i18n/config'
import { logger } from '@/lib/logger'
import { cleanupOldFiles } from '@/lib/recovery'

function RootRouteComponent() {
  const [isAppReady, setIsAppReady] = useState(false)

  useEffect(() => {
    logger.info('🚀 Frontend application starting up')

    const initApp = async () => {
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

      setIsAppReady(true)
    }

    initApp()
  }, [])

  return (
    <ThemeProvider>
      <SplashScreen isReady={isAppReady} minDuration={1500} />
      <MainWindow />
    </ThemeProvider>
  )
}

const rootRoute = createRootRoute({
  component: RootRouteComponent,
})

const entityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/entity/:entityType',
  component: EntityWorkspace,
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: DashboardContent,
})

const newTabRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/new-tab',
  component: NewTabContent,
})

const salesInvoiceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sales-invoice',
  component: NewTabContent,
})

const purchaseInvoiceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/purchase-invoice',
  component: NewTabContent,
})

const catchAllRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '*',
  component: DashboardContent,
})

export const routeTree = rootRoute.addChildren([
  dashboardRoute,
  newTabRoute,
  salesInvoiceRoute,
  purchaseInvoiceRoute,
  entityRoute,
  catchAllRoute,
])

export const router = createRouter({
  routeTree,
})