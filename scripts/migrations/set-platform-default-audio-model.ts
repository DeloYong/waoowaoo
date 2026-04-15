/**
 * 设置平台默认音频/音色设计/口型同步模型
 *
 * 用法:
 *   npx tsx scripts/migrations/set-platform-default-audio-model.ts
 *
 * 或在 Docker 中:
 *   docker exec -it <app-container> npx tsx scripts/migrations/set-platform-default-audio-model.ts
 */
import { PrismaClient } from '@prisma/client'

const DEFAULT_MODELS = {
  audioModel: 'ark::doubao-tts-v1',
  voiceDesignModel: 'ark::doubao-voice-design-v1',
  lipSyncModel: 'ark::doubao-lipsync-v1',
} as const

async function main() {
  const prisma = new PrismaClient()

  try {
    // 检查当前配置
    const existing = await prisma.platformConfig.findUnique({
      where: { configKey: 'api_config' },
      select: {
        audioModel: true,
        voiceDesignModel: true,
        lipSyncModel: true,
      },
    })

    console.log('📋 当前平台默认模型配置:')
    console.log(`   audioModel: ${existing?.audioModel || '(未设置)'}`)
    console.log(`   voiceDesignModel: ${existing?.voiceDesignModel || '(未设置)'}`)
    console.log(`   lipSyncModel: ${existing?.lipSyncModel || '(未设置)'}`)

    if (existing?.audioModel && existing?.voiceDesignModel && existing?.lipSyncModel) {
      console.log('\n✅ 所有模型已设置，无需更新')
      return
    }

    // 更新配置
    const result = await prisma.platformConfig.upsert({
      where: { configKey: 'api_config' },
      update: DEFAULT_MODELS,
      create: {
        configKey: 'api_config',
        ...DEFAULT_MODELS,
      },
    })

    console.log('\n✅ 平台默认模型已设置:')
    console.log(`   audioModel: ${result.audioModel}`)
    console.log(`   voiceDesignModel: ${result.voiceDesignModel}`)
    console.log(`   lipSyncModel: ${result.lipSyncModel}`)
  } catch (error) {
    console.error('❌ 设置失败:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
