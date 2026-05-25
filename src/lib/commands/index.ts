// Command system exports
export * from './registry'
export * from '../../hooks/use-command-context'
import { windowCommands } from './window-commands'
import { notificationCommands } from './notification-commands'
import { registerCommands } from './registry'

/**
 * Initialize the command system by registering all commands.
 * This should be called once during app initialization.
 */
export function initializeCommandSystem(): void {
  registerCommands(windowCommands)
  registerCommands(notificationCommands)

  if (import.meta.env.DEV) {
    console.log('Command system initialized')
  }
}

export { windowCommands, notificationCommands }
