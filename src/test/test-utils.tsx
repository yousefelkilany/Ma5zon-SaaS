import React, { useState, useMemo } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nextProvider } from 'react-i18next'
import {
  RouterContextProvider,
  createRouter,
  createRootRoute,
  createRoute,
} from '@tanstack/react-router'
import i18n from '@/i18n/config'
import {
  ThemeProviderContext,
  type Theme,
  type ThemeProviderState,
} from '@/lib/theme-context'

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })

interface AllTheProvidersProps {
  children: React.ReactNode
}

function MockThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')

  const value: ThemeProviderState = {
    theme,
    setTheme,
  }

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

const rootRoute = createRootRoute({})

const testRouter = createRouter({
  routeTree: rootRoute.addChildren([
    createRoute({
      path: '/',
      getParentRoute: () => rootRoute,
      component: () => null,
    }),
  ]),
})

const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  const queryClient = useMemo(() => createTestQueryClient(), [])

  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <RouterContextProvider router={testRouter}>
          <MockThemeProvider>{children}</MockThemeProvider>
        </RouterContextProvider>
      </I18nextProvider>
    </QueryClientProvider>
  )
}

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }
