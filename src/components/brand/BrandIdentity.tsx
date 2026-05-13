'use client'

export default function BrandIdentity() {
  const brandCards = [
    {
      icon: '🏷️',
      title: '品牌身份',
      items: [
        '中文名: 芜湖',
        '英文名: wuhu',
        'Slogan: 芜湖起飞！',
        '定位: AI 创意创作平台',
      ],
      color: 'var(--wuhu-neon-purple)',
    },
    {
      icon: '🎯',
      title: '目标用户',
      items: [
        '短剧/漫画创作者',
        '年轻内容生产者',
        '追求趣味与效率的',
        'AI 工具使用者',
      ],
      color: 'var(--wuhu-neon-pink)',
    },
    {
      icon: '✨',
      title: '品牌气质',
      items: [
        '🟣 酷萌风',
        '🟡 霓虹活力',
        '🔵 搞怪有趣',
        '',
      ],
      color: 'var(--wuhu-neon-cyan)',
    },
  ]

  return (
    <div className="w-full max-w-6xl px-8">
      <h2 className="text-4xl font-bold text-center mb-12 neon-text">
        品牌核心
      </h2>

      {/* 三栏卡片布局 */}
      <div className="grid grid-cols-3 gap-8">
        {brandCards.map((card, index) => (
          <div
            key={index}
            className="glow-card p-8 text-center"
            style={{
              borderColor: `${card.color}40`,
              animationDelay: `${index * 0.2}s`,
            }}
          >
            {/* 图标 */}
            <div
              className="text-5xl mb-6"
              style={{
                filter: `drop-shadow(0 0 15px ${card.color})`,
              }}
            >
              {card.icon}
            </div>

            {/* 标题 */}
            <h3
              className="text-2xl font-bold mb-6"
              style={{ color: card.color }}
            >
              {card.title}
            </h3>

            {/* 内容列表 */}
            <ul className="space-y-3">
              {card.items.map((item, i) => (
                <li key={i} className="text-white/70 text-lg">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* 渐变分割线 */}
      <div className="mt-16 h-px bg-gradient-to-r from-transparent via-[var(--wuhu-neon-purple)] to-transparent opacity-50" />

      {/* 底部小彩蛋 - 角落探头的呜虎 */}
      <div className="absolute bottom-8 right-8 opacity-30 hover:opacity-100 transition-opacity duration-300">
        <div className="text-6xl transform rotate-12">👀</div>
      </div>
    </div>
  )
}
