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
echo "步骤 2/3: 重建 Docker 镜像..."
echo "注意：Next.js 生产构建会静态生成所有路由，必须重建镜像"
docker compose build
echo "Docker 镜像重建完成"
echo ""

# 步骤 3/3: 重启容器并等待启动
echo "步骤 3/3: 重启容器..."
docker compose down
docker compose up -d
echo "容器重启完成"
echo ""

# 等待应用启动
echo "等待应用启动..."
sleep 5

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
