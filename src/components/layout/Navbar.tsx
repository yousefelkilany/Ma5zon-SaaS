import { useTranslation } from 'react-i18next'
import { ProfileSection } from '@/components/auth'
import { SettingsPopover } from './SettingsPopover'

export function Navbar() {
  const { t } = useTranslation()

  return (
    <header className="flex items-center h-16 px-gutter bg-surface-container-low border-b border-outline-variant shrink-0">
      {/* Left: Logo */}
      <div className="flex items-center gap-compact-gap">
        <img
          alt={t('titlebar.logo')}
          className="w-12 h-12 shrink-0"
          src={new URL('@/assets/logo.svg', import.meta.url).href}
        />
        <div className="flex flex-col">
          <span className="font-headline-sm text-[16px] font-bold text-on-surface">
            {t('nav.appName')}
          </span>
          <span className="font-label-caps text-[14px] align-sub text-on-surface-variant">
            {t('nav.appTagline')}
          </span>
        </div>
      </div>

      {/* Center: Global Search */}
      <div className="flex-1 flex items-center justify-center max-w-xl mx-auto">
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute inset-s-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
            search
          </span>
          <input
            className="bg-surface-container-high border border-outline-variant/30 rounded-lg ps-10 pe-4 py-2 text-body-sm font-body-sm text-on-surface focus:ring-1 focus:ring-primary w-full transition-all"
            placeholder={t('nav.globalSearchPlaceholder')}
            type="text"
          />
        </div>
      </div>

      {/* Right: Settings & Profile */}
      <div className="flex items-center ps-8">
        <SettingsPopover />
        <ProfileSection />
      </div>
    </header>
  )
}
