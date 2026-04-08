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

# 通过 Docker 容器执行 MySQL
MYSQL_CONTAINER=$(docker ps --filter "name=mysql" --filter "name=db" --format '{{.Names}}' | head -1)

if [ -z "$MYSQL_CONTAINER" ]; then
    echo "错误: 未找到 MySQL 容器"
    echo "请确保 Docker 容器正在运行: docker compose up -d"
    exit 1
fi

echo "找到 MySQL 容器: $MYSQL_CONTAINER"

# 尝试不同的数据库配置
for DB_USER in "root"; do
    for DB_NAME in "waoowaoo" "nextjs"; do
        if docker exec "$MYSQL_CONTAINER" mysql -u"$DB_USER" "$DB_NAME" -e "SELECT 1" &>/dev/null; then
            echo "使用数据库: $DB_NAME, 用户: $DB_USER"
            docker exec "$MYSQL_CONTAINER" mysql -u"$DB_USER" "$DB_NAME" -e "UPDATE User SET isAdmin = 1 WHERE email = '$EMAIL'; SELECT id, email, isAdmin FROM User WHERE email = '$EMAIL';"
            echo ""
            echo "用户 $EMAIL 已设置为管理员"
            echo "访问管理后台: http://localhost:13000/zh/admin/platform-keys"
            exit 0
        fi
    done
done

echo "错误: 无法连接到数据库"
exit 1
