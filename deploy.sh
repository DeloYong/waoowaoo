#!/bin/bash

# waoowaoo 部署脚本
# 用法：./deploy.sh

set -e  # 遇到错误立即退出

EC2_HOST="ec2-user@ec2-54-206-102-49.ap-southeast-2.compute.amazonaws.com"
SSH_KEY="$HOME/.ssh/blog.pem"
REMOTE_DIR="~/waoowaoo"

echo "🚀 开始部署 waoowaoo 到 AWS EC2..."
echo "📍 服务器: $EC2_HOST"
echo ""

# 检查 SSH 密钥是否存在
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ 错误: SSH 密钥不存在: $SSH_KEY"
    exit 1
fi

# 设置 SSH 密钥权限
chmod 400 "$SSH_KEY"

echo "📦 步骤 1/5: SSH 连接到服务器..."
echo "📦 步骤 2/5: 拉取最新代码..."
echo "📦 步骤 3/5: 检查 Docker 变更..."
echo "📦 步骤 4/5: 重建 Docker 镜像..."
echo "📦 步骤 5/5: 重启容器..."
echo ""

# 执行远程部署
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$EC2_HOST" << 'REMOTE_SCRIPT'
set -e

echo "==================================="
echo "🔧 开始部署 waoowaoo"
echo "==================================="
echo ""

# 进入项目目录
cd ~/waoowaoo || { echo "❌ 错误: 项目目录不存在"; exit 1; }

# 步骤 1: 更新远程仓库地址并切换到 feature/saas-credits 分支
echo "📥 步骤 1/6: 更新远程仓库地址..."
# 检查当前 remote URL
CURRENT_URL=$(git remote get-url origin 2>/dev/null || echo "none")
TARGET_URL="https://github.com/DeloYong/waoowaoo.git"

if [ "$CURRENT_URL" != "$TARGET_URL" ]; then
    echo "🔄 当前远程: $CURRENT_URL"
    echo "🔄 更改为: $TARGET_URL"
    git remote set-url origin "$TARGET_URL" || git remote add origin "$TARGET_URL"
    echo "✅ 远程仓库地址已更新"
else
    echo "✅ 远程仓库地址已是目标地址"
fi

# 获取所有远程分支
git fetch origin

# 检查是否已在 feature/saas-credits 分支
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "feature/saas-credits" ]; then
    echo "🔄 当前分支: $CURRENT_BRANCH"
    echo "🔄 切换到 feature/saas-credits 分支..."
    git checkout feature/saas-credits 2>/dev/null || git checkout -b feature/saas-credits origin/feature/saas-credits
    echo "✅ 已切换到 feature/saas-credits 分支"
else
    echo "✅ 已在 feature/saas-credits 分支"
fi

# 步骤 2: 拉取最新代码
echo "📥 步骤 2/6: 拉取最新代码..."
git pull origin feature/saas-credits
echo "✅ 代码拉取完成"
echo ""

# 步骤 3: 检查 docker-compose.yml 或 Dockerfile 是否有变更
echo "🔍 步骤 3/6: 检查 Docker 配置变更..."
if git diff HEAD@{1} HEAD -- docker-compose.yml docker-compose.yaml Dockerfile Dockerfile.* .dockerignore 2>/dev/null | grep -q .; then
    echo "⚠️  检测到 Docker 配置变更，将重建镜像..."
    DOCKER_CHANGED=true
else
    echo "✅ 无 Docker 配置变更"
    DOCKER_CHANGED=false
fi
echo ""

# 步骤 4: 如果有 Docker 变更，重建镜像
if [ "$DOCKER_CHANGED" = true ]; then
    echo "🔨 步骤 4/6: 重建 Docker 镜像..."
    docker compose build --no-cache
    echo "✅ Docker 镜像重建完成"
else
    echo "⏭️  步骤 4/6: 跳过镜像重建（无变更）"
fi
echo ""

# 步骤 5: 重启容器
echo "🔄 步骤 5/6: 重启容器..."
docker compose down
docker compose up -d
echo "✅ 容器重启完成"
echo ""

# 步骤 6: 检查容器状态
echo "📊 步骤 6/6: 检查容器状态..."
docker compose ps
echo ""

# 显示最近的日志
echo "📋 最近的容器日志:"
docker compose logs --tail=20
echo ""

echo "==================================="
echo "🎉 部署完成！"
echo "==================================="
echo ""
echo "📍 部署信息:"
echo "   远程仓库: $TARGET_URL"
echo "   分支: feature/saas-credits"
echo "   版本: $(cat package.json | grep '\"version\"' | cut -d'\"' -f4)"
echo "==================================="

REMOTE_SCRIPT

# 检查 SSH 命令是否成功
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 部署成功完成！"
else
    echo ""
    echo "❌ 部署过程中出现错误"
    exit 1
fi
