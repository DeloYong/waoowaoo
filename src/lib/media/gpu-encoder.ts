/**
 * GPU 编码器检测
 *
 * 目标:根据系统硬件自动选择最佳 ffmpeg 编码器
 * - NVIDIA GPU → h264_nvenc
 * - Intel QSV → h264_qsv
 * - Apple VideoToolbox → h264_videotoolbox
 * - 无 GPU / 检测失败 → libx264 (CPU)
 *
 * 设计:
 * - 同步执行外部命令检测,带超时
 * - 结果缓存(进程生命周期内)
 * - 失败优雅降级到 CPU
 */

import { exec as defaultExec } from 'node:child_process'
import { promisify } from 'node:util'
import { access as defaultAccess } from 'node:fs/promises'

const execAsync = promisify(defaultExec)
const accessAsync = defaultAccess

export type EncoderName = 'h264_nvenc' | 'h264_qsv' | 'h264_videotoolbox' | 'libx264'
export type EncoderSource = 'cuda' | 'qsv' | 'videotoolbox' | 'cpu'

export interface EncoderResult {
  encoder: EncoderName
  via: EncoderSource
}

export interface DetectOptions {
  execFn?: (cmd: string) => Promise<{ stdout: string; stderr: string }>
  fsAccess?: (path: string) => Promise<boolean>
  useCache?: boolean
  timeoutMs?: number
}

let cachedResult: EncoderResult | null = null

/**
 * 检测系统可用的 GPU 编码器
 */
export async function detectGpuEncoder(options: DetectOptions = {}): Promise<EncoderResult> {
  if (options.useCache && cachedResult) return cachedResult

  const exec = options.execFn ?? defaultExecImpl
  const fsAccess = options.fsAccess ?? defaultFsAccessImpl

  // 1. NVIDIA
  try {
    const { stdout } = await exec('nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -1')
    if (stdout.trim()) {
      const result: EncoderResult = { encoder: 'h264_nvenc', via: 'cuda' }
      if (options.useCache) cachedResult = result
      return result
    }
  } catch {
    // nvidia-smi 不可用
  }

  // 2. Apple VideoToolbox (macOS)
  if (process.platform === 'darwin') {
    const result: EncoderResult = { encoder: 'h264_videotoolbox', via: 'videotoolbox' }
    if (options.useCache) cachedResult = result
    return result
  }

  // 3. Intel QSV / VAAPI (Linux with Intel GPU)
  try {
    await fsAccess('/dev/dri/renderD128')
    const result: EncoderResult = { encoder: 'h264_qsv', via: 'qsv' }
    if (options.useCache) cachedResult = result
    return result
  } catch {
    // 无 Intel GPU
  }

  // 4. CPU 兜底
  const fallback: EncoderResult = { encoder: 'libx264', via: 'cpu' }
  if (options.useCache) cachedResult = fallback
  return fallback
}

async function defaultExecImpl(cmd: string): Promise<{ stdout: string; stderr: string }> {
  return execAsync(cmd, { timeout: 5000 })
}

async function defaultFsAccessImpl(path: string): Promise<boolean> {
  await accessAsync(path)
  return true
}

/** 测试辅助:清空缓存 */
export function clearEncoderCache(): void {
  cachedResult = null
}
