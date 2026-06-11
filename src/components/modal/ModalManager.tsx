import { useQueryClient } from '@tanstack/react-query'
import { useTabStore } from '@/store/workspace-store'
import { ProductModal } from '@/components/entity/ProductModal'
import { VariantModal } from '@/components/entity/VariantModal'
import { WarehouseModal } from '@/components/entity/WarehouseModal'


export function ModalManager() {
  const queryClient = useQueryClient()
  const top = useTabStore(state => {
    const stack = state.tabUIStates[state.activeTabId]?.modalStack
    return stack && stack.length > 0 ? stack[stack.length - 1] : null
  })

  function handleClose() {
    useTabStore.getState().popModal()
  }

  if (!top) return null

  switch (top.entity_modal) {
    case 'product':
      if (!top.entity_id) return null
      return (
        <ProductModal
          entityId={top.entity_id}
          queryClient={queryClient}
          mode="view"
          onDeleted={handleClose}
        />
      )
    case 'variant':
      if (!top.entity_id) return null
      return (
        <VariantModal
          entityId={top.entity_id}
          productId={top.product_id}
          queryClient={queryClient}
          mode="view"
          onDeleted={handleClose}
        />
      )
    case 'warehouse':
      if (!top.entity_id) return null
      return (
        <WarehouseModal
          entityId={top.entity_id}
          queryClient={queryClient}
          mode="view"
          onDeleted={handleClose}
        />
      )
    case 'create-product':
      return (
        <ProductModal
          queryClient={queryClient}
          mode="create"
          onDeleted={handleClose}
        />
      )
    case 'create-warehouse':
      return (
        <WarehouseModal
          queryClient={queryClient}
          mode="create"
          onDeleted={handleClose}
        />
      )
    case 'create-variant':
      if (!top.product_id) return null
      return (
        <VariantModal
          productId={top.product_id}
          queryClient={queryClient}
          mode="create"
          onDeleted={handleClose}
        />
      )
    default: {
      top.entity_modal satisfies never
      return null
    }
  }
}