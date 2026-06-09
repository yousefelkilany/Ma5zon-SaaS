import { useEffect, useRef } from 'react'
import { Outlet, useNavigate, useLocation } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useTabStore } from '@/store/workspace-store'
import { useUIStore } from '@/store/ui-store'
import { ModalManager } from '@/components/modal/ModalManager'
import { useWorkspacePortalTarget } from '@/components/entity/workspace-portal-context'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ModalTypes } from '@/lib/utils'
import type { EntityType, ModalType } from '@/lib/utils'
import { getModalHandle } from './modal-handle-registry'

export function MainWindowContent() {
  const { t } = useTranslation()
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
  const interceptedNavigation = useUIStore(state => state.interceptedNavigation)
  const setInterceptedNavigation = useUIStore(
    state => state.setInterceptedNavigation
  )

  useEffect(() => {
    const activeTab = tabs.find(t => t.id === activeTabId)
    if (!activeTab) return

    const prevTabId = prevTabIdRef.current
    const prevTab = prevTabId ? tabs.find(t => t.id === prevTabId) : undefined
    const prevEntityType = prevTab?.entityType as EntityType
    const newEntityType = activeTab.entityType as EntityType

    // 1) Capture previous tab's live modal state (if any) into the Zustand slice.
    if (prevTabId && prevEntityType) {
      const prevEntityTab = prevEntityType as EntityType
      const handle = getModalHandle(prevEntityType)
      if (handle) {
        const search = new URLSearchParams(location.search)
        const rawEntityModal = search.get('entity_modal') as ModalType
        const entity_modal =
          rawEntityModal && ModalTypes.includes(rawEntityModal)
            ? (rawEntityModal as ModalType)
            : null
        if (!entity_modal) return

        const raw_entity_id = decodeURIComponent(search.get('entity_id') || '')
        const entity_id = raw_entity_id.replace(/["\\]/g, '')

        setTabModal(prevEntityTab, { entity_modal, entity_id })
        setTabIsDirty(prevEntityTab, handle.getIsDirty())
        const createDraft = handle.getCreateDraft()
        const editDraft = handle.getEditDraft()
        if (createDraft) setTabCreateDraft(prevEntityTab, createDraft)
        if (editDraft) setTabEditDraft(prevEntityTab, editDraft)
      }
    }

    prevTabIdRef.current = activeTabId

    // 2) Compute the new path and search.
    const targetPath =
      activeTab.type === 'entity' && activeTab.entityType
        ? `/entity/${activeTab.entityType}`
        : `/${activeTab.type}`

    const stored = newEntityType ? tabState[newEntityType] : undefined
    if (!stored) return
    const rawEntityModal = stored?.entity_modal
    const entity_modal =
      rawEntityModal && ModalTypes.includes(rawEntityModal)
        ? rawEntityModal
        : null
    if (!entity_modal) return
    const entity_id = stored.entity_id ?? undefined

    const search = { entity_modal, entity_id }
    if (location.pathname !== targetPath) navigate({ to: targetPath, search })
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

  const handleInterceptedDiscard = () => {
    interceptedNavigation?.onDiscard()
    setInterceptedNavigation(null)
  }

  const handleInterceptedSaveAndClose = async () => {
    const nav = interceptedNavigation
    if (!nav) return
    if (nav.onSaveAndClose) {
      try {
        await nav.onSaveAndClose()
      } catch {
        setInterceptedNavigation(null)
        return
      }
    }
    nav.onDiscard()
    setInterceptedNavigation(null)
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <Outlet />
      <ModalManager portalTarget={portalTarget?.current ?? null} />
      <Dialog
        open={interceptedNavigation !== null}
        onClose={() => setInterceptedNavigation(null)}
      >
        <DialogPanel
          className="max-w-sm"
          onClose={() => setInterceptedNavigation(null)}
          showCloseButton={false}
        >
          <DialogTitle>{t('common.unsavedChanges.discardTitle')}</DialogTitle>
          <DialogDescription>
            {t('common.unsavedChanges.body')}
          </DialogDescription>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => setInterceptedNavigation(null)}
            >
              {t('common.unsavedChanges.keepEditing')}
            </Button>
            {interceptedNavigation?.onSaveAndClose && (
              <Button onClick={handleInterceptedSaveAndClose}>
                {t('common.unsavedChanges.saveAndClose')}
              </Button>
            )}
            <Button variant="destructive" onClick={handleInterceptedDiscard}>
              {t('common.unsavedChanges.discard')}
            </Button>
          </div>
        </DialogPanel>
      </Dialog>
    </div>
  )
}
