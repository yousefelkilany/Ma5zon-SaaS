import { useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'

interface EntityDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityType: string
  entityId: string | null
}

type TabId = 'details' | 'insights' | 'audits'

const tabs: { id: TabId; label: string }[] = [
  { id: 'details', label: 'Details' },
  { id: 'insights', label: 'Insights' },
  { id: 'audits', label: 'Audits' },
]

export function EntityDetailModal({
  open,
  onOpenChange,
}: EntityDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('details')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <div className="flex flex-col h-full">
          {/* Tab Bar */}
          <div className="flex border-b border-outline-variant mb-4">
            {tabs.map(tab => (
              <button
                key={tab.id}
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
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="space-y-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-5 w-full" />
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'insights' && (
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
            )}
            {activeTab === 'audits' && (
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
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}