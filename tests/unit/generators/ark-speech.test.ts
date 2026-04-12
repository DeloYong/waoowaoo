import { describe, expect, it, vi } from 'vitest'
import { createAudioGenerator, createVoiceDesignGenerator, createLipSyncGenerator } from '@/lib/generators/factory'
import { ArkTTSGenerator } from '@/lib/generators/ark-speech-tts'
import { ArkVoiceDesignGenerator } from '@/lib/generators/ark-speech-voice-design'
import { ArkLipSyncGenerator } from '@/lib/generators/ark-speech-lipsync'

// Mock dependencies
vi.mock('@/lib/api-config', () => ({
  getProviderConfig: vi.fn().mockResolvedValue({ apiKey: 'test-key' }),
  getProviderKey: vi.fn((key) => key),
}))

vi.mock('@/lib/ark-api', async () => {
  const actual = await import('@/lib/ark-api')
  return {
    ...actual,
    arkTTSGeneration: vi.fn().mockResolvedValue({
      audio: new Blob(['test-audio']),
      contentType: 'audio/mpeg',
    }),
  }
})

vi.mock('@/lib/storage/factory', () => ({
  createStorageProvider: vi.fn().mockReturnValue({
    generateUniqueKey: vi.fn().mockReturnValue('audio/tts/test.mp3'),
    uploadObject: vi.fn().mockResolvedValue(null),
    toFetchableUrl: vi.fn().mockReturnValue('https://test-url.com/audio.mp3'),
  }),
}))

describe('ark speech generators', () => {
  it('routes ark audio provider to ArkTTSGenerator', () => {
    const generator = createAudioGenerator('ark')
    expect(generator).toBeInstanceOf(ArkTTSGenerator)
  })

  it('routes ark voice design provider to ArkVoiceDesignGenerator', () => {
    const generator = createVoiceDesignGenerator('ark')
    expect(generator).toBeInstanceOf(ArkVoiceDesignGenerator)
  })

  it('routes ark lipsync provider to ArkLipSyncGenerator', () => {
    const generator = createLipSyncGenerator('ark')
    expect(generator).toBeInstanceOf(ArkLipSyncGenerator)
  })

  describe('ArkTTSGenerator parameter validation', () => {
    const generator = new ArkTTSGenerator()

    it('returns error for unsupported options', async () => {
      const result = await generator.generate({
        userId: 'test-user',
        text: 'test text',
        options: { invalidOption: 'value' },
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('不支持的选项: invalidOption')
    })

    it('returns error for rate outside 0.5-2.0 range', async () => {
      let result = await generator.generate({
        userId: 'test-user',
        text: 'test text',
        rate: 0.4,
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('语速范围0.5-2.0')

      result = await generator.generate({
        userId: 'test-user',
        text: 'test text',
        rate: 2.1,
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('语速范围0.5-2.0')
    })

    it('returns error for pitch outside 0.5-2.0 range', async () => {
      let result = await generator.generate({
        userId: 'test-user',
        text: 'test text',
        options: { pitch: 0.4 },
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('音调范围0.5-2.0')

      result = await generator.generate({
        userId: 'test-user',
        text: 'test text',
        options: { pitch: 2.1 },
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('音调范围0.5-2.0')
    })

    it('returns error for volume outside 0-2.0 range', async () => {
      let result = await generator.generate({
        userId: 'test-user',
        text: 'test text',
        options: { volume: -0.1 },
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('音量范围0-2.0')

      result = await generator.generate({
        userId: 'test-user',
        text: 'test text',
        options: { volume: 2.1 },
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('音量范围0-2.0')
    })

    it('passes validation for valid parameters', async () => {
      const result = await generator.generate({
        userId: 'test-user',
        text: 'test text',
        rate: 1.0,
        options: { pitch: 1.0, volume: 1.0 },
      })

      expect(result.success).toBe(true)
      expect(result.audioUrl).toBe('https://test-url.com/audio.mp3')
    })
  })
})
