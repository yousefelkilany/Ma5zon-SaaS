import { createContext, useContext, type RefObject } from 'react'

export const WorkspacePortalContext =
  createContext<RefObject<HTMLElement | null> | null>(null)

export function useWorkspacePortalTarget(): RefObject<HTMLElement | null> | null {
  return useContext(WorkspacePortalContext)
}
