#!/bin/bash
# commit-msg hook - 验证 commit message 格式
# 位置: .husky/commit-msg

COMMIT_MSG=$(cat "$1")

# 检查是否为空
if [ -z "$COMMIT_MSG" ]; then
    echo "❌ Commit message is empty"
    exit 1
fi

# 检查是否符合 Conventional Commits 格式
# 格式: <type>(<scope>): <description>
if ! echo "$COMMIT_MSG" | grep -qE '^(feat|fix|refactor|chore|docs|test|perf|style|build|ci|revert)(\([a-z0-9-]+\))?: .+'; then
    echo "❌ Invalid commit message format"
    echo ""
    echo "Expected format: <type>(<scope>): <description>"
    echo ""
    echo "Valid types:"
    echo "  feat     - New feature"
    echo "  fix      - Bug fix"
    echo "  refactor - Code refactoring"
    echo "  chore    - Maintenance tasks"
    echo "  docs     - Documentation"
    echo "  test     - Tests"
    echo "  perf     - Performance"
    echo "  style    - Code style"
    echo "  build    - Build system"
    echo "  ci       - CI/CD"
    echo "  revert   - Revert changes"
    echo ""
    echo "Example: fix(voice): resolve async save issue"
    exit 1
fi

echo "✅ Commit message format is valid"
exit 0
