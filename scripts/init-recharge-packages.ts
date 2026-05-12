/**
 * 初始化充值套餐数据
 * 运行方式：npx tsx scripts/init-recharge-packages.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const defaultPackages = [
  {
    id: 'pkg_001',
    name: '基础套餐',
    credits: 1000,
    price: 9.9,
    originalPrice: null,
    bonusCredits: 0,
    isPopular: false,
    isActive: true,
    sortOrder: 1,
    description: '适合轻度用户使用',
  },
  {
    id: 'pkg_002',
    name: '标准套餐',
    credits: 5000,
    price: 49.0,
    originalPrice: 59.0,
    bonusCredits: 500,
    isPopular: true,
    isActive: true,
    sortOrder: 2,
    description: '最受欢迎的选择，赠送500积分',
  },
  {
    id: 'pkg_003',
    name: '专业套餐',
    credits: 10000,
    price: 99.0,
    originalPrice: 119.0,
    bonusCredits: 2000,
    isPopular: true,
    isActive: true,
    sortOrder: 3,
    description: '适合专业创作者，赠送2000积分',
  },
  {
    id: 'pkg_004',
    name: '企业套餐',
    credits: 50000,
    price: 499.0,
    originalPrice: 599.0,
    bonusCredits: 15000,
    isPopular: false,
    isActive: true,
    sortOrder: 4,
    description: '团队使用首选，赠送15000积分',
  },
  {
    id: 'pkg_005',
    name: '旗舰套餐',
    credits: 100000,
    price: 999.0,
    originalPrice: 1199.0,
    bonusCredits: 40000,
    isPopular: false,
    isActive: true,
    sortOrder: 5,
    description: '重度用户首选，赠送40000积分',
  },
]

async function main() {
  console.log('开始初始化充值套餐数据...\n')

  for (const pkg of defaultPackages) {
    const existing = await prisma.rechargePackage.findUnique({
      where: { id: pkg.id },
    })

    if (existing) {
      console.log(`更新套餐: ${pkg.name}`)
      await prisma.rechargePackage.update({
        where: { id: pkg.id },
        data: pkg,
      })
    } else {
      console.log(`创建套餐: ${pkg.name}`)
      await prisma.rechargePackage.create({
        data: pkg,
      })
    }
  }

  console.log('\n✅ 充值套餐数据初始化完成！')

  const packages = await prisma.rechargePackage.findMany({
    orderBy: { sortOrder: 'asc' },
  })

  console.log('\n当前套餐列表：')
  packages.forEach((pkg) => {
    const discount = pkg.originalPrice
      ? ` (${Math.round((pkg.price / pkg.originalPrice.toNumber()) * 100)}折)`
      : ''
    console.log(
      `  - ${pkg.name}: ${pkg.credits} + ${pkg.bonusCredits} 积分, ¥${pkg.price}${discount}`
    )
  })
}

main()
  .catch((e) => {
    console.error('❌ 初始化失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
