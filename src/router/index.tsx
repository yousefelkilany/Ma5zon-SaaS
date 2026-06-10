import {
  createRouter,
  createRoute,
  createRootRoute,
} from '@tanstack/react-router'
import { z } from 'zod'
import { EntityWorkspace } from '@/components/entity'
import { DashboardContent, NewTabContent } from '@/components/tabs'
import { ModalTypes } from '@/lib/utils'
import { RootRouteComponent } from './RootRouteComponent'
import { RouterErrorComponent } from './RouterErrorComponent'

const rootRoute = createRootRoute({
  component: RootRouteComponent,
  errorComponent: RouterErrorComponent,
})

const entitySearchSchema = z.object({
  entity_modal: z.enum(ModalTypes).optional(),
  entity_id: z.string().optional(),
  product_id: z.string().optional(),
})

const entityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/entity/$entityType',
  component: EntityWorkspace,
  validateSearch: entitySearchSchema,
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
