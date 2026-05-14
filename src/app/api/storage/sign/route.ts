import { NextRequest, NextResponse } from 'next/server'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { getObjectBuffer, getStorageProvider } from '@/lib/storage'

export const GET = apiHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')
  const inline = searchParams.get('inline') === 'true'

  if (!key) {
    throw new ApiError('INVALID_PARAMS')
  }

  const provider = getStorageProvider()

  // Local provider: redirect to /api/files (already works)
  if (provider.kind === 'local') {
    const encodedPath = key.split('/').map(segment => encodeURIComponent(segment)).join('/')
    return NextResponse.redirect(`/api/files/${encodedPath}`)
  }

  // MinIO/S3: 代理下载，不直接暴露存储服务地址
  const buffer = await getObjectBuffer(key)
  const ext = key.split('.').pop()?.toLowerCase() ?? 'mp4'

  const contentType = ext === 'mp4' ? 'video/mp4'
    : ext === 'webm' ? 'video/webm'
    : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
    : ext === 'png' ? 'image/png'
    : ext === 'webp' ? 'image/webp'
    : 'application/octet-stream'

  const filename = key.split('/').pop() ?? `download.${ext}`
  const dispositionType = inline ? 'inline' : 'attachment'
  const contentDisposition = `${dispositionType}; filename*=UTF-8''${encodeURIComponent(filename)}`

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': contentDisposition,
      'Content-Length': String(buffer.length),
      'Cache-Control': 'public, max-age=86400',
    },
  })
})
