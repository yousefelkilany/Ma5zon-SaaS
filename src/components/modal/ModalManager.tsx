import { useSearch, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { ProductModal } from '@/components/entity/ProductModal'
import { VariantModal } from '@/components/entity/VariantModal'
import { WarehouseModal } from '@/components/entity/WarehouseModal'

type ModalType = 'product' | 'variant' | 'warehouse' | null

export function ModalManager() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const entity_modal = useSearch({
    select: (search) => search.entity_modal as ModalType,
  })
  const entity_id = useSearch({
    select: (search) => search.entity_id as string | null,
  })

  const isOpen = entity_modal && entity_id

  function handleClose() {
    navigate({
      search: (prev) => ({
        ...prev,
        entity_modal: null,
        entity_id: null,
      }),
    })
  }

  if (!isOpen || !entity_id) return null

  switch (entity_modal) {
    case 'product':
      return (
        <ProductModal
          entityId={entity_id}
          queryClient={queryClient}
          onDeleted={handleClose}
        />
      )
    case 'variant':
      return (
        <VariantModal
          entityId={entity_id}
          queryClient={queryClient}
          onDeleted={handleClose}
        />
      )
    case 'warehouse':
      return (
        <WarehouseModal
          entityId={entity_id}
          queryClient={queryClient}
          onDeleted={handleClose}
        />
      )
    default:
      return null
  }
}