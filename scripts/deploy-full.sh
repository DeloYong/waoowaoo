#!/bin/bash

# EC2 完整部署脚本 - 包含代码拉取、Docker 重建和套餐数据导入
# 用法: 在 EC2 的 waoowaoo 目录下运行: bash deploy-full.sh

set -e

echo "========================================="
echo "  waoowaoo 完整部署脚本"
echo "========================================="
echo ""

# 步骤 1: 拉取最新代码
echo "步骤 1/4: 拉取最新代码..."
echo "========================================="
git fetch origin
git pull origin feature/saas-credits
echo "✅ 代码拉取完成"
echo ""

# 步骤 2: 重建 Docker 镜像
echo "步骤 2/4: 重建 Docker 镜像..."
echo "========================================="
echo "注意: Next.js 生产构建会静态生成所有路由,必须重建镜像"
echo "开始时间: $(date)"
echo ""

# 停止旧容器
echo "停止现有容器..."
docker compose down || true

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
echo "步骤 3/4: 启动容器..."
echo "========================================="
docker compose up -d
echo "✅ 容器启动完成"
echo ""

# 等待应用启动
echo "等待应用启动(30秒)..."
for i in $(seq 1 30); do
    if docker compose ps | grep -q "healthy\|Up"; then
        echo "✅ 容器已启动 ($i/30秒)"
        break
    fi
    sleep 1
done

echo ""
echo "容器状态:"
docker compose ps
echo ""

# 步骤 4: 导入套餐数据
echo "步骤 4/4: 导入套餐数据到数据库..."
echo "========================================="

# 等待 MySQL 完全启动
echo "等待 MySQL 启动(10秒)..."
sleep 10

# 执行种子脚本
echo "开始导入套餐数据..."
docker exec waoowaoo-app npx tsx prisma/seed-plans.ts

echo ""
echo "验证套餐数据..."
docker exec waoowaoo-mysql mysql -uroot -pwaoowaoo123 waoowaoo -e "SELECT id, name, monthlyPrice, yearlyPrice, monthlyCredits FROM subscription_plans ORDER BY sortOrder;"

echo ""
echo "✅ 套餐数据导入完成"
echo ""

# 显示部署信息
VERSION=$(grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' package.json | sed 's/.*"version"[[:space:]]*:[[:space:]]*"//;s/"//')

echo "========================================="
echo "  🎉 部署完成!"
echo "========================================="
echo " 分支: feature/saas-credits"
echo " 版本: $VERSION"
echo "========================================="
echo ""
echo "📋 下一步操作:"
echo "1. 访问 http://54.206.102.49:13000/zh/pricing 查看套餐页面"
echo "2. 访问 http://54.206.102.49:13000/zh/admin/platform-keys 测试 admin 后台"
echo "3. 测试退出登录功能,应该跳转到当前域名而不是 localhost"
echo ""
