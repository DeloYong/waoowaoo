import { describe, it, expect } from 'vitest'
import {
  buildFirstLastFrameRequest,
  supportsFirstLastFrame,
  isFirstLastFrameOnlyModel,
} from '@/lib/providers/shared/first-last-frame'

describe('providers/shared/first-last-frame', () => {
  it('returns false for models that do not support first-last-frame', () => {
    expect(supportsFirstLastFrame('wan2.6-i2v-flash')).toBe(false)
  })

  it('returns true for models that support first-last-frame', () => {
    expect(supportsFirstLastFrame('wan2.2-kf2v-flash')).toBe(true)
  })

  it('identifies first-last-frame only models', () => {
    expect(isFirstLastFrameOnlyModel('wan2.2-kf2v-flash')).toBe(true)
    expect(isFirstLastFrameOnlyModel('wan2.7-i2v')).toBe(false)
  })

  it('builds request body with first+last frame urls', () => {
    const result = buildFirstLastFrameRequest({
      model: 'wan2.2-kf2v-flash',
      firstFrameUrl: 'https://x.com/first.jpg',
      lastFrameUrl: 'https://x.com/last.jpg',
      prompt: 'a cat walks',
    })
    expect(result).toEqual({
      first_frame_url: 'https://x.com/first.jpg',
      last_frame_url: 'https://x.com/last.jpg',
      prompt: 'a cat walks',
    })
  })

  it('builds request with only first frame (no last frame)', () => {
    const result = buildFirstLastFrameRequest({
      model: 'wan2.7-i2v',
      firstFrameUrl: 'https://x.com/first.jpg',
      prompt: 'a cat',
    })
    expect(result).toEqual({
      img_url: 'https://x.com/first.jpg',
      prompt: 'a cat',
    })
  })

  it('throws when first-last-frame only model lacks last frame', () => {
    expect(() =>
      buildFirstLastFrameRequest({
        model: 'wan2.2-kf2v-flash',
        firstFrameUrl: 'https://x.com/first.jpg',
      })
    ).toThrow(/lastFrameUrl.*required/i)
  })

  it('throws when model does not support first-last-frame but last frame provided', () => {
    expect(() =>
      buildFirstLastFrameRequest({
        model: 'wan2.6-i2v-flash',
        firstFrameUrl: 'https://x.com/first.jpg',
        lastFrameUrl: 'https://x.com/last.jpg',
      })
    ).toThrow(/does not support/i)
  })
})
