/**
 * 交错布局算法
 * 计算战斗单位的交错排列位置
 */

import type { BattleUnit, UnitPosition } from "@/types";

/** 布局配置 */
export interface StaggeredLayoutConfig {
  /** 画布宽度 */
  canvasWidth: number;
  /** 画布高度 */
  canvasHeight: number;
  /** 单位宽度 */
  unitWidth?: number;
  /** 单位高度 */
  unitHeight?: number;
  /** 列间距 */
  columnGap?: number;
  /** 行间距 */
  rowGap?: number;
  /** 交错偏移量 */
  staggerOffset?: number;
  /** 边距 */
  padding?: number;
}

/** 单位位置结果 */
export interface UnitLayoutResult {
  unitId: string;
  position: UnitPosition;
  row: number;
  col: number;
}

/** 布局结果 */
export interface StaggeredLayoutResult {
  enemies: UnitLayoutResult[];
  players: UnitLayoutResult[];
}

const DEFAULT_CONFIG = {
  unitWidth: 80,
  unitHeight: 100,
  columnGap: 40,
  rowGap: 30,
  staggerOffset: 40,
  padding: 60,
};

/**
 * 计算单侧单位的交错位置
 * @param units 单位列表
 * @param isLeftSide 是否在左侧（敌方）
 * @param config 布局配置
 */
function calculateSidePositions(
  units: BattleUnit[],
  isLeftSide: boolean,
  config: Required<StaggeredLayoutConfig>,
): UnitLayoutResult[] {
  const { canvasWidth, canvasHeight, unitWidth, unitHeight, columnGap, rowGap, staggerOffset, padding } = config;

  const results: UnitLayoutResult[] = [];
  const maxRows = 3; // 每列最多 3 个单位（6 个角色 = 3 行 x 2 列）
  const cols = 2; // 每侧 2 列

  // 计算区域起始 X 坐标
  // 左侧（敌方）：从左边距开始
  // 右侧（我方）：从右边距开始
  const startX = isLeftSide ? padding + unitWidth / 2 : canvasWidth - padding - unitWidth / 2;

  // 计算垂直居中的起始 Y
  const totalRows = Math.min(Math.ceil(units.length / cols), maxRows);
  const totalHeight = totalRows * unitHeight + (totalRows - 1) * rowGap;
  const startY = (canvasHeight - totalHeight) / 2 + unitHeight / 2;

  units.forEach((unit, index) => {
    if (index >= maxRows * cols) return; // 超出容量限制（最多 6 个）

    // 按列优先排列：先填满第一列，再填第二列
    const col = Math.floor(index / maxRows);
    const row = index % maxRows;

    // X 坐标：左侧向右排列，右侧向左排列
    const colOffset = col * (unitWidth + columnGap);
    const x = isLeftSide ? startX + colOffset : startX - colOffset;

    // Y 坐标：基础位置 + 交错偏移（第二列向下偏移）
    const baseY = startY + row * (unitHeight + rowGap);
    const y = col === 1 ? baseY + staggerOffset : baseY;

    results.push({
      unitId: unit.id,
      position: { x, y },
      row,
      col,
    });
  });

  return results;
}

/**
 * 计算所有单位的交错布局位置
 * @param enemyUnits 敌方单位
 * @param playerUnits 我方单位
 * @param config 布局配置
 */
export function calculateStaggeredPositions(
  enemyUnits: BattleUnit[],
  playerUnits: BattleUnit[],
  config: StaggeredLayoutConfig,
): StaggeredLayoutResult {
  const fullConfig: Required<StaggeredLayoutConfig> = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  return {
    enemies: calculateSidePositions(enemyUnits, true, fullConfig),
    players: calculateSidePositions(playerUnits, false, fullConfig),
  };
}

/**
 * 交错布局 Composable
 */
export function useStaggeredLayout(config: StaggeredLayoutConfig) {
  /**
   * 计算布局
   */
  function calculate(enemyUnits: BattleUnit[], playerUnits: BattleUnit[]): StaggeredLayoutResult {
    return calculateStaggeredPositions(enemyUnits, playerUnits, config);
  }

  /**
   * 获取单位位置
   */
  function getUnitPosition(unitId: string, enemyUnits: BattleUnit[], playerUnits: BattleUnit[]): UnitPosition | null {
    const layout = calculate(enemyUnits, playerUnits);

    const enemyResult = layout.enemies.find((r) => r.unitId === unitId);
    if (enemyResult) return enemyResult.position;

    const playerResult = layout.players.find((r) => r.unitId === unitId);
    if (playerResult) return playerResult.position;

    return null;
  }

  return {
    calculate,
    getUnitPosition,
  };
}
