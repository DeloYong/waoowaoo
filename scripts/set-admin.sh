#!/bin/bash

# 设置管理员账号脚本
# 用法：./scripts/set-admin.sh <user-name>
#
# 支持按用户名或邮箱设置管理员

set -e

if [ -z "$1" ]; then
    echo "用法: $0 <user-name或email>"
    echo "示例: $0 admin@example.com"
    echo "示例: $0 myusername"
    exit 1
fi

IDENTIFIER="$1"
echo "正在将用户 '$IDENTIFIER' 设置为管理员..."

# 通过 Docker 容器执行 MySQL
MYSQL_CONTAINER=$(docker ps --filter "name=mysql" --filter "name=db" --format '{{.Names}}' | head -1)

if [ -z "$MYSQL_CONTAINER" ]; then
    echo "错误: 未找到 MySQL 容器"
    echo "请确保 Docker 容器正在运行: docker compose up -d"
    exit 1
fi

echo "找到 MySQL 容器: $MYSQL_CONTAINER"

# 数据库配置（来自 docker-compose.yml）
DB_USER="root"
DB_PASS="waoowaoo123"
DB_NAME="waoowaoo"

echo "连接数据库: $DB_NAME"

# 执行 SQL（表名是小写的 user）
# 支持用户名或邮箱
docker exec "$MYSQL_CONTAINER" mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "UPDATE \`user\` SET isAdmin = 1 WHERE name = '$IDENTIFIER' OR email = '$IDENTIFIER'; SELECT id, name, email, isAdmin FROM \`user\` WHERE name = '$IDENTIFIER' OR email = '$IDENTIFIER';"

echo ""
echo "用户 '$IDENTIFIER' 已设置为管理员"
echo "访问管理后台: http://localhost:13000/zh/admin/platform-keys"
