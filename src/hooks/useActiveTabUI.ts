import type { ColumnDef, FilterState } from '@/lib/types'
import { defaultUIState, useTabStore } from '@/store/tab-store'
import { useShallow } from 'zustand/react/shallow'

export const useActiveTabUI = (entityType: string) => {
  return useTabStore(
    useShallow(state => {
      const activeTabId = state.activeTabId
      const uiState = state.tabUIStates[activeTabId] ?? defaultUIState

      return {
        // Expose only what the component needs
        sort: uiState.sort,
        searchValue: uiState.searchValue,
        filters: uiState.filters[entityType] ?? [],
        filterDialogOpen: uiState.filterDialogOpen[entityType] ?? false,
        columnDialogOpen: uiState.columnDialogOpen[entityType] ?? false,
        deleteDialogOpen: uiState.deleteDialogOpen[entityType] ?? false,
        localColumns: uiState.localColumns[entityType] ?? [],

        // Actions
        setSort: state.setSort,
        setSearchValue: state.setSearchValue,
        setFilters: (filters: FilterState[]) =>
          state.setFilters(entityType, filters),
        setFilterDialogOpen: (open: boolean) =>
          state.setFilterDialogOpen(entityType, open),
        setColumnDialogOpen: (open: boolean) =>
          state.setColumnDialogOpen(entityType, open),
        setDeleteDialogOpen: (open: boolean) =>
          state.setDeleteDialogOpen(entityType, open),
        setLocalColumns: (columns: ColumnDef[]) =>
          state.setLocalColumns(entityType, columns),
      }
    })
  )
}
