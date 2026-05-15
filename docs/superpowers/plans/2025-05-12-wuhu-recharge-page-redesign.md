# Wuhu Recharge Page Brand Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the recharge page from old glass style to new Wuhu neon cyberpunk cute brand style, integrating mascot, neon effects, and brand colors.

**Architecture:** Phased implementation starting with global CSS enhancements, then component replacements in the page, followed by mascot integration and animation polish. Each phase is independently testable.

**Tech Stack:** Next.js 15, Tailwind CSS, TypeScript, CSS Variables, React Hooks

---

## Phase 1: Global CSS Enhancements

### Task 1.1: Add Recharge-Specific CSS Utility Classes

**Files:**
- Modify: `src/app/globals.css` (append to end of Wuhu animations section)

- [ ] **Step 1: Add new CSS classes for recharge page**

```css
/* ========================================
   Wuhu Recharge Page Specific Styles
   ======================================== */

/* Neon number display for balance and price */
.wuhu-neon-number {
  background: var(--wuhu-gradient-text);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 20px rgba(167, 87, 255, 0.5);
}

/* Popular tag glow effect */
.wuhu-tag-popular {
  background: linear-gradient(135deg, #f97316, #ef4444);
  box-shadow: 0 0 15px rgba(249, 115, 22, 0.5);
}

/* Selected package pulse animation */
.wuhu-package-selected {
  animation: wuhu-neon-pulse 2s ease-in-out infinite;
}

/* Dark page background for recharge */
.wuhu-page-bg {
  background: linear-gradient(
    135deg,
    oklch(0.12 0.05 280) 0%,
    oklch(0.15 0.04 290) 50%,
    oklch(0.13 0.05 300) 100%
  );
}

/* Glow border for payment method selection */
.wuhu-payment-alipay {
  border-color: #3b82f6 !important;
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
  background: rgba(59, 130, 246, 0.1) !important;
}

.wuhu-payment-wechat {
  border-color: #22c55e !important;
  box-shadow: 0 0 20px rgba(34, 197, 94, 0.4);
  background: rgba(34, 197, 94, 0.1) !important;
}
```

- [ ] **Step 2: Build verification**

Run: `npm run build`
Expected: Build completes successfully with no CSS errors

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(theme): add recharge page specific css utility classes"
```

---

## Phase 2: Page Component Structure Upgrade

### Task 2.1: Add Wuhu Imports and Page Background

**Files:**
- Modify: `src/app/[locale]/recharge/page.tsx:1-10`

- [ ] **Step 1: Update imports section**

Replace lines 1-10 with:

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from '@/i18n/navigation'
import Navbar from '@/components/Navbar'
import { AppIcon } from '@/components/ui/icons'
import { toast } from 'react-hot-toast'
import WuhuMascot from '@/components/WuhuMascot'
import { WuhuCard } from '@/components/ui/wuhu-card'
import { WuhuButton } from '@/components/ui/wuhu-button'
import WuhuEmptyState from '@/components/WuhuEmptyState'
```

- [ ] **Step 2: Update page root div class (around line 194-195)**

Find the main div with `className="glass-page min-h-screen"` and replace with:

```tsx
<div className="wuhu-page-bg min-h-screen">
```

- [ ] **Step 3: Build verification**

Run: `npm run build`
Expected: Build completes successfully with no import errors

- [ ] **Step 4: Commit**

```bash
git add src/app/[locale]/recharge/page.tsx
git commit -m "feat(recharge): add wuhu component imports and page background"
```

---

### Task 2.2: Redesign Top Welcome Section with Mascot

**Files:**
- Modify: `src/app/[locale]/recharge/page.tsx:198-237`

- [ ] **Step 1: Replace balance card section (lines 211-237)**

Replace the balance card div (inside the left column, after the h1/p header) with:

