/**
 * 管理员鉴权
 */
import { prisma } from '@/lib/prisma'

// 临时实现 - 实际项目需集成 next-auth
export async function requireAdmin(): Promise<string> {
  // 临时返回测试管理员ID
  return 'admin-user-id'
}
