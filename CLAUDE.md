# Claude Code 项目规范

## 核心原则

1. **每次对话结束时**：确保所有修改已 commit + push
2. **Bug修复优先**：使用系统调试流程，不猜测根因
3. **构建验证**：修改后必须运行 `npm run build` 验证
4. **渐进式变更**：一次只做一件事，验证后再继续

---

## 一、代码提交规范

### 1.1 提交时机

**每次对话结束时**，必须执行以下操作：

```bash
# 1. 检查变更状态
git status

# 2. 添加相关文件（不添加敏感文件）
git add <changed-files>

# 3. 提交（遵循 Conventional Commits 规范）
git commit -m "<type>: <description>

<详细说明（如果有）>"

# 4. 推送到远程
git push
```

### 1.2 Commit Message 规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**类型 (type)**：
| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(voice): 添加AI智能设计音色功能` |
| `fix` | Bug修复 | `fix(voice): 修复弹窗关闭时保存不完整的问题` |
| `refactor` | 重构 | `refactor(assets): 提取TTS逻辑到独立hook` |
| `chore` | 辅助变更 | `chore: 更新依赖版本` |
| `docs` | 文档 | `docs: 更新API文档` |
| `test` | 测试 | `test: 添加音色选择单元测试` |
| `perf` | 性能 | `perf(api): 优化视频剪辑队列处理` |

**范围 (scope)**：使用功能模块名
- `voice` - 音色相关
- `assets` - 资产管理
- `video` - 视频剪辑
- `auth` - 认证授权
- `api` - API接口
- `ui` - 用户界面

### 1.3 自动提交的触发场景

**必须提交的情况**：
- 每次对话结束时
- 完成一个功能模块
- 完成一个 bug 修复
- 完成代码重构
- 添加或修改测试

**不需要提交的情况**：
- 仅做代码探索/研究
- 仅查看文件内容
- 调试性质的临时修改（应在验证后回退）

---

## 二、Bug修复规范

### 2.1 系统调试流程

遇到任何 bug，必须使用 `superpowers:systematic-debugging` 技能：

```
Phase 1: 根因调查
  ├── 仔细阅读错误信息
  ├── 可靠复现问题
  ├── 检查最近的变更
  └── 收集多组件系统的证据

Phase 2: 模式分析
  ├── 找到工作示例
  ├── 与参考实现对比
  └── 识别差异

Phase 3: 假设与测试
  ├── 形成单一假设
  ├── 最小化测试
  └── 验证后再继续

Phase 4: 实现
  ├── 创建失败测试用例
  ├── 实现单一修复
  └── 验证修复有效
```

### 2.2 关键原则

| 原则 | 说明 |
|------|------|
| **不猜测** | 必须找到根因才能修复 |
| **单次变更** | 一次只修复一个问题 |
| **验证后断言** | 测试通过后才声称完成 |

---

## 三、功能开发规范

### 3.1 开发前检查清单

- [ ] 理解需求和用户意图
- [ ] 了解现有代码结构
- [ ] 确定影响范围
- [ ] 准备测试方案

### 3.2 开发流程

```
1. 探索代码结构 → 理解现有实现
2. 设计方案 → 必要时使用 Plan 模式
3. 实现变更 → 渐进式，每次验证
4. 运行构建 → npm run build
5. 测试验证 → 手动或自动测试
6. 提交代码 → git add + commit + push
```

### 3.3 变更范围控制

- **越小越好**：只改必要的代码
- **不破坏现有功能**：确保相关功能不受影响
- **可逆性**：优先使用可逆的方案

---

## 四、代码质量规范

### 4.1 构建验证

**每次修改后必须运行**：

```bash
npm run build
```

构建失败时：
1. 修复编译错误
2. 重新运行构建
3. 确认通过后才能继续

### 4.2 代码检查

```bash
# 运行类型检查
npx tsc --noEmit

# 运行 lint
npm run lint
```

### 4.3 Git Hooks

项目已配置以下 hooks：

| Hook | 说明 |
|------|------|
| `commit-msg` | 验证 commit message 格式 |
| `pre-push` | 运行验证脚本 |

---

## 五、项目结构

```
waoowaoo/
├── src/
│   ├── app/                    # Next.js App Router
│   │   └── [locale]/          # 国际化路由
│   │       ├── workspace/      # 工作区
│   │       │   ├── asset-hub/  # 资产库
│   │       │   └── [projectId]/ # 项目空间
│   │       └── ...
│   ├── components/             # React 组件
│   │   ├── ui/                # 基础UI组件
│   │   ├── voice/             # 音色相关组件
│   │   └── ...
│   ├── lib/                   # 核心库
│   │   ├── query/             # React Query
│   │   ├── task/              # 任务系统
│   │   ├── workers/           # 后台Worker
│   │   └── ...
│   └── types/                 # TypeScript 类型
├── prisma/                    # 数据库模型
├── scripts/                   # 构建脚本
└── standards/                 # 标准规范
```

---

## 六、分支策略

### 6.1 分支命名

| 类型 | 命名格式 | 示例 |
|------|----------|------|
| 功能 | `feature/<描述>` | `feature/voice-design-v2` |
| Bug修复 | `fix/<描述>` | `fix/voice-dialog-save` |
| 发布 | `release/<版本>` | `release/v1.0.0` |

### 6.2 当前分支

- **主要开发分支**: `main`
- **功能分支**: `feature/saas-credits` (当前)

---

## 七、常用命令

```bash
# 开发
npm run dev              # 启动开发服务器（全部）
npm run dev:turbo        # 快速开发模式

# 构建
npm run build            # 生产构建
npm run build:turbo      # Turbopack 构建

# 代码检查
npm run check:api-handler  # API Handler 契约检查
npm run check:logs         # 日志检查

# 数据库
npx prisma studio         # 打开 Prisma Studio
npx prisma db push        # 推送 schema 到数据库

# Git
git status                # 查看变更
git log --oneline -10    # 最近10条提交
```

---

## 八、调试技巧

### 8.1 前端调试

```typescript
// 添加临时日志
console.log('[DEBUG]', { variable: value })

// 使用 React DevTools
// 浏览器安装 React Developer Tools 扩展
```

### 8.2 API 调试

```bash
# 查看最近的日志
tail -f logs/app.log

# 检查任务状态
npm run stats:errors
```

---

## 九、联系与支持

- **项目文档**: README.md
- **任务报告**: TASK_COMPLETION_REPORT.md
- **已完成任务**: 任务完成.md
