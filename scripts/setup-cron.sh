#!/bin/bash

# 自动配置Cron定时任务脚本
# 用法: sudo bash scripts/setup-cron.sh

set -e

echo "========================================="
echo "  waoowaoo Cron任务自动配置脚本"
echo "========================================="
echo ""

# 检查是否为root用户
if [ "$(id -u)" -ne 0 ]; then
    echo "❌ 需要root权限运行，请使用sudo执行"
    exit 1
fi

# 检查.env文件
if [ ! -f .env ]; then
    echo "❌ 未找到.env文件，请在项目根目录运行"
    exit 1
fi

# 获取CRON_SECRET
CRON_SECRET=$(grep CRON_SECRET .env | cut -d '=' -f2 | xargs)
if [ -z "$CRON_SECRET" ]; then
    echo "❌ .env文件中未配置CRON_SECRET，请先配置"
    exit 1
fi

# Cron任务命令
CRON_CMD="0 1 * * * curl -X POST http://127.0.0.1:13000/api/cron/generate-daily-stats -H \"Authorization: Bearer $CRON_SECRET\" > /var/log/waoowaoo-cron.log 2>&1"

# 检查是否已存在相同任务
if crontab -l 2>/dev/null | grep -q "generate-daily-stats"; then
    echo "⚠️  已存在Cron任务，是否更新？(y/n)"
    read -r CONFIRM
    if [ "$CONFIRM" != "y" ]; then
        echo "操作已取消"
        exit 0
    fi
    # 删除旧任务
    crontab -l 2>/dev/null | grep -v "generate-daily-stats" | crontab -
fi

# 添加新任务
(crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -

echo "✅ Cron任务已配置成功"
echo ""
echo "任务详情："
echo "  执行时间：每日凌晨1点"
echo "  任务功能：生成每日统计报表数据"
echo "  日志文件：/var/log/waoowaoo-cron.log"
echo ""
echo "当前Cron任务列表："
crontab -l
echo ""
echo "📋 测试任务（立即执行一次）："
echo "$CRON_CMD"
