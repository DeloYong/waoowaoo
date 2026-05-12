import { describe, it, expect } from 'vitest'
import { ROUTE_CATALOG, type RouteCatalogEntry } from '../../../contracts/route-catalog'

describe('Payment Routes Contract', () => {
  it('should include all payment routes in the catalog', () => {
    const paymentRoutes = ROUTE_CATALOG.filter((entry: RouteCatalogEntry) =>
      entry.routeFile.startsWith('src/app/api/payment/')
    )

    expect(paymentRoutes.length).toBeGreaterThanOrEqual(5)

    const routeFiles = paymentRoutes.map((r: RouteCatalogEntry) => r.routeFile)
    expect(routeFiles).toContain('src/app/api/payment/callback/route.ts')
    expect(routeFiles).toContain('src/app/api/payment/mock/route.ts')
    expect(routeFiles).toContain('src/app/api/payment/orders/route.ts')
    expect(routeFiles).toContain('src/app/api/payment/orders/[orderId]/route.ts')
    expect(routeFiles).toContain('src/app/api/payment/packages/route.ts')
  })

  it('should assign payment routes to correct category and contract group', () => {
    const paymentRoutes = ROUTE_CATALOG.filter((entry: RouteCatalogEntry) =>
      entry.routeFile.startsWith('src/app/api/payment/')
    )

    paymentRoutes.forEach((route: RouteCatalogEntry) => {
      expect(route.category).toBe('user')
      expect(route.contractGroup).toBe('user-project-routes')
    })
  })
})
