import { useTabStore } from '@/store/workspace-store'
import type { ModalFrame } from '@/lib/types/modal-frame'

export function useCurrentModalFrame(): ModalFrame | null {
  return useTabStore(state => {
    const stack = state.tabUIStates[state.activeTabId]?.modalStack
    if (!stack || stack.length === 0) return null
    return stack[stack.length - 1]
  })
}