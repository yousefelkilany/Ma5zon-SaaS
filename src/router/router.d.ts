import '@tanstack/react-router'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { router } from '@/router'

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
