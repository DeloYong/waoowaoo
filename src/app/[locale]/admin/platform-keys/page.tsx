'use client'

import { ApiConfigTabContainer } from '@/app/[locale]/profile/components/api-config-tab/ApiConfigTabContainer'
import { usePlatformProviders } from './hooks'

export default function PlatformKeysPage() {
  const platformConfig = usePlatformProviders()

  return (
    <div className="h-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[white]">
          平台 API Key 配置
        </h2>
        <p className="text-sm text-[rgba(255,255,255,0.7)] mt-1">
          配置平台级AI服务API Key和模型池（所有用户共享）
        </p>
      </div>

      <div className="h-[calc(100vh-220px)] overflow-hidden rounded-xl border border-[rgba(167, 87, 255, 0.2)] bg-[var(--wuhu-bg-surface)]">
        <ApiConfigTabContainer {...platformConfig} />
      </div>
    </div>
  )
}
