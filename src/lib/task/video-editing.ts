import { prisma } from '@/lib/prisma'
import { ApiError } from '@/lib/api-errors'

/**
 * 更新视频剪辑任务状态
 * @param taskId 任务ID
 * @param status 任务状态：pending/processing/completed/failed
 * @param progress 进度 0-100
 * @param resultUrl 结果视频URL
 * @param errorMessage 错误信息
 */
export async function updateVideoEditingTaskStatus(
  taskId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  progress?: number,
  resultUrl?: string,
  errorMessage?: string
) {
  const task = await prisma.videoEditingTask.findUnique({
    where: { id: taskId },
  })

  if (!task) {
    throw new ApiError('NOT_FOUND', { message: 'Video editing task not found' })
  }

  const updatedTask = await prisma.videoEditingTask.update({
    where: { id: taskId },
    data: {
      status,
      ...(progress !== undefined && { progress: Math.max(0, Math.min(100, progress)) }),
      ...(resultUrl && { resultUrl }),
      ...(errorMessage && { errorMessage }),
    },
  })

  return updatedTask
}

/**
 * 获取视频剪辑任务详情
 * @param taskId 任务ID
 */
export async function getVideoEditingTask(taskId: string) {
  const task = await prisma.videoEditingTask.findUnique({
    where: { id: taskId },
  })

  if (!task) {
    throw new ApiError('NOT_FOUND', { message: 'Video editing task not found' })
  }

  return task
}
