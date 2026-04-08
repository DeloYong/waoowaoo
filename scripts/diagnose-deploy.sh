#!/bin/bash

# EC2 部署诊断脚本
# 用法：chmod +x scripts/diagnose-deploy.sh && ./scripts/diagnose-deploy.sh

set -e

echo "========================================="
echo "waoowaoo 部署诊断工具"
echo "========================================="
echo ""

# 1. 检查 Git 状态
echo "【1/7】检查 Git 状态..."
echo "当前分支: $(git branch --show-current)"
echo "最新提交:"
git log --oneline -3
echo ""

# 检查是否包含 admin 页面的提交
if git log --oneline -10 | grep -q "admin"; then
    echo "✅ Git 历史中包含 admin 相关提交"
else
    echo "❌ Git 历史中未找到 admin 相关提交"
fi
echo ""

# 2. 检查 admin 页面文件是否存在
echo "【2/7】检查 admin 页面文件..."
ADMIN_FILES=(
    "src/app/[locale]/admin/layout.tsx"
    "src/app/[locale]/admin/platform-keys/page.tsx"
    "src/app/[locale]/admin/credit-pricing/page.tsx"
    "src/app/[locale]/admin/users/page.tsx"
    "src/app/[locale]/admin/invite-leaderboard/page.tsx"
)

for file in "${ADMIN_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file (缺失)"
    fi
done
echo ""

# 3. 检查 Docker 容器状态
echo "【3/7】检查 Docker 容器状态..."
docker compose ps
echo ""

# 4. 检查 Docker 镜像
echo "【4/7】检查 Docker 镜像..."
docker images waoowaoo-app 2>/dev/null || echo "未找到 waoowaoo-app 镜像"
echo ""

# 5. 检查 .next 构建产物（在容器内）
echo "【5/7】检查 Next.js 构建产物..."
if docker ps --filter "name=waoowaoo-app" --format '{{.Names}}' | grep -q .; then
    echo "检查容器内的 .next 目录:"
    docker exec waoowaoo-app ls -la .next/static/chunks/app/ 2>/dev/null | head -20 || echo "无法访问 .next 目录"
    echo ""
    
    # 检查是否包含 admin 路由
    echo "搜索 admin 路由:"
    docker exec waoowaoo-app find .next -name "*admin*" -type f 2>/dev/null | head -10 || echo "未找到 admin 相关文件"
else
    echo "❌ waoowaoo-app 容器未运行"
fi
echo ""

# 6. 检查 docker-compose.yml 配置
echo "【6/7】检查 Docker 配置..."
if grep -q "build: ." docker-compose.yml; then
    echo "✅ Docker build 配置已启用"
else
    echo "❌ Docker build 配置被禁用（这会导致无法重新构建镜像）"
fi
echo ""

# 7. 检查最近的错误日志
echo "【7/7】检查最近的错误日志..."
docker compose logs --tail=100 2>/dev/null | grep -iE "error|404|route|admin" | tail -10 || echo "无相关日志"
echo ""

echo "========================================="
echo "诊断完成"
echo "========================================="
echo ""
echo "如果第 5 步未找到 admin 路由，说明 Docker 镜像没有正确构建。"
echo "解决方案：执行 ./deploy.sh 重新构建和部署"
