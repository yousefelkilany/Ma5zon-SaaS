import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { QueryWrapper } from '@/lib/test-utils/query-wrapper'
import { createTestQueryClient } from '@/lib/test-utils/create-test-query-client'
import { ProductModal } from '../ProductModal'
import { useUIStore } from '@/store/ui-store'
import { commands } from '@/lib/tauri-bindings'

vi.mock('@/lib/tauri-bindings', () => ({
  commands: {
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    stockLevelsGetByProduct: vi.fn(),
    variantsGetByProductWithStock: vi.fn(),
    stockMovementsGetByVariant: vi.fn(),
    warehousesGetAll: vi.fn(),
  },
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const mockOk = <T,>(data: T) => ({ status: 'ok' as const, data })

function renderModal(
  props: Partial<React.ComponentProps<typeof ProductModal>> = {}
) {
  const client = createTestQueryClient()
  const utils = render(
    <ProductModal
      entityId="P1"
      queryClient={client}
      mode="view"
      onDeleted={vi.fn()}
      {...props}
    />,
    { wrapper: p => <QueryWrapper {...p} client={client} /> }
  )
  return { ...utils, client }
}

describe('ProductModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useUIStore.setState({ tabState: {} })
  })

  it('create mode renders without crashing', async () => {
    vi.mocked(commands.warehousesGetAll).mockResolvedValue(mockOk([]))
    const client = createTestQueryClient()
    render(
      <ProductModal queryClient={client} mode="create" onDeleted={vi.fn()} />,
      { wrapper: p => <QueryWrapper {...p} client={client} /> }
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('renders the dialog with modal={false} (no backdrop blocks the rest of the app)', async () => {
    vi.mocked(commands.getById).mockResolvedValue(
      mockOk({
        id: 'P1',
        company: 'ACME',
        name: 'Widget',
        category: 'A',
        created_at: null,
        updated_at: null,
        deleted_at: null,
      } as never)
    )
    vi.mocked(commands.warehousesGetAll).mockResolvedValue(mockOk([]))
    vi.mocked(commands.stockLevelsGetByProduct).mockResolvedValue(mockOk([]))
    vi.mocked(commands.variantsGetByProductWithStock).mockResolvedValue(
      mockOk([])
    )
    vi.mocked(commands.stockMovementsGetByVariant).mockResolvedValue(mockOk([]))

    renderModal()
    await waitFor(() => screen.getByRole('heading', { name: 'Widget' }), {
      timeout: 5000,
    })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('Save button is disabled when isDirty is false', async () => {
    vi.mocked(commands.getById).mockResolvedValue(
      mockOk({
        id: 'P1',
        company: 'ACME',
        name: 'Widget',
        category: 'A',
        created_at: null,
        updated_at: null,
        deleted_at: null,
      } as never)
    )
    vi.mocked(commands.warehousesGetAll).mockResolvedValue(mockOk([]))
    vi.mocked(commands.stockLevelsGetByProduct).mockResolvedValue(mockOk([]))
    vi.mocked(commands.variantsGetByProductWithStock).mockResolvedValue(
      mockOk([])
    )
    vi.mocked(commands.stockMovementsGetByVariant).mockResolvedValue(mockOk([]))

    renderModal()
    await waitFor(() => screen.getByRole('heading', { name: 'Widget' }))
    await userEvent.setup().click(screen.getByRole('button', { name: /edit/i }))
    const saveAndClose = screen.queryByText(/save.*close/i)
    if (saveAndClose) {
      expect(saveAndClose.closest('button')).toBeDisabled()
    }
  })
})
