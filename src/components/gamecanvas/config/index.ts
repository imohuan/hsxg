/**
 * GameCanvas 统一配置
 * 所有画布相关的配置项集中管理
 */

// ============ 布局配置 ============

/** 单位尺寸配置 */
export const UNIT_SIZE = {
  /** 单位宽度 */
  width: 120,
  /** 单位高度 */
  height: 200,
} as const;

/** 布局配置 */
export const LAYOUT = {
  /** 列间距 */
  columnGap: 30,
  /** 行间距 */
  rowGap: 25,
  /** 交错偏移量（第二列向下偏移） */
  staggerOffset: 35,
  /** 距离中心的距离（两侧单位距离画布中心的距离） */
  centerOffset: 300,
  /** 每列最大单位数 */
  maxRowsPerColumn: 3,
  /** 每侧列数 */
  columnsPerSide: 2,
} as const;

// ============ 血条/蓝条配置 ============

/** 状态条配置 */
export const STATUS_BAR = {
  /** 血条宽度（相对于单位宽度的比例） */
  widthRatio: 0.85,
  /** 血条高度 */
  height: 7,
  /** 血条与蓝条之间的间距 */
  gap: 0,
  /** 内边距 */
  padding: 1,
  /** 蓝条 X 偏移（交错效果） */
  mpOffsetX: -8,
  /** 状态条区域距离单位底部的偏移 */
  bottomOffset: 10,
} as const;

/** 状态条颜色 */
export const STATUS_BAR_COLORS = {
  /** 血条背景（外框） */
  hpBackground: "#ffffff",
  /** 血条内部背景 */
  hpInnerBackground: "#1e293b",
  /** 血条填充（正常） */
  hpFill: "#ef4444",
  /** 血条填充（低血量 < 30%） */
  hpFillLow: "#dc2626",
  /** 蓝条背景（外框） */
  mpBackground: "#ffffff",
  /** 蓝条内部背景 */
  mpInnerBackground: "#1e293b",
  /** 蓝条填充 */
  mpFill: "#3b82f6",
} as const;

// ============ 单位区域配置 ============

/** 单位区域划分 */
export const UNIT_AREA = {
  /** 名称区域高度 */
  nameHeight: 20,
  /** 血条区域高度 */
  barHeight: 24,
} as const;

// ============ 选中/高亮效果配置 ============

/** 高亮效果配置（当前行动角色） */
export const ACTIVE_HIGHLIGHT = {
  /** 椭圆宽度扩展 */
  ellipseWidthExtend: 8,
  /** 椭圆高度 */
  ellipseHeight: 10,
  /** Y 偏移 */
  offsetY: -5,
  /** 边框颜色 */
  strokeColor: "#fbbf24",
  /** 边框宽度 */
  lineWidth: 3,
} as const;

/** 选中效果配置（施法目标） */
export const SELECTION_EFFECT = {
  /** 箭头大小 */
  arrowSize: 14,
  /** 箭头距离单位中心的水平距离 */
  offsetX: 10,
  /** 箭头距离单位中心的垂直距离（正值向下，负值向上） */
  offsetY: UNIT_SIZE.height / 2 - 10,
  /** 帧动画间隔（毫秒） */
  frameInterval: 100,
  /** 帧动画图片路径 */
  frameUrls: ["/zhuan1.png", "/zhuan2.png", "/zhuan3.png", "/zhuan5.png", "/zhuan6.png"],
} as const;

// ============ 默认角色配置 ============

/** 默认角色雪碧图配置 */
export const DEFAULT_SPRITE = {
  /** 雪碧图路径 */
  url: "/sprite_5x5.webp",
  /** 行数 */
  rows: 5,
  /** 列数 */
  cols: 5,
  /** 总帧数 */
  totalFrames: 22,
  /** 缩放比例 */
  scale: 1,
  /** 帧动画间隔（毫秒） */
  frameInterval: 66,
} as const;

// ============ 占位单位配置 ============

/** 占位单位配置（空位显示） */
export const PLACEHOLDER_UNIT = {
  /** 占位框宽度 */
  width: 60,
  /** 占位框高度 */
  height: 80,
  /** 圆角半径 */
  borderRadius: 8,
  /** 边框宽度 */
  borderWidth: 2,
  /** 虚线间隔 */
  dashPattern: [5, 5],
} as const;

/** 占位单位颜色 */
export const PLACEHOLDER_COLORS = {
  /** 边框颜色 */
  border: "#cbd5e1",
  /** 填充颜色 */
  fill: "#f1f5f9",
} as const;

// ============ 文字配置 ============

/** 文字配置 */
export const TEXT = {
  /** 名称字体 */
  nameFont: "bold 11px sans-serif",
  /** 名称颜色 */
  nameColor: "#1e293b",
  /** 速度序号字体 */
  speedOrderFont: "bold 12px sans-serif",
  /** 速度序号颜色 */
  speedOrderColor: "#ffffff",
  /** 速度序号描边颜色 */
  speedOrderStrokeColor: "#1e293b",
  /** 速度序号描边宽度 */
  speedOrderStrokeWidth: 2,
  /** 速度序号 X 偏移（相对于血条左侧） */
  speedOrderOffsetX: 12,
} as const;

// ============ 伤害数字配置 ============

/** 伤害数字配置 */
export const DAMAGE_NUMBER = {
  /** 普通伤害字体 */
  normalFont: "bold 18px sans-serif",
  /** 暴击伤害字体 */
  criticalFont: "bold 24px sans-serif",
  /** 动画持续时间（毫秒） */
  duration: 1000,
  /** 向上飘动距离 */
  floatDistance: 30,
  /** Y 偏移（相对于单位位置） */
  offsetY: -50,
} as const;

/** 伤害数字颜色 */
export const DAMAGE_COLORS = {
  /** 普通伤害 */
  damage: "#ff4444",
  /** 治疗 */
  heal: "#44ff44",
  /** 暴击 */
  critical: "#ffaa00",
  /** 未命中 */
  miss: "#aaaaaa",
} as const;

// ============ 相机配置 ============

/** 相机配置 */
export const CAMERA = {
  /** 最小缩放 */
  minZoom: 0.5,
  /** 最大缩放 */
  maxZoom: 2.5,
  /** 缩放因子（滚轮缩放时的倍率） */
  zoomFactor: 0.1,
  /** 重置动画时长（毫秒） */
  resetDuration: 300,
} as const;

// ============ 背景配置 ============

/** 背景配置 */
export const BACKGROUND = {
  /** 默认背景色 */
  defaultColor: "#e2e8f0" as string,
} as const;

// ============ 透明度配置 ============

/** 透明度配置 */
export const OPACITY = {
  /** 不可选择/死亡单位透明度 */
  disabled: 0.5,
} as const;

// ============ 导出完整配置对象 ============

export const GAME_CANVAS_CONFIG = {
  unitSize: UNIT_SIZE,
  layout: LAYOUT,
  statusBar: STATUS_BAR,
  statusBarColors: STATUS_BAR_COLORS,
  unitArea: UNIT_AREA,
  activeHighlight: ACTIVE_HIGHLIGHT,
  selectionEffect: SELECTION_EFFECT,
  placeholderUnit: PLACEHOLDER_UNIT,
  placeholderColors: PLACEHOLDER_COLORS,
  text: TEXT,
  damageNumber: DAMAGE_NUMBER,
  damageColors: DAMAGE_COLORS,
  camera: CAMERA,
  background: BACKGROUND,
  opacity: OPACITY,
} as const;

export type GameCanvasConfig = typeof GAME_CANVAS_CONFIG;

// ============ 目标选择规则 ============

export * from "./targetSelection";
