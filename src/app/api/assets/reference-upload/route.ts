import { NextRequest, NextResponse } from 'next/server'
import { uploadObject, generateUniqueKey } from '@/lib/storage'
import { requireUserAuth, isErrorResponse } from '@/lib/api-auth'
import { apiHandler, ApiError } from '@/lib/api-errors'

export const POST = apiHandler(async (request: NextRequest) => {
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  
  if (!file) {
    throw new ApiError('INVALID_PARAMS', { details: 'file is required' })
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  
  const ext = file.name.split('.').pop() || 'jpg'
  const key = generateUniqueKey('ref-upload', ext)
  
  // Actually upload Object
  await uploadObject(buffer, key)
  
  return NextResponse.json({
    success: true,
    url: key
  })
})
