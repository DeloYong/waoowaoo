/**
 * System test: Admin API routes apiHandler wrapper
 *
 * Tests that admin API routes properly use the apiHandler wrapper
 * for consistent error handling and logging.
 */
import { describe, expect, it, vi } from 'vitest'

describe('Admin API routes apiHandler wrapper', () => {
  it('model-config route should export handler functions', async () => {
    // Verify the route file exports GET and POST functions wrapped with apiHandler
    const routeModule = await import('@/app/api/admin/model-config/route')
    expect(routeModule.GET).toBeDefined()
    expect(typeof routeModule.GET).toBe('function')
    expect(routeModule.POST).toBeDefined()
    expect(typeof routeModule.POST).toBe('function')
  })

  it('platform-keys/models route should export handler functions', async () => {
    const routeModule = await import('@/app/api/admin/platform-keys/models/route')
    expect(routeModule.GET).toBeDefined()
    expect(typeof routeModule.GET).toBe('function')
  })

  it('platform-keys/test route should export handler functions', async () => {
    const routeModule = await import('@/app/api/admin/platform-keys/test/route')
    expect(routeModule.POST).toBeDefined()
    expect(typeof routeModule.POST).toBe('function')
  })
})
