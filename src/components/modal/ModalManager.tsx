import { useLocation, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { ProductModal } from '@/components/entity/ProductModal'
import { VariantModal } from '@/components/entity/VariantModal'
import { WarehouseModal } from '@/components/entity/WarehouseModal'
import type { ModalType } from '@/lib/utils'

interface ModalManagerProps {
  portalTarget: HTMLElement | null
}

export function ModalManager({ portalTarget }: ModalManagerProps) {
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
  const raw_entity_id = decodeURIComponent(searchParams.get('entity_id') || '')
  const entity_id = raw_entity_id.replace(/["\\]/g, '')

  function handleClose() {
    searchParams.delete('entity_modal')
    searchParams.delete('entity_id')
    navigate({ to: location.pathname, search: {} })
  }

  if (!entity_modal) return null

  const portalProps = portalTarget ? { container: portalTarget } : {}

  switch (entity_modal) {
    case 'product':
      if (!entity_id) return null
      return (
        <ProductModal
          entityId={entity_id}
          queryClient={queryClient}
          mode="view"
          onDeleted={handleClose}
          {...portalProps}
        />
      )
    case 'variant':
      if (!entity_id) return null

      return (
        <VariantModal
          entityId={entity_id}
          queryClient={queryClient}
          mode="view"
          onDeleted={handleClose}
          {...portalProps}
        />
      )
    case 'warehouse':
      if (!entity_id) return null
      return (
        <WarehouseModal
          entityId={entity_id}
          queryClient={queryClient}
          mode="view"
          onDeleted={handleClose}
          {...portalProps}
        />
      )
    case 'create-product':
      return (
        <ProductModal
          queryClient={queryClient}
          mode="create"
          onDeleted={handleClose}
          {...portalProps}
        />
      )
    case 'create-warehouse':
      return (
        <WarehouseModal
          queryClient={queryClient}
          mode="create"
          onDeleted={handleClose}
          {...portalProps}
        />
      )
    case 'create-variant':
      if (!entity_id) return null
      return (
        <VariantModal
          productId={entity_id}
          queryClient={queryClient}
          mode="create"
          onDeleted={handleClose}
          {...portalProps}
        />
      )
    default:
      return null
  }
}
