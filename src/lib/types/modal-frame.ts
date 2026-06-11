import type { ModalType } from '@/lib/utils'

export interface ModalFrame {
  entity_modal: ModalType
  entity_id: string | null
  product_id?: string
}
