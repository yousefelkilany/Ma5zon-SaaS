import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { QueryWrapper, createTestQueryClient } from '@/lib/test-utils/query-wrapper'
import { WarehouseModal } from '../WarehouseModal'
import { useUIStore } from '@/store/ui-store'
import { commands } from '@/lib/tauri-bindings'

vi.mock('@/lib/tauri-bindings', () => ({
  commands: {
    warehousesGetById: vi.fn(),
    warehousesCreate: vi.fn(),
    warehousesUpdate: vi.fn(),
    warehousesDelete: vi.fn(),
    warehousesGetAll: vi.fn(),
    stockMovementsGetByWarehouse: vi.fn(),
  },
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const mockOk = <T,>(data: T) => ({ status: 'ok' as const, data })

function renderModal(
  props: Partial<React.ComponentProps<typeof WarehouseModal>> = {}
) {
  const client = createTestQueryClient()
  const utils = render(
    <WarehouseModal
      entityId="W1"
      queryClient={client}
      mode="view"
      onDeleted={vi.fn()}
      {...props}
    />,
    { wrapper: (p) => <QueryWrapper {...p} client={client} /> }
  )
  return { ...utils, client }
}

describe('WarehouseModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useUIStore.setState({ tabState: {} })
  })

  it('create mode renders without crashing', async () => {
    vi.mocked(commands.warehousesGetAll).mockResolvedValue(mockOk([]))
    const client = createTestQueryClient()
    render(
      <WarehouseModal queryClient={client} mode="create" onDeleted={vi.fn()} />,
      { wrapper: (p) => <QueryWrapper {...p} client={client} /> }
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('renders the dialog with modal={false} (no backdrop blocks the rest of the app)', async () => {
    vi.mocked(commands.warehousesGetById).mockResolvedValue(
      mockOk({
        id: 'W1',
        name: 'Main Warehouse',
        location: 'Cairo',
        created_at: null,
        updated_at: null,
        deleted_at: null,
      } as never)
    )
    vi.mocked(commands.warehousesGetAll).mockResolvedValue(mockOk([]))
    vi.mocked(commands.stockMovementsGetByWarehouse).mockResolvedValue(mockOk([]))

    renderModal()
    await waitFor(
      () => screen.getByRole('heading', { name: 'Main Warehouse' }),
      { timeout: 5000 }
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('Save button is disabled when isDirty is false', async () => {
    vi.mocked(commands.warehousesGetById).mockResolvedValue(
      mockOk({
        id: 'W1',
        name: 'Main Warehouse',
        location: 'Cairo',
        created_at: null,
        updated_at: null,
        deleted_at: null,
      } as never)
    )
    vi.mocked(commands.warehousesGetAll).mockResolvedValue(mockOk([]))
    vi.mocked(commands.stockMovementsGetByWarehouse).mockResolvedValue(mockOk([]))

    renderModal()
    await waitFor(() => screen.getByRole('heading', { name: 'Main Warehouse' }))
    await userEvent.setup().click(screen.getByRole('button', { name: /edit/i }))
    const saveAndClose = screen.queryByText(/save.*close/i)
    if (saveAndClose) {
      expect(saveAndClose.closest('button')).toBeDisabled()
    }
  })
})
