import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireProjectAuthLight, isErrorResponse } from '@/lib/api-auth'
import { apiHandler, ApiError, getRequestId } from '@/lib/api-errors'
import { submitTask } from '@/lib/task/submitter'
import { resolveRequiredTaskLocale } from '@/lib/task/resolve-locale'
import { TASK_TYPE } from '@/lib/task/types'
import { buildDefaultTaskBillingInfo } from '@/lib/billing'
import { estimateVoiceLineMaxSeconds } from '@/lib/voice/generate-voice-line'
import { hasVoiceLineAudioOutput } from '@/lib/task/has-output'
import { withTaskUiPayload } from '@/lib/task/ui-payload'
import { parseModelKeyStrict } from '@/lib/model-config-contract'
import { getProviderKey, resolveModelSelectionOrSingle } from '@/lib/api-config'
import { getProjectModelConfig } from '@/lib/config-service'
import {
  hasVoiceBindingForProvider,
  looksLikeArkVoiceId,
  parseSpeakerVoiceMap,
  type CharacterVoiceFields,
  type SpeakerVoiceMap,
} from '@/lib/voice/provider-voice-binding'

type VoiceLineRow = {
  id: string
  speaker: string
  content: string
}

type CharacterRow = CharacterVoiceFields & {
  name: string
}

type VoiceBindingValidationResult =
  | { ok: true }
  | { ok: false; message: string }

function matchCharacterBySpeaker(speaker: string, characters: CharacterRow[]) {
  const normalizedSpeaker = speaker.trim().toLowerCase()
  return characters.find((character) => character.name.trim().toLowerCase() === normalizedSpeaker) || null
}

function validateSpeakerVoiceForProvider(
  speaker: string,
  characters: CharacterRow[],
  speakerVoices: SpeakerVoiceMap,
  providerKey: string,
): VoiceBindingValidationResult {
  const character = matchCharacterBySpeaker(speaker, characters)
  const speakerVoice = speakerVoices[speaker]

  if (hasVoiceBindingForProvider({
    providerKey,
    character,
    speakerVoice,
  })) {
    return { ok: true }
  }

  const characterVoiceId = character?.voiceId || ''
  const hasBailianVoiceId = characterVoiceId.startsWith('qwen-tts-vd-')
  const hasArkVoiceId = looksLikeArkVoiceId(characterVoiceId)

  if (providerKey === 'bailian') {
    if (hasArkVoiceId) {
      return {
        ok: false,
        message: '该角色使用的是火山引擎音色，请切换到火山引擎语音合成模型',
      }
    }
    const hasUploadedReference =
      !!character?.customVoiceUrl ||
      (speakerVoice?.provider === 'fal' && !!speakerVoice.audioUrl)
    if (hasUploadedReference) {
      return {
        ok: false,
        message: '无音色ID，QwenTTS 必须使用 AI 设计音色',
      }
    }
    return {
      ok: false,
      message: '请先为该发言人绑定百炼音色',
    }
  }

  if (providerKey === 'ark') {
    if (hasBailianVoiceId) {
      return {
        ok: false,
        message: '该角色使用的是阿里云百炼音色，请切换到百炼语音合成模型',
      }
    }
    const hasNonArkVoiceId = !!characterVoiceId && !hasArkVoiceId
    if (hasNonArkVoiceId) {
      return {
        ok: false,
        message: '无火山引擎音色ID，Doubao TTS 必须使用 AI 设计音色',
      }
    }
    return {
      ok: false,
      message: '请先为该发言人绑定火山引擎音色',
    }
  }

  return {
    ok: false,
    message: '请先为该发言人设置参考音频',
  }
}

function hasSpeakerVoiceForProvider(
  speaker: string,
  characters: CharacterRow[],
  speakerVoices: SpeakerVoiceMap,
  providerKey: string,
): boolean {
  const character = matchCharacterBySpeaker(speaker, characters)
  const speakerVoice = speakerVoices[speaker]
  return hasVoiceBindingForProvider({
    providerKey,
    character,
    speakerVoice,
  })
}

