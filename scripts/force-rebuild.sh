#!/bin/bash

# 强制重建 Docker 镜像脚本
# 用法：chmod +x scripts/force-rebuild.sh && ./scripts/force-rebuild.sh

# 注意：不使用 set -e，因为 docker build 失败时需要继续执行错误处理

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
docker compose down || echo "容器可能已停止"
echo ""

# 步骤 3: 删除所有旧镜像
echo "【步骤 3/5】删除旧镜像..."
docker rmi waoowaoo-app:latest 2>/dev/null || echo "  - 无 latest 镜像"
docker rmi waoowaoo-app:local 2>/dev/null || echo "  - 无 local 镜像"
docker image prune -f || true
echo ""

# 步骤 4: 重新构建镜像（带详细日志）
echo "【步骤 4/5】开始构建新镜像（这可能需要 5-10 分钟）..."
echo "构建开始时间: $(date)"
echo ""
echo "提示：详细构建日志保存到 /tmp/docker-build-force.log"
echo "您可以另开终端查看进度: tail -f /tmp/docker-build-force.log"
echo ""

# 使用传统 docker build，输出到日志文件
DOCKER_BUILDKIT=0 docker build --no-cache -t waoowaoo-app:latest . > /tmp/docker-build-force.log 2>&1

# 检查 docker build 的退出码
BUILD_EXIT=$?

if [ $BUILD_EXIT -ne 0 ]; then
    echo ""
    echo "❌ Docker 构建失败（退出码: $BUILD_EXIT）"
    echo ""
    echo "=== 最后 80 行错误日志 ==="
    tail -80 /tmp/docker-build-force.log
    echo ""
    echo "请查看完整日志: cat /tmp/docker-build-force.log"
    exit 1
fi

# 二次验证镜像是否存在
if ! docker images waoowaoo-app:latest --format '{{.Repository}}' | grep -q waoowaoo-app; then
    echo ""
    echo "❌ 镜像构建完成但未生成 waoowaoo-app:latest"
    echo "请查看日志: /tmp/docker-build-force.log"
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
