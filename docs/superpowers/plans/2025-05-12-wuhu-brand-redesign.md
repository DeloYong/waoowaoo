# Wuhu Brand Theme Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete brand identity migration from "waoowaoo" to "wuhu" with neon cyberpunk cute aesthetic, including color system, logo, mascot character, and UI component restyling.

**Architecture:** Phased implementation starting with core design tokens (non-breaking), then component updates, then mascot integration, then final polish. Each phase produces working software that can be deployed independently.

**Tech Stack:** Next.js 15, Tailwind CSS v4, React 19, TypeScript, CSS Variables

---

## Phase 1: Core Design Tokens & Color System

### Task 1.1: Add Wuhu CSS Color Variables

**Files:**
- Modify: `src/app/globals.css:1-100`

- [ ] **Step 1: Add wuhu color system to globals.css**

Insert after line 1 (after `@import "tailwindcss";`):

```css
/* ========================================
   Wuhu Brand Color System
   ======================================== */

:root {
  /* Wuhu Neon Core Colors */
  --wuhu-neon-purple: oklch(0.65 0.28 290);
  --wuhu-neon-pink: oklch(0.7 0.32 350);
  --wuhu-neon-cyan: oklch(0.75 0.25 180);
  --wuhu-neon-orange: oklch(0.72 0.26 55);
  
  /* Wuhu Background System */
  --wuhu-bg-dark: oklch(0.15 0.05 280);
  --wuhu-bg-surface: oklch(0.2 0.05 280);
  --wuhu-bg-card: oklch(0.22 0.04 280);
  
  /* Wuhu Gradients */
  --wuhu-gradient-primary: linear-gradient(135deg, var(--wuhu-neon-purple), var(--wuhu-neon-pink), var(--wuhu-neon-cyan));
  --wuhu-gradient-btn: linear-gradient(135deg, var(--wuhu-neon-purple), var(--wuhu-neon-pink));
  --wuhu-gradient-text: linear-gradient(90deg, var(--wuhu-neon-cyan), var(--wuhu-neon-purple), var(--wuhu-neon-pink));
}

/* Wuhu Theme Mode */
.wuhu-theme {
  --background: var(--wuhu-bg-dark);
  --foreground: oklch(0.98 0 0);
  --card: var(--wuhu-bg-card);
  --card-foreground: oklch(0.98 0 0);
  --primary: var(--wuhu-neon-purple);
  --primary-foreground: oklch(0.98 0 0);
  --border: rgba(167, 87, 255, 0.3);
  --input: rgba(167, 87, 255, 0.2);
  --ring: var(--wuhu-neon-purple);
}
```

- [ ] **Step 2: Add Tailwind theme extensions for wuhu colors**

Add to `@theme inline` block (after line 68):

```css
  /* Wuhu Brand Colors */
  --color-wuhu-purple: var(--wuhu-neon-purple);
  --color-wuhu-pink: var(--wuhu-neon-pink);
  --color-wuhu-cyan: var(--wuhu-neon-cyan);
  --color-wuhu-orange: var(--wuhu-neon-orange);
  --color-wuhu-bg-dark: var(--wuhu-bg-dark);
  --color-wuhu-bg-surface: var(--wuhu-bg-surface);
```

- [ ] **Step 3: Verify build compiles without errors**

Run: `npm run build`
Expected: Build completes successfully with 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(theme): add wuhu brand color system and css variables"
```

---

### Task 1.2: Create Neon Glow Utility Classes

**Files:**
- Modify: `src/app/globals.css:100-200`

- [ ] **Step 1: Add neon glow utilities**

Add after the `:root` block:

```css
/* ========================================
   Wuhu Neon Glow Effects
   ======================================== */

/* Neon Border Glow */
.wuhu-glow-purple {
  box-shadow: 
    0 0 10px var(--wuhu-neon-purple),
    0 0 20px rgba(167, 87, 255, 0.3),
    inset 0 0 10px rgba(167, 87, 255, 0.1);
}