```tsx
            {/* 欢迎区域 - 带吉祥物 */}
            <WuhuCard glow="purple" className="mb-8 overflow-hidden">
              <div className="flex items-center gap-6 p-2">
                {/* 吉祥物 */}
                <div className="flex-shrink-0">
                  <WuhuMascot expression="happy" size="md" animated={true} />
                </div>

                {/* 余额信息 */}
                <div className="flex-1">
                  <div className="text-lg font-bold text-white mb-1">
                    芜湖起飞！🚀
                  </div>
                  <div className="text-sm text-white/60 mb-3">
                    当前可用积分
                  </div>
                  <div className="text-5xl font-black wuhu-neon-number mb-4">
                    {balance.subscriptionCredits + balance.permanentCredits - balance.frozenCredits}
                  </div>
                  <div className="flex gap-6">
                    <div className="text-sm">
                      <span className="text-white/60">套餐积分：</span>
                      <span className="font-medium text-white">{balance.subscriptionCredits}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-white/60">永久积分：</span>
                      <span className="font-medium text-white">{balance.permanentCredits}</span>
                    </div>
                  </div>
                </div>

                {/* 查看明细按钮 */}
                <button
                  onClick={() => router.push({ pathname: '/profile' })}
                  className="flex-shrink-0 px-5 py-2.5 rounded-xl border border-white/20 text-white/80 hover:text-white hover:border-white/40 transition-all text-sm font-medium"
                >
                  查看明细
                </button>
              </div>
            </WuhuCard>
```

- [ ] **Step 2: Update section header text colors (lines 202-208)**

Update the h1 and p tags for better contrast on dark background:

```tsx
              <h1 className="text-3xl font-bold text-white mb-2">
                积分充值
              </h1>
              <p className="text-white/60">
                选择适合您的充值套餐，立即获得积分用于AI创作
              </p>
```

- [ ] **Step 3: Build verification**

Run: `npm run build`
Expected: Success

- [ ] **Step 4: Commit**

```bash
git add src/app/[locale]/recharge/page.tsx
git commit -m "feat(recharge): redesign top welcome section with wuhu mascot"
```

---

### Task 2.3: Upgrade Package Cards to Wuhu Neon Style

**Files:**
- Modify: `src/app/[locale]/recharge/page.tsx:239-310`

- [ ] **Step 1: Replace package cards grid (lines 250-309)**

Find the `packages.map` section and replace with:

```tsx
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedPackage(pkg)}
                      className={`relative cursor-pointer transition-all duration-300 ${selectedPackage?.id === pkg.id ? 'scale-[1.02]' : 'hover:scale-[1.01]'}`}
                    >
                      <WuhuCard
                        glow={selectedPackage?.id === pkg.id ? 'pink' : 'purple'}
                        className={`p-6 h-full ${selectedPackage?.id === pkg.id ? 'wuhu-package-selected' : ''}`}
                      >
                        {pkg.isPopular && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                            <span className="wuhu-tag-popular text-white text-xs font-bold px-3 py-1 rounded-full">
                              🔥 热门推荐
                            </span>
                          </div>
                        )}

                        <div className="text-center">
                          <h3 className="text-lg font-bold text-white mb-2">
                            {pkg.name}
                          </h3>

                          <div className="mb-4">
                            <span className="text-4xl font-black wuhu-neon-number">¥{pkg.price.toFixed(2)}</span>
                            {pkg.originalPrice && (
                              <span className="text-sm text-white/40 line-through ml-2">
                                ¥{pkg.originalPrice.toFixed(2)}
                              </span>
                            )}
                          </div>

                          <div className="space-y-2 text-sm mb-6">
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-white/60">基础积分：</span>
                              <span className="font-medium text-white">{pkg.credits}</span>
                            </div>
                            {pkg.bonusCredits > 0 && (
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-orange-400 font-medium">🎁 赠送积分：</span>
                                <span className="font-bold text-orange-400">+{pkg.bonusCredits}</span>
                              </div>
                            )}
                            <div className="pt-2 border-t border-white/10">
                              <span className="text-lg font-bold text-white">
                                总共 {pkg.totalCredits} 积分
                              </span>
                            </div>
                          </div>

                          {pkg.discount && (
                            <div className="inline-block bg-purple-500/30 text-purple-300 text-xs font-medium px-2 py-1 rounded border border-purple-500/30">
                              {pkg.discount}折优惠
                            </div>
                          )}
                        </div>
                      </WuhuCard>
                    </div>
                  ))}
                </div>
```

- [ ] **Step 2: Update loading and empty states (lines 240-248)**

Update loading and empty states for better contrast:

```tsx
            {/* 套餐列表 */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-white/60">加载中...</div>
              </div>
            ) : packages.length === 0 ? (
              <WuhuEmptyState
                title="暂无可用充值套餐"
                expression="thinking"
              />
            ) : (
```

- [ ] **Step 3: Build verification**

Run: `npm run build`
Expected: Success

- [ ] **Step 4: Commit**

```bash
git add src/app/[locale]/recharge/page.tsx
git commit -m "feat(recharge): upgrade package cards to wuhu neon style"
```

---

### Task 2.4: Upgrade Payment Method Selection and Summary

