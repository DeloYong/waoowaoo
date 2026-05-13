'use client'

import React from 'react'
import VideoPanelCardHeader from './VideoPanelCardHeader'
import VideoPanelCardBody from './VideoPanelCardBody'
import VideoPanelCardFooter from './VideoPanelCardFooter'
import { useVideoPanelActions, type VideoPanelCardShellProps } from './hooks/useVideoPanelActions'

export type { VideoPanelCardShellProps }

function VideoPanelCardLayout(props: VideoPanelCardShellProps) {
  const runtime = useVideoPanelActions(props)

  return (
    <div className="bg-[var(--wuhu-bg-card)] border border-[var(--wuhu-neon-purple)]/40 shadow-[0_0_20px_rgba(167,87,255,0.2)] rounded-2xl overflow-visible">
      <VideoPanelCardHeader runtime={runtime} />
      <VideoPanelCardBody runtime={runtime} />
      <VideoPanelCardFooter runtime={runtime} />
    </div>
  )
}

export default React.memo(VideoPanelCardLayout)
