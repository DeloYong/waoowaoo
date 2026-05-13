'use client'

import Mascot from './Mascot'

export default function MascotGallery() {
  const expressions = [
    { key: 'wink', name: '眨眼', description: '默认搞怪脸', emoji: '😜' },
    { key: 'surprise', name: '惊喜', description: '星星眼睛', emoji: '⭐' },
    { key: 'director', name: '导演', description: '专业创作', emoji: '🎬' },
    { key: 'celebrate', name: '庆祝', description: '撒花欢呼', emoji: '🎉' },
    { key: 'thinking', name: '思考', description: '创意迸发', emoji: '🤔' },
    { key: 'sorry', name: '抱歉', description: '委屈挠头', emoji: '🥺' },
  ] as const

  return (
    <div className="w-full max-w-6xl px-8">
      <h2 className="text-4xl font-bold text-center mb-4 neon-text">
        呜虎 Woohoo
      </h2>
      <p className="text-center text-white/60 mb-12 text-lg">
        圆滚滚的小怪兽，你的创意创作伙伴
      </p>

      <div className="flex gap-12">
        {/* 左侧：主形象大展示 */}
        <div className="flex-1 flex flex-col items-center">
          <div className="mascot-float">
            <Mascot expression="wink" size={320} />
          </div>
          <div className="mt-8 text-center">
            <p className="text-white/80 text-xl font-medium mb-2">名字：呜虎 (Woohoo)</p>
            <p className="text-white/60">类型：圆滚滚的创意小怪兽</p>
            <p className="text-white/60">特征：半透明身体 + 霓虹尖角 + 星星眼</p>
          </div>
        </div>

        {/* 右侧：表情网格 2x3 */}
        <div className="flex-1">
          <div className="grid grid-cols-3 gap-4">
            {expressions.map((expr, index) => (
              <div
                key={expr.key}
                className="glow-card p-4 flex flex-col items-center cursor-pointer hover:scale-105 transition-transform"
                style={{
                  animationDelay: `${index * 0.1}s`,
                }}
              >
                <Mascot expression={expr.key} size={100} />
                <div className="mt-2 text-center">
                  <span className="text-xl mr-1">{expr.emoji}</span>
                  <span className="text-white/80 font-medium">{expr.name}</span>
                  <p className="text-white/40 text-xs mt-1">{expr.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
