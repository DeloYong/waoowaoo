/**
 * 清理用户模型配置
 *
 * 由于模型配置已改为管理员统一管理，需要清除所有用户和项目的自定义模型配置。
 * 运行方式: npx tsx scripts/migrations/clear-user-model-configs.ts
 */
import { prisma } from '@/lib/prisma'

async function main() {
  console.log('开始清理用户模型配置...')

  // 1. 清理 novel_promotion_projects 表中的模型字段
  console.log('\n1. 清理项目模型配置...')

  const projectsResult = await prisma.novelPromotionProject.updateMany({
    where: {
      OR: [
        { analysisModel: { not: null } },
        { characterModel: { not: null } },
        { locationModel: { not: null } },
        { storyboardModel: { not: null } },
        { editModel: { not: null } },
        { videoModel: { not: null } },
        { audioModel: { not: null } },
      ],
    },
    data: {
      analysisModel: null,
      characterModel: null,
      locationModel: null,
      storyboardModel: null,
      editModel: null,
      videoModel: null,
      audioModel: null,
    },
  })

  console.log(`  ✓ 已清理 ${projectsResult.count} 个项目的模型配置`)

  // 2. 清理 user_preferences 表中的模型字段
  console.log('\n2. 清理用户偏好模型配置...')

  const userPrefsResult = await prisma.userPreference.updateMany({
    where: {
      OR: [
        { analysisModel: { not: null } },
        { characterModel: { not: null } },
        { locationModel: { not: null } },
        { storyboardModel: { not: null } },
        { editModel: { not: null } },
        { videoModel: { not: null } },
        { audioModel: { not: null } },
      ],
    },
    data: {
      analysisModel: null,
      characterModel: null,
      locationModel: null,
      storyboardModel: null,
      editModel: null,
      videoModel: null,
      audioModel: null,
    },
  })

  console.log(`  ✓ 已清理 ${userPrefsResult.count} 个用户的模型配置`)

  // 3. 统计结果
  console.log('\n3. 验证清理结果...')

  const remainingProjects = await prisma.novelPromotionProject.count({
    where: {
      OR: [
        { analysisModel: { not: null } },
        { characterModel: { not: null } },
        { locationModel: { not: null } },
        { storyboardModel: { not: null } },
        { editModel: { not: null } },
        { videoModel: { not: null } },
        { audioModel: { not: null } },
      ],
    },
  })

  const remainingUserPrefs = await prisma.userPreference.count({
    where: {
      OR: [
        { analysisModel: { not: null } },
        { characterModel: { not: null } },
        { locationModel: { not: null } },
        { storyboardModel: { not: null } },
        { editModel: { not: null } },
        { videoModel: { not: null } },
        { audioModel: { not: null } },
      ],
    },
  })

  console.log(`  剩余项目模型配置: ${remainingProjects} (预期: 0)`)
  console.log(`  剩余用户模型配置: ${remainingUserPrefs} (预期: 0)`)

  if (remainingProjects === 0 && remainingUserPrefs === 0) {
    console.log('\n✅ 清理完成！所有用户和项目的模型配置已清除。')
    console.log('   现在所有用户将使用管理员在「平台 API Key 配置」中设置的系统默认模型。')
  } else {
    console.log('\n⚠️  警告: 仍有部分模型配置未被清理，请检查数据库。')
  }
}

main()
  .catch((error) => {
    console.error('清理失败:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
