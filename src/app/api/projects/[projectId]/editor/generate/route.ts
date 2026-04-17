import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserAuth, isErrorResponse } from '@/lib/api-auth'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { addTaskJob } from '@/lib/task/queues'
import { TASK_TYPE } from '@/lib/task/types'
import { v4 as uuidv4 } from 'uuid'

// POST - 提交视频剪辑任务
export const POST = apiHandler(async (
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

  const body = await request.json()
  const { episodeId, clipIds } = body

  if (!episodeId) {
    throw new ApiError('BAD_REQUEST', 'episodeId is required')
  }

  if (!clipIds || !Array.isArray(clipIds) || clipIds.length === 0) {
    throw new ApiError('BAD_REQUEST', 'clipIds is required and must be a non-empty array')
  }

  // 查询所有片段的视频URL
  const clips = await prisma.novelPromotionSceneShot.findMany({
    where: {
      id: { in: clipIds },
      episode: {
        projectId,
        userId: session.user.id,
      },
    },
    select: {
      videoUrl: true,
    },
  })

  const shardVideos = clips.map(clip => clip.videoUrl).filter(Boolean) as string[]
  if (shardVideos.length === 0) {
    throw new ApiError('BAD_REQUEST', 'No valid video clips found')
  }

  // 创建VideoEditingTask记录
  const taskId = uuidv4()
  const videoEditingTask = await prisma.videoEditingTask.create({
    data: {
      id: taskId,
      projectId,
      episodeId,
      userId: session.user.id,
      status: 'pending',
      progress: 0,
    },
  })

  // 提交任务到队列
  await addTaskJob({
    taskId,
    type: TASK_TYPE.VIDEO_EDITING,
    locale: 'zh-CN', // TODO: 从用户信息获取
    projectId,
    episodeId,
    targetType: 'video_editing',
    targetId: episodeId,
    payload: {
      shardVideos,
    },
    userId: session.user.id,
  })

  return NextResponse.json({
    success: true,
    taskId,
    task: videoEditingTask,
  })
})
