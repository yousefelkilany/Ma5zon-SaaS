import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WarehousesSubTable } from './WarehousesSubTable'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Infinity,
      },
    },
  })
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return Wrapper
}

describe('WarehousesSubTable', () => {
  beforeEach(() => {
    vi.mock('react-i18next', () => ({
      useTranslation: () => ({ t: (key: string) => key }),
    }))
    vi.mock('@/i18n/config', () => ({
      default: { language: 'en' },
    }))
  })

  it('renders loading skeleton when isLoading is true', () => {
    const Wrapper = createWrapper()
    render(
      <Wrapper>
        <WarehousesSubTable warehouseId="wh1" />
      </Wrapper>
    )
    expect(screen.getByTestId('warehouses-subtable-skeleton')).toBeTruthy()
  })

  it('renders empty state when stockLevels is empty', () => {
    const Wrapper = createWrapper()
    render(
      <Wrapper>
        <WarehousesSubTable warehouseId="wh1" />
      </Wrapper>
    )
    expect(screen.getByText('entity.stock.noLevels')).toBeTruthy()
  })

  it('renders stock levels table when data exists', () => {
    const Wrapper = createWrapper()
    render(
      <Wrapper>
        <WarehousesSubTable warehouseId="wh1" />
      </Wrapper>
    )
    expect(screen.getByText('Widget A')).toBeTruthy()
    expect(screen.getByText('Widget B')).toBeTruthy()
  })
})
