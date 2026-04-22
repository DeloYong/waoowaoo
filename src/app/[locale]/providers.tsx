'use client'

import { SessionProvider } from "next-auth/react"
import { ToastProvider } from "@/contexts/ToastContext"
import { QueryProvider } from "@/components/providers/QueryProvider"
import { InsufficientCreditsProvider } from "@/lib/insufficient-credits-modal"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      refetchOnWindowFocus={false}
      refetchInterval={0}
    >
      <QueryProvider>
        <ToastProvider>
          <InsufficientCreditsProvider>
            {children}
          </InsufficientCreditsProvider>
        </ToastProvider>
      </QueryProvider>
    </SessionProvider>
  )
}
