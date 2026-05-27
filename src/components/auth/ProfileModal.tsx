import { useState, useEffect } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'

interface ProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface FormData {
  name: string
  email: string
}

type TabId = 'account' | 'security' | 'activity'

const tabs: { id: TabId; label: string }[] = [
  { id: 'account', label: 'Account' },
  { id: 'security', label: 'Security' },
  { id: 'activity', label: 'Activity Logs' },
]

export function ProfileModal({
  open,
  onOpenChange,
}: ProfileModalProps) {
  const { user } = useAuth()

  const [activeTab, setActiveTab] = useState<TabId>('account')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
  })

  useEffect(() => {
    if (open && user) {
      setFormData({
        name: user.name,
        email: 'user@example.com',
      })
    }
  }, [open, user])

  useEffect(() => {
    if (!open) {
      setActiveTab('account')
      setIsSaving(false)
      setSaveSuccess(false)
    }
  }, [open])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const currentIndex = tabs.findIndex(tab => tab.id === activeTab)
    if (e.key === 'ArrowRight') {
      const nextTab = tabs[(currentIndex + 1) % tabs.length]
      if (nextTab) setActiveTab(nextTab.id)
    } else if (e.key === 'ArrowLeft') {
      const prevTab = tabs[(currentIndex - 1 + tabs.length) % tabs.length]
      if (prevTab) setActiveTab(prevTab.id)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveSuccess(false)

    await new Promise(resolve => setTimeout(resolve, 1200))

    setIsSaving(false)
    setSaveSuccess(true)

    setTimeout(() => {
      setSaveSuccess(false)
    }, 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0 max-w-5xl w-[calc(100%-2rem)] max-h-[85vh] overflow-auto z-[51] bg-surface-container border-outline-variant rounded-lg shadow-2xl overflow-hidden"
      >
        <div className="flex flex-col h-full">
          <header className="px-cozy-padding pt-cozy-padding pb-gutter bg-surface-container-high">
            <h1 className="font-headline-md text-headline-md text-on-surface">
              User Profile & Security
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              Manage your enterprise account settings and security preferences.
            </p>
          </header>

          <div
            className="flex px-cozy-padding bg-surface-container-high border-b border-outline-variant"
            role="tablist"
            onKeyDown={handleKeyDown}
          >
            {tabs.map(tab => (
              <button
                key={tab.id}
                id={`${tab.id}-tab`}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`${tab.id}-panel`}
                tabIndex={activeTab === tab.id ? 0 : -1}
                className={`font-label-caps text-label-caps py-compact-padding px-gutter border-b-2 cursor-pointer transition-colors ${
                  activeTab === tab.id
                    ? 'border-secondary text-secondary'
                    : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto">
            {activeTab === 'account' && (
              <div
                id="account-panel"
                role="tabpanel"
                aria-labelledby="account-tab"
                className="p-cozy-padding bg-surface-container grid grid-cols-1 md:grid-cols-12 gap-cozy-gap"
              >
                <aside className="md:col-span-4 flex flex-col items-center justify-start space-y-gutter border-r border-outline-variant/30 pr-cozy-padding">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-outline-variant bg-surface-container-highest">
                      {user?.avatar_url ? (
                        <img
                          alt="User profile"
                          className="w-full h-full object-cover"
                          src={user.avatar_url}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-surface-container-low">
                          <span className="material-symbols-outlined text-on-surface-variant text-4xl">
                            person
                          </span>
                        </div>
                      )}
                    </div>
                    <button className="absolute bottom-0 right-0 p-2 bg-secondary text-on-secondary rounded-full shadow-lg hover:bg-secondary-fixed transition-transform active:scale-95 flex items-center justify-center">
                      <span className="material-symbols-outlined text-sm">
                        edit
                      </span>
                    </button>
                  </div>

                  <div className="text-center">
                    <h3 className="font-headline-sm text-headline-sm text-on-surface">
                      {user?.name || 'User'}
                    </h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {user?.role || 'Loading...'}
                    </p>
                  </div>

                  <div className="w-full pt-gutter">
                    <div className="p-compact-padding bg-surface-container-low border border-outline-variant text-center">
                      <span className="font-label-caps text-label-caps text-on-surface-variant">
                        Last Login: Just now
                      </span>
                    </div>
                  </div>
                </aside>

                <section className="md:col-span-8 flex flex-col space-y-gutter">
                  <div className="space-y-compact-gap">
                    <div className="flex flex-col space-y-1">
                      <label
                        className="font-label-caps text-label-caps text-on-surface-variant px-1"
                        htmlFor="fullName"
                      >
                        Full Name
                      </label>
                      <input
                        className="w-full bg-surface-container-highest border border-outline-variant text-on-surface font-body-md text-body-md px-gutter py-compact-padding focus:border-secondary focus:ring-1 focus:ring-secondary transition-all outline-none"
                        id="fullName"
                        type="text"
                        value={formData.name}
                        onChange={e =>
                          setFormData(prev => ({ ...prev, name: e.target.value }))
                        }
                        disabled={isSaving}
                      />
                    </div>

                    <div className="flex flex-col space-y-1">
                      <label
                        className="font-label-caps text-label-caps text-on-surface-variant px-1"
                        htmlFor="email"
                      >
                        Email Address
                      </label>
                      <input
                        className="w-full bg-surface-container-highest border border-outline-variant text-on-surface font-body-md text-body-md px-gutter py-compact-padding focus:border-secondary focus:ring-1 focus:ring-secondary transition-all outline-none"
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={e =>
                          setFormData(prev => ({ ...prev, email: e.target.value }))
                        }
                        disabled={isSaving}
                      />
                    </div>

                    <div className="flex flex-col space-y-1">
                      <label
                        className="font-label-caps text-label-caps text-on-surface-variant px-1"
                        htmlFor="role"
                      >
                        Enterprise Role
                      </label>
                      <div className="relative">
                        <input
                          className="w-full bg-surface-container-low border border-outline-variant text-on-surface-variant font-body-md text-body-md px-gutter py-compact-padding cursor-not-allowed opacity-75"
                          disabled
                          id="role"
                          type="text"
                          value={user?.role || ''}
                        />
                        <span className="absolute right-gutter top-1/2 -translate-y-1/2 material-symbols-outlined text-sm text-on-surface-variant">
                          lock
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant italic mt-1">
                        Roles can only be modified by the System Administrator.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-gutter pt-gutter">
                      <div className="flex flex-col space-y-1">
                        <label className="font-label-caps text-label-caps text-on-surface-variant px-1">
                          Department
                        </label>
                        <div className="relative">
                          <input
                            className="w-full bg-surface-container-low border border-outline-variant text-on-surface-variant font-body-md text-body-md px-gutter py-compact-padding cursor-not-allowed opacity-75"
                            disabled
                            type="text"
                            value="Department"
                          />
                          <span className="absolute right-gutter top-1/2 -translate-y-1/2 material-symbols-outlined text-sm text-on-surface-variant">
                            lock
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-1">
                        <label className="font-label-caps text-label-caps text-on-surface-variant px-1">
                          Location
                        </label>
                        <div className="relative">
                          <input
                            className="w-full bg-surface-container-low border border-outline-variant text-on-surface-variant font-body-md text-body-md px-gutter py-compact-padding cursor-not-allowed opacity-75"
                            disabled
                            type="text"
                            value="Location"
                          />
                          <span className="absolute right-gutter top-1/2 -translate-y-1/2 material-symbols-outlined text-sm text-on-surface-variant">
                            lock
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-cozy-padding flex items-center justify-end space-x-gutter">
                    <button
                      className="font-label-caps text-label-caps text-on-surface-variant hover:text-on-surface px-gutter py-compact-padding transition-colors"
                      type="button"
                      onClick={() => onOpenChange(false)}
                      disabled={isSaving}
                    >
                      Cancel
                    </button>
                    <button
                      className={`font-label-caps text-label-caps px-cozy-padding py-compact-padding transition-all active:scale-95 flex items-center space-x-2 ${
                        saveSuccess
                          ? 'bg-secondary-container text-on-secondary-container cursor-default'
                          : 'bg-secondary text-on-secondary hover:bg-secondary-fixed'
                      } ${isSaving ? 'opacity-80 cursor-wait' : ''}`}
                      type="button"
                      onClick={handleSave}
                      disabled={isSaving || saveSuccess}
                    >
                      {isSaving ? (
                        <>
                          <span className="material-symbols-outlined text-sm animate-spin">
                            sync
                          </span>
                          <span>Processing...</span>
                        </>
                      ) : saveSuccess ? (
                        <>
                          <span className="material-symbols-outlined text-sm">
                            check_circle
                          </span>
                          <span>Saved Successfully</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-sm">
                            save
                          </span>
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'security' && (
              <div
                id="security-panel"
                role="tabpanel"
                aria-labelledby="security-tab"
                className="p-cozy-padding"
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="space-y-1">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-5 w-full" />
                      </div>
                    ))}
                  </div>
                  <Skeleton className="h-24 w-full rounded-lg" />
                </div>
              </div>
            )}

            {activeTab === 'activity' && (
              <div
                id="activity-panel"
                role="tabpanel"
                aria-labelledby="activity-tab"
                className="p-cozy-padding"
              >
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <footer className="px-cozy-padding py-compact-padding bg-surface-container-low border-t border-outline-variant flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-secondary"></div>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                System Online: v2.4.12-Enterprise
              </span>
            </div>
            <span className="font-data-tabular text-data-tabular text-on-surface-variant">
              UTC +00:00
            </span>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  )
}

