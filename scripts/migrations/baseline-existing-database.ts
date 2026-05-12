/**
 * 数据库基线脚本 - 用于解决 Prisma P3005 错误
 *
 * 问题场景：
 * - 数据库已存在数据和表结构，但 _prisma_migrations 表不存在
 * - 运行 npx prisma migrate deploy 时会报错 P3005
 *
 * 使用方法：
 * 1. 确保数据库连接正常
 * 2. 运行：npx tsx scripts/migrations/baseline-existing-database.ts
 * 3. 之后即可正常运行 npx prisma migrate deploy
 *
 * 注意：仅在首次部署且数据库已有数据时使用！
 */
import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// 迁移目录和顺序（按时间戳排序）
const MIGRATIONS_DIR = path.join(process.cwd(), 'prisma', 'migrations')
const MIGRATION_ORDER = [
  '20260317120000_add_asset_kind_to_locations',
  '20260324120000_drop_project_mode',
  '20260328110000_add_location_available_slots',
  '20260405080019_saas_credits_schema',
]

async function main() {
  console.log('=========================================')
  console.log('  Prisma 数据库基线脚本')
  console.log('=========================================')
  console.log()

  // 1. 检查是否已经有 _prisma_migrations 表
  try {
    const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = '_prisma_migrations'
    `)

    if (result[0].count > 0n) {
      // 检查表中是否有数据
      const migrations = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
        SELECT COUNT(*) as count FROM _prisma_migrations
      `)

      if (migrations[0].count > 0) {
        console.log('✅ _prisma_migrations 表已存在且有数据')
        console.log('   数据库已经基线化，无需操作')
        console.log()
        console.log('可直接运行：npx prisma migrate deploy')
        return
      } else {
        console.log('ℹ️  _prisma_migrations 表存在但为空，开始填充基线数据...')
      }
    } else {
      console.log('ℹ️  _prisma_migrations 表不存在，需要创建并填充基线数据...')

      // 创建 _prisma_migrations 表
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS _prisma_migrations (
          id VARCHAR(36) PRIMARY KEY,
          checksum VARCHAR(64) NOT NULL,
          finished_at DATETIME(3) NULL,
          migration_name VARCHAR(255) NOT NULL,
          logs TEXT NULL,
          rolled_back_at DATETIME(3) NULL,
          started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          applied_steps_count INT UNSIGNED NOT NULL DEFAULT 0
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)
      console.log('✅ _prisma_migrations 表已创建')
    }
  } catch (error) {
    console.error('❌ 检查/创建 _prisma_migrations 表失败:', error)
    throw error
  }

  console.log()
  console.log('开始标记迁移为已应用...')
  console.log()

  // 2. 按顺序标记每个迁移为已应用
  for (const migrationName of MIGRATION_ORDER) {
    const migrationPath = path.join(MIGRATIONS_DIR, migrationName, 'migration.sql')

    if (!fs.existsSync(migrationPath)) {
      console.log(`⚠️  跳过 ${migrationName}: migration.sql 不存在`)
      continue
    }

    // 生成简单的 checksum（实际 Prisma 使用更复杂的计算）
    const migrationContent = fs.readFileSync(migrationPath, 'utf-8')
    const checksum = Buffer.from(migrationContent).toString('base64').slice(0, 64)

    // 生成 UUID
    const id = generateUUID()
    const now = new Date()

    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO _prisma_migrations (
          id, checksum, finished_at, migration_name,
          logs, rolled_back_at, started_at, applied_steps_count
        ) VALUES (?, ?, ?, ?, NULL, NULL, ?, 1)
      `, id, checksum, now, migrationName, now)

      console.log(`✅ ${migrationName}`)
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        console.log(`ℹ️  ${migrationName} - 已存在，跳过`)
      } else {
        console.error(`❌ ${migrationName} - 失败:`, error.message)
        throw error
      }
    }
  }

  console.log()
  console.log('=========================================')
  console.log('  ✅ 数据库基线化完成!')
  console.log('=========================================')
  console.log()
  console.log('现在可以正常运行: npx prisma migrate deploy')
  console.log()

  // 验证结果
  const result = await prisma.$queryRawUnsafe<Array<{ migration_name: string }>>(`
    SELECT migration_name FROM _prisma_migrations ORDER BY started_at
  `)
  console.log('已标记的迁移:')
  result.forEach(r => console.log(`  - ${r.migration_name}`))
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

main()
  .catch((e) => {
    console.error()
    console.error('=========================================')
    console.error('  ❌ 基线化失败!')
    console.error('=========================================')
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
