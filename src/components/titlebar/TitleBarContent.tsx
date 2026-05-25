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
      src="https://lh3.googleusercontent.com/aida-public/AB6AXuBiZVh33XK4sg0Cf0Pm2N5FrKbpAMT8lNGK97INqjoemoBZsqlzyY7NiAgGS3jiGjEPzRX6s5XJyPyyEixFtC4Vj_hvysR6CBiupoA-ceSylGa8Dy44bMRlPcrGzA1WYFEJT-HR4cXIEJ2PUFTlS2QdTf5AjhxMrOmkibHJVWkrHMx6bzFoXPqCkiP2vlxvuyDbwHrlWKWaYlW8EV3M6ocVQ5ds4g6WyTZnIWhEHMvf2OV0ztC5yFT_0sF1Q4d-rcpdwYtHWMm6Azo"
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
  return (
    <span className="text-sm text-foreground/60">
      {title}
    </span>
  )
}