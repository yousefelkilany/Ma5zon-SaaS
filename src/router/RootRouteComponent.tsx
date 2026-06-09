import { ThemeProvider } from '@/components/ThemeProvider'
import { MainWindow } from '@/components/layout/MainWindow'

export function RootRouteComponent() {
  return (
    <ThemeProvider>
      <MainWindow />
    </ThemeProvider>
  )
}
