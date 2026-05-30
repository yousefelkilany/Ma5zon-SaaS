import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import type { CommandContext, AppCommand } from './types'

const mockUIStore = {
  getState: vi.fn(() => ({
    sidebarVisible: true,
    commandPaletteOpen: false,
    setSidebarVisible: vi.fn(),
  })),
}

vi.mock('@/store/ui-store', () => ({
  useUIStore: mockUIStore,
}))

const { registerCommands, getAllCommands, executeCommand } =
  await import('./registry')
const { windowCommands, notificationCommands } = await import('./index')

const createMockContext = (): CommandContext => ({
  showToast: vi.fn(),
})

describe('Command System', () => {
  let mockContext: CommandContext

  beforeEach(async () => {
    mockContext = createMockContext()
    await registerCommands(windowCommands)
    await registerCommands(notificationCommands)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Command Registration', () => {
    it('registers commands correctly', () => {
      const commands = getAllCommands(mockContext)
      expect(commands.length).toBeGreaterThan(0)
    })
  })

  describe('Command Execution', () => {
    it('handles non-existent command', async () => {
      const result = await executeCommand('non-existent-command', mockContext)

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('handles command execution errors', async () => {
      const errorCommand: AppCommand = {
        id: 'error-command',
        labelKey: 'commands.error.label',
        execute: () => {
          throw new Error('Test error')
        },
      }

      registerCommands([errorCommand])

      const result = await executeCommand('error-command', mockContext)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Test error')
    })
  })
})
