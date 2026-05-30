/**
 * Title bar content components.
 * Logo, app name, and tab title for the custom titlebar.
 */

import { useTranslation } from 'react-i18next'

/**
 * Logo for the title bar (leftmost element).
 * Uses the same logo image as the Navbar.
 */
export function TitleBarLogo() {
  const { t } = useTranslation()
  return (
    <img
      src={new URL('@/assets/logo.svg', import.meta.url).href}
      alt={t('titlebar.logo')}
      className="h-6 w-6 shrink-0"
    />
  )
}

/**
 * App name displayed after the logo.
 */
export function TitleBarAppName() {
  const { t } = useTranslation()
  return (
    <span className="text-sm font-medium text-foreground/80">
      {t('titlebar.appName')}
    </span>
  )
}

interface TitleBarTabTitleProps {
  title: string
}

/**
 * Dynamic tab title shown in the center of the titlebar.
 * Displays the title of the currently active tab.
 */
export function TitleBarTabTitle({ title }: TitleBarTabTitleProps) {
  return <span className="text-sm text-foreground/60">{title}</span>
}
