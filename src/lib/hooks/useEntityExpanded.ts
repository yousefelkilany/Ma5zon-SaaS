import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

export function useEntityExpanded(entityType: string) {
  const queryClient = useQueryClient()

  const expandedKey = ['entity', entityType, 'expanded'] as const

  const getExpandedIds = useCallback((): Set<string> => {
    const data = queryClient.getQueryData(expandedKey)
    return data ?? new Set<string>()
  }, [queryClient, expandedKey])

  const setExpandedIds = useCallback((ids: Set<string>) => {
    queryClient.setQueryData(expandedKey, ids)
  }, [queryClient, expandedKey])

  const toggleExpanded = useCallback((id: string) => {
    const current = getExpandedIds()
    const next = new Set(current)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setExpandedIds(next)
  }, [getExpandedIds, setExpandedIds])

  const isExpanded = useCallback((id: string): boolean => {
    return getExpandedIds().has(id)
  }, [getExpandedIds])

  return {
    getExpandedIds,
    setExpandedIds,
    toggleExpanded,
    isExpanded,
  }
}