'use client'

import { ApiConfigTabContainer } from '@/app/[locale]/profile/components/api-config-tab/ApiConfigTabContainer'

export default function PlatformKeysPage() {
  return (
    <div className="h-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[var(--glass-text-primary)]">
          平台 API Key 配置
        </h2>
        <p className="text-sm text-[var(--glass-text-secondary)] mt-1">
          配置平台级AI服务API Key和模型池（所有用户共享）
        </p>
      </div>

      <div className="h-[calc(100vh-220px)] overflow-hidden rounded-xl border border-[var(--glass-stroke-soft)] bg-[var(--glass-bg-surface)]">
        <ApiConfigTabContainer />
      </div>
    </div>
  )
}
