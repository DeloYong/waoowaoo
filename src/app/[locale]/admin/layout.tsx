import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Link } from '@/i18n/navigation'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await getServerSession(authOptions)
  
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
    { href: '/zh/admin/platform-keys', label: '平台 Key 配置', icon: '🔑' },
    { href: '/zh/admin/credit-pricing', label: '积分定价配置', icon: '💰' },
    { href: '/zh/admin/users', label: '用户管理', icon: '👥' },
    { href: '/zh/admin/invite-leaderboard', label: '邀请榜单', icon: '🏆' },
  ]

  return (
    <div className="min-h-screen bg-[var(--glass-bg-canvas)]">
      <div className="flex">
        {/* 侧边栏 */}
        <aside className="w-64 min-h-screen bg-[var(--glass-bg-surface)] border-r border-[var(--glass-stroke-soft)] p-6">
          <div className="mb-8">
            <h1 className="text-xl font-bold text-[var(--glass-text-primary)]">管理员后台</h1>
          </div>
          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-[var(--glass-text-secondary)] hover:bg-[var(--glass-bg-surface-strong)] hover:text-[var(--glass-text-primary)] transition-colors"
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