.wuhu-glow-pink {
  box-shadow: 
    0 0 10px var(--wuhu-neon-pink),
    0 0 20px rgba(255, 100, 200, 0.3),
    inset 0 0 10px rgba(255, 100, 200, 0.1);
}

.wuhu-glow-cyan {
  box-shadow: 
    0 0 10px var(--wuhu-neon-cyan),
    0 0 20px rgba(100, 255, 255, 0.3),
    inset 0 0 10px rgba(100, 255, 255, 0.1);
}

/* Hover Glow Enhancement */
.wuhu-glow-hover:hover {
  box-shadow: 
    0 0 20px var(--wuhu-neon-pink),
    0 0 40px rgba(255, 100, 200, 0.3),
    inset 0 0 15px rgba(167, 87, 255, 0.2);
}

/* Text Gradient */
.wuhu-text-gradient {
  background: var(--wuhu-gradient-text);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}
```

- [ ] **Step 2: Run build to verify**

Run: `npm run build`
Expected: Success

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(theme): add neon glow utility classes and text gradient"
```

---

### Task 1.3: Add Wuhu Animation Keyframes

**Files:**
- Modify: `src/app/globals.css` (append to end of file)

- [ ] **Step 1: Add wuhu animations**

```css
/* ========================================
   Wuhu Brand Animations
   ======================================== */

/* Neon Breathing Pulse */
@keyframes wuhu-neon-pulse {
  0%, 100% { 
    box-shadow: 
      0 0 10px var(--wuhu-neon-purple),
      0 0 20px rgba(167, 87, 255, 0.5);
  }
  50% { 
    box-shadow: 
      0 0 20px var(--wuhu-neon-pink),
      0 0 40px rgba(255, 100, 200, 0.3);
  }
}

.wuhu-animate-pulse {
  animation: wuhu-neon-pulse 2s ease-in-out infinite;
}

/* Floating Animation for Mascot */
@keyframes wuhu-float {
  0%, 100% { transform: translateY(0) rotate(-2deg); }
  50% { transform: translateY(-10px) rotate(2deg); }
}

.wuhu-animate-float {
  animation: wuhu-float 3s ease-in-out infinite;
}

/* Rainbow Border Glow */
@keyframes wuhu-rainbow-glow {
  0% { box-shadow: 0 0 15px var(--wuhu-neon-purple); }
  33% { box-shadow: 0 0 15px var(--wuhu-neon-pink); }
  66% { box-shadow: 0 0 15px var(--wuhu-neon-cyan); }
  100% { box-shadow: 0 0 15px var(--wuhu-neon-purple); }
}

.wuhu-animate-rainbow {
  animation: wuhu-rainbow-glow 4s linear infinite;
}
```

- [ ] **Step 2: Build verification**

Run: `npm run build`
Expected: Success

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(theme): add wuhu brand animation keyframes"
```

---

## Phase 2: Logo & Brand Assets

### Task 2.1: Create Wuhu Text Logo Component

**Files:**
- Create: `src/components/WuhuLogo.tsx`

- [ ] **Step 1: Create WuhuLogo component**

```tsx
'use client'

import { useEffect, useState } from 'react'

interface WuhuLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  animated?: boolean
}

