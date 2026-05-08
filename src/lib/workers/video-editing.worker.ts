import { Worker, type Job } from 'bullmq'
import { exec as execCallback } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { queueRedis } from '@/lib/redis'
import { QUEUE_NAME } from '@/lib/task/queues'
import { TASK_TYPE, type TaskJobData } from '@/lib/task/types'
import { getUserWorkflowConcurrencyConfig } from '@/lib/config-service'
import { reportTaskProgress, withTaskLifecycle } from './shared'
import { withUserConcurrencyGate } from './user-concurrency-gate'
import { assertTaskActive, toSignedUrlIfCos, uploadVideoSourceToCos } from './utils'
import { createScopedLogger } from '@/lib/logging/core'
import { updateVideoEditingTaskStatus } from '@/lib/task/video-editing'

const exec = promisify(execCallback)

// Configurations - these can be moved to env vars later
const DEFAULT_INTRO_VIDEO_PATH = process.env.DEFAULT_VIDEO_INTRO_PATH || '/assets/default-intro.mp4'
const DEFAULT_OUTRO_VIDEO_PATH = process.env.DEFAULT_VIDEO_OUTRO_PATH || '/assets/default-outro.mp4'
const DEFAULT_WATERMARK_PATH = process.env.DEFAULT_VIDEO_WATERMARK_PATH || '/assets/watermark.png'
const TRANSITION_DURATION = 0.5 // seconds
const TEMP_DIR = process.env.TEMP_DIR || '/tmp/video-editing'

type VideoEditingTaskPayload = {
  projectId: string
  episodeId: string
  shardVideos: string[]
  introVideoPath?: string
  outroVideoPath?: string
  watermarkPath?: string
  transitionDuration?: number
}

const logger = createScopedLogger({ module: 'worker.video-editing' })

async function ensureTempDir(taskId: string): Promise<string> {
  const taskTempDir = path.join(TEMP_DIR, taskId)
  await fs.mkdir(taskTempDir, { recursive: true })
  return taskTempDir
}

async function cleanupTempDir(tempDir: string): Promise<void> {
  try {
    await fs.rm(tempDir, { recursive: true, force: true })
  } catch (err) {
    logger.warn({
      action: 'cleanup_temp_dir',
      message: 'Failed to clean up temp directory',
      error: err instanceof Error ? err.message : String(err),
      tempDir,
    })
  }
}

const INTERNAL_APP_URL = process.env.INTERNAL_APP_URL || 'http://127.0.0.1:3000'

async function downloadFile(url: string, outputPath: string): Promise<void> {
  // Ensure we have a complete URL for Node.js fetch
  let fetchUrl = url
  if (url.startsWith('/')) {
    fetchUrl = `${INTERNAL_APP_URL}${url}`
  }

  const response = await fetch(fetchUrl)
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status} ${response.statusText}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  await fs.writeFile(outputPath, Buffer.from(arrayBuffer))
}

async function getVideoDuration(videoPath: string): Promise<number> {
  const { stdout } = await exec(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`)
  return parseFloat(stdout.trim())
}

async function concatenateVideosWithTransitions(
  inputVideos: string[],
  outputPath: string,
  transitionDuration: number = TRANSITION_DURATION,
): Promise<void> {
  if (inputVideos.length === 0) {
    throw new Error('No input videos provided for concatenation')
  }

  if (inputVideos.length === 1) {
    // No transitions needed, just copy the file
    await fs.copyFile(inputVideos[0], outputPath)
    return
  }

  // First pass: normalize all videos to same resolution and codec
  const tempDir = path.dirname(outputPath)
  const normalizedVideos: string[] = []

  for (let i = 0; i < inputVideos.length; i++) {
    const normalizedPath = path.join(tempDir, `normalized-${i}.mp4`)
    // Normalize to 1080p, h264, aac, same frame rate
    await exec(`ffmpeg -y -i "${inputVideos[i]}" -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" -c:v libx264 -c:a aac -r 30 "${normalizedPath}"`)
    normalizedVideos.push(normalizedPath)
  }

  // Simple concatenation without transitions for now (to ensure basic functionality works)
  // Video concatenation filter
  const videoLabels = normalizedVideos.map((_, i) => `[${i}:v]`).join('')
  const audioLabels = normalizedVideos.map((_, i) => `[${i}:a]`).join('')

  // Build filter_complex: split video and audio, then concat
  // Add fade in for first video and fade out for last video
  let filterComplex = ''

  // Fade in for first video (0.5s)
  filterComplex += `${videoLabels}${audioLabels}`
  filterComplex += `concat=n=${normalizedVideos.length}:v=1:a=1[outv][outa];`

  // Add fade in at start of first video
  filterComplex += `[outv]fade=t=in:st=0:d=${transitionDuration}[outv];`

  // Add fade out at end of last video
  const totalDuration = await getVideoDuration(normalizedVideos[0]) * normalizedVideos.length
  filterComplex += `[outv]fade=t=out:st=${totalDuration - transitionDuration}:d=${transitionDuration}[outv]`

  // Run ffmpeg command
  const command = `ffmpeg -y ${normalizedVideos.map(v => `-i "${v}"`).join(' ')} \
    -filter_complex "${filterComplex}" \
    -map "[outv]" -map "[outa]" \
    -c:v libx264 -c:a aac \
    -hwaccel auto \
    "${outputPath}"`

  await exec(command)
}

