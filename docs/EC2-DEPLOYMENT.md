# EC2 部署指南

本文档详细说明如何在 AWS EC2 实例上从零部署 waoowaoo 项目。

## 目录

1. [EC2 实例创建](#1-ec2-实例创建)
2. [基础环境配置](#2-基础环境配置)
3. [项目部署](#3-项目部署)
4. [常用运维命令](#4-常用运维命令)
5. [故障排查](#5-故障排查)

---

## 1. EC2 实例创建

### 1.1 选择实例类型

推荐使用 **Ubuntu Server 22.04 LTS (HVM)** 免费套餐实例：

| 配置项 | 推荐值 |
|--------|--------|
| AMI | Ubuntu Server 22.04 LTS (HVM), SSD Volume Type |
| 实例类型 | t3.micro (免费套餐) 或 t3.small |
| 存储 | 至少 30GB gp3 |
| 安全组 | 见下方配置 |

### 1.2 安全组配置

**在 AWS 控制台配置：**

1. EC2 → 实例 → 选择你的实例 → 安全 → 安全组 → 编辑入站规则

**需要的入站规则：**

| 类型 | 端口范围 | 来源 | 说明 |
|------|----------|------|------|
| SSH | 22 | 你的IP/32 | 远程连接（建议只允许你的IP） |
| HTTP | 80 | 0.0.0.0/0 | Web 访问 |
| HTTPS | 443 | 0.0.0.0/0 | HTTPS 访问 |
| 自定义 TCP | 13000 | 0.0.0.0/0 | 应用端口（必须！） |

**出站规则：** 保持默认（允许所有流量）

### 1.3 登录实例

```bash
# 下载密钥对后设置权限（必须！）
chmod 400 your-key.pem

# SSH 登录
ssh -i your-key.pem ubuntu@your-instance-ip      # Ubuntu
ssh -i your-key.pem ec2-user@your-instance-ip     # Amazon Linux
```

---

## 2. 基础环境配置

> **注意**：不同 Linux 发行版使用的包管理器不同：
> - **Ubuntu/Debian**: 使用 `apt`
> - **Amazon Linux/CentOS/RHEL**: 使用 `yum` 或 `dnf`

### 2.1 Ubuntu 系统更新

```bash
sudo apt update && sudo apt upgrade -y
```

### 2.2 Amazon Linux 系统更新

```bash
sudo yum update -y
```

### 2.3 安装基础依赖

**Ubuntu/Debian:**
```bash
sudo apt install -y \
    curl \
    wget \
    git \
    unzip \
    build-essential \
    python3 \
    python3-pip \
    ffmpeg
```

**Amazon Linux:**
```bash
sudo yum install -y \
    git \
    curl \
    wget \
    unzip \
    gcc \
    gcc-c++ \
    make \
    python3 \
    python3-pip

# 安装 ffmpeg (Amazon Linux Extras)
sudo amazon-linux-extras install epel -y
sudo yum install -y ffmpeg
```

### 2.4 安装 Docker

**Ubuntu/Debian:**
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
sudo systemctl enable docker
sudo systemctl start docker
```

**Amazon Linux:**
```bash
sudo yum install -y docker
sudo usermod -aG docker ec2-user
sudo systemctl enable docker
sudo systemctl start docker
```

**重新登录使组成员生效:**
```bash
exit
ssh -i your-key.pem ubuntu@your-instance-ip  # Ubuntu
# 或
ssh -i your-key.pem ec2-user@your-instance-ip  # Amazon Linux
```

### 2.5 安装 Docker Compose

```bash
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

sudo chmod +x /usr/local/bin/docker-compose

# 验证安装
docker-compose --version
```

### 2.5 安装 Node.js 18+

```bash
# 使用 nvm 安装 Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# 重新加载 shell 配置
source ~/.bashrc

# 安装 Node.js 20 LTS
nvm install 20
nvm use 20
nvm alias default 20

# 验证
node --version  # 应显示 v20.x.x
npm --version
```

---

## 3. 项目部署

### 3.1 克隆代码仓库

**Ubuntu:**
```bash
sudo mkdir -p /var/www
sudo chown ubuntu:ubuntu /var/www
cd /var/www
```

**Amazon Linux:**
```bash
sudo mkdir -p /var/www
sudo chown ec2-user:ec2-user /var/www
cd /var/www
```

```bash
# 克隆仓库
git clone https://github.com/DeloYong/waoowaoo.git
cd waoowaoo
```

### 3.2 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
nano .env
```

关键配置项说明：

```bash
# 数据库配置
DATABASE_URL="mysql://root:your_password@mysql:3306/waoowaoo"

# Redis 配置
REDIS_URL="redis://redis:6379"

# COS 存储配置（可选，使用本地存储）
STORAGE_PROVIDER="local"

# 应用 URL
NEXT_PUBLIC_APP_URL="http://your-domain-or-ip:13000"
INTERNAL_APP_URL="http://127.0.0.1:3000"

# 其他必要配置...
```

### 3.3 创建必要目录

```bash
# 创建 Docker 运行时目录
sudo mkdir -p /var/www/waoowaoo/.next
sudo mkdir -p /var/www/waoowaoo/.data

# 设置权限
sudo chown -R ubuntu:ubuntu /var/www/waoowaoo
```

### 3.4 部署脚本部署（推荐）

```bash
cd /var/www/waoowaoo

# 给脚本添加执行权限
chmod +x scripts/deploy-full.sh

# 运行完整部署脚本
bash scripts/deploy-full.sh
```

**脚本执行内容：**
1. 清理 Docker 无用资源
2. 拉取最新代码
3. 重建 Docker 镜像
4. 启动容器
5. 初始化套餐数据
6. 执行数据库迁移

### 3.5 手动部署（如脚本失败）

```bash
cd /var/www/waoowaoo

# 1. 给脚本添加执行权限
chmod +x scripts/deploy-full.sh

# 2. 停止现有容器
docker compose down

# 3. 删除旧镜像
docker rmi waoowaoo-app:latest 2>/dev/null || true

# 4. 构建新镜像（可能需要 5-10 分钟）
DOCKER_BUILDKIT=0 docker build --no-cache -t waoowaoo-app:latest .

# 5. 启动容器
docker compose up -d

# 6. 等待启动
sleep 30

# 7. 执行数据库迁移
docker exec waoowaoo-app npx prisma migrate deploy

# 8. 初始化套餐数据
docker exec waoowaoo-app npx tsx prisma/seed-plans.ts
```

### 3.6 验证部署

```bash
# 检查容器状态
docker compose ps

# 查看应用日志
docker compose logs -f app

# 访问应用（替换为你的 IP）
curl http://localhost:13000
```

---

## 4. 常用运维命令

### 4.1 容器管理

```bash
# 查看所有容器状态
docker compose ps

# 启动服务
docker compose up -d

# 停止服务
docker compose down

# 重启服务
docker compose restart

# 查看日志
docker compose logs -f
docker compose logs -f app    # 只看应用日志
docker compose logs -f worker   # 只看 Worker 日志
```

### 4.2 代码更新

```bash
cd /var/www/waoowaoo

# 拉取最新代码
git pull origin main  # 或你的分支

# 重建并重启
bash scripts/deploy-full.sh
```

### 4.3 数据库操作

```bash
# 进入 MySQL
docker exec -it waoowaoo-mysql mysql -uroot -pwaoowaoo123 waoowaoo

# 查看表
docker exec waoowaoo-mysql mysql -uroot -pwaoowaoo123 waoowaoo -e "SHOW TABLES;"

# 执行 Prisma 命令
docker exec waoowaoo-app npx prisma studio        # 打开 Prisma Studio
docker exec waoowaoo-app npx prisma db push       # 推送 schema
docker exec waoowaoo-app npx prisma migrate deploy # 执行迁移
```

### 4.4 日志查看

```bash
# 应用日志
docker compose logs -f app

# Worker 日志
docker compose logs -f worker

# 数据库日志
docker compose logs -f mysql

# 实时查看所有日志
docker compose logs -f
```

### 4.5 磁盘管理

```bash
# 查看磁盘使用
df -h

# 查看 Docker 磁盘使用
docker system df

# 清理未使用的 Docker 资源
docker system prune -af
```

---

## 5. 故障排查

### 5.1 容器启动失败

```bash
# 1. 查看详细日志
docker compose logs

# 2. 检查容器状态
docker ps -a

# 3. 检查端口占用
sudo netstat -tlnp | grep 13000
```

### 5.2 数据库连接失败

```bash
# 检查 MySQL 容器
docker compose logs mysql

# 测试数据库连接
docker exec waoowaoo-app nc -zv mysql 3306

# 重启 MySQL
docker compose restart mysql
```

### 5.3 Worker 不处理任务

```bash
# 检查 Worker 容器
docker compose logs worker

# 检查 Redis 连接
docker exec waoowaoo-app nc -zv redis 6379

# 检查任务队列
docker exec waoowaoo-app npx bullmq-cli lists
```

### 5.4 视频处理失败

视频处理依赖 ffmpeg，确保已安装：

```bash
# 检查 ffmpeg
ffmpeg -version

# 如果未安装
sudo apt install ffmpeg
```

### 5.5 重置所有数据

⚠️ **危险操作，会删除所有数据**

```bash
cd /var/www/waoowaoo

# 停止服务
docker compose down

# 删除所有数据卷
docker volume rm waoowaoo_mysql_data 2>/dev/null || true
docker volume rm waoowaoo_redis_data 2>/dev/null || true
docker volume rm waoowaoo_local_storage 2>/dev/null || true

# 重新启动
docker compose up -d

# 重新初始化
docker exec waoowaoo-app npx prisma migrate deploy
docker exec waoowaoo-app npx tsx prisma/seed-plans.ts
```

---

## 附录 A：docker-compose.yml 关键配置

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "13000:3000"
    environment:
      - DATABASE_URL=mysql://root:${MYSQL_ROOT_PASSWORD}@mysql:3306/waoowaoo
      - REDIS_URL=redis://redis:6379
      - STORAGE_PROVIDER=local
      - INTERNAL_APP_URL=http://127.0.0.1:3000
    depends_on:
      - mysql
      - redis
    volumes:
      - ./:/app
      - local_storage:/app/data/storage
      - /app/.next
    restart: unless-stopped

  worker:
    build: .
    command: node dist/worker-entry.js
    environment:
      - DATABASE_URL=mysql://root:${MYSQL_ROOT_PASSWORD}@mysql:3306/waoowaoo
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mysql
      - redis
    volumes:
      - ./:/app
      - local_storage:/app/data/storage
    restart: unless-stopped

  mysql:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
      - MYSQL_DATABASE=waoowaoo
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped

volumes:
  mysql_data:
  redis_data:
  local_storage:
```

---

## 附录 B：环境变量模板

```bash
# ===================
# 数据库
# ===================
DATABASE_URL="mysql://root:your_secure_password@mysql:3306/waoowaoo"
MYSQL_ROOT_PASSWORD="your_secure_password"

# ===================
# Redis
# ===================
REDIS_URL="redis://redis:6379"

# ===================
# 应用配置
# ===================
NODE_ENV="production"
NEXT_TELEMETRY_DISABLED="1"

# 内部 URL（Worker 访问用）
INTERNAL_APP_URL="http://127.0.0.1:3000"

# 公共 URL
NEXT_PUBLIC_APP_URL="http://your-domain-or-ip:13000"

# ===================
# 存储
# ===================
STORAGE_PROVIDER="local"  # 或 "cos" 使用腾讯云COS
# COS 配置（如果使用 COS）
# COS_SECRET_ID="your-secret-id"
# COS_SECRET_KEY="your-secret-key"
# COS_BUCKET="your-bucket"
# COS_REGION="ap-guangzhou"

# ===================
# AI API 配置
# ===================
# 你的 AI API 密钥...

# ===================
# 其他
# ===================
CRON_SECRET="your-cron-secret"
```

---

## 附录 C：设置 Cron 定时任务

```bash
# 编辑 crontab
crontab -e

# 添加每日统计任务（每日凌晨1点执行）
0 1 * * * curl -X POST http://127.0.0.1:13000/api/cron/generate-daily-stats -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## 附录 D：使用 PM2 替代 Docker 运行（可选）

如果不想使用 Docker，可以使用 PM2：

```bash
# 安装 PM2
npm install -g pm2

# 在项目目录
pm2 start npm --name "waoowaoo" -- start

# 保存 PM2 配置
pm2 save

# 设置开机自启
pm2 startup
```

**注意**：PM2 模式需要手动启动 MySQL 和 Redis 服务。
