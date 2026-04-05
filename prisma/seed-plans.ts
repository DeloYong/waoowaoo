/**
 * 套餐初始数据种子脚本
 * 运行方式：npx tsx prisma/seed-plans.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const plans = [
  {
    id: 'starter',
    name: '新手试用',
    monthlyPrice: 9.9,
    yearlyPrice: null,
    trialDays: 7,
    monthlyCredits: 300,
    maxVideoSeconds: 60,
    maxConcurrency: 1,
    features: { watermark: true, advancedModels: false, fastQueue: false },
    isActive: true,
    sortOrder: 0,
  },
  {
    id: 'basic',
    name: '基础版',
    monthlyPrice: 89.9,
    yearlyPrice: 899,
    trialDays: 0,
    monthlyCredits: 2000,
    maxVideoSeconds: 400,
    maxConcurrency: 1,
    features: { watermark: false, advancedModels: false, fastQueue: false },
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'pro',
    name: '专业版',
    monthlyPrice: 199.9,
    yearlyPrice: 1999,
    trialDays: 0,
    monthlyCredits: 5000,
    maxVideoSeconds: 1000,
    maxConcurrency: 2,
    features: { watermark: false, advancedModels: true, fastQueue: false },
    isActive: true,
    sortOrder: 2,
  },
  {
    id: 'flagship',
    name: '旗舰版',
    monthlyPrice: 499.9,
    yearlyPrice: 4999,
    trialDays: 0,
    monthlyCredits: 15000,
    maxVideoSeconds: 3000,
    maxConcurrency: 5,
    features: { watermark: false, advancedModels: true, fastQueue: true },
    isActive: true,
    sortOrder: 3,
  },
  {
    id: 'enterprise',
    name: '企业版',
    monthlyPrice: -1,
    yearlyPrice: -1,
    trialDays: 0,
    monthlyCredits: 0,
    maxVideoSeconds: 999999,
    maxConcurrency: 99,
    features: { watermark: false, advancedModels: true, fastQueue: true, apiAccess: true },
    isActive: true,
    sortOrder: 4,
  },
]

async function main() {
  console.log('开始写入套餐初始数据...')
  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { id: plan.id },
      update: plan,
      create: plan,
    })
    console.log(`✓ ${plan.name}`)
  }
  console.log('套餐数据写入完成')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
