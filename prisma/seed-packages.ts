/**
 * 充值套餐初始数据种子脚本
 * 运行方式：npx tsx prisma/seed-packages.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const packages = [
  {
    id: 'pkg-mini',
    name: '迷你包',
    credits: 500,
    price: 9.9,
    originalPrice: 14.9,
    bonusCredits: 0,
    isPopular: false,
    isActive: true,
    sortOrder: 0,
    description: '适合轻度使用，体验AI创作',
  },
  {
    id: 'pkg-small',
    name: '小型包',
    credits: 2000,
    price: 29.9,
    originalPrice: 39.9,
    bonusCredits: 200,
    isPopular: false,
    isActive: true,
    sortOrder: 1,
    description: '额外赠送200积分',
  },
  {
    id: 'pkg-medium',
    name: '中型包',
    credits: 5000,
    price: 69.9,
    originalPrice: 99.9,
    bonusCredits: 500,
    isPopular: true,
    isActive: true,
    sortOrder: 2,
    description: '热门推荐，高性价比',
  },
  {
    id: 'pkg-large',
    name: '大型包',
    credits: 12000,
    price: 149.9,
    originalPrice: 199.9,
    bonusCredits: 2000,
    isPopular: false,
    isActive: true,
    sortOrder: 3,
    description: '创作者首选，赠送2000积分',
  },
  {
    id: 'pkg-xl',
    name: '超大包',
    credits: 30000,
    price: 299.9,
    originalPrice: 399.9,
    bonusCredits: 5000,
    isPopular: false,
    isActive: true,
    sortOrder: 4,
    description: '重度用户专属，赠送5000积分',
  },
]

async function main() {
  console.log('开始写入充值套餐初始数据...')
  for (const pkg of packages) {
    await prisma.rechargePackage.upsert({
      where: { id: pkg.id },
      update: pkg,
      create: pkg,
    })
    console.log(`✓ ${pkg.name} - ${pkg.credits}积分`)
  }
  console.log('充值套餐数据写入完成')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