async function addIntroOutro(
  inputVideo: string,
  introPath: string,
  outroPath: string,
  outputPath: string,
): Promise<void> {
  const tempDir = path.dirname(outputPath)

  // Normalize intro and outro to match main video specs
  const normalizedIntro = path.join(tempDir, 'normalized-intro.mp4')
  const normalizedOutro = path.join(tempDir, 'normalized-outro.mp4')

  await exec(`ffmpeg -y -i "${introPath}" -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" -c:v libx264 -c:a aac -r 30 "${normalizedIntro}"`)
  await exec(`ffmpeg -y -i "${outroPath}" -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" -c:v libx264 -c:a aac -r 30 "${normalizedOutro}"`)

  // Concatenate intro + main + outro
  const command = `ffmpeg -y \
    -i "${normalizedIntro}" -i "${inputVideo}" -i "${normalizedOutro}" \
    -filter_complex "[0:v][0:a][1:v][1:a][2:v][2:a]concat=n=3:v=1:a=1[outv][outa]" \
    -map "[outv]" -map "[outa]" \
    -c:v libx264 -c:a aac \
    -hwaccel auto \
    "${outputPath}"`

  await exec(command)
}

async function addWatermark(
  inputVideo: string,
  watermarkPath: string,
  outputPath: string,
): Promise<void> {
  // Add watermark to bottom right corner, 20px padding, scaled to 10% width
  const command = `ffmpeg -y -i "${inputVideo}" -i "${watermarkPath}" \
    -filter_complex "[1:v]scale=iw*0.1:-1[wm];[0:v][wm]overlay=W-w-20:H-h-20:format=auto" \
    -c:v libx264 -c:a aac \
    -hwaccel auto \
    "${outputPath}"`

  await exec(command)
}

