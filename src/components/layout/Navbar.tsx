import { useTranslation } from 'react-i18next'

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
        <button className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full">
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '1.75em' }}
          >
            settings
          </span>
        </button>
        <div className="flex items-center gap-compact-gap cursor-pointer hover:bg-surface-container-high p-1 px-3 rounded-full transition-colors">
          <img
            alt="User Profile"
            className="w-9 h-9 rounded-full border border-secondary"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAUBAQM9pd0d2Y8CyJX6QTiPWqXNZTzy2Dvsz_OYI_RhgqqQBO7jfH7iXr3tiD5m58oLfeYLboKxEeJ6qRvPmL8wgFw2mJV51DGt9FMuZQ0dntsReqcm4VhWQPJwNU8efHXGmD-wxzLibbyzc2khT29AKRbbhOivAOxGwe6H69jXIJIHK5699KvwRPkaSdrstAeU3WY2_A9cWK1lGotJwgcZtxQwXxWXeUt-9iDBQH5Udos-CZmoHXZIZLI-cP9eXuaw6LFlHbu96k"
          />
          <div className="hidden lg:block leading-tight">
            <p className="font-body-sm text-body-lg font-bold text-primary">
              {t('nav.userName')}
            </p>
            <p className="font-label-caps text-[12px] text-on-surface-variant uppercase">
              {t('nav.userRole')}
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}
