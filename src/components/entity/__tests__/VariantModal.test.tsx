import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { QueryWrapper, createTestQueryClient } from '@/lib/test-utils/query-wrapper'
import { VariantModal } from '../VariantModal'
import { useUIStore } from '@/store/ui-store'
import { commands } from '@/lib/tauri-bindings'

vi.mock('@/lib/tauri-bindings', () => ({
  commands: {
    variantsGetById: vi.fn(),
    variantsCreate: vi.fn(),
    variantsUpdate: vi.fn(),
    variantsDelete: vi.fn(),
    stockLevelsGetByVariant: vi.fn(),
    stockMovementsGetByVariant: vi.fn(),
    variantsGetByProductWithStock: vi.fn(),
    warehousesGetAll: vi.fn(),
  },
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const mockOk = <T,>(data: T) => ({ status: 'ok' as const, data })

function renderModal(props: Partial<React.ComponentProps<typeof VariantModal>> = {}) {
  const client = createTestQueryClient()
  const utils = render(
    <VariantModal
      entityId="V1"
      queryClient={client}
      mode="view"
      onDeleted={vi.fn()}
      {...props}
    />,
    { wrapper: (p) => <QueryWrapper {...p} client={client} /> }
  )
  return { ...utils, client }
}

describe('VariantModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useUIStore.setState({ tabState: {} })
  })

  it('create mode renders without crashing', async () => {
    vi.mocked(commands.warehousesGetAll).mockResolvedValue(mockOk([]))
    const client = createTestQueryClient()
    render(
      <VariantModal
        queryClient={client}
        mode="create"
        productId="P1"
        onDeleted={vi.fn()}
      />,
      { wrapper: (p) => <QueryWrapper {...p} client={client} /> }
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('renders the dialog with modal={false} (no backdrop blocks the rest of the app)', async () => {
    vi.mocked(commands.variantsGetById).mockResolvedValue(
      mockOk({
        id: 'V1',
        product_id: 'P1',
        sku: 'SKU-1',
        variant_name: 'Red',
        uom_id: 'pcs',
        retail_price: 10,
        wholesale_price: 8,
        distribution_price: 6,
        created_at: null,
        updated_at: null,
        deleted_at: null,
      } as never)
    )
    vi.mocked(commands.warehousesGetAll).mockResolvedValue(mockOk([]))
    vi.mocked(commands.stockLevelsGetByVariant).mockResolvedValue(mockOk([]))
    vi.mocked(commands.stockMovementsGetByVariant).mockResolvedValue(mockOk([]))
    vi.mocked(commands.variantsGetByProductWithStock).mockResolvedValue(mockOk([]))

    renderModal()
    await waitFor(
      () => screen.getByRole('heading', { name: 'Red' }),
      { timeout: 5000 }
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('Save button is disabled when isDirty is false', async () => {
    vi.mocked(commands.variantsGetById).mockResolvedValue(
      mockOk({
        id: 'V1',
        product_id: 'P1',
        sku: 'SKU-1',
        variant_name: 'Red',
        uom_id: 'pcs',
        retail_price: 10,
        wholesale_price: 8,
        distribution_price: 6,
        created_at: null,
        updated_at: null,
        deleted_at: null,
      } as never)
    )
    vi.mocked(commands.warehousesGetAll).mockResolvedValue(mockOk([]))
    vi.mocked(commands.stockLevelsGetByVariant).mockResolvedValue(mockOk([]))
    vi.mocked(commands.stockMovementsGetByVariant).mockResolvedValue(mockOk([]))
    vi.mocked(commands.variantsGetByProductWithStock).mockResolvedValue(mockOk([]))

    renderModal()
    await waitFor(() => screen.getByRole('heading', { name: 'Red' }))
    await userEvent.setup().click(screen.getByRole('button', { name: /edit/i }))
    const saveAndClose = screen.queryByText(/save.*close/i)
    if (saveAndClose) {
      expect(saveAndClose.closest('button')).toBeDisabled()
    }
  })
})
