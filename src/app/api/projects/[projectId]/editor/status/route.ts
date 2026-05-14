import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserAuth, isErrorResponse } from '@/lib/api-auth'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { getSignedUrl, DEFAULT_SIGNED_URL_EXPIRES_SECONDS } from '@/lib/storage'

// GET - 查询视频剪辑任务状态
export const GET = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) => {
  const { projectId } = await context.params
  // 🔐 统一权限验证
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult
  const { session } = authResult

  // 验证用户是项目所有者
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  })

  if (!project) {
    throw new ApiError('NOT_FOUND')
  }

  if (project.userId !== session.user.id) {
    throw new ApiError('FORBIDDEN')
  }

  const { searchParams } = new URL(request.url)
  const taskId = searchParams.get('taskId')
  const episodeId = searchParams.get('episodeId')

  if (!taskId && !episodeId) {
    throw new ApiError('INVALID_PARAMS', { message: 'taskId or episodeId is required' })
  }

  let task
  if (taskId) {
    task = await prisma.videoEditingTask.findUnique({
      where: { id: taskId },
    })
  } else if (episodeId) {
    // 获取最新的剪辑任务
    task = await prisma.videoEditingTask.findFirst({
      where: {
        projectId,
        episodeId,
        userId: session.user.id,
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  if (!task) {
    throw new ApiError('NOT_FOUND', { message: 'Video editing task not found' })
  }

  // Map task status to frontend expected format
  const status = task.status === 'completed' ? 'completed'
    : task.status === 'failed' ? 'failed'
    : task.status === 'processing' || task.status === 'pending' ? 'generating'
    : 'idle'

  const videoUrl = task.resultUrl ? getSignedUrl(task.resultUrl, DEFAULT_SIGNED_URL_EXPIRES_SECONDS, true) : undefined
  const downloadUrl = task.resultUrl ? getSignedUrl(task.resultUrl, DEFAULT_SIGNED_URL_EXPIRES_SECONDS, false) : undefined

  return NextResponse.json({
    success: true,
    status,
    progress: task.progress,
    videoUrl,
    downloadUrl,
    message: task.errorMessage || undefined,
  })
})
