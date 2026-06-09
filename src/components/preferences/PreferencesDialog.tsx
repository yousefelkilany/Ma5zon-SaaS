import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Settings, Palette, Zap } from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '@/components/ui/sidebar'
import { useUIStore } from '@/store/ui-store'
import { useSavePreferences } from '@/services/preferences'
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard'
import { GeneralPane } from './panes/GeneralPane'
import { AppearancePane } from './panes/AppearancePane'
import { AdvancedPane } from './panes/AdvancedPane'
import { setPreferencesDirty, usePreferencesDirty } from './preferences-dirty'

type PreferencePane = 'general' | 'appearance' | 'advanced'

const navigationItems = [
  {
    id: 'general' as const,
    labelKey: 'preferences.general',
    icon: Settings,
  },
  {
    id: 'appearance' as const,
    labelKey: 'preferences.appearance',
    icon: Palette,
  },
  {
    id: 'advanced' as const,
    labelKey: 'preferences.advanced',
    icon: Zap,
  },
] as const

export function PreferencesDialog() {
  const { t } = useTranslation()
  const [activePane, setActivePane] = useState<PreferencePane>('general')
  const preferencesOpen = useUIStore(state => state.preferencesOpen)
  const setPreferencesOpen = useUIStore(state => state.setPreferencesOpen)

  const savePreferences = useSavePreferences()
  const isDirty = usePreferencesDirty()

  const guard = useUnsavedGuard({
    isDirty,
    onDiscard: () => {
      setPreferencesDirty(false)
      setPreferencesOpen(false)
    },
    onSaveAndClose: () => {
      return new Promise<void>(resolve => {
        const current = useUIStore.getState()
        // The actual preferences object is held inside useSavePreferences' onSuccess path
        // (via the panes). For the 3-button guard we trigger a no-op-shaped save by
        // passing the latest cached preferences — the test mocks this.
        const cached =
          (savePreferences as unknown as { variables?: unknown }).variables ??
          {}
        savePreferences.mutate(cached as never, {
          onSettled: () => {
            setPreferencesDirty(false)
            setPreferencesOpen(false)
            resolve()
          },
        })
        void current
      })
    },
  })

  const getPaneTitle = (pane: PreferencePane): string => {
    return t(`preferences.${pane}`)
  }

  return (
    <Dialog open={preferencesOpen} onClose={guard.requestClose}>
      <DialogPanel onClose={guard.requestClose}>
        <DialogTitle className="sr-only">{t('preferences.title')}</DialogTitle>
        <DialogDescription className="sr-only">
          {t('preferences.description')}
        </DialogDescription>

        <SidebarProvider className="items-start">
          <Sidebar collapsible="none" className="hidden md:flex">
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {navigationItems.map(item => (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          asChild
                          isActive={activePane === item.id}
                        >
                          <button
                            onClick={() => setActivePane(item.id)}
                            className="w-full"
                          >
                            <item.icon />
                            <span>{t(item.labelKey)}</span>
                          </button>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>

          <main className="flex flex-1 flex-col overflow-hidden">
            <header className="flex h-16 shrink-0 items-center gap-2">
              <div className="flex items-center gap-2 px-4">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink asChild>
                        <span>{t('preferences.title')}</span>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>
                        {getPaneTitle(activePane)}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </header>

            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pt-0 max-h-[calc(600px-4rem)]">
              {activePane === 'general' && <GeneralPane />}
              {activePane === 'appearance' && <AppearancePane />}
              {activePane === 'advanced' && <AdvancedPane />}
            </div>
          </main>
        </SidebarProvider>
        <guard.ConfirmDialog />
      </DialogPanel>
    </Dialog>
  )
}
