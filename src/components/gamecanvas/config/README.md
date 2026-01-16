# GameCanvas 配置说明

所有画布相关的配置项都集中在 `src/components/gamecanvas/config/index.ts` 中管理。

## 配置分类

### 1. 布局配置 (LAYOUT)

控制角色在画布上的排列位置：

```typescript
export const LAYOUT = {
  columnGap: 30, // 列间距（角色之间的水平距离）
  rowGap: 25, // 行间距（角色之间的垂直距离）
  staggerOffset: 35, // 交错偏移量（第二列向下偏移的距离）
  padding: 150, // 边距（角色距离画布边缘的距离）
  maxRowsPerColumn: 3, // 每列最大单位数
  columnsPerSide: 2, // 每侧列数
};
```

**调整建议：**

- 增大 `padding` 可以让角色更靠近中间
- 减小 `columnGap` 可以让同侧角色更紧凑
- 调整 `staggerOffset` 可以改变交错效果

### 2. 单位尺寸 (UNIT_SIZE)

```typescript
export const UNIT_SIZE = {
  width: 80, // 单位宽度
  height: 100, // 单位高度
};
```

### 3. 血条/蓝条配置 (STATUS_BAR)

```typescript
export const STATUS_BAR = {
  widthRatio: 0.85, // 血条宽度（相对于单位宽度的比例）
  height: 7, // 血条高度
  gap: 2, // 血条与蓝条之间的间距
  padding: 1, // 内边距
  mpOffsetX: -8, // 蓝条 X 偏移（交错效果）
  bottomOffset: 20, // 状态条区域距离单位底部的偏移
};
```

### 4. 血条/蓝条颜色 (STATUS_BAR_COLORS)

```typescript
export const STATUS_BAR_COLORS = {
  hpBackground: "#ffffff", // 血条背景（外框）
  hpInnerBackground: "#1e293b", // 血条内部背景
  hpFill: "#ef4444", // 血条填充（正常）
  hpFillLow: "#dc2626", // 血条填充（低血量 < 30%）
  mpBackground: "#ffffff", // 蓝条背景（外框）
  mpInnerBackground: "#1e293b", // 蓝条内部背景
  mpFill: "#3b82f6", // 蓝条填充
};
```

### 5. 高亮/选中效果 (ACTIVE_HIGHLIGHT, SELECTION_EFFECT)

```typescript
// 当前行动角色的高亮效果
export const ACTIVE_HIGHLIGHT = {
  ellipseWidthExtend: 8,      // 椭圆宽度扩展
  ellipseHeight: 10,          // 椭圆高度
  offsetY: -5,                // Y 偏移
  strokeColor: "#fbbf24",     // 边框颜色（黄色）
  lineWidth: 3,               // 边框宽度
}

// 施法目标的选中效果
export const SELECTION_EFFECT = {
  arrowSize: 14,              // 箭头大小
  offsetX: 10,                // 箭头距离单位中心的水平距离
  frameInterval: 100,         // 帧动画间隔（毫秒）
  frameUrls: [...],           // 帧动画图片路径
}
```

### 6. 占位角色配置 (PLACEHOLDER_UNIT, PLACEHOLDER_COLORS)

当角色没有精灵图时显示的占位图：

```typescript
export const PLACEHOLDER_UNIT = {
  widthRatio: 0.7, // 宽度比例
  heightRatio: 0.8, // 高度比例
  borderRadius: 8, // 圆角半径
  borderWidth: 2, // 边框宽度
  iconSizeRatio: 0.5, // 图标大小比例
};

export const PLACEHOLDER_COLORS = {
  playerBackground: "#3b82f6", // 我方背景色（蓝色）
  playerBorder: "#1d4ed8", // 我方边框色
  enemyBackground: "#ef4444", // 敌方背景色（红色）
  enemyBorder: "#b91c1c", // 敌方边框色
  deadBackground: "#94a3b8", // 死亡背景色（灰色）
  deadBorder: "#64748b", // 死亡边框色
  iconColor: "#ffffff", // 图标颜色（白色）
};
```

### 7. 文字配置 (TEXT)

```typescript
export const TEXT = {
  nameFont: "bold 11px sans-serif", // 名称字体
  nameColor: "#1e293b", // 名称颜色
  speedOrderFont: "bold 12px sans-serif", // 速度序号字体
  speedOrderColor: "#ffffff", // 速度序号颜色
  speedOrderStrokeColor: "#1e293b", // 速度序号描边颜色
  speedOrderStrokeWidth: 2, // 速度序号描边宽度
  speedOrderOffsetX: 12, // 速度序号 X 偏移
};
```

### 8. 伤害数字配置 (DAMAGE_NUMBER, DAMAGE_COLORS)

```typescript
export const DAMAGE_NUMBER = {
  normalFont: "bold 18px sans-serif", // 普通伤害字体
  criticalFont: "bold 24px sans-serif", // 暴击伤害字体
  duration: 1000, // 动画持续时间（毫秒）
  floatDistance: 30, // 向上飘动距离
  offsetY: -50, // Y 偏移
};

export const DAMAGE_COLORS = {
  damage: "#ff4444", // 普通伤害（红色）
  heal: "#44ff44", // 治疗（绿色）
  critical: "#ffaa00", // 暴击（橙色）
  miss: "#aaaaaa", // 未命中（灰色）
};
```

### 9. 相机配置 (CAMERA)

```typescript
export const CAMERA = {
  minZoom: 0.5, // 最小缩放
  maxZoom: 2.5, // 最大缩放
  zoomFactor: 0.1, // 缩放因子
  resetDuration: 300, // 重置动画时长（毫秒）
};
```

### 10. 其他配置

```typescript
// 背景配置
export const BACKGROUND = {
  defaultColor: "#e2e8f0", // 默认背景色（浅灰色）
};

// 透明度配置
export const OPACITY = {
  disabled: 0.5, // 不可选择/死亡单位透明度
};

// 单位区域划分
export const UNIT_AREA = {
  nameHeight: 20, // 名称区域高度
  barHeight: 24, // 血条区域高度
};
```

## 使用方式

在需要使用配置的地方导入：

```typescript
import { LAYOUT, STATUS_BAR, DAMAGE_COLORS } from "@/components/gamecanvas/config";

// 使用配置
const padding = LAYOUT.padding;
const barHeight = STATUS_BAR.height;
const damageColor = DAMAGE_COLORS.damage;
```

## 修改配置

直接修改 `src/components/gamecanvas/config/index.ts` 文件中的配置值即可，所有使用该配置的地方会自动生效。

## 常见调整场景

### 让角色更靠近中间

增大 `LAYOUT.padding` 的值：

```typescript
export const LAYOUT = {
  padding: 200, // 从 150 增加到 200
  // ...
};
```

### 调整血条长度

修改 `STATUS_BAR.widthRatio`：

```typescript
export const STATUS_BAR = {
  widthRatio: 0.9, // 从 0.85 增加到 0.9（更长）
  // ...
};
```

### 调整血条/蓝条间距

修改 `STATUS_BAR.gap`：

```typescript
export const STATUS_BAR = {
  gap: 4, // 从 2 增加到 4（间距更大）
  // ...
};
```

### 修改血条颜色

修改 `STATUS_BAR_COLORS` 中的颜色值：

```typescript
export const STATUS_BAR_COLORS = {
  hpFill: "#ff0000", // 改为纯红色
  mpFill: "#0000ff", // 改为纯蓝色
  // ...
};
```
