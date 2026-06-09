// src/components/AppInitializer.tsx
import { useEffect } from 'react'
import { initializeCommandSystem } from '@/lib/commands'
import { loadUserPreferences } from '@/store/preferences-sync'
import { useUIStore } from '@/store/ui-store'
import i18n from '@/i18n/config'
import { logger } from '@/lib/logger'
import { cleanupOldFiles } from '@/lib/recovery'
import { SplashScreen } from '../splash'

export function AppInitializer({ children }: { children: React.ReactNode }) {
  const isAppReady = useUIStore(state => state.isAppReady)

  useEffect(() => {
    async function init() {
      logger.info('🚀 Frontend application starting up')
      initializeCommandSystem()

      const loaded = await loadUserPreferences()
      useUIStore.getState().setUserPreferences(loaded)
      await i18n.changeLanguage(loaded.language)
      await cleanupOldFiles()

      useUIStore.getState().setAppReady(true)
    }

    init()
  }, [])

  if (!isAppReady)
    return <SplashScreen isReady={isAppReady} minDuration={1500} />
  return <>{children}</>
}
