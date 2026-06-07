import { defaultUIState, useTabStore } from '@/store/tab-store'
import { useShallow } from 'zustand/react/shallow'

export const useActiveTabUI = () =>
  useTabStore(
    useShallow(state => state.tabUIStates[state.activeTabId] ?? defaultUIState)
  )

export const useTabActions = () => {
  const setSort = useTabStore(state => state.setSort)
  const setSearchValue = useTabStore(state => state.setSearchValue)
  const setFilters = useTabStore(state => state.setFilters)
  const setFilterDialogOpen = useTabStore(state => state.setFilterDialogOpen)
  const setColumnDialogOpen = useTabStore(state => state.setColumnDialogOpen)
  const setDeleteDialogOpen = useTabStore(state => state.setDeleteDialogOpen)
  const setLocalColumns = useTabStore(state => state.setLocalColumns)

  return {
    setSort,
    setSearchValue,
    setFilters,
    setFilterDialogOpen,
    setColumnDialogOpen,
    setDeleteDialogOpen,
    setLocalColumns,
  }
}
