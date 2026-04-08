#!/bin/bash

# 设置管理员账号脚本
# 用法：./scripts/set-admin.sh <user-email>

set -e

if [ -z "$1" ]; then
    echo "用法: $0 <user-email>"
    echo "示例: $0 admin@example.com"
    exit 1
fi

EMAIL="$1"

echo "正在将用户 $EMAIL 设置为管理员..."

# 检查是否在 EC2 上有 .env 文件
if [ -f ".env" ]; then
    # 从 .env 读取数据库配置
    source .env
fi

# 使用 Prisma 设置管理员
npx prisma db execute --stdin << SQL
UPDATE User SET isAdmin = 1 WHERE email = '$EMAIL';
SELECT id, email, isAdmin FROM User WHERE email = '$EMAIL';
SQL

if [ $? -eq 0 ]; then
    echo "✅ 用户 $EMAIL 已设置为管理员"
    echo "访问管理后台: http://localhost:13000/admin/platform-keys"
else
    echo "❌ 设置失败，请检查邮箱是否正确"
    exit 1
fi
