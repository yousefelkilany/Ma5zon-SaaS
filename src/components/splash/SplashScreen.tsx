import { useEffect, useState } from 'react'
import { Banknote, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'
import { useTranslation } from 'react-i18next'

interface SplashScreenProps {
  isReady: boolean
  minDuration?: number
}

function SplashScreen({ isReady, minDuration = 1000 }: SplashScreenProps) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(true)
  const [logoError, setLogoError] = useState(false)

  useEffect(() => {
    const startTime = Date.now()

    const checkReady = () => {
      const elapsed = Date.now() - startTime
      if (isReady && elapsed >= minDuration) {
        setVisible(false)
      }
    }

    const interval = setInterval(checkReady, 100)
    return () => clearInterval(interval)
  }, [isReady, minDuration])

  if (!visible) return null

  const LogoIcon: LucideIcon = Banknote

  return (
    <div
      className={cn(
        'fixed inset-0 z-100 flex flex-col items-center justify-center bg-background transition-opacity duration-500 ease-out',
        !visible && 'opacity-0 pointer-events-none'
      )}
    >
      <main className="flex flex-1 flex-col items-center justify-center space-y-8">
        <div className="h-30 w-30 flex items-center justify-center">
          {!logoError ? (
            <img
              src={new URL('@/assets/logo.svg', import.meta.url).href}
              alt={t('titlebar.logo')}
              className="h-full w-full object-contain"
              onError={() => setLogoError(true)}
            />
          ) : (
            <LogoIcon className="h-30 w-30 text-secondary" />
          )}
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {t('titlebar.appName')}
          </h1>
          <p className="text-base text-muted-foreground opacity-70">
            {t('splash.loadingCaption')}
          </p>
        </div>

        <div className="flex items-center justify-center pt-12">
          <Spinner className="h-6 w-6 text-secondary" />
        </div>
      </main>

      <footer className="flex w-full justify-center pb-10">
        <p className="text-sm text-muted-foreground opacity-50">
          © 2026 {t('titlebar.appName')} v0.1.0
        </p>
      </footer>
    </div>
  )
}

export { SplashScreen }
export type { SplashScreenProps }
