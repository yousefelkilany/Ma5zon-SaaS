import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'

interface RouterErrorComponentProps {
  error: unknown
}

export function RouterErrorComponent({ error }: RouterErrorComponentProps) {
  const { t } = useTranslation()
  const errorMessage =
    error instanceof Error ? error.message : t('errors.unknown')

  return (
    <div className="flex min-h-100 flex-col items-center justify-center bg-background p-8">
      <div className="w-full max-w-md text-center h-lvh overflow-y-scrol">
        <div className="mb-6">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {t('errors.route.title')}
          </h1>
          <p className="text-muted-foreground mb-6">
            {t('errors.route.description')}
          </p>
        </div>

        <div className="space-y-3">
          <Button onClick={() => window.location.reload()} className="w-full">
            {t('errors.reload')}
          </Button>
        </div>

        {import.meta.env.DEV && error instanceof Error && (
          <details className="mt-6 text-left overflow-y-scroll h-lvh">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              {t('errors.details')}
            </summary>
            <div className="mt-2 p-3 bg-muted rounded-md text-xs font-mono h-lvh overflow-y-scrol select-all">
              <div className="text-destructive font-semibold mb-1">
                {error.name}: {errorMessage}
              </div>
              {error.stack && (
                <pre className="whitespace-pre-wrap text-muted-foreground overflow-auto overflow-y-scroll">
                  {error.stack}
                </pre>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}
