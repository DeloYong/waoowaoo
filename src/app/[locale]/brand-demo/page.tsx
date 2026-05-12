import WuhuLogo from '@/components/WuhuLogo'
import WuhuMascot from '@/components/WuhuMascot'
import WuhuEmptyState from '@/components/WuhuEmptyState'
import WuhuLoading from '@/components/WuhuLoading'
import { WuhuButton } from '@/components/ui/wuhu-button'
import { WuhuCard } from '@/components/ui/wuhu-card'

export default function BrandDemoPage() {
  return (
    <div className="min-h-screen bg-[var(--wuhu-bg-dark)] p-8">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Logo Section */}
        <section>
          <h2 className="text-white text-2xl font-bold mb-6">Logo Variants</h2>
          <div className="flex items-end gap-8">
            <WuhuLogo size="sm" />
            <WuhuLogo size="md" />
            <WuhuLogo size="lg" />
            <WuhuLogo size="xl" />
          </div>
        </section>

        {/* Mascot Section */}
        <section>
          <h2 className="text-white text-2xl font-bold mb-6">Mascot Expressions</h2>
          <div className="flex gap-6 flex-wrap">
            <div className="text-center">
              <WuhuMascot expression="default" size="md" />
              <p className="text-white mt-2">Default</p>
            </div>
            <div className="text-center">
              <WuhuMascot expression="happy" size="md" />
              <p className="text-white mt-2">Happy</p>
            </div>
            <div className="text-center">
              <WuhuMascot expression="thinking" size="md" />
              <p className="text-white mt-2">Thinking</p>
            </div>
            <div className="text-center">
              <WuhuMascot expression="surprised" size="md" />
              <p className="text-white mt-2">Surprised</p>
            </div>
            <div className="text-center">
              <WuhuMascot expression="working" size="md" />
              <p className="text-white mt-2">Working</p>
            </div>
          </div>
        </section>

        {/* Buttons Section */}
        <section>
          <h2 className="text-white text-2xl font-bold mb-6">Button Variants</h2>
          <div className="flex gap-4 flex-wrap">
            <WuhuButton variant="primary">Primary</WuhuButton>
            <WuhuButton variant="secondary">Secondary</WuhuButton>
            <WuhuButton variant="ghost">Ghost</WuhuButton>
            <WuhuButton variant="gradient">Gradient</WuhuButton>
          </div>
        </section>

        {/* Cards Section */}
        <section>
          <h2 className="text-white text-2xl font-bold mb-6">Cards</h2>
          <div className="grid grid-cols-3 gap-6">
            <WuhuCard glow="purple">
              <h3 className="text-white font-bold mb-2">Purple Glow</h3>
              <p className="text-white/70 text-sm">Card with purple neon glow</p>
            </WuhuCard>
            <WuhuCard glow="pink">
              <h3 className="text-white font-bold mb-2">Pink Glow</h3>
              <p className="text-white/70 text-sm">Card with pink neon glow</p>
            </WuhuCard>
            <WuhuCard glow="cyan">
              <h3 className="text-white font-bold mb-2">Cyan Glow</h3>
              <p className="text-white/70 text-sm">Card with cyan neon glow</p>
            </WuhuCard>
          </div>
        </section>

        {/* Empty State Section */}
        <section>
          <h2 className="text-white text-2xl font-bold mb-6">Empty State</h2>
          <WuhuCard>
            <WuhuEmptyState
              title="还没有项目哦"
              description="点击下方按钮创建你的第一个AI视频项目吧！"
              action={<WuhuButton variant="gradient">创建项目</WuhuButton>}
            />
          </WuhuCard>
        </section>

        {/* Loading Section */}
        <section>
          <h2 className="text-white text-2xl font-bold mb-6">Loading State</h2>
          <WuhuCard>
            <WuhuLoading text="正在生成你的 masterpiece..." />
          </WuhuCard>
        </section>
      </div>
    </div>
  )
}
