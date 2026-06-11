import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useTabStore } from '@/store/workspace-store'
import { useUIStore } from '@/store/ui-store'
import { ModalManager } from '@/components/modal/ModalManager'
import { UnloadGuard } from '@/components/modal/UnloadGuard'
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
  const location = useLocation()
  const activeTabId = useTabStore(state => state.activeTabId)
  const tabs = useTabStore(state => state.tabs)
  const prevTabIdRef = useRef<string | null>(null)

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

    if (prevTabId && prevEntityType) {
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
        const raw_product_id = decodeURIComponent(
          search.get('product_id') || ''
        )
        const product_id = raw_product_id.replace(/["\\]/g, '') || undefined

        const frame = {
          entity_modal,
          entity_id: entity_id || null,
          ...(product_id ? { product_id } : {}),
        }
        useTabStore.getState().pushModal(frame)
        useUIStore.getState().setTabIsDirty(prevEntityType, handle.getIsDirty())
        const createDraft = handle.getCreateDraft()
        const editDraft = handle.getEditDraft()
        if (createDraft)
          useUIStore.getState().setTabCreateDraft(prevEntityType, createDraft)
        if (editDraft)
          useUIStore.getState().setTabEditDraft(prevEntityType, editDraft)
      }
    }

    prevTabIdRef.current = activeTabId
  }, [activeTabId, tabs, location.search])

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
      <ModalManager />
      <UnloadGuard />
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
