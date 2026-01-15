/**
 * @file 战斗场景配置
 * @description 定义战斗场景相关的配置参数，包括站位配置和单位默认统计数据
 */

import type { PositionConfig, UnitStats } from "./types";

/**
 * 默认站位配置
 * 这些值经过调优，适合大多数战斗场景
 */
export const DEFAULT_POSITION_CONFIG: PositionConfig = {
  centerGap: 400, // 左右阵营中心间隔 300 像素
  verticalGap: 50, // 上下边距 50 像素
  horizontalGap: 120, // 同一行单位间隔 120 像素
  unitYGap: 200, // 不同行单位间隔 100 像素
  containerWidth: 80, // 单位容器宽度 80 像素
  containerHeight: 200, // 单位容器高度 100 像素
};

/**
 * 默认单位统计数据
 * 当无法找到单位或单位ID无效时使用
 */
export const DEFAULT_STATS: UnitStats = {
  hp: 100,
  maxHp: 100,
  mp: 0,
  maxMp: 0,
  speed: 1,
};
