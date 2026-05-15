# Wuhu 品牌主题设计规范

**日期**: 2025-05-12  
**状态**: 设计中  
**版本**: v1.0

---

## 一、品牌核心定位

### 1.1 品牌理念
- **中文名**: 芜湖
- **英文名**: wuhu
- **核心口号**: 芜湖起飞！AI 创作，惊喜连连
- **品牌精神**: 娱乐性、趣味性、惊喜感、创造力

### 1.2 目标用户
- 短剧/漫画视频创作者
- 年轻内容创作者
- 追求趣味和效率的 AI 工具使用者

### 1.3 品牌气质
- **酷萌风**: 圆润可爱但不失酷炫感
- **霓虹活力**: 高饱和度撞色，充满能量
- **搞怪有趣**: 像随时会跳出来给你惊喜的小恶魔

---

## 二、视觉识别系统

### 2.1 色彩系统

#### 主色调
```css
/* 霓虹三原色 */
--wuhu-neon-purple: oklch(0.65 0.28 290);   /* 电光紫 */
--wuhu-neon-pink: oklch(0.7 0.32 350);      /* 荧光粉 */
--wuhu-neon-cyan: oklch(0.75 0.25 180);     /* 亮青色 */

/* 背景色 */
--wuhu-bg-dark: oklch(0.15 0.05 280);       /* 深紫黑 */
--wuhu-bg-surface: oklch(0.2 0.05 280);     /* 卡片背景 */
```

#### 渐变系统
```css
/* 主渐变 - 霓虹流动 */
--wuhu-gradient-primary: linear-gradient(135deg, var(--wuhu-neon-purple), var(--wuhu-neon-pink), var(--wuhu-neon-cyan));

/* 按钮渐变 */
--wuhu-gradient-btn: linear-gradient(135deg, var(--wuhu-neon-purple), var(--wuhu-neon-pink));

/* 文字渐变 */
--wuhu-gradient-text: linear-gradient(90deg, var(--wuhu-neon-cyan), var(--wuhu-neon-purple), var(--wuhu-neon-pink));
```

### 2.2 Logo 设计

#### 文字 Logo 规范
- **字体**: 圆润无衬线字体，字母边缘做圆角处理
- **效果**: 霓虹发光外发光效果
- **特点**: "w" 做波浪形处理，"u" 内部融入小怪兽眼睛元素
- **变体**:
  - 完整版本: wuhu
  - 简化版本: WH (用于小尺寸场景)
  - 图标版本: 仅发光的 W 字母

#### Logo 使用规范
- 最小使用尺寸: 32px
- 安全边距: Logo 周围保留至少 20% 的空白区域
- 背景: 优先使用深色背景以突出霓虹效果

---

## 三、吉祥物「呜虎」设计规范

### 3.1 形象描述
- **名字**: 呜虎 (Woohoo)
- **形象**: 圆滚滚的小怪兽
- **体型**: 球形身体，比例 1:1.2（宽:高）
- **特征**:
  - 大大的圆形眼睛，瞳孔有星芒效果
  - 头顶两个小尖角，带霓虹发光
  - 小小的爪子，表情搞怪
  - 身体半透明，内部有能量流动效果

### 3.2 表情系统
- **默认表情**: 眨眼搞怪笑
- **惊喜表情**: 眼睛变成星星，嘴巴张大 O 型
- **工作中**: 戴导演帽，手持场记板
- **成功**: 撒花庆祝，身上有烟花特效
- **思考中**: 摸下巴，头顶有问号灯泡

### 3.3 使用场景
- **空状态**: 呜虎摊手，表示"这里还没有内容哦"
- **加载中**: 呜虎旋转/跳舞，带霓虹拖尾
- **成功提示**: 呜虎比耶 + 烟花效果
- **错误状态**: 呜虎挠头，表示"出了点小问题"
- **引导教学**: 呜虎用手指指向操作区域
- **社交媒体**: 表情包贴纸系列

---

## 四、界面设计规范

### 4.1 玻璃态 + 霓虹系统
```css
/* 霓虹边框按钮 */
.wuhu-btn-neon {
  border: 2px solid var(--wuhu-neon-purple);
  box-shadow: 
    0 0 10px var(--wuhu-neon-purple),
    inset 0 0 10px rgba(var(--wuhu-neon-purple), 0.1);
  transition: all 0.3s ease;
}

.wuhu-btn-neon:hover {
  box-shadow: 
    0 0 20px var(--wuhu-neon-pink),
    0 0 40px rgba(var(--wuhu-neon-pink), 0.3),
    inset 0 0 15px rgba(var(--wuhu-neon-purple), 0.2);
}

/* 发光卡片 */
.wuhu-card-glow {
  background: var(--wuhu-bg-surface);
  border: 1px solid rgba(var(--wuhu-neon-purple), 0.3);
  box-shadow: 
    0 4px 24px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(var(--wuhu-neon-purple), 0.1) inset;
}
```

### 4.2 动画系统

#### 霓虹呼吸动画
```css
@keyframes neon-pulse {
  0%, 100% { 
    box-shadow: 0 0 10px var(--wuhu-neon-purple), 0 0 20px rgba(var(--wuhu-neon-purple), 0.5);
  }
  50% { 
    box-shadow: 0 0 20px var(--wuhu-neon-pink), 0 0 40px rgba(var(--wuhu-neon-pink), 0.3);
  }
}
```

#### 呜虎漂浮动画
```css
@keyframes wuhu-float {
  0%, 100% { transform: translateY(0) rotate(-2deg); }
  50% { transform: translateY(-10px) rotate(2deg); }
}
```

### 4.3 组件设计规范

#### 按钮层级
- **主要按钮**: 霓虹渐变背景 + 发光边框
- **次要按钮**: 透明背景 + 霓虹边框
- **文字按钮**: 渐变色文字，hover 时出现下划线发光

#### 输入框
- 边框: 细霓虹边框
- focus 状态: 边框发光增强，出现外发光
- 占位符文字: 半透明霓虹色

#### 卡片
- 背景: 半透明深底色
- 边框: 细微霓虹描边
- hover 效果: 边框发光增强，轻微上浮

---

## 五、实施优先级

### Phase 1: 核心品牌元素（高优先级）
1. Logo 设计（主版本 + 简化版本）
2. 吉祥物呜虎基础形象（3-5 个核心表情）
3. 色彩系统 CSS 变量定义
4. 导航栏品牌展示区域改造

### Phase 2: 界面组件（中优先级）
1. 按钮样式系统
2. 卡片样式系统
3. 输入框样式
4. 空状态组件（带呜虎）
5. 加载动画组件

### Phase 3: 动效和细节（低优先级）
1. 完整的吉祥物表情库（10+ 表情）
2. 页面转场动画
3. 交互反馈动效
4. 深色/浅色模式适配
5. 营销物料和周边设计

---

## 六、设计验收标准

- [ ] Logo 在各种尺寸下清晰可识别
- [ ] 霓虹效果在深色模式下表现良好
- [ ] 吉祥物形象统一且具有辨识度
- [ ] 色彩对比度符合可访问性标准
- [ ] 动画流畅不卡顿
- [ ] 整体风格保持"酷萌"统一调性
- [ ] 用户反馈"看起来很有趣"

---

**备注**: 本设计文档将在实施过程中持续迭代和完善。
