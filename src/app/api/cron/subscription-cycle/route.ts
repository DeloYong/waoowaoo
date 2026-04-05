import { NextRequest, NextResponse } from 'next/server'
import { processExpiredSubscriptions } from '@/lib/subscription'

export const POST = async (request: NextRequest) => {
  // 简单的认证：检查 Authorization header
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await processExpiredSubscriptions()

  return NextResponse.json({
    success: true,
    processed: result.processed,
    errors: result.errors,
  })
}
