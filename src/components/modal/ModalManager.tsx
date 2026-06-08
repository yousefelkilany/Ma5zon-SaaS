import { useLocation, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { ProductModal } from '@/components/entity/ProductModal'
import { VariantModal } from '@/components/entity/VariantModal'
import { WarehouseModal } from '@/components/entity/WarehouseModal'

type ModalType = 'product' | 'variant' | 'warehouse' | null

export function ModalManager() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation({
    select: state => ({
      pathname: state.pathname,
      search: state.href.split('?')[1] || '',
    }),
  })
  const searchParams = new URLSearchParams(location.search)
  const entity_modal = searchParams.get('entity_modal') as ModalType
  const entity_id = searchParams.get('entity_id')

  const isOpen = entity_modal && entity_id

  function handleClose() {
    searchParams.delete('entity_modal')
    searchParams.delete('entity_id')
    navigate({ to: location.pathname, search: {} })
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
