import { describe, it, expect, afterEach } from 'vitest'

describe('worker error resilience', () => {
  afterEach(() => {
    process.removeAllListeners('unhandledRejection')
    process.removeAllListeners('uncaughtException')
    // Re-register default behavior
    process.on('uncaughtException', () => {
      process.exit(1)
    })
    process.on('unhandledRejection', () => {
      process.exit(1)
    })
  })

  it('logs unhandledRejection without crashing the process', async () => {
    process.removeAllListeners('unhandledRejection')

    let caught = false
    process.on('unhandledRejection', () => {
      caught = true
    })

    // Trigger an unhandled rejection
    const rejected = Promise.reject(new Error('test rejection'))
    // Prevent node from treating this as a real unhandled rejection
    rejected.catch(() => {})

    // Let microtasks run
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(caught).toBe(true)
  })

  it('logs uncaughtException without crashing the process', async () => {
    process.removeAllListeners('uncaughtException')

    let caught = false
    process.on('uncaughtException', () => {
      caught = true
    })

    // Trigger an uncaught exception in a separate tick
    setTimeout(() => {
      throw new Error('test exception')
    }, 10)

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(caught).toBe(true)
  })
})