/**
 * @file 单位渲染配置
 * @description 定义单位渲染相关的尺寸、样式和交互配置
 */

const scale = 2;

/**
 * 单位区域高度配置
 */
export const UNIT_AREAS = {
  /** 名称区域高度（像素） */
  nameAreaHeight: 25 * scale,
  /** 血条区域高度（像素，包含血条和蓝条） */
  barAreaHeight: 14,
  /** 精灵区域高度（像素） */
  spriteAreaHeight: 200 * scale,
} as const;

/**
 * 单位容器尺寸配置
 */
export const UNIT_CONTAINER = {
  /** 单位容器宽度（像素） */
  width: 80 * scale,
  /** 单位容器高度（像素） */
  height:
    UNIT_AREAS.spriteAreaHeight -
    UNIT_AREAS.barAreaHeight -
    UNIT_AREAS.nameAreaHeight,
} as const;

/**
 * 名称标签配置
 */
export const NAME_LABEL = {
  /** 名称背景宽度（像素） */
  bgWidth: 100,
  /** 名称背景高度（像素） */
  bgHeight: 22,
  /** 名称背景透明度 */
  bgAlpha: 0.7,
  /** 名称文字大小 */
  fontSize: "14px",
  /** 名称文字颜色 */
  textColor: "#fff",
  /** 名称文字样式 */
  fontStyle: "bold" as const,
} as const;

/**
 * 选中光圈配置
 */
export const SELECTION_AURA = {
  /** 光圈线条宽度（像素） */
  lineWidth: 4,
  /** 光圈颜色（十六进制） */
  color: 0xffff00,
  /** 光圈透明度 */
  alpha: 0.8,
  /** 光圈椭圆中心X偏移（相对于容器中心） */
  centerX: 0,
  /** 光圈椭圆中心Y偏移（相对于容器中心） */
  centerY: 45,
  /** 光圈椭圆宽度（像素） */
  width: 70,
  /** 光圈椭圆高度（像素） */
  height: 25,
} as const;

/**
 * 交互区域配置
 */
export const INTERACTION = {
  /** 交互区域宽度（像素） */
  hitAreaWidth: 60,
  /** 交互区域高度（像素） */
  hitAreaHeight: 80,
  /** 交互区域X偏移（相对于容器中心） */
  hitAreaOffsetX: -30,
  /** 交互区域Y偏移（相对于容器中心） */
  hitAreaOffsetY: -40,
  /** 鼠标悬停时的缩放比例 */
  hoverScale: 1.1,
} as const;

/**
 * 血条和蓝条配置
 */
export const HEALTH_BARS = {
  /** 血条宽度相对于容器宽度的比例 */
  barWidthRatio: 0.8,
  /** 血条高度（像素） */
  barHeight: UNIT_AREAS.barAreaHeight / 2,
  /** 血条和蓝条之间的间距（像素） */
  barSpacing: 2,
  /** 蓝条X偏移（相对于血条中心） */
  mpBarOffsetX: -10,
  /** 速度顺序文本X偏移（相对于血条左边缘） */
  speedOrderOffsetX: -10,
  /** 速度顺序文字大小 */
  speedOrderFontSize: "12px",
  /** 速度顺序文字颜色 */
  speedOrderTextColor: "#ffffff",
  /** 速度顺序文字描边颜色 */
  speedOrderStrokeColor: "#000000",
  /** 速度顺序文字描边宽度 */
  speedOrderStrokeThickness: 2,
  /** 血条填充内边距（像素） */
  barPadding: 1,
  /** 血条颜色（十六进制） */
  hpBarColor: 0xff4444,
  /** 蓝条颜色（十六进制） */
  mpBarColor: 0x0000ff,
  /** 血条背景颜色（白色边框） */
  barBgColor: 0xffffff,
  /** 空血条颜色（黑色） */
  emptyBarColor: 0x000000,
} as const;

/**
 * 精灵图配置
 */
export const SPRITE = {
  /** 默认缩放值 */
  defaultScale: 0.8,
} as const;
