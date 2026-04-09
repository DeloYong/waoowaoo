/**
 * 为已有用户补全邀请码
 * 运行方式: npx tsx scripts/migrations/backfill-invite-codes.ts
 */
import { prisma } from '@/lib/prisma'
import { generateUniqueInviteCode } from '@/lib/invite/code'

async function main() {
  console.log('开始为已有用户补全邀请码...')

  // 查找所有没有邀请码的用户
  const usersWithoutCode = await prisma.user.findMany({
    where: {
      inviteCode: null,
    },
    select: {
      id: true,
      name: true,
    },
  })

  if (usersWithoutCode.length === 0) {
    console.log('所有用户已有邀请码，无需补全')
    return
  }

  console.log(`找到 ${usersWithoutCode.length} 个用户需要补全邀请码`)

  let successCount = 0
  let failCount = 0

  for (const user of usersWithoutCode) {
    try {
      const inviteCode = await generateUniqueInviteCode()
      await prisma.user.update({
        where: { id: user.id },
        data: { inviteCode },
      })
      successCount++
      console.log(`  ✓ 用户 ${user.name} -> ${inviteCode}`)
    } catch (error) {
      failCount++
      console.error(`  ✗ 用户 ${user.name} 失败:`, error)
    }
  }

  console.log(`\n补全完成！`)
  console.log(`  成功: ${successCount}`)
  console.log(`  失败: ${failCount}`)
}

main()
  .catch((error) => {
    console.error('补全失败:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
