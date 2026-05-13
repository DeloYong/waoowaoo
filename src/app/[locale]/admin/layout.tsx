import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Link } from '@/i18n/navigation'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await getServerSession(authOptions) as { user?: { id?: string } } | null
  
  if (!session?.user?.id) {
    redirect('/zh/auth/signin')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true }
  })

  if (!user?.isAdmin) {
    redirect('/zh/home')
  }

  const navItems = [
    { href: '/admin/platform-keys', label: '平台 Key 配置', icon: '🔑' },
    { href: '/admin/plans', label: '套餐管理', icon: '📦' },
    { href: '/admin/credit-pricing', label: '积分定价配置', icon: '💰' },
    { href: '/admin/users', label: '用户管理', icon: '👥' },
    { href: '/admin/invite-leaderboard', label: '邀请榜单', icon: '🏆' },
    { href: '/admin/reports', label: '数据报表', icon: '📊' },
  ]

  return (
    <div className="min-h-screen bg-[var(--wuhu-bg-canvas)]">
      <div className="flex">
        {/* 侧边栏 */}
        <aside className="w-64 min-h-screen bg-[var(--wuhu-bg-surface)] border-r border-[rgba(167, 87, 255, 0.2)] p-6">
          <div className="mb-8">
            <h1 className="text-xl font-bold text-[white]">管理员后台</h1>
          </div>
          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-[rgba(255,255,255,0.7)] hover:bg-[var(--wuhu-bg-surface)] hover:text-[white] transition-colors"
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* 主内容区 */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