async function handleVideoEditingTask(job: Job<TaskJobData>): Promise<{ resultUrl: string; episodeId: string }> {
  const payload = job.data.payload as VideoEditingTaskPayload
  const { projectId, episodeId, shardVideos } = payload

  if (!shardVideos || shardVideos.length === 0) {
    throw new Error('No shard videos provided for editing')
  }

  const taskId = job.data.taskId
  const tempDir = await ensureTempDir(taskId)

  // 任务开始，更新状态为processing
  await updateVideoEditingTaskStatus(taskId, 'processing', 0)

  try {
    // Step 1: Download all shard videos
    await reportTaskProgress(job, 10, { stage: 'download_shards' })
    await updateVideoEditingTaskStatus(taskId, 'processing', 10)

    const downloadedShards: string[] = []
    for (let i = 0; i < shardVideos.length; i++) {
      const shardUrl = toSignedUrlIfCos(shardVideos[i], 7200)
      if (!shardUrl) throw new Error(`Invalid shard video URL: ${shardVideos[i]}`)

      const outputPath = path.join(tempDir, `shard-${i}.mp4`)
      await downloadFile(shardUrl, outputPath)
      downloadedShards.push(outputPath)

      await assertTaskActive(job, 'download_shards')
    }

    // Step 2: Concatenate shards with transitions
    await reportTaskProgress(job, 40, { stage: 'concatenate_shards' })
    await updateVideoEditingTaskStatus(taskId, 'processing', 40)

    const concatenatedPath = path.join(tempDir, 'concatenated.mp4')
    await concatenateVideosWithTransitions(
      downloadedShards,
      concatenatedPath,
      payload.transitionDuration || TRANSITION_DURATION,
    )

    await assertTaskActive(job, 'concatenate_shards')

    let currentVideoPath = concatenatedPath

    // Step 3: Add intro and outro (if files exist)
    await reportTaskProgress(job, 70, { stage: 'add_intro_outro' })
    await updateVideoEditingTaskStatus(taskId, 'processing', 70)
    const introPath = payload.introVideoPath || DEFAULT_INTRO_VIDEO_PATH
    const outroPath = payload.outroVideoPath || DEFAULT_OUTRO_VIDEO_PATH

    const introExists = await fs.access(introPath).then(() => true).catch(() => false)
    const outroExists = await fs.access(outroPath).then(() => true).catch(() => false)

    if (introExists && outroExists) {
      const withIntroOutroPath = path.join(tempDir, 'with-intro-outro.mp4')
      await addIntroOutro(currentVideoPath, introPath, outroPath, withIntroOutroPath)
      currentVideoPath = withIntroOutroPath
    } else {
      logger.info('[VideoEditing] Intro or outro file not found, skipping', { introPath, outroPath, introExists, outroExists })
    }
    await assertTaskActive(job, 'add_intro_outro')

    // Step 4: Add watermark (if file exists)
    await reportTaskProgress(job, 90, { stage: 'add_watermark' })
    await updateVideoEditingTaskStatus(taskId, 'processing', 90)
    const watermarkPath = payload.watermarkPath || DEFAULT_WATERMARK_PATH
    const finalVideoPath = path.join(tempDir, 'final.mp4')

    const watermarkExists = await fs.access(watermarkPath).then(() => true).catch(() => false)
    if (watermarkExists) {
      await addWatermark(currentVideoPath, watermarkPath, finalVideoPath)
    } else {
      logger.info('[VideoEditing] Watermark file not found, skipping', { watermarkPath })
      // Rename current file to final path
      await fs.rename(currentVideoPath, finalVideoPath)
    }
    await assertTaskActive(job, 'add_watermark')

    // Step 5: Upload final video to storage
    await reportTaskProgress(job, 95, { stage: 'upload_final' })
    await updateVideoEditingTaskStatus(taskId, 'processing', 95)

    const resultUrl = await uploadVideoSourceToCos(
      finalVideoPath,
      'videos',
      episodeId || randomUUID(),
    )

    await assertTaskActive(job, 'upload_final')

    // 任务完成，更新状态为completed
    await updateVideoEditingTaskStatus(taskId, 'completed', 100, resultUrl)

    return {
      resultUrl,
      episodeId,
    }
  } finally {
    // Clean up temp files
    await cleanupTempDir(tempDir)
  }
}

async function processVideoEditingTask(job: Job<TaskJobData>) {
  await reportTaskProgress(job, 5, { stage: 'received' })
  const taskId = job.data.taskId

  try {
    switch (job.data.type) {
      case TASK_TYPE.VIDEO_EDITING:
        return await handleVideoEditingTask(job)
      default:
        throw new Error(`Unsupported video editing task type: ${job.data.type}`)
    }
  } catch (err) {
    // 任务失败，更新状态为failed
    const errorMessage = err instanceof Error ? err.message : String(err)
    await updateVideoEditingTaskStatus(taskId, 'failed', undefined, undefined, errorMessage)
    throw err // 重新抛出异常，让BullMQ处理失败逻辑
  }
}

export function createVideoEditingWorker() {
  return new Worker<TaskJobData>(
    QUEUE_NAME.VIDEO_EDITING, // Make sure this is defined in your queues.ts
    async (job) => await withTaskLifecycle(job, async (taskJob) => {
      const workflowConcurrency = await getUserWorkflowConcurrencyConfig(taskJob.data.userId)
      return await withUserConcurrencyGate({
        scope: 'video',
        userId: taskJob.data.userId,
        limit: workflowConcurrency.video || 2,
        run: async () => await processVideoEditingTask(taskJob),
      })
    }),
    {
      connection: queueRedis,
      concurrency: Number.parseInt(process.env.QUEUE_CONCURRENCY_VIDEO_EDITING || '2', 10) || 2,
    },
  )
}
