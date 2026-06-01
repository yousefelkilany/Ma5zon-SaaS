import { createContext, useContext, useReducer, type ReactNode } from 'react'

type ExpandedIds = Record<string, boolean>

type ExpandedState = Record<string, ExpandedIds>

type Action = { type: 'TOGGLE'; entityType: string; id: string }

function expandedReducer(state: ExpandedState, action: Action): ExpandedState {
  if (action.type === 'TOGGLE') {
    const { entityType, id } = action
    const entityExpanded = state[entityType] ?? {}
    const next = { ...entityExpanded, [id]: !entityExpanded[id] }
    return { ...state, [entityType]: next }
  }
  return state
}

interface ExpandedContextValue {
  getExpanded: (entityType: string, id: string) => boolean
  toggleExpanded: (entityType: string, id: string) => void
}

const ExpandedContext = createContext<ExpandedContextValue | null>(null)

interface ProviderProps {
  children: ReactNode
}

export function ExpandedProvider({ children }: ProviderProps) {
  const [state, dispatch] = useReducer(expandedReducer, {})

  const getExpanded = (entityType: string, id: string) =>
    state[entityType]?.[id] ?? false

  const toggleExpanded = (entityType: string, id: string) => {
    dispatch({ type: 'TOGGLE', entityType, id })
  }

  return (
    <ExpandedContext.Provider value={{ getExpanded, toggleExpanded }}>
      {children}
    </ExpandedContext.Provider>
  )
}

export function useEntityExpanded(entityType: string) {
  const ctx = useContext(ExpandedContext)
  if (!ctx) {
    throw new Error(
      'useEntityExpanded must be used within ExpandedProvider'
    )
  }

  const getExpanded = (id: string) => ctx.getExpanded(entityType, id)

  return {
    expandedIds: {} as Record<string, boolean>,
    toggleExpanded: (id: string) => ctx.toggleExpanded(entityType, id),
    isExpanded: getExpanded,
  }
}