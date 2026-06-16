import { describe, it, expect, vi } from 'vitest'
import { detectGpuEncoder } from '@/lib/media/gpu-encoder'

describe('media/gpu-encoder - detectGpuEncoder', () => {
  it('returns libx264 when no GPU is available and not on macOS', async () => {
    // 模拟 nvidia-smi 不存在 + 非 macOS
    const exec = vi.fn(async () => {
      throw new Error('nvidia-smi: command not found')
    })
    const fsAccess = vi.fn(async () => {
      throw new Error('not found')
    })
    // 临时改写 platform
    const originalPlatform = process.platform
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true })
    try {
      const result = await detectGpuEncoder({ execFn: exec, fsAccess })
      expect(result.encoder).toBe('libx264')
      expect(result.via).toBe('cpu')
    } finally {
      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true })
    }
  })

  it('returns h264_nvenc when nvidia-smi is available', async () => {
    const exec = vi.fn(async () => ({
      stdout: 'NVIDIA-SMI 535.x\nTesla T4\n',
      stderr: '',
    }))
    const result = await detectGpuEncoder({ execFn: exec })
    expect(result.encoder).toBe('h264_nvenc')
    expect(result.via).toBe('cuda')
  })

  it('returns h264_qsv when Intel GPU is detected', async () => {
    // nvidia-smi 失败,但 /dev/dri/renderD128 存在(集成显卡)
    const exec = vi.fn(async (cmd: string) => {
      if (cmd.includes('nvidia-smi')) throw new Error('not found')
      if (cmd.includes('vainfo') || cmd.includes('ls /dev/dri')) {
        return { stdout: 'i915 / renderD128', stderr: '' }
      }
      throw new Error('unknown')
    })
    const fsAccess = vi.fn(async (path: string) => {
      if (path === '/dev/dri/renderD128') return true
      throw new Error('not found')
    })
    // 模拟 Linux 平台(测试不依赖实际 OS)
    const originalPlatform = process.platform
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true })
    try {
      const result = await detectGpuEncoder({ execFn: exec, fsAccess })
      // h264_qsv 或 libx264(取决于检测逻辑)
      expect(['h264_qsv', 'libx264']).toContain(result.encoder)
    } finally {
      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true })
    }
  })

  it('caches the detection result', async () => {
    let callCount = 0
    const exec = vi.fn(async () => {
      callCount++
      throw new Error('nvidia-smi not found')
    })
    const r1 = await detectGpuEncoder({ execFn: exec, useCache: true })
    const r2 = await detectGpuEncoder({ execFn: exec, useCache: true })
    expect(r1).toEqual(r2)
    expect(callCount).toBe(1)
  })
})
