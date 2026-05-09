#!/bin/bash

# EC2 完整部署脚本 - 包含代码拉取、Docker 重建和套餐数据导入
# 用法: 在 EC2 的 waoowaoo 目录下运行: bash deploy-full.sh
#
# 注意: Amazon Linux 使用 docker-compose V1 (带连字符)
# 如果是 Docker Compose V2 (不带连字符)，将 docker-compose 改为 docker compose

set -e

# 检测 Docker Compose 版本并设置命令
if docker compose version &>/dev/null; then
    DC_CMD="docker compose"
elif docker-compose --version &>/dev/null; then
    DC_CMD="docker-compose"
else
    echo "错误: 未找到 docker compose 或 docker-compose 命令"
    exit 1
fi

echo "========================================="
echo "  waoowaoo 完整部署脚本"
echo "========================================="
echo "使用命令: $DC_CMD"
echo ""

# 清理Docker无用资源
echo "清理Docker无用资源..."
docker system prune -af --volumes
echo "✅ Docker清理完成"
echo ""

# 步骤 1: 拉取最新代码
echo "步骤 1/7: 拉取最新代码..."
echo "========================================="
git fetch origin
git pull origin feature/saas-credits

# 清除本地 .next 缓存，防止 COPY . . 将旧构建产物带入 Docker
echo "清除 .next 构建缓存..."
rm -rf .next
echo "✅ 代码拉取完成"
echo ""

# 步骤 2: 重建 Docker 镜像
echo "步骤 2/7: 重建 Docker 镜像..."
echo "========================================="
echo "注意: Next.js 生产构建会静态生成所有路由,必须重建镜像"
echo "开始时间: $(date)"
echo ""

# 停止旧容器
echo "停止现有容器..."
$DC_CMD down || true

# 删除旧镜像
echo "删除旧镜像..."
docker rmi waoowaoo-app:latest 2>/dev/null || true
docker rmi waoowaoo-app:local 2>/dev/null || true

# 使用 force-rebuild.sh 的构建逻辑 (legacy builder)
echo "开始构建新镜像..."
echo "注意: 构建过程可能需要 5-10 分钟,请耐心等待..."
echo ""

# 使用 script 命令确保输出被正确捕获,并等待完成
DOCKER_BUILDKIT=0 docker build --no-cache -t waoowaoo-app:latest . 2>&1 | tee /tmp/docker-build.log

BUILD_EXIT=${PIPESTATUS[0]}
if [ $BUILD_EXIT -ne 0 ]; then
    echo ""
    echo "❌ Docker 构建失败(退出码: $BUILD_EXIT)"
    echo "查看最后 50 行构建日志:"
    tail -50 /tmp/docker-build.log
    exit 1
fi

echo ""
echo "✅ Docker 镜像构建成功"
echo "构建完成时间: $(date)"
echo ""

# 验证新镜像
echo "验证镜像..."
docker images waoowaoo-app
echo ""

# 步骤 3: 启动容器
echo "步骤 3/7: 启动容器..."
echo "========================================="
$DC_CMD up -d
echo "✅ 容器启动完成"
echo ""

# 等待应用启动
echo "等待应用启动(30秒)..."
for i in $(seq 1 30); do
    if $DC_CMD ps | grep -q "healthy\|Up"; then
        echo "✅ 容器已启动 ($i/30秒)"
        break
    fi
    sleep 1
done

echo ""
echo "容器状态:"
$DC_CMD ps
echo ""

# 步骤 4: 执行数据库迁移
echo "步骤 4/7: 执行数据库迁移..."
echo "========================================="
echo "等待 MySQL 启动(10秒)..."
sleep 10
docker exec waoowaoo-app npx prisma migrate deploy
echo "✅ 数据库迁移完成"
echo ""

# 步骤 5: 初始化套餐数据
echo "步骤 5/7: 初始化套餐数据..."
echo "========================================="
docker exec waoowaoo-app npx tsx prisma/seed-plans.ts
echo ""
echo "验证套餐数据..."
docker exec waoowaoo-mysql mysql -uroot -pwaoowaoo123 waoowaoo -e "SELECT id, name, monthlyPrice, monthlyCredits FROM subscription_plans ORDER BY sortOrder;"
echo "✅ 套餐数据导入完成"
echo ""

# 步骤 6: 补全已有用户邀请码
echo "步骤 6/7: 补全已有用户邀请码..."
echo "========================================="
docker exec waoowaoo-app npx tsx scripts/migrations/backfill-invite-codes.ts || echo "⚠️  邀请码补全失败（可能无需要补全的用户）"
echo ""

# 步骤 7: 清理用户模型配置
echo "步骤 7/7: 清理用户模型配置，统一使用系统默认..."
echo "========================================="
docker exec waoowaoo-app npx tsx scripts/migrations/clear-user-model-configs.ts
echo ""

# 显示部署信息
VERSION=$(grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' package.json | sed 's/.*"version"[[:space:]]*:[[:space:]]*"//;s/"//')

# 配置Cron任务提示
echo "========================================="
echo "  ⏰ Cron任务配置提醒"
echo "========================================="
echo "已集成每日统计报表功能，需要配置定时任务："
echo ""
echo "手动配置："
echo "crontab -e"
echo "添加行：0 1 * * * curl -X POST http://127.0.0.1:13000/api/cron/generate-daily-stats -H \"Authorization: Bearer CRON_SECRET值\""
echo ""

echo "========================================="
echo "  🎉 部署完成!"
echo "========================================="
echo " 命令: $DC_CMD"
echo " 分支: feature/saas-credits"
echo " 版本: $VERSION"
echo "========================================="
echo ""
echo "📋 下一步操作:"
echo "1. 设置管理员: chmod +x scripts/set-admin.sh && ./scripts/set-admin.sh 你的用户名"
echo "2. 访问 http://你的IP:13000/zh 登录账号"
echo "3. 访问 http://你的IP:13000/zh/admin/platform-keys 配置系统默认模型"
echo ""
