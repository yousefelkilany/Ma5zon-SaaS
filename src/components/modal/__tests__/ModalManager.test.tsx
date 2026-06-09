import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { QueryWrapper } from '@/lib/test-utils/query-wrapper'
import { ModalManager } from '../ModalManager'
import { useUIStore } from '@/store/ui-store'
import { commands } from '@/lib/tauri-bindings'

vi.mock('@/lib/tauri-bindings', () => ({
  commands: {
    getById: vi.fn(),
    variantsGetById: vi.fn(),
    warehousesGetById: vi.fn(),
    stockLevelsGetByProduct: vi.fn(),
    stockLevelsGetByVariant: vi.fn(),
    stockMovementsGetByProduct: vi.fn(),
    stockMovementsGetByVariant: vi.fn(),
    stockMovementsGetByWarehouse: vi.fn(),
    variantsGetByProductWithStock: vi.fn(),
    warehousesGetAll: vi.fn(),
  },
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const mockOk = <T,>(data: T) => ({ status: 'ok' as const, data })

let mockSearch = ''
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>(
    '@tanstack/react-router'
  )
  return {
    ...actual,
    useLocation: (_opts?: unknown) => {
      const href = '/entity/products' + (mockSearch ? '?' + mockSearch : '')
      return {
        pathname: '/entity/products',
        search: mockSearch,
        href,
      }
    },
    useNavigate: () => vi.fn(),
  }
})

describe('ModalManager', () => {
  beforeEach(() => {
    mockSearch = ''
    useUIStore.setState({ tabState: {} })
    vi.mocked(commands.getById).mockResolvedValue(
      mockOk({
        id: 'P1',
        company: 'ACME',
        name: 'Widget',
        category: 'A',
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
        deleted_at: null,
      })
    )
    vi.mocked(commands.warehousesGetAll).mockResolvedValue(mockOk([]))
    vi.mocked(commands.stockLevelsGetByProduct).mockResolvedValue(mockOk([]))
    vi.mocked(commands.variantsGetByProductWithStock).mockResolvedValue(mockOk([]))
    vi.mocked(commands.stockMovementsGetByVariant).mockResolvedValue(mockOk([]))
  })

  it('returns null when there are no modal search params', () => {
    const { container } = render(<ModalManager portalTarget={null} />, {
      wrapper: QueryWrapper,
    })
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the product modal when entity_modal=product and entity_id is set', async () => {
    mockSearch = 'entity_modal=product&entity_id=P1'
    render(<ModalManager portalTarget={null} />, { wrapper: QueryWrapper })
    await waitFor(
      () => {
        const title = document.querySelector('[data-slot="dialog-title"]')
        const desc = document.querySelector('[data-slot="dialog-description"]')
        const text = `${title?.textContent ?? ''} ${desc?.textContent ?? ''}`
        expect(text).toMatch(/ACME|Widget/)
      },
      { timeout: 3000 }
    )
  })
})