export const POST = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) => {
  const { projectId } = await context.params

  const authResult = await requireProjectAuthLight(projectId)
  if (isErrorResponse(authResult)) return authResult
  const { session } = authResult

  const body = await request.json().catch(() => null)
  const locale = resolveRequiredTaskLocale(request, body)
  const episodeId = typeof body?.episodeId === 'string' ? body.episodeId : ''
  const lineId = typeof body?.lineId === 'string' ? body.lineId : ''
  const requestedAudioModel = typeof body?.audioModel === 'string' ? body.audioModel.trim() : ''
  const all = body?.all === true

  if (!episodeId) {
    throw new ApiError('INVALID_PARAMS')
  }
  if (!all && !lineId) {
    throw new ApiError('INVALID_PARAMS')
  }
  if (requestedAudioModel && !parseModelKeyStrict(requestedAudioModel)) {
    throw new ApiError('INVALID_PARAMS', {
      code: 'MODEL_KEY_INVALID',
      field: 'audioModel'})
  }

  const modelConfig = await getProjectModelConfig(projectId, session.user.id)
  const resolvedAudioModel = requestedAudioModel || modelConfig.audioModel || ''
  const selectedResolvedAudioModel = await resolveModelSelectionOrSingle(
    session.user.id,
    resolvedAudioModel || null,
    'audio',
  )
  const selectedProviderKey = getProviderKey(selectedResolvedAudioModel.provider).toLowerCase()

  const projectData = await prisma.novelPromotionProject.findUnique({
    where: { projectId },
    select: {
      id: true,
      characters: {
        select: {
          name: true,
          customVoiceUrl: true,
          voiceId: true,
        },
      },
    },
  })
  if (!projectData) {
    throw new ApiError('NOT_FOUND')
  }

  const episode = await prisma.novelPromotionEpisode.findFirst({
    where: {
      id: episodeId,
      novelPromotionProjectId: projectData.id},
    select: {
      id: true,
      speakerVoices: true}})
  if (!episode) {
    throw new ApiError('NOT_FOUND')
  }

  const speakerVoices = parseSpeakerVoiceMap(episode.speakerVoices)
  const characters = projectData.characters || []

  let voiceLines: VoiceLineRow[] = []
  if (all) {
    const allLines = await prisma.novelPromotionVoiceLine.findMany({
      where: {
        episodeId,
        audioUrl: null},
      orderBy: { lineIndex: 'asc' },
      select: {
        id: true,
        speaker: true,
        content: true}})
    voiceLines = allLines.filter((line) =>
      hasSpeakerVoiceForProvider(line.speaker, characters, speakerVoices, selectedProviderKey),
    )
  } else {
    const line = await prisma.novelPromotionVoiceLine.findFirst({
      where: {
        id: lineId,
        episodeId},
      select: {
        id: true,
        speaker: true,
        content: true}})
    if (!line) {
      throw new ApiError('NOT_FOUND')
    }
    const validation = validateSpeakerVoiceForProvider(
      line.speaker,
      characters,
      speakerVoices,
      selectedProviderKey,
    )
    if (!validation.ok) {
      throw new ApiError('INVALID_PARAMS', {
        message: validation.message,
      })
    }
    voiceLines = [line]
  }

  if (voiceLines.length === 0) {
    if (all) {
      const firstLineWithoutBinding = await prisma.novelPromotionVoiceLine.findFirst({
        where: {
          episodeId,
          audioUrl: null,
        },
        orderBy: { lineIndex: 'asc' },
        select: {
          speaker: true,
        },
      })
      const validation = firstLineWithoutBinding
        ? validateSpeakerVoiceForProvider(
          firstLineWithoutBinding.speaker,
          characters,
          speakerVoices,
          selectedProviderKey,
        )
        : { ok: false as const, message: '没有需要生成的台词' }
      return NextResponse.json({
        success: true,
        async: true,
        results: [],
        taskIds: [],
        total: 0,
        ...(validation.ok ? {} : { error: validation.message }),
      })
    }
    throw new ApiError('INVALID_PARAMS', {
      message: '没有需要生成的台词',
    })
  }

  const results = await Promise.all(
    voiceLines.map(async (line) => {
      const payload = {
        episodeId,
        lineId: line.id,
        maxSeconds: estimateVoiceLineMaxSeconds(line.content),
        audioModel: selectedResolvedAudioModel.modelKey}
      const result = await submitTask({
        userId: session.user.id,
    locale,
        requestId: getRequestId(request),
        projectId,
        episodeId,
        type: TASK_TYPE.VOICE_LINE,
        targetType: 'NovelPromotionVoiceLine',
        targetId: line.id,
        payload: withTaskUiPayload(payload, {
          hasOutputAtStart: await hasVoiceLineAudioOutput(line.id)}),
        dedupeKey: `voice_line:${line.id}`,
        billingInfo: buildDefaultTaskBillingInfo(TASK_TYPE.VOICE_LINE, payload)})

      return {
        lineId: line.id,
        taskId: result.taskId}
    }),
  )

  if (all) {
    return NextResponse.json({
      success: true,
      async: true,
      results,
      taskIds: results.map((item) => item.taskId),
      total: results.length})
  }

  return NextResponse.json({
    success: true,
    async: true,
    taskId: results[0].taskId})
})
