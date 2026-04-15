import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserAuth, isErrorResponse } from '@/lib/api-auth'
import { ApiError, apiHandler } from '@/lib/api-errors'
import { attachMediaFieldsToGlobalVoice } from '@/lib/media/attach'
import { resolveMediaRefFromLegacyValue } from '@/lib/media/service'

// 获取用户所有音色（支持 folderId 筛选）
export const GET = apiHandler(async (request: NextRequest) => {
    // 🔐 统一权限验证
    const authResult = await requireUserAuth()
    if (isErrorResponse(authResult)) return authResult
    const { session } = authResult

    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get('folderId')

    const where: Record<string, unknown> = { userId: session.user.id }
    if (folderId === 'null') {
        where.folderId = null
    } else if (folderId) {
        where.folderId = folderId
    }

    const voices = await prisma.globalVoice.findMany({
        where,
        orderBy: { createdAt: 'desc' }
    })

    const signedVoices = await Promise.all(
        voices.map((voice) => attachMediaFieldsToGlobalVoice(voice))
    )

    return NextResponse.json({ voices: signedVoices })
})

// 新建音色
export const POST = apiHandler(async (request: NextRequest) => {
    // 🔐 统一权限验证
    const authResult = await requireUserAuth()
    if (isErrorResponse(authResult)) return authResult
    const { session } = authResult

    const body = await request.json()
    const {
        name,
        description,
        folderId,
        voiceId,
        voiceType,
        customVoiceUrl,
        voicePrompt,
        gender,
        language
    } = body

    if (!name) {
        throw new ApiError('INVALID_PARAMS')
    }

    if (folderId) {
        const folder = await prisma.globalAssetFolder.findUnique({
            where: { id: folderId }
        })
        if (!folder || folder.userId !== session.user.id) {
            throw new ApiError('INVALID_PARAMS')
        }
    }

    // 根据 voiceId 格式推断 voiceType（服务端校验，不依赖前端传入）
    const inferVoiceType = (vid: string | null | undefined, fallback: string): string => {
        if (!vid) return fallback
        if (vid.startsWith('S_') || vid.includes('_mars_') || vid.includes('_moon_') || vid.includes('_uranus_') || vid.includes('_bigtts')) return 'ark-designed'
        if (vid.startsWith('qwen-tts-vd-')) return 'qwen-designed'
        return fallback
    }
    const resolvedVoiceType = voiceId ? inferVoiceType(voiceId, voiceType || 'qwen-designed') : (voiceType || 'qwen-designed')

    const customVoiceMedia = await resolveMediaRefFromLegacyValue(customVoiceUrl || null)
    const voice = await prisma.globalVoice.create({
        data: {
            userId: session.user.id,
            folderId: folderId || null,
            name: name.trim(),
            description: description?.trim() || null,
            voiceId: voiceId || null,
            voiceType: resolvedVoiceType,
            customVoiceUrl: customVoiceUrl || null,
            customVoiceMediaId: customVoiceMedia?.id || null,
            voicePrompt: voicePrompt?.trim() || null,
            gender: gender || null,
            language: language || 'zh'
        }
    })

    const withMedia = await attachMediaFieldsToGlobalVoice(voice)
    return NextResponse.json({ success: true, voice: withMedia })
})
