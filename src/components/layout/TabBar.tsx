import { useTranslation } from 'react-i18next'
import { useTabStore } from '@/store/tab-store'
import { cn } from '@/lib/utils'

export function TabBar() {
  const { t } = useTranslation()
  const { tabs, activeTabId, setActiveTab, addTab, removeTab } = useTabStore()

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId)
    // Let MainWindowContent effect handle URL sync after state updates
  }

  const handleAddTab = () => {
    addTab({
      title: t('nav.newTab'),
      type: 'new-tab',
      closable: true,
    })
  }

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation()
    removeTab(tabId)
  }

  return (
    <div
      role="tablist"
      className="flex items-center h-10 px-gutter bg-surface-container-lowest gap-1 overflow-x-auto no-scrollbar border-t border-outline-variant/30"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId
        return (
          <div
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => handleTabClick(tab.id)}
            className={cn(
              'flex items-center px-4 h-full text-[11px] font-label-caps font-medium cursor-pointer shrink-0 border-b-2 transition-colors',
              isActive
                ? 'bg-secondary/20 border-secondary text-secondary'
                : 'text-on-surface-variant hover:bg-surface-container-high border-transparent'
            )}
          >
            {tab.title}
            {tab.closable && (
              <span
                onClick={(e) => handleCloseTab(e, tab.id)}
                className="material-symbols-outlined text-[14px] ms-2 hover:text-error"
              >
                close
              </span>
            )}
          </div>
        )
      })}

      <div
        onClick={handleAddTab}
        className="flex items-center px-4 h-full text-on-surface-variant hover:bg-surface-container-high cursor-pointer"
      >
        <span className="material-symbols-outlined text-[18px]">add</span>
      </div>
    </div>
  )
}