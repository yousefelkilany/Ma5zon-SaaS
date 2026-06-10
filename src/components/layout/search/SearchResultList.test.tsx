import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SearchResultList } from './SearchResultList'
import type { SearchHit } from './types'

const hit = (overrides: Partial<SearchHit> = {}): SearchHit => ({
  entity_type: 'product',
  id: '1',
  parent_id: null,
  matched_column: 'name',
  match_title: 'Laptop Stand',
  highlighted_title: '<mark>Laptop</mark> Stand',
  subtitle: 'Acme',
  meta: 'Accessories',
  rank: 1,
  ...overrides,
})

describe('SearchResultList', () => {
  it('groups hits by entity_type', () => {
    render(
      <SearchResultList
        hits={[
          hit({ entity_type: 'product', id: '1' }),
          hit({ entity_type: 'variant', id: '2' }),
          hit({ entity_type: 'product', id: '3' }),
        ]}
        totalCount={3}
        hasMore={false}
        onLoadMore={() => {}}
        isFetchingMore={false}
        onActivate={() => {}}
        activeIndex={0}
        setActiveIndex={() => {}}
      />,
    )
    expect(screen.getByTestId('search-result-list')).toBeInTheDocument()
    expect(screen.getAllByTestId('search-result-row')).toHaveLength(3)
  })

  it('renders "No results" when hits are empty', () => {
    render(
      <SearchResultList
        hits={[]}
        totalCount={0}
        hasMore={false}
        onLoadMore={() => {}}
        isFetchingMore={false}
        onActivate={() => {}}
        activeIndex={0}
        setActiveIndex={() => {}}
      />,
    )
    expect(screen.getByText(/no results/i)).toBeInTheDocument()
  })

  it('calls onLoadMore when Show more is clicked', () => {
    const onLoadMore = vi.fn()
    render(
      <SearchResultList
        hits={[hit()]}
        totalCount={100}
        hasMore
        onLoadMore={onLoadMore}
        isFetchingMore={false}
        onActivate={() => {}}
        activeIndex={0}
        setActiveIndex={() => {}}
      />,
    )
    fireEvent.click(screen.getByText(/show more/i))
    expect(onLoadMore).toHaveBeenCalled()
  })
})