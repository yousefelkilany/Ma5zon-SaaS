import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'

interface EntityDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type TabId = 'details' | 'insights' | 'audits'

export function EntityDetailModal({
  open,
  onOpenChange,
}: EntityDetailModalProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<TabId>('details')

  const tabs: { id: TabId; label: string }[] = [
    { id: 'details', label: t('entity.detail.tabs.details') },
    { id: 'insights', label: t('entity.detail.tabs.insights') },
    { id: 'audits', label: t('entity.detail.tabs.audits') },
  ]

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange} aria-label="Entity Details">
      <DialogContent className="max-w-2xl">
        <div className="flex flex-col h-full">
          {/* Tab Bar */}
          <div
            className="flex border-b border-outline-variant mb-4"
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
                className={`px-4 py-2 text-body-sm font-medium transition-colors border-b-2 -mb-px ${
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

          {/* Tab Content */}
          <div className="flex-1 overflow-auto">
            {activeTab === 'details' && (
              <div id="details-panel" role="tabpanel" aria-labelledby="details-tab">
                <div className="grid grid-cols-2 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="space-y-1">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-5 w-full" />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeTab === 'insights' && (
              <div id="insights-panel" role="tabpanel" aria-labelledby="insights-tab">
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="space-y-1">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-8 w-full" />
                      </div>
                    ))}
                  </div>
                  <Skeleton className="h-48 w-full rounded-lg" />
                </div>
              </div>
            )}
            {activeTab === 'audits' && (
              <div id="audits-panel" role="tabpanel" aria-labelledby="audits-tab">
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
        </div>
      </DialogContent>
    </Dialog>
  )
}