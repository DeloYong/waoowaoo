#!/bin/bash

# MySQL 数据库基线脚本 - 解决 Prisma P3005 错误
# 不需要 node_modules / @prisma/client 依赖
#
# 使用方法：
# 1. Docker 环境: ./scripts/migrations/baseline-mysql.sh --docker
# 2. 本地环境: ./scripts/migrations/baseline-mysql.sh
# 3. 自定义数据库: ./scripts/migrations/baseline-mysql.sh -h host -u user -p pass -d dbname

set -e

# 默认配置
DB_HOST="127.0.0.1"
DB_PORT="3306"
DB_USER="root"
DB_PASS="waoowaoo123"
DB_NAME="waoowaoo"
USE_DOCKER=false
DOCKER_CONTAINER="waoowaoo-mysql"

# 迁移列表（按顺序）
MIGRATIONS=(
  "20260317120000_add_asset_kind_to_locations"
  "20260324120000_drop_project_mode"
  "20260328110000_add_location_available_slots"
  "20260405080019_saas_credits_schema"
)

# 显示帮助
show_help() {
  echo "MySQL 数据库基线脚本 - 解决 Prisma P3005 错误"
  echo ""
  echo "用法:"
  echo "  $0 [选项]"
  echo ""
  echo "选项:"
  echo "  --docker           使用 Docker 容器中的 MySQL (默认容器名: waoowaoo-mysql)"
  echo "  --container NAME   指定 Docker 容器名称"
  echo "  -h HOST            MySQL 主机 (默认: 127.0.0.1)"
  echo "  -P PORT            MySQL 端口 (默认: 3306)"
  echo "  -u USER            MySQL 用户名 (默认: root)"
  echo "  -p PASS            MySQL 密码 (默认: waoowaoo123)"
  echo "  -d DBNAME          数据库名称 (默认: waoowaoo)"
  echo "  --help             显示此帮助信息"
  echo ""
  echo "示例:"
  echo "  $0 --docker                          # 使用 Docker MySQL"
  echo "  $0 -h 127.0.0.1 -P 13306 -u root    # 本地 MySQL 使用 13306 端口"
  echo ""
}

# 解析参数
while [[ $# -gt 0 ]]; do
  case $1 in
    --docker)
      USE_DOCKER=true
      shift
      ;;
    --container)
      DOCKER_CONTAINER="$2"
      USE_DOCKER=true
      shift 2
      ;;
    -h)
      DB_HOST="$2"
      shift 2
      ;;
    -P)
      DB_PORT="$2"
      shift 2
      ;;
    -u)
      DB_USER="$2"
      shift 2
      ;;
    -p)
      DB_PASS="$2"
      shift 2
      ;;
    -d)
      DB_NAME="$2"
      shift 2
      ;;
    --help)
      show_help
      exit 0
      ;;
    *)
      echo "未知选项: $1"
      show_help
      exit 1
      ;;
  esac
done

echo "========================================="
echo "  Prisma 数据库基线脚本 (MySQL 版本)"
echo "========================================="
echo ""

# 检查 Docker 模式
if [ "$USE_DOCKER" = true ]; then
  echo "使用 Docker 容器: $DOCKER_CONTAINER"

  # 检查容器是否运行
  if ! docker ps --format '{{.Names}}' | grep -q "^${DOCKER_CONTAINER}$"; then
    echo "❌ 错误: Docker 容器 '$DOCKER_CONTAINER' 未运行"
    echo ""
    echo "请先启动容器: docker compose up -d mysql"
    exit 1
  fi

  # 构建 Docker exec 命令
  MYSQL_CMD="docker exec $DOCKER_CONTAINER mysql -u$DB_USER -p$DB_PASS $DB_NAME -e"
else
  echo "连接信息: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"

  # 检查 mysql 客户端是否存在
  if ! command -v mysql &> /dev/null; then
    echo "❌ 错误: 未找到 mysql 命令"
    echo ""
    echo "请安装 MySQL 客户端，或使用 --docker 模式:"
    echo "  $0 --docker"
    exit 1
  fi

  # 构建本地 mysql 命令
  MYSQL_CMD="mysql -h$DB_HOST -P$DB_PORT -u$DB_USER -p$DB_PASS $DB_NAME -e"
