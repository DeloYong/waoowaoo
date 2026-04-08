import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-errors'
import { processExpiredSubscriptions } from '@/lib/subscription'

export const POST = apiHandler(async (request: NextRequest) => {
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
})
