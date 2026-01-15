/**
 * @file 站位计算工具函数
 * @description 负责计算战斗场景中单位的站位，采用双列交错布局
 */

import type { SkillSandboxUnit } from "./sandbox";
import type { PositionConfig } from "../config/types";
import { DEFAULT_POSITION_CONFIG } from "../config/battleConfig";

/**
 * 阵营区域边界接口
 * 描述一个阵营在画布上占据的矩形区域
 */
interface SideBounds {
  /** 区域左上角的 X 坐标 */
  x: number;
  /** 区域左上角的 Y 坐标 */
  y: number;
  /** 区域的宽度 */
  width: number;
  /** 区域的高度 */
  height: number;
}

/**
 * 计算双列交错站位
 *
 * @param units - 单位列表（包含玩家和敌人）
 * @param canvasWidth - 画布宽度，默认 800 像素
 * @param canvasHeight - 画布高度，默认 600 像素
 * @param config - 站位配置（可选，会与默认配置合并）
 * @returns 单位ID到位置的映射表，位置坐标为容器中心点
 *
 * @description
 * 此函数计算所有单位的站位，采用双列交错布局：
 * - 玩家单位在画布右侧
 * - 敌人单位在画布左侧
 * - 每个阵营内部采用双列交错排列（第一列向上偏移，第二列向下偏移）
 * - 单位按顺序排列：第1个在左列第1行，第2个在右列第1行，第3个在左列第2行...
 *
 * 布局示例（4个单位）：
 * ```
 *   左列    右列
 *   1       2
 *   3       4
 * ```
 */
export function calculateStaggeredPositions(
  units: SkillSandboxUnit[],
  canvasWidth: number = 800,
  canvasHeight: number = 600,
  config: Partial<PositionConfig> = {}
): Map<string, { x: number; y: number }> {
  const positionMap = new Map<string, { x: number; y: number }>();

  // 如果没有单位，直接返回空映射
  if (units.length === 0) return positionMap;

  // 合并用户配置和默认配置（用户配置优先）
  const finalConfig: PositionConfig = {
    ...DEFAULT_POSITION_CONFIG,
    ...config,
  };

  // 按阵营分组单位
  const playerUnits = units.filter((u) => u.side === "player");
  const enemyUnits = units.filter((u) => u.side === "enemy");

  // 计算敌人单位的站位（左侧）
  if (enemyUnits.length > 0) {
    // 计算敌人阵营的边界区域
    const enemyBounds = calculateSideBounds(
      enemyUnits.length,
      false, // false 表示左侧
      canvasWidth,
      canvasHeight,
      finalConfig
    );
    // 在边界区域内计算每个单位的具体位置
    const enemyPositions = calculateUnitPositionsInBounds(
      enemyUnits,
      enemyBounds,
      finalConfig
    );
    // 将位置添加到映射表
    enemyPositions.forEach((pos, id) => positionMap.set(id, pos));
  }

  // 计算玩家单位的站位（右侧）
  if (playerUnits.length > 0) {
    // 计算玩家阵营的边界区域
    const playerBounds = calculateSideBounds(
      playerUnits.length,
      true, // true 表示右侧
      canvasWidth,
      canvasHeight,
      finalConfig
    );
    // 在边界区域内计算每个单位的具体位置
    const playerPositions = calculateUnitPositionsInBounds(
      playerUnits,
      playerBounds,
      finalConfig
    );
    // 将位置添加到映射表
    playerPositions.forEach((pos, id) => positionMap.set(id, pos));
  }

  return positionMap;
}

/**
 * 计算一侧阵营的边界区域
 *
 * @param unitCount - 该阵营的单位数量
 * @param isRightSide - 是否在右侧（true=玩家在右侧，false=敌人在左侧）
 * @param canvasWidth - 画布宽度
 * @param canvasHeight - 画布高度
 * @param config - 站位配置
 * @returns 该阵营占据的矩形边界区域
 *
 * @description
 * 此函数计算一个阵营在画布上占据的矩形区域：
 * 1. 计算区域宽度：双列布局需要 horizontalGap + containerWidth * 2
 * 2. 计算区域高度：根据单位数量和行数计算
 * 3. 计算 X 坐标：根据左右阵营和中心间隔计算
 * 4. 计算 Y 坐标：垂直居中显示
 */