**Files:**
- Modify: `src/app/[locale]/recharge/page.tsx:312-383`

- [ ] **Step 1: Replace payment method section (lines 313-383)**

Replace the selected package section with:

```tsx
            {/* 支付方式选择 */}
            {selectedPackage && (
              <WuhuCard glow="cyan" className="p-6 mt-8">
                <h3 className="text-lg font-bold text-white mb-4">
                  选择支付方式
                </h3>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button
                    onClick={() => setPaymentMethod('alipay')}
                    className={`p-4 rounded-xl border-2 border-white/20 transition-all ${paymentMethod === 'alipay' ? 'wuhu-payment-alipay' : 'hover:border-white/40'}`}
                  >
                    <div className="flex items-center justify-center gap-3">
                      <AppIcon name="coins" className="w-8 h-8 text-blue-400" />
                      <div className="text-left">
                        <div className="font-semibold text-white">支付宝</div>
                        <div className="text-xs text-white/60">推荐使用</div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('wechat')}
                    className={`p-4 rounded-xl border-2 border-white/20 transition-all ${paymentMethod === 'wechat' ? 'wuhu-payment-wechat' : 'hover:border-white/40'}`}
                  >
                    <div className="flex items-center justify-center gap-3">
                      <AppIcon name="coins" className="w-8 h-8 text-green-400" />
                      <div className="text-left">
                        <div className="font-semibold text-white">微信支付</div>
                        <div className="text-xs text-white/60">便捷安全</div>
                      </div>
                    </div>
                  </button>
                </div>

                {/* 订单摘要 */}
                <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white/60">充值套餐</span>
                    <span className="font-medium text-white">{selectedPackage.name}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white/60">获得积分</span>
                    <span className="font-bold text-white">{selectedPackage.totalCredits} 积分</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-white/10">
                    <span className="text-white/60">应付金额</span>
                    <span className="text-3xl font-black wuhu-neon-number">¥{selectedPackage.price.toFixed(2)}</span>
                  </div>
                </div>

                <WuhuButton
                  variant="gradient"
                  glow={true}
                  onClick={handleRecharge}
                  disabled={submitting}
                  className="w-full py-4 text-lg font-bold"
                >
                  {submitting ? '创建订单中...' : '芜湖，立即起飞！🚀'}
                </WuhuButton>

                <p className="text-center text-xs text-white/40 mt-4">
                  支付成功后积分将自动发放到您的账户
                </p>
              </WuhuCard>
            )}
```

- [ ] **Step 2: Build verification**

