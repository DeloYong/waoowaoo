'use client'

export default function VisualSystem() {
  const colors = [
    {
      name: '电光紫',
      hex: '#A757FF',
      oklch: 'oklch(0.65 0.28 290)',
      cssVar: '--wuhu-neon-purple',
      usage: '主色 / 品牌色',
    },
    {
      name: '荧光粉',
      hex: '#FF64C8',
      oklch: 'oklch(0.7 0.32 350)',
      cssVar: '--wuhu-neon-pink',
      usage: '强调 / 交互',
    },
    {
      name: '亮青色',
      hex: '#64FFFF',
      oklch: 'oklch(0.75 0.25 180)',
      cssVar: '--wuhu-neon-cyan',
      usage: '高亮 / 成功',
    },
  ]

  return (
    <div className="w-full max-w-6xl px-8">
      <h2 className="text-4xl font-bold text-center mb-12 neon-text">
        视觉系统
      </h2>

      {/* 色卡展示区域 */}
      <div className="flex justify-center gap-12 mb-16">
        {colors.map((color, index) => (
          <div key={index} className="text-center">
            {/* 色卡 */}
            <div
              className="w-32 h-32 rounded-2xl mb-6 breathe-glow"
              style={{
                background: `linear-gradient(135deg, ${color.hex}80, ${color.hex}40)`,
                border: `2px solid ${color.hex}`,
                boxShadow: `0 0 30px ${color.hex}60, inset 0 0 20px ${color.hex}30`,
              }}
            />
            {/* 颜色信息 */}
            <h3 className="text-xl font-bold text-white mb-2">{color.name}</h3>
            <p className="text-white/60 font-mono text-sm">{color.hex}</p>
            <p className="text-white/40 font-mono text-xs mt-1">{color.oklch}</p>
            <p className="text-white/50 text-sm mt-3">{color.usage}</p>
          </div>
        ))}
      </div>

      {/* 渐变分割线 */}
      <div className="h-px bg-gradient-to-r from-transparent via-[var(--wuhu-neon-purple)] to-transparent opacity-50 mb-12" />

      {/* 核心组件预览 */}
      <h3 className="text-2xl font-bold text-white/80 text-center mb-8">核心组件预览</h3>

      <div className="grid grid-cols-3 gap-6">
        {/* 主要按钮预览 */}
        <div className="glow-card p-6 flex flex-col items-center">
          <p className="text-white/50 text-sm mb-4">主要按钮</p>
          <button className="px-8 py-3 bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] rounded-lg text-white font-medium shadow-[0_0_20px_rgba(167,87,255,0.3)] hover:shadow-[0_0_30px_rgba(167,87,255,0.4)] transition-all">
            立即开始
          </button>
        </div>

        {/* 发光卡片预览 */}
        <div className="glow-card p-6 flex flex-col items-center">
          <p className="text-white/50 text-sm mb-4">发光卡片</p>
          <div className="w-full bg-[var(--wuhu-bg-surface)] rounded-lg p-4 border border-[var(--wuhu-neon-purple)]/30">
            <p className="text-white/70 text-center">卡片内容区域</p>
          </div>
        </div>

        {/* 渐变文字预览 */}
        <div className="glow-card p-6 flex flex-col items-center">
          <p className="text-white/50 text-sm mb-4">渐变文字</p>
          <p className="neon-text text-2xl font-bold">¥99.00</p>
        </div>
      </div>

      {/* CSS 变量代码展示 */}
      <div className="mt-12 glow-card p-6">
        <p className="text-white/50 text-sm mb-3">核心 CSS 变量</p>
        <pre className="text-white/70 font-mono text-sm overflow-x-auto whitespace-pre-wrap">
{`/* 霓虹三原色 */
--wuhu-neon-purple: oklch(0.65 0.28 290);
--wuhu-neon-pink: oklch(0.7 0.32 350);
--wuhu-neon-cyan: oklch(0.75 0.25 180);

/* 渐变系统 */
--wuhu-gradient-text: linear-gradient(90deg,
  var(--wuhu-neon-cyan),
  var(--wuhu-neon-purple),
  var(--wuhu-neon-pink));`}
        </pre>
      </div>
    </div>
  )
}
