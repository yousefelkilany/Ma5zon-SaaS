import { useEffect } from 'react'
import { useTabStore } from '@/store/workspace-store'

function shouldGuard(
  tabCount: number,
  stackLengths: number[]
): boolean {
  if (tabCount > 1) return true
  return stackLengths.some(len => len > 0)
}

export function UnloadGuard() {
  const tabCount = useTabStore(state => state.tabs.length)
  const stackLengths = useTabStore(state =>
    state.tabs.map(t => state.tabUIStates[t.id]?.modalStack.length ?? 0)
  )

  useEffect(() => {
    if (!shouldGuard(tabCount, stackLengths)) return

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [tabCount, stackLengths])

  return null
}