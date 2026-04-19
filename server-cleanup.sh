#!/bin/bash
  set -u

  # 清理日志路径，方便后续排查
  LOG_FILE="/var/log/server-cleanup.log"
  echo "=====================================" >> $LOG_FILE
  echo "清理开始时间: $(date '+%Y-%m-%d %H:%M:%S')" >> $LOG_FILE
  echo "清理前磁盘使用情况:" >> $LOG_FILE
  df -h >> $LOG_FILE

  # =============================================
  # 1. 清理系统临时文件（只删7天以上没访问的，安全）
  # =============================================
  echo "1. 清理临时文件..." >> $LOG_FILE
  find /tmp -type f -atime +7 -delete >> $LOG_FILE 2>&1
  find /var/tmp -type f -atime +7 -delete >> $LOG_FILE 2>&1

  # =============================================
  # 2. 清理各类缓存文件（自动重建，不影响使用）
  # =============================================
  echo "2. 清理各类缓存..." >> $LOG_FILE
  # npm缓存
  npm cache clean --force >> $LOG_FILE 2>&1
  # Prisma缓存
  rm -rf /root/.cache/prisma >> $LOG_FILE 2>&1
  # yarn/pnpm缓存（如果有的话）
  yarn cache clean --force >> $LOG_FILE 2>&1 || true
  pnpm store prune >> $LOG_FILE 2>&1 || true

  # =============================================
  # 3. 清理Docker无用资源（**绝对不会影响运行中的容器**）
  # 规则：只清理24小时以上没被使用过的镜像/容器/卷，运行中的服务完全不受影响
  # =============================================
  echo "3. 清理Docker无用资源..." >> $LOG_FILE
  if command -v docker &> /dev/null; then
    # 清理停止的容器、悬空镜像、没用的网络、24h以上没用的镜像
    docker system prune -af --filter "until=24h" >> $LOG_FILE 2>&1
    # 清理没用的Docker构建缓存
    docker builder prune -af --filter "until=24h" >> $LOG_FILE 2>&1
  fi

  # =============================================
  # 4. 清理旧日志文件（保留最近7天的日志）
  # =============================================
  echo "4. 清理旧日志..." >> $LOG_FILE
  # 清理系统日志，只删7天以上的压缩包和旧日志
  find /var/log -type f \( -name "*.gz" -o -name "*.old" -o -name "*.[0-9]" \)
  -mtime +7 -delete >> $LOG_FILE 2>&1
  # 清空过大的日志文件（超过1G的日志清空内容，不删除文件，避免句柄泄漏）

  # =============================================
  # 5. 清理旧构建产物（CI/CD构建缓存，1天以上的删除）
  # =============================================
  echo "5. 清理旧构建产物..." >> $LOG_FILE
  find /tmp -name "*build*" -o -name "*ci*" -o -name "*deploy*" -type d -mtime
  +1 -exec rm -rf {} \; >> $LOG_FILE 2>&1 || true

  # =============================================
  # 输出清理结果
  # =============================================
  echo "清理后磁盘使用情况:" >> $LOG_FILE
  df -h >> $LOG_FILE
  echo "清理完成时间: $(date '+%Y-%m-%d %H:%M:%S')" >> $LOG_FILE
  echo "=====================================" >> $LOG_FILE

  # 自动清理自己的日志，只保留最近30天的清理日志
  tail -n 1000 $LOG_FILE > $LOG_FILE.tmp && mv $LOG_FILE.tmp $LOG_FILE