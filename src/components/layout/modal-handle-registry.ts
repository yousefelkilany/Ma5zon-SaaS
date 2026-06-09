export interface ModalHandle {
  getIsDirty: () => boolean
  getCreateDraft: () => Record<string, unknown> | undefined
  getEditDraft: () => Record<string, unknown> | undefined
  discardDrafts: () => void
  saveAndClose?: () => Promise<void> | void
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

export function getModalHandle(tabKey: string): ModalHandle | undefined {
  return tabHandles.get(tabKey)
}
