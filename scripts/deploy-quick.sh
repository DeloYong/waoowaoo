#!/bin/bash

# 快速部署脚本 - 仅更新代码，不重建镜像
# 用于调试时快速验证代码改动

set -e

echo "========================================="
echo "  waoowaoo 快速部署 (跳过镜像重建)"
echo "========================================="
echo ""

# 步骤 1: 拉取最新代码
echo "步骤 1/3: 拉取最新代码..."
git fetch origin
git pull origin feature/saas-credits
echo "✅ 代码拉取完成"
echo ""

# 步骤 2: 复制代码到容器（跳过构建）
echo "步骤 2/3: 复制代码到容器..."
docker cp . waoowaoo-app:/app
echo "✅ 代码复制完成"
echo ""

# 步骤 3: 重启应用
echo "步骤 3/3: 重启应用..."
docker compose restart app
echo "✅ 应用重启完成"
echo ""

echo "========================================="
echo "  快速部署完成！"
echo "  等待应用启动 (约10秒)..."
echo "========================================="

# 等待应用启动
for i in $(seq 1 10); do
    if docker compose ps | grep -q "Up"; then
        echo "✅ 容器已启动"
        break
    fi
    sleep 1
done

docker compose ps