fi

echo ""

# 1. 检查 _prisma_migrations 表是否存在
echo "步骤 1/4: 检查 _prisma_migrations 表..."
TABLE_EXISTS=$($MYSQL_CMD "SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '_prisma_migrations';" 2>/dev/null | grep -v "cnt" | tr -d ' ')

if [ "$TABLE_EXISTS" = "1" ]; then
  # 检查表中是否有数据
  MIGRATION_COUNT=$($MYSQL_CMD "SELECT COUNT(*) as cnt FROM _prisma_migrations;" 2>/dev/null | grep -v "cnt" | tr -d ' ')

  if [ "$MIGRATION_COUNT" != "0" ]; then
    echo "✅ _prisma_migrations 表已存在且有数据 ($MIGRATION_COUNT 条记录)"
    echo ""
    echo "数据库已经基线化，无需操作"
    echo ""
    echo "可直接运行: npx prisma migrate deploy"
    exit 0
  else
    echo "ℹ️  _prisma_migrations 表存在但为空，开始填充基线数据..."
  fi
else
  echo "ℹ️  _prisma_migrations 表不存在，正在创建..."

  # 创建 _prisma_migrations 表
  $MYSQL_CMD "CREATE TABLE IF NOT EXISTS _prisma_migrations (
    id VARCHAR(36) PRIMARY KEY,
    checksum VARCHAR(64) NOT NULL,
    finished_at DATETIME(3) NULL,
    migration_name VARCHAR(255) NOT NULL,
    logs TEXT NULL,
    rolled_back_at DATETIME(3) NULL,
    started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    applied_steps_count INT UNSIGNED NOT NULL DEFAULT 0
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;"

  echo "✅ _prisma_migrations 表已创建"
fi

echo ""
echo "步骤 2/4: 按顺序标记迁移为已应用..."
echo ""

# 2. 生成 UUID 并插入每个迁移记录
for migration in "${MIGRATIONS[@]}"; do
  # 生成简单的 UUID
  UUID=$(cat /proc/sys/kernel/random/uuid 2>/dev/null || python3 -c "import uuid; print(uuid.uuid4())" 2>/dev/null || echo "11111111-1111-1111-1111-$(date +%s%N | cut -b1-12)")

  # 生成简单的 checksum (使用迁移名称的 hash)
  CHECKSUM=$(echo -n "$migration" | md5sum 2>/dev/null | cut -d' ' -f1 || echo "$migration")
  # 补全到 64 字符
  while [ ${#CHECKSUM} -lt 64 ]; do
    CHECKSUM="${CHECKSUM}0"
  done
  CHECKSUM="${CHECKSUM:0:64}"

  # 时间戳
  NOW=$(date "+%Y-%m-%d %H:%M:%S.%3N")

  # 检查是否已存在
  EXISTS=$($MYSQL_CMD "SELECT COUNT(*) as cnt FROM _prisma_migrations WHERE migration_name = '$migration';" 2>/dev/null | grep -v "cnt" | tr -d ' ')

  if [ "$EXISTS" = "1" ]; then
    echo "ℹ️  $migration - 已存在，跳过"
  else
    # 插入迁移记录
    $MYSQL_CMD "INSERT INTO _prisma_migrations (
      id, checksum, finished_at, migration_name,
      logs, rolled_back_at, started_at, applied_steps_count
    ) VALUES (
      '$UUID',
      '$CHECKSUM',
      '$NOW',
      '$migration',
      NULL,
      NULL,
      '$NOW',
      1
    );"

    echo "✅ $migration"
  fi
done

echo ""
echo "步骤 3/4: 验证结果..."
echo ""
echo "已标记的迁移:"
$MYSQL_CMD "SELECT migration_name, started_at FROM _prisma_migrations ORDER BY started_at;" 2>/dev/null | tail -n +2

echo ""
echo "步骤 4/4: 完成!"
echo ""
echo "========================================="
echo "  ✅ 数据库基线化完成!"
echo "========================================="
echo ""
echo "现在可以正常运行: npx prisma migrate deploy"
echo ""
