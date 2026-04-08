#!/bin/bash
# 在 EC2 上执行套餐数据导入

set -e

echo "========================================="
echo "  导入套餐数据到数据库"
echo "========================================="
echo ""

# 在 Docker 容器中执行 seed 脚本
docker exec waoowaoo-app npx tsx prisma/seed-plans.ts

echo ""
echo "========================================="
echo "  验证数据导入"
echo "========================================="

# 查询数据库验证
docker exec waoowaoo-mysql mysql -uroot -pwaoowaoo123 waoowaoo -e "SELECT id, name, monthlyPrice, yearlyPrice, monthlyCredits FROM subscription_plans ORDER BY sortOrder;"

echo ""
echo "✅ 套餐数据导入完成!"