function calculateSideBounds(
  unitCount: number,
  isRightSide: boolean,
  canvasWidth: number,
  canvasHeight: number,
  config: PositionConfig
): SideBounds {
  // 计算区域宽度
  // 双列布局：左列容器 + 水平间隔 + 右列容器
  const width = config.horizontalGap + config.containerWidth * 2;

  // 计算区域高度
  // 行数 = ceil(单位数量 / 2)（因为每行有2个单位）
  const rowCount = Math.ceil(unitCount / 2);
  // 高度 = 行数 * 容器高度 + (行数 - 1) * 行间隔
  const height =
    rowCount * config.containerHeight + (rowCount - 1) * config.unitYGap;

  // 计算 X 坐标（边界区域的左上角）
  // 画布中心 = canvasWidth / 2
  // 右侧阵营：从中心向右偏移 centerGap/2
  // 左侧阵营：从中心向左偏移 centerGap/2，再向左偏移整个宽度
  const x = isRightSide
    ? canvasWidth / 2 + config.centerGap / 2
    : canvasWidth / 2 - config.centerGap / 2 - width;

  // 计算 Y 坐标（边界区域的左上角）
  // 垂直居中：(画布高度 - 区域高度) / 2
  // 加上 unitYGap/2 的微调，使视觉效果更好
  const y = (canvasHeight - height) / 2 + config.unitYGap / 2;

  return { x, y, width, height };
}

/**
 * 在边界区域内计算每个单位的具体位置（交错布局）
 *
 * @param units - 单位列表（已按阵营分组）
 * @param bounds - 该阵营的边界区域
 * @param config - 站位配置
 * @returns 单位ID到位置的映射表，位置坐标为容器中心点
 *
 * @description
 * 此函数在给定的边界区域内，为每个单位计算具体位置：
 * 1. 单位按顺序排列：第0个在左列第0行，第1个在右列第0行，第2个在左列第1行...
 * 2. 采用交错布局：左列单位向上偏移，右列单位向下偏移，形成交错效果
 * 3. 返回的位置是容器中心点坐标，便于 Phaser 渲染
 *
 * 布局示例（4个单位）：
 * ```
 *   左列（向上偏移）    右列（向下偏移）
 *       1                   2
 *       3                   4
 * ```
 */
function calculateUnitPositionsInBounds(
  units: SkillSandboxUnit[],
  bounds: SideBounds,
  config: PositionConfig
): Map<string, { x: number; y: number }> {
  const positionMap = new Map<string, { x: number; y: number }>();

  // 交错偏移量：左列向上偏移，右列向下偏移，偏移量为行间隔的一半
  // 这样形成交错效果，使布局更有层次感
  const staggerOffset = config.unitYGap / 2;

  // 遍历所有单位，计算每个单位的位置
  for (let i = 0; i < units.length; i++) {
    const unit = units[i];
    if (!unit) continue;

    // 计算单位所在的行索引（从0开始）
    // 每行有2个单位，所以行索引 = floor(索引 / 2)
    const rowIndex = Math.floor(i / 2);

    // 计算单位所在的列索引（0=左列，1=右列）
    // 列索引 = 索引 % 2
    const colIndex = i % 2;

    // 计算 X 坐标（容器左上角的 X 坐标）
    // 左列：直接使用边界区域的 X 坐标
    // 右列：左列 X + 容器宽度 + 水平间隔
    const x =
      colIndex === 0
        ? bounds.x
        : bounds.x + config.containerWidth + config.horizontalGap;

    // 计算基础 Y 坐标（容器左上角的 Y 坐标）
    // 基础 Y = 边界区域 Y + 行索引 * (容器高度 + 行间隔)
    const baseY =
      bounds.y + rowIndex * (config.containerHeight + config.unitYGap);

    // 应用交错偏移
    // 左列（colIndex === 0）：向上偏移
    // 右列（colIndex === 1）：向下偏移
    const y =
      colIndex === 0
        ? baseY - staggerOffset // 左列向上偏移
        : baseY + staggerOffset; // 右列向下偏移

    // 将坐标转换为容器中心点（Phaser 使用中心点作为位置）
    const centerX = x + config.containerWidth / 2;
    const centerY = y + config.containerHeight / 2;

    // 将位置添加到映射表
    positionMap.set(unit.id, { x: centerX, y: centerY });
  }

  return positionMap;
}
