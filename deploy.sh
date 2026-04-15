#!/bin/bash

# waoowaoo 部署脚本
# 用法：./deploy.sh

set -e  # 遇到错误立即退出

# 获取所有远程分支
git fetch origin

# 检查是否已在 feature/saas-credits 分支
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "feature/saas-credits" ]; then
    echo "当前分支: $CURRENT_BRANCH"
    echo "切换到 feature/saas-credits 分支..."
    git checkout feature/saas-credits 2>/dev/null || git checkout -b feature/saas-credits origin/feature/saas-credits
    echo "已切换到 feature/saas-credits 分支"
else
    echo "已在 feature/saas-credits 分支"
fi

# 步骤 1/3: 拉取最新代码
echo ""
echo "步骤 1/3: 拉取最新代码..."
git pull origin feature/saas-credits
echo "代码拉取完成"
echo ""

# 步骤 2/3: 重建 Docker 镜像（Next.js 需要重新构建以包含新路由）
echo ""
echo "========================================="
echo "步骤 2/3: 重建 Docker 镜像..."
echo "========================================="
echo "注意：Next.js 生产构建会静态生成所有路由，必须重建镜像"
echo "开始时间: $(date)"
echo ""

# 先停止旧容器（避免缓存问题）
echo "停止现有容器..."
docker compose down || true

# 删除旧镜像（强制使用新构建）
echo "删除旧镜像..."
docker rmi waoowaoo-app:latest 2>/dev/null || true
docker rmi waoowaoo-app:local 2>/dev/null || true

# 重新构建镜像
echo "开始构建新镜像..."
docker compose build --progress=plain 2>&1 | tee /tmp/docker-build.log

if [ ${PIPESTATUS[0]} -ne 0 ]; then
    echo ""
    echo "❌ Docker 构建失败！查看完整日志："
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

# 步骤 3/3: 启动容器
echo ""
echo "========================================="
echo "步骤 3/3: 启动容器..."
echo "========================================="
docker compose up -d
echo "容器启动完成"
echo ""

# 等待应用启动并检查健康状态
echo "等待应用启动（30秒）..."
for i in $(seq 1 30); do
    if docker compose ps | grep -q "healthy\|Up"; then
        echo "✅ 容器已启动 ($i/30秒)"
        break
    fi
    sleep 1
done

echo ""

# 检查容器状态
echo "容器状态:"
docker compose ps
echo ""

# 显示最近的日志
echo "最近的容器日志:"
docker compose logs --tail=20
echo ""

# 获取版本号
VERSION=$(python3 -c "import json; print(json.load(open('package.json'))['version'])" 2>/dev/null || grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' package.json | sed 's/.*"version"[[:space:]]*:[[:space:]]*"//;s/"//')

echo "==================================="
echo "部署完成！"
echo "==================================="
echo " 分支: feature/saas-credits"
echo " 版本: $VERSION"
echo "==================================="

# 步骤 4: 执行数据库迁移脚本
echo ""
echo "========================================="
echo "步骤 4/4: 执行数据库迁移..."
echo "========================================="

# 等待应用完全就绪（prisma db push 需要完成）
echo "等待应用就绪（15秒）..."
sleep 15

# 设置平台默认音频模型
echo "设置平台默认音频模型..."
docker exec waoowaoo-app npx tsx scripts/migrations/set-platform-default-audio-model.ts 2>&1

if [ $? -eq 0 ]; then
    echo "✅ 平台默认音频模型设置成功"
else
    echo "⚠️  平台默认音频模型设置失败（可手动执行）"
    echo "   docker exec -it waoowaoo-app npx tsx scripts/migrations/set-platform-default-audio-model.ts"
fi

echo ""
echo "==================================="
echo "全部完成！"
echo "==================================="
