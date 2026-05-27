/**
 * 修复现金计费（consume）的 amount 精度异常问题
 *
 * 历史数据中 amount 字段可能因以下原因异常：
 * 1. Decimal(18,6) 小数点被吞：7.938 → 7938000（放大 1,000,000 倍）
 * 2. Decimal 部分小数位被吞：7.938 → 7938（放大 1,000 倍）
 * 3. 旧代码 bug：把积分值直接存入了 amount（此时 amount 本身就是积分）
 *
 * 策略：
 * - 金额在合理范围（≤1000 元）内：正常元→积分转换（*100）
 * - 金额过大：依次尝试 /1,000,000 和 /1,000 还原，结果合理则再用
 * - 都无法还原：直接当作积分值返回（避免再 *100 导致二次放大）
 */
export function normalizeConsumeAmount(rawAmount: number): number {
  const absAmount = Math.abs(rawAmount)

  // 合理范围内的金额，正常元→积分转换
  if (absAmount <= 1000) {
    return Math.round(absAmount * 100)
  }

  // 尝试 /1,000,000 还原（Decimal 6位小数全部被吞的情况）
  const byMillion = absAmount / 1_000_000
  if (byMillion >= 0.01 && byMillion <= 1000) {
    return Math.round(byMillion * 100)
  }

  // 尝试 /1,000 还原（3位小数被吞的情况）
  const byThousand = absAmount / 1_000
  if (byThousand >= 0.01 && byThousand <= 1000) {
    return Math.round(byThousand * 100)
  }

  // 无法还原，大概率是积分值被直接存入了 amount，直接返回原始值
  return Math.round(absAmount)
}
