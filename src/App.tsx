import { useEffect, useState } from 'react'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { initializeCommandSystem } from './lib/commands'
import { initializeLanguage } from './i18n/language-init'
import { logger } from './lib/logger'
import { cleanupOldFiles } from './lib/recovery'
import { commands } from './lib/tauri-bindings'
import './App.css'
import { MainWindow } from './components/layout/MainWindow'
import { SplashScreen } from './components/splash'
import { ThemeProvider } from './components/ThemeProvider'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useSquareCornersEffect } from './hooks/useSquareCornersEffect'

function App() {
  useSquareCornersEffect()
  const [isAppReady, setIsAppReady] = useState(false)

  useEffect(() => {
    logger.info('🚀 Frontend application starting up')

    const initApp = async () => {
      initializeCommandSystem()
      logger.debug('Command system initialized')

      try {
        const result = await commands.loadPreferences()
        const savedLanguage =
          result.status === 'ok' ? result.data.language : null
        await initializeLanguage(savedLanguage)
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

    const checkForUpdates = async () => {
      try {
        const update = await check()
        if (update) {
          logger.info(`Update available: ${update.version}`)

          const shouldUpdate = confirm(
            `Update available: ${update.version}\n\nWould you like to install this update now?`
          )

          if (shouldUpdate) {
            try {
              await update.downloadAndInstall(event => {
                switch (event.event) {
                  case 'Started':
                    logger.info(`Downloading ${event.data.contentLength} bytes`)
                    break
                  case 'Progress':
                    logger.info(`Downloaded: ${event.data.chunkLength} bytes`)
                    break
                  case 'Finished':
                    logger.info('Download complete, installing...')
                    break
                }
              })

              const shouldRestart = confirm(
                'Update completed successfully!\n\nWould you like to restart the app now to use the new version?'
              )

              if (shouldRestart) {
                await relaunch()
              }
            } catch (updateError) {
              logger.error(`Update installation failed: ${String(updateError)}`)
              alert(
                `Update failed: There was a problem with the automatic download.\n\n${String(updateError)}`
              )
            }
          }
        }
      } catch (checkError) {
        logger.error(`Update check failed: ${String(checkError)}`)
      }
    }

    const updateTimer = setTimeout(checkForUpdates, 5000)
    return () => clearTimeout(updateTimer)
  }, [])

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <SplashScreen isReady={isAppReady} minDuration={3000} />
        <MainWindow />
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
