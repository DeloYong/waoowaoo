'use client'

export default function ScenePreview() {
  const scenes = [
    {
      icon: '🌐',
      title: '网站首页',
      description: '呜虎在 Hero 区域跳跃，背景粒子流动，迎接每一位创作者',
      color: 'var(--wuhu-neon-purple)',
    },
    {
      icon: '📱',
      title: '社交媒体',
      description: '呜虎表情包贴纸系列，微信/微博传播，病毒式品牌扩散',
      color: 'var(--wuhu-neon-pink)',
    },
    {
      icon: '🎨',
      title: '营销物料',
      description: '海报、易拉宝、周边产品，品牌露出无处不在',
      color: 'var(--wuhu-neon-cyan)',
    },
    {
      icon: '🎥',
      title: '视频水印',
      description: '动态结尾动画，强化品牌记忆，创作者作品的骄傲印记',
      color: 'var(--wuhu-neon-orange)',
    },
  ]

  return (
    <div className="w-full max-w-6xl px-8">
      <h2 className="text-4xl font-bold text-center mb-12 neon-text">
        应用场景
      </h2>

      {/* 2x2 场景网格 */}
      <div className="grid grid-cols-2 gap-8">
        {scenes.map((scene, index) => (
          <div
            key={index}
            className="glow-card p-8 hover:scale-105 transition-transform cursor-pointer"
            style={{
              borderColor: `${scene.color}40`,
            }}
          >
            <div
              className="text-5xl mb-6"
              style={{
                filter: `drop-shadow(0 0 10px ${scene.color})`,
              }}
            >
              {scene.icon}
            </div>
            <h3
              className="text-2xl font-bold mb-4"
              style={{ color: scene.color }}
            >
              {scene.title}
            </h3>
            <p className="text-white/60 text-lg leading-relaxed">
              {scene.description}
            </p>
          </div>
        ))}
      </div>

      {/* 底部品牌理念 */}
      <div className="mt-16 text-center">
        <div className="inline-block px-12 py-6 rounded-2xl bg-gradient-to-r from-[var(--wuhu-neon-purple)]/20 via-[var(--wuhu-neon-pink)]/20 to-[var(--wuhu-neon-cyan)]/20 border border-white/10">
          <p className="text-white/80 text-xl mb-2">
            Wuhu 品牌的核心是「惊喜感」
          </p>
          <p className="text-white/50">
            就像看到视频成品时脱口而出的那句——「芜湖起飞！」
          </p>
        </div>
      </div>

      {/* 封底 Logo */}
      <div className="mt-16 text-center">
        <div className="text-6xl font-bold neon-text inline-block px-8 py-4 rounded-2xl breathe-glow">
          WH
        </div>
        <p className="mt-6 text-white/40 text-lg">wuhu.ai</p>
        <p className="mt-2 text-white/30 text-xl">「 芜湖起飞！」</p>
      </div>
    </div>
  )
}
