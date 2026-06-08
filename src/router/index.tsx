import {
  createRouter,
  createRoute,
  createRootRoute,
} from '@tanstack/react-router'
import { EntityWorkspace } from '@/components/entity'
import { DashboardContent, NewTabContent } from '@/components/tabs'
import { RootRouteComponent } from './RootRouteComponent'

const rootRoute = createRootRoute({
  component: RootRouteComponent,
})

const entityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/entity/:entityType',
  component: EntityWorkspace,
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: DashboardContent,
})

const newTabRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/new-tab',
  component: NewTabContent,
})

const salesInvoiceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sales-invoice',
  component: NewTabContent,
})

const purchaseInvoiceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/purchase-invoice',
  component: NewTabContent,
})

const catchAllRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '*',
  component: DashboardContent,
})

export const routeTree = rootRoute.addChildren([
  dashboardRoute,
  newTabRoute,
  salesInvoiceRoute,
  purchaseInvoiceRoute,
  entityRoute,
  catchAllRoute,
])

export const router = createRouter({
  routeTree,
})
