import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { callRoute } from '../integration/api/helpers/call-route'
import { installAuthMocks, mockAuthenticated, resetAuthMockState } from '../helpers/auth'
import { resetSystemState } from '../helpers/db-reset'
import { seedMinimalDomainState } from './helpers/seed'
import { startSystemWorkers, stopSystemWorkers, type SystemWorkers } from './helpers/workers'

const videoState = vi.hoisted(() => ({
  pollResponses: new Map<string, { status: string; resultUrl?: string }[]>(),
  uploadedCosKey: 'video/editor-test.mp4',
}))

vi.mock('@/lib/generator-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/generator-api')>('@/lib/generator-api')
  return {
    ...actual,
    generateVideo: vi.fn(async () => ({
      success: true,
      async: true,
      externalId: 'editor-ext-1',
    })),
  }
})

vi.mock('@/lib/async-poll', async () => {
  const actual = await vi.importActual<typeof import('@/lib/async-poll')>('@/lib/async-poll')
  return {
    ...actual,
    pollAsyncTask: vi.fn(async (externalId: string) => {
      const queue = videoState.pollResponses.get(externalId) || []
      const next = queue.shift()
      if (!next) {
        return { status: 'completed', resultUrl: 'https://provider.example/editor-final.mp4' }
      }
      videoState.pollResponses.set(externalId, queue)
      return next
    }),
  }
})

vi.mock('@/lib/media/outbound-image', async () => {
  const actual = await vi.importActual<typeof import('@/lib/media/outbound-image')>('@/lib/media/outbound-image')
  return {
    ...actual,
    normalizeToBase64ForGeneration: vi.fn(async (input: string) => input),
  }
})

vi.mock('@/lib/workers/utils', async () => {
  const actual = await vi.importActual<typeof import('@/lib/workers/utils')>('@/lib/workers/utils')
  return {
    ...actual,
    uploadVideoSourceToCos: vi.fn(async () => videoState.uploadedCosKey),
  }
})

describe('system - editor generate', () => {
  let workers: SystemWorkers = {}

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    videoState.pollResponses.clear()
    videoState.pollResponses.set('editor-ext-1', [
      { status: 'processing' },
      { status: 'completed', resultUrl: 'https://provider.example/editor-final.mp4' },
    ])
    await resetSystemState()
    installAuthMocks()
  })

  afterEach(async () => {
    await stopSystemWorkers(workers)
    workers = {}
    resetAuthMockState()
  })

  it('generate -> status polling returns correct mapping', async () => {
    const seeded = await seedMinimalDomainState()
    mockAuthenticated(seeded.user.id)
    workers = await startSystemWorkers(['video'])

    // Generate task
    const generateMod = await import('@/app/api/projects/[projectId]/editor/generate/route')
    const generateResponse = await callRoute(
      generateMod.POST,
      'POST',
      {
        locale: 'zh',
        episodeId: seeded.episode.id,
        clipIds: [seeded.panel.id],
      },
      { params: { projectId: seeded.project.id } },
    )

    expect(generateResponse.status).toBe(200)
    await generateResponse.json() as { taskId: string }

    // Check status - should return 'generating' for pending/processing tasks
    const statusMod = await import('@/app/api/projects/[projectId]/editor/status/route')
    const statusResponse = await callRoute(
      statusMod.GET,
      'GET',
      {},
      {
        params: { projectId: seeded.project.id },
        query: { episodeId: seeded.episode.id },
      },
    )

    expect(statusResponse.status).toBe(200)
    const statusData = await statusResponse.json() as {
      success: boolean
      status: string
      progress: number
    }

    // Status should be 'generating' for pending task (not 'idle')
    expect(statusData.success).toBe(true)
    expect(statusData.status).toBe('generating')
  })
})
