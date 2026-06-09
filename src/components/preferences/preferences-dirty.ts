import { useEffect, useState } from 'react'

type Listener = (dirty: boolean) => void

let currentDirty = false
const listeners = new Set<Listener>()

export function setPreferencesDirty(dirty: boolean) {
  if (currentDirty === dirty) return
  currentDirty = dirty
  listeners.forEach(l => l(dirty))
}

export function usePreferencesDirty(): boolean {
  const [dirty, setDirty] = useState(currentDirty)
  useEffect(() => {
    const listener: Listener = next => setDirty(next)
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])
  return dirty
}
