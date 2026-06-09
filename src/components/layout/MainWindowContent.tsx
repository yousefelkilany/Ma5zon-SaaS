import { useEffect, useRef } from 'react'
import { Outlet, useNavigate, useLocation } from '@tanstack/react-router'
import { useTabStore } from '@/store/workspace-store'
import { useUIStore } from '@/store/ui-store'
import { ModalManager } from '@/components/modal/ModalManager'
import { useWorkspacePortalTarget } from '@/components/entity/workspace-portal-context'
import type { ModalType } from '@/lib/utils'

// Imperative handle exposed by an entity modal so this effect can read
// (and clear) per-tab modal state at navigation time.
export interface ModalHandle {
  getIsDirty: () => boolean
  getCreateDraft: () => Record<string, unknown> | undefined
  getEditDraft: () => Record<string, unknown> | undefined
  discardDrafts: () => void
}

const tabHandles = new Map<string, ModalHandle>()

export function registerModalHandle(tabKey: string, handle: ModalHandle) {
  tabHandles.set(tabKey, handle)
  return () => {
    if (tabHandles.get(tabKey) === handle) {
      tabHandles.delete(tabKey)
    }
  }
}

export function MainWindowContent() {
  const navigate = useNavigate()
  const location = useLocation()
  const activeTabId = useTabStore(state => state.activeTabId)
  const tabs = useTabStore(state => state.tabs)
  const portalTarget = useWorkspacePortalTarget()
  const prevTabIdRef = useRef<string | null>(null)

  const setTabModal = useUIStore(state => state.setTabModal)
  const setTabCreateDraft = useUIStore(state => state.setTabCreateDraft)
  const setTabEditDraft = useUIStore(state => state.setTabEditDraft)
  const setTabIsDirty = useUIStore(state => state.setTabIsDirty)
  const tabState = useUIStore(state => state.tabState)
  const clearTabState = useUIStore(state => state.clearTabState)

  useEffect(() => {
    const activeTab = tabs.find(t => t.id === activeTabId)
    if (!activeTab) return

    const prevTabId = prevTabIdRef.current
    const prevTab = prevTabId ? tabs.find(t => t.id === prevTabId) : undefined
    const prevEntityType = prevTab?.entityType
    const newEntityType = activeTab.entityType

    // 1) Capture previous tab's live modal state (if any) into the Zustand slice.
    if (prevTabId && prevEntityType && tabHandles.has(prevEntityType)) {
      const handle = tabHandles.get(prevEntityType)!
      const search = new URLSearchParams(location.search)
      const entity_modal = (search.get('entity_modal') as ModalType) ?? null
      const entity_id = search.get('entity_id')
      setTabModal(
        prevEntityType as 'products' | 'variants' | 'warehouses',
        { entity_modal, entity_id }
      )
      setTabIsDirty(prevEntityType as 'products' | 'variants' | 'warehouses', handle.getIsDirty())
      const createDraft = handle.getCreateDraft()
      const editDraft = handle.getEditDraft()
      if (createDraft) setTabCreateDraft(prevEntityType as 'products' | 'variants' | 'warehouses', createDraft)
      if (editDraft) setTabEditDraft(prevEntityType as 'products' | 'variants' | 'warehouses', editDraft)
    }

    prevTabIdRef.current = activeTabId

    // 2) Compute the new path and search.
    const targetPath =
      activeTab.type === 'entity' && activeTab.entityType
        ? `/entity/${activeTab.entityType}`
        : `/${activeTab.type}`

    const stored = newEntityType
      ? tabState[newEntityType as 'products' | 'variants' | 'warehouses']
      : undefined
    const search = stored?.entity_modal
      ? {
          entity_modal: stored.entity_modal as ModalType,
          entity_id: stored.entity_id ?? undefined,
        }
      : {}

    // 3) Navigate. The unsaved-guard prompt is fired by the user clicking
    // the tab (handled by the tab bar consumer wiring in a follow-up task);
    // here we just navigate to the restored URL.
    if (location.pathname !== targetPath) {
      navigate({ to: targetPath, search })
    }
  }, [
    activeTabId,
    tabs,
    navigate,
    location.pathname,
    location.search,
    setTabModal,
    setTabCreateDraft,
    setTabEditDraft,
    setTabIsDirty,
    tabState,
  ])

  return (
    <div className="flex h-full flex-col bg-background">
      <Outlet />
      <ModalManager portalTarget={portalTarget?.current ?? null} />
    </div>
  )
}