Run: `npm run build`
Expected: Success

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/recharge/page.tsx
git commit -m "feat(recharge): upgrade payment method selection and order summary"
```

---

### Task 2.5: Upgrade Order History Sidebar

**Files:**
- Modify: `src/app/[locale]/recharge/page.tsx:385-442`

- [ ] **Step 1: Replace sidebar order history (lines 387-441)**

Replace the right sidebar div with:

```tsx
          {/* 右侧 - 订单记录 */}
          <div className="w-80 flex-shrink-0">
            <WuhuCard glow="purple" className="p-6 sticky top-8">
              <h3 className="text-lg font-bold text-white mb-4">
                最近充值记录
              </h3>

              {recentOrders.length === 0 ? (
                <div className="py-8">
                  <WuhuEmptyState
                    title="暂无充值记录"
                    description="完成首次充值后记录将显示在这里"
                    expression="thinking"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {recentOrders.map((order) => {
                    const statusInfo = getStatusText(order.status)
                    return (
                      <div
                        key={order.orderId}
                        className="bg-white/5 rounded-xl p-4 border border-white/10"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-medium text-white">
                              {order.credits} 积分
                            </div>
                            <div className="text-xs text-white/40">
                              {order.orderNo}
                            </div>
                          </div>
                          <div className={`text-xs font-medium ${statusInfo.color.replace('text-', 'text-').replace('gray', 'white/60')}`}>
                            {statusInfo.text}
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-white/60">
                            {getPaymentMethodText(order.paymentMethod)}
                          </span>
                          <span className="font-bold text-white">
                            ¥{order.amount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <button
                onClick={() => router.push({ pathname: '/profile' })}
                className="w-full mt-6 py-3 rounded-xl border border-white/20 text-white/80 hover:text-white hover:border-white/40 transition-all text-sm font-medium"
              >
                查看全部记录
              </button>
            </WuhuCard>
          </div>
```

- [ ] **Step 2: Update status color map (around lines 166-175)**

Update the getStatusText function to use Wuhu brand colors:

```tsx
  // 获取状态显示文本
  const getStatusText = (status: string) => {
    const statusMap: Record<string, { text: string; color: string }> = {
      pending: { text: '待支付', color: 'text-yellow-400' },
      paid: { text: '支付成功', color: 'text-green-400' },
      failed: { text: '支付失败', color: 'text-red-400' },
      cancelled: { text: '已取消', color: 'text-white/50' },
      expired: { text: '已过期', color: 'text-white/50' },
    }
    return statusMap[status] || { text: status, color: 'text-white/50' }
  }
```

- [ ] **Step 3: Build verification**

Run: `npm run build`
Expected: Success

- [ ] **Step 4: Commit**

```bash
git add src/app/[locale]/recharge/page.tsx
git commit -m "feat(recharge): upgrade order history sidebar with wuhu style"
```

---

## Phase 3: Animation & Polish

### Task 3.1: Add Payment Success Celebration Animation

**Files:**
- Modify: `src/app/[locale]/recharge/page.tsx:88-163`

- [ ] **Step 1: Add state for success animation (after line 46)**

Add a new state variable:

```tsx
  const [showSuccess, setShowSuccess] = useState(false)
```

- [ ] **Step 2: Update handleRecharge success handling (around line 127)**

In the messageHandler function (line 126-131):

```tsx
        // 监听支付完成消息
        const messageHandler = (event: MessageEvent) => {
          if (event.data?.type === 'payment_success') {
            setShowSuccess(true)
            toast.success('支付成功！积分已发放')
            loadData() // 刷新余额和订单列表
            window.removeEventListener('message', messageHandler)
            setTimeout(() => setShowSuccess(false), 3000)
          }
        }
```

Also update the poll interval success case (around line 142):

```tsx
              if (orderData.status === 'paid') {
                setShowSuccess(true)
                toast.success('支付成功！积分已发放')
                loadData()
                clearInterval(pollInterval)
                if (paymentWindow && !paymentWindow.closed) {
                  paymentWindow.close()
                }
                setTimeout(() => setShowSuccess(false), 3000)
              }
```

- [ ] **Step 3: Add success celebration overlay (at end of main div, before closing tag)**

Add before the final closing `</main>` tag:

```tsx
        {/* 支付成功庆祝动画 */}
        {showSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="text-center animate-bounce">
              <div className="mb-4">
                <WuhuMascot expression="surprised" size="xl" animated={true} />
              </div>
              <div className="text-4xl font-black wuhu-neon-number animate-pulse">
                支付成功！🎉
              </div>
              <div className="text-xl text-white/80 mt-2">
                积分已发放到您的账户
              </div>
            </div>
            {/* 彩虹光效背景 */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-cyan-500/20 animate-pulse" />
          </div>
        )}
```

- [ ] **Step 4: Build verification**

Run: `npm run build`
Expected: Success

- [ ] **Step 5: Commit**

```bash
git add src/app/[locale]/recharge/page.tsx
git commit -m "feat(recharge): add payment success celebration animation with mascot"
```

---

## Phase 4: Final Verification

### Task 4.1: Full Build and Visual Verification

**Files:**
- Entire project

- [ ] **Step 1: Full build test**

Run: `npm run build`
Expected: Build completes successfully with no errors

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: 0 type errors

- [ ] **Step 3: Manual visual checklist**
  - [ ] Navigate to `/recharge` page
  - [ ] Page background shows dark neon gradient
  - [ ] Wuhu mascot displays correctly in welcome section
  - [ ] Balance number shows neon gradient text
  - [ ] Package cards show purple glow, selected shows pink glow + pulse
  - [ ] Popular tag has orange gradient + glow
  - [ ] Payment methods show colored glow when selected
  - [ ] Pay button shows gradient + hover glow
  - [ ] Order history cards have proper styling
  - [ ] All text has proper contrast on dark background

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat(recharge): complete wuhu brand style redesign for recharge page"
git push
```

---

## Acceptance Criteria

- [ ] All Wuhu CSS classes are added and functional
- [ ] Page uses dark neon gradient background
- [ ] Welcome section includes animated Wuhu mascot
- [ ] Balance and price numbers show neon gradient effect
- [ ] Package cards use WuhuCard with glow effects
- [ ] Payment methods have colored glow when selected
- [ ] Pay button uses WuhuButton gradient style
- [ ] Order history sidebar uses WuhuCard style
- [ ] Payment success shows mascot celebration animation
- [ ] Build passes with no errors
- [ ] All text has proper contrast for readability
