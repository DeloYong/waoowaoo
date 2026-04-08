#!/bin/bash

# 强制重建 Docker 镜像脚本
# 用法：chmod +x scripts/force-rebuild.sh && ./scripts/force-rebuild.sh

set -e

echo "========================================="
echo "强制重建 Docker 镜像"
echo "========================================="
echo ""

# 步骤 1: 确保在正确的分支
echo "【步骤 1/5】检查代码版本..."
git fetch origin
git pull origin feature/saas-credits
echo "当前提交: $(git log --oneline -1)"
echo ""

# 步骤 2: 停止所有容器
echo "【步骤 2/5】停止所有容器..."
docker compose down
echo ""

# 步骤 3: 删除所有旧镜像
echo "【步骤 3/5】删除旧镜像..."
docker rmi waoowaoo-app:latest 2>/dev/null || echo "  - 无 latest 镜像"
docker rmi waoowaoo-app:local 2>/dev/null || echo "  - 无 local 镜像"
docker image prune -f
echo ""

# 步骤 4: 重新构建镜像（带详细日志）
echo "【步骤 4/5】开始构建新镜像（这可能需要 5-10 分钟）..."
echo "构建开始时间: $(date)"
echo ""

# 使用 docker build 而不是 compose build，更可靠
docker build -t waoowaoo-app:latest . 2>&1 | tee /tmp/docker-build-force.log

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ 构建失败！最后 50 行错误日志："
    tail -50 /tmp/docker-build-force.log
    exit 1
fi

echo ""
echo "✅ 镜像构建成功！"
echo "构建完成时间: $(date)"
echo ""

# 验证镜像
echo "新镜像信息:"
docker images waoowaoo-app:latest
echo ""

# 步骤 5: 启动容器
echo "【步骤 5/5】启动容器..."
docker compose up -d
echo ""

# 等待并验证
echo "等待容器启动（30秒）..."
for i in $(seq 1 30); do
    if docker compose ps | grep -q "Up"; then
        echo "✅ 容器已启动 ($i 秒)"
        break
    fi
    sleep 1
done

echo ""
echo "========================================="
echo "部署完成！"
echo "========================================="
echo ""
echo "验证步骤："
echo "1. 检查容器状态: docker compose ps"
echo "2. 查看日志: docker compose logs --tail=50"
echo "3. 验证 admin 页面: curl http://localhost:13000/zh/admin/platform-keys"
echo ""
echo "如果页面仍然 404，请运行诊断脚本:"
echo "  ./scripts/diagnose-deploy.sh"
echo ""