export default function WuhuLogo({ size = 'md', animated = true }: WuhuLogoProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-3xl',
    lg: 'text-5xl',
    xl: 'text-7xl'
  }

  return (
    <div 
      className={`
        font-black tracking-tight select-none
        ${sizeClasses[size]}
        ${animated ? 'transition-all duration-300' : ''}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span 
        className={`
          wuhu-text-gradient
          ${animated && isHovered ? 'wuhu-animate-rainbow' : ''}
        `}
        style={{
          textShadow: animated && isHovered 
            ? '0 0 20px rgba(167, 87, 255, 0.8), 0 0 40px rgba(255, 100, 200, 0.5)'
            : '0 0 10px rgba(167, 87, 255, 0.5)'
        }}
      >
        wuhu
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit src/components/WuhuLogo.tsx`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/WuhuLogo.tsx
git commit -m "feat(brand): add wuhu text logo component with gradient and hover effects"
```

---

### Task 2.2: Update Navbar with New Branding

**Files:**
- Modify: `src/components/Navbar.tsx:1-150`

- [ ] **Step 1: Update imports**

Replace line 8 (`import { AppIcon }...`) with:

```tsx
import { AppIcon } from '@/components/ui/icons'
import WuhuLogo from './WuhuLogo'
```

- [ ] **Step 2: Replace logo in JSX (line 92-101)**

Replace the Image logo component:

```tsx
<div className="flex items-center gap-2">
  <Link href={session ? buildAuthenticatedHomeTarget() : { pathname: '/' }} className="group">
    <WuhuLogo size="md" animated={true} />
  </Link>
```

- [ ] **Step 3: Update app name references in translations**

Search for any hardcoded "waoowaoo" strings and update to "wuhu" in this file. Check line 114 for beta version text.

- [ ] **Step 4: Build verification**

Run: `npm run build`
Expected: Success

- [ ] **Step 5: Commit**

```bash
git add src/components/Navbar.tsx
git commit -m "feat(brand): update navbar with wuhu logo component"
```

---

### Task 2.3: Create Placeholder Mascot SVG (Wuhu the Little Monster)

**Files:**
- Create: `src/components/WuhuMascot.tsx`

- [ ] **Step 1: Create mascot SVG component**

```tsx
'use client'

import { useState } from 'react'

interface WuhuMascotProps {
  expression?: 'default' | 'happy' | 'thinking' | 'surprised' | 'working'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  animated?: boolean
}

const expressions = {
  default: { leftEye: '○', rightEye: '◉', mouth: 'ᴗ' },
  happy: { leftEye: '◠', rightEye: '◠', mouth: '▽' },
  thinking: { leftEye: '◑', rightEye: '◐', mouth: '～' },
  surprised: { leftEye: '◎', rightEye: '◎', mouth: 'O' },
  working: { leftEye: '✧', rightEye: '✧', mouth: 'ω' }
}

export default function WuhuMascot({ 
  expression = 'default', 
  size = 'md',
  animated = true 
}: WuhuMascotProps) {
  const [isHovered, setIsHovered] = useState(false)
  const expr = expressions[expression]
  
  const sizeMap = {
    sm: { w: 60, h: 60, fontSize: '12px' },
    md: { w: 100, h: 100, fontSize: '18px' },
    lg: { w: 160, h: 160, fontSize: '28px' },
    xl: { w: 240, h: 240, fontSize: '42px' }
  }

  const { w, h, fontSize } = sizeMap[size]

  return (
    <div 
      className={`relative ${animated ? 'wuhu-animate-float' : ''}`}
      style={{ width: w, height: h }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <svg width={w} height={h} viewBox="0 0 100 100">
        {/* Body glow */}
        <defs>
          <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.65 0.28 290)" />
            <stop offset="50%" stopColor="oklch(0.7 0.32 350)" />
            <stop offset="100%" stopColor="oklch(0.75 0.25 180)" />
          </linearGradient>
        </defs>
        
        {/* Body - round monster shape */}
        <ellipse 
          cx="50" cy="55" rx="35" ry="32" 
          fill="url(#bodyGradient)"
          filter="url(#neonGlow)"
          style={{ transform: isHovered ? 'scale(1.05)' : 'scale(1)', transformOrigin: 'center', transition: 'transform 0.3s ease' }}
        />
        
        {/* Little horns */}
        <path d="M30 28 L25 15 L35 25 Z" fill="oklch(0.65 0.28 290)" filter="url(#neonGlow)" />
        <path d="M70 28 L75 15 L65 25 Z" fill="oklch(0.65 0.28 290)" filter="url(#neonGlow)" />
        
        {/* Eyes and mouth are placed via text overlay for simplicity */}
      </svg>
      
      {/* Face overlay */}
      <div 
        className="absolute inset-0 flex flex-col items-center justify-center text-white font-bold"
        style={{ 
          fontSize,
          textShadow: '0 0 10px rgba(255,255,255,0.8)',
          paddingTop: size === 'sm' ? '4px' : '8px'
        }}
      >
        <div className="flex gap-2">
          <span>{expr.leftEye}</span>
          <span>{expr.rightEye}</span>
        </div>
        <div style={{ marginTop: '-2px' }}>{expr.mouth}</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit src/components/WuhuMascot.tsx`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/WuhuMascot.tsx
git commit -m "feat(brand): add wuhu mascot component with multiple expressions"
```

---

## Phase 3: UI Component Restyling

### Task 3.1: Create Neon Button Styles

**Files:**
- Create: `src/components/ui/wuhu-button.tsx`

- [ ] **Step 1: Create Wuhu styled button**

```tsx
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface WuhuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'gradient'
  glow?: boolean
  children: React.ReactNode
}

export function WuhuButton({ 
  variant = 'primary', 
  glow = true,
  className,
  children,
  ...props 
}: WuhuButtonProps) {
  const baseStyles = "transition-all duration-300 font-medium"
  
  const variants = {
    primary: "bg-[var(--wuhu-neon-purple)] text-white hover:brightness-110",
    secondary: "border-2 border-[var(--wuhu-neon-purple)] text-[var(--wuhu-neon-purple)] bg-transparent hover:bg-[var(--wuhu-neon-purple)] hover:text-white",
    ghost: "text-[var(--wuhu-neon-purple)] hover:bg-[var(--wuhu-neon-purple)] hover:text-white",
    gradient: "bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white hover:brightness-110"
  }

  return (
    <Button
      className={cn(
        baseStyles,
        variants[variant],
        glow && variant !== 'ghost' && "wuhu-glow-purple wuhu-glow-hover",
        className
      )}
      {...props}
    >
      {children}
    </Button>
  )
}
```

- [ ] **Step 2: Build verification**

Run: `npm run build`
Expected: Success

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/wuhu-button.tsx
git commit -m "feat(ui): add wuhu neon styled button component"
```

---

### Task 3.2: Create Wuhu Styled Card Component

**Files:**
- Create: `src/components/ui/wuhu-card.tsx`

- [ ] **Step 1: Create neon card component**

```tsx
import { cn } from '@/lib/utils'

interface WuhuCardProps {
  className?: string
  children: React.ReactNode
  glow?: 'purple' | 'pink' | 'cyan' | 'none'
  hoverable?: boolean
}

export function WuhuCard({ 
  className, 
  children, 
  glow = 'purple',
  hoverable = true
}: WuhuCardProps) {
  const glowClasses = {
    purple: 'wuhu-glow-purple',
    pink: 'wuhu-glow-pink',
    cyan: 'wuhu-glow-cyan',
    none: ''
  }

  return (
    <div 
      className={cn(
        "bg-[var(--wuhu-bg-card)] rounded-xl border border-[var(--wuhu-neon-purple)]/30 p-6",
        "transition-all duration-300",
        glow !== 'none' && glowClasses[glow],
        hoverable && "hover:scale-[1.02] hover:shadow-lg",
        className
      )}
    >
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Build verification**

Run: `npm run build`
Expected: Success

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/wuhu-card.tsx
git commit -m "feat(ui): add wuhu neon card component with glow options"
```

---

## Phase 4: Mascot Integration & Empty States

### Task 4.1: Create Empty State Component with Mascot

**Files:**
- Create: `src/components/WuhuEmptyState.tsx`

- [ ] **Step 1: Create empty state component**

```tsx
import WuhuMascot from './WuhuMascot'

interface WuhuEmptyStateProps {
  title: string
  description?: string
  action?: React.ReactNode
  expression?: 'default' | 'happy' | 'thinking' | 'surprised' | 'working'
}

export default function WuhuEmptyState({ 
  title, 
  description, 
  action,
  expression = 'thinking'
}: WuhuEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <WuhuMascot expression={expression} size="lg" animated={true} />
      
      <h3 className="mt-6 text-xl font-bold wuhu-text-gradient">
        {title}
      </h3>
      
      {description && (
        <p className="mt-2 text-[var(--glass-text-secondary)] max-w-md">
          {description}
        </p>
      )}
      
      {action && (
        <div className="mt-6">
          {action}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit src/components/WuhuEmptyState.tsx`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/WuhuEmptyState.tsx
git commit -m "feat(ui): add empty state component with wuhu mascot"
```

---

### Task 4.2: Create Loading Spinner with Mascot

**Files:**
- Create: `src/components/WuhuLoading.tsx`

- [ ] **Step 1: Create loading component**

```tsx
import WuhuMascot from './WuhuMascot'

interface WuhuLoadingProps {
  text?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function WuhuLoading({ 
  text = '芜湖起飞中...',
  size = 'md'
}: WuhuLoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="wuhu-animate-pulse rounded-full p-4">
        <WuhuMascot expression="working" size={size} animated={false} />
      </div>
      <p className="mt-4 text-[var(--glass-text-secondary)] animate-pulse">
        {text}
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Type check and build**

Run: `npm run build`
Expected: Success

- [ ] **Step 3: Commit**

```bash
git add src/components/WuhuLoading.tsx
git commit -m "feat(ui): add loading component with animated wuhu mascot"
```

---

## Phase 5: Global Brand Update & Polish

### Task 5.1: Update Translation Files for Brand Name

**Files:**
- Search and update: `messages/` directory (all locale files)

- [ ] **Step 1: Find all "waoowaoo" references**

Run: `grep -r "waoowaoo" messages/ --include="*.json" --include="*.ts"`
Expected: List of files containing brand name references

- [ ] **Step 2: Replace all occurrences**

For each file found, replace "waoowaoo" with "wuhu" (lowercase) and "Waoowaoo" with "Wuhu" (capitalized).

- [ ] **Step 3: Build verification**

Run: `npm run build`
Expected: Success

- [ ] **Step 4: Commit**

```bash
git add messages/
git commit -m "feat(i18n): update brand references from waoowaoo to wuhu in translations"
```

---

### Task 5.2: Create Brand Showcase Demo Page

**Files:**
- Create: `src/app/[locale]/brand-demo/page.tsx`

- [ ] **Step 1: Create brand demo page**

```tsx
import WuhuLogo from '@/components/WuhuLogo'
import WuhuMascot from '@/components/WuhuMascot'
import WuhuEmptyState from '@/components/WuhuEmptyState'
import WuhuLoading from '@/components/WuhuLoading'
import { WuhuButton } from '@/components/ui/wuhu-button'
import { WuhuCard } from '@/components/ui/wuhu-card'

export default function BrandDemoPage() {
  return (
    <div className="min-h-screen bg-[var(--wuhu-bg-dark)] p-8">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Logo Section */}
        <section>
          <h2 className="text-white text-2xl font-bold mb-6">Logo Variants</h2>
          <div className="flex items-end gap-8">
            <WuhuLogo size="sm" />
            <WuhuLogo size="md" />
            <WuhuLogo size="lg" />
            <WuhuLogo size="xl" />
          </div>
        </section>

        {/* Mascot Section */}
        <section>
          <h2 className="text-white text-2xl font-bold mb-6">Mascot Expressions</h2>
          <div className="flex gap-6 flex-wrap">
            <div className="text-center">
              <WuhuMascot expression="default" size="md" />
              <p className="text-white mt-2">Default</p>
            </div>
            <div className="text-center">
              <WuhuMascot expression="happy" size="md" />
              <p className="text-white mt-2">Happy</p>
            </div>
            <div className="text-center">
              <WuhuMascot expression="thinking" size="md" />
              <p className="text-white mt-2">Thinking</p>
            </div>
            <div className="text-center">
              <WuhuMascot expression="surprised" size="md" />
              <p className="text-white mt-2">Surprised</p>
            </div>
            <div className="text-center">
              <WuhuMascot expression="working" size="md" />
              <p className="text-white mt-2">Working</p>
            </div>
          </div>
        </section>

        {/* Buttons Section */}
        <section>
          <h2 className="text-white text-2xl font-bold mb-6">Button Variants</h2>
          <div className="flex gap-4 flex-wrap">
            <WuhuButton variant="primary">Primary</WuhuButton>
            <WuhuButton variant="secondary">Secondary</WuhuButton>
            <WuhuButton variant="ghost">Ghost</WuhuButton>
            <WuhuButton variant="gradient">Gradient</WuhuButton>
          </div>
        </section>

        {/* Cards Section */}
        <section>
          <h2 className="text-white text-2xl font-bold mb-6">Cards</h2>
          <div className="grid grid-cols-3 gap-6">
            <WuhuCard glow="purple">
              <h3 className="text-white font-bold mb-2">Purple Glow</h3>
              <p className="text-white/70 text-sm">Card with purple neon glow</p>
            </WuhuCard>
            <WuhuCard glow="pink">
              <h3 className="text-white font-bold mb-2">Pink Glow</h3>
              <p className="text-white/70 text-sm">Card with pink neon glow</p>
            </WuhuCard>
            <WuhuCard glow="cyan">
              <h3 className="text-white font-bold mb-2">Cyan Glow</h3>
              <p className="text-white/70 text-sm">Card with cyan neon glow</p>
            </WuhuCard>
          </div>
        </section>

        {/* Empty State Section */}
        <section>
          <h2 className="text-white text-2xl font-bold mb-6">Empty State</h2>
          <WuhuCard>
            <WuhuEmptyState 
              title="还没有项目哦"
              description="点击下方按钮创建你的第一个AI视频项目吧！"
              action={<WuhuButton variant="gradient">创建项目</WuhuButton>}
            />
          </WuhuCard>
        </section>

        {/* Loading Section */}
        <section>
          <h2 className="text-white text-2xl font-bold mb-6">Loading State</h2>
          <WuhuCard>
            <WuhuLoading text="正在生成你的 masterpiece..." />
          </WuhuCard>
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build verification**

Run: `npm run build`
Expected: Success

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/brand-demo/page.tsx
git commit -m "feat(brand): add brand showcase demo page"
```

---

### Task 5.3: Final Build & Smoke Test

**Files:**
- Entire project

- [ ] **Step 1: Full build test**

Run: `npm run build`
Expected: Build completes successfully, all components compile

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: 0 type errors

- [ ] **Step 3: Lint check**

Run: `npm run lint`
Expected: No critical errors

- [ ] **Step 4: Manual verification checklist**
  - [ ] Navbar shows wuhu logo correctly
  - [ ] Logo hover animation works
  - [ ] Brand demo page renders all components
  - [ ] Mascot animations are smooth
  - [ ] Neon glow effects are visible
  - [ ] No broken imports

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat(brand): complete wuhu brand theme implementation"
```

---

## Acceptance Criteria

- [ ] All CSS color variables are defined and accessible
- [ ] Wuhu logo component displays gradient text with glow effect
- [ ] Mascot component has all 5 expressions and floats smoothly
- [ ] Neon button variants work with hover glow effects
- [ ] Card components have visible neon borders and glow
- [ ] Empty state component integrates mascot with action button
- [ ] Loading component shows animated mascot with pulse effect
- [ ] All "waoowaoo" references updated to "wuhu"
- [ ] Build passes with 0 errors
- [ ] Demo page shows all brand elements correctly
