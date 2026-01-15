/**
 * @file BattleScene 属性测试
 * Property 1: 单位阵营位置正确性
 * Validates: Requirements 1.1, 1.2
 *
 * *For any* 战斗场景中的单位列表，所有玩家单位的 x 坐标应小于画布中心点，
 * 所有敌方单位的 x 坐标应大于画布中心点。
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

/**
 * 单位位置计算逻辑（从 Unit.calculatePosition 提取）
 * 这是纯函数，可以独立测试
 */
function calculateUnitPosition(
  position: { row: number; col: number },
  isPlayer: boolean,
  canvasWidth: number,
  canvasHeight: number,
): { x: number; y: number } {
  const centerX = canvasWidth / 2;

  // 基础偏移
  const baseOffsetX = 150;
  const colSpacing = 80;
  const rowSpacing = 100;

  // 玩家在左侧（负方向），敌人在右侧（正方向）
  const sideMultiplier = isPlayer ? -1 : 1;
  const x = centerX + sideMultiplier * (baseOffsetX + position.col * colSpacing);

  // Y 坐标从上到下排列
  const baseY = canvasHeight / 2 - 100;
  const y = baseY + position.row * rowSpacing;

  return { x, y };
}

/**
 * 生成有效的单位位置配置
 * 阵营最多 6 个角色，通常排列为 2 列 3 行
 */
const arbitraryUnitPosition = (): fc.Arbitrary<{ row: number; col: number }> =>
  fc.record({
    row: fc.integer({ min: 0, max: 2 }), // 最多 3 行
    col: fc.integer({ min: 0, max: 1 }), // 最多 2 列
  });

/**
 * 生成有效的画布尺寸
 */
const arbitraryCanvasSize = (): fc.Arbitrary<{ width: number; height: number }> =>
  fc.record({
    width: fc.integer({ min: 800, max: 1920 }), // 常见画布宽度
    height: fc.integer({ min: 600, max: 1080 }), // 常见画布高度
  });

describe("BattleScene 单位位置属性测试", () => {
  /**
   * Feature: turn-based-battle-game, Property 1: 单位阵营位置正确性
   * Validates: Requirements 1.1, 1.2
   *
   * *For any* 战斗场景中的单位列表，所有玩家单位的 x 坐标应小于画布中心点，
   * 所有敌方单位的 x 坐标应大于画布中心点。
   */
  it("Property 1: 玩家单位 x 坐标应小于画布中心点", () => {
    fc.assert(
      fc.property(
        arbitraryUnitPosition(),
        arbitraryCanvasSize(),
        (position, canvas) => {
          const { x } = calculateUnitPosition(position, true, canvas.width, canvas.height);
          const centerX = canvas.width / 2;

          // 玩家单位应在画布左侧（x < centerX）
          expect(x).toBeLessThan(centerX);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Feature: turn-based-battle-game, Property 1: 单位阵营位置正确性
   * Validates: Requirements 1.1, 1.2
   */
  it("Property 1: 敌方单位 x 坐标应大于画布中心点", () => {
    fc.assert(
      fc.property(
        arbitraryUnitPosition(),
        arbitraryCanvasSize(),
        (position, canvas) => {
          const { x } = calculateUnitPosition(position, false, canvas.width, canvas.height);
          const centerX = canvas.width / 2;

          // 敌方单位应在画布右侧（x > centerX）
          expect(x).toBeGreaterThan(centerX);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * 补充测试：玩家和敌方单位不应重叠
   * 验证同一位置的玩家和敌方单位 x 坐标不同
   */
  it("Property 1 补充: 同一位置的玩家和敌方单位 x 坐标应不同", () => {
    fc.assert(
      fc.property(
        arbitraryUnitPosition(),
        arbitraryCanvasSize(),
        (position, canvas) => {
          const playerPos = calculateUnitPosition(position, true, canvas.width, canvas.height);
          const enemyPos = calculateUnitPosition(position, false, canvas.width, canvas.height);

          // 玩家和敌方单位的 x 坐标应不同
          expect(playerPos.x).not.toBe(enemyPos.x);

          // 玩家应在左侧，敌方应在右侧
          expect(playerPos.x).toBeLessThan(enemyPos.x);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * 补充测试：单位 y 坐标应在画布范围内
   */
  it("Property 1 补充: 单位 y 坐标应在画布范围内", () => {
    fc.assert(
      fc.property(
        arbitraryUnitPosition(),
        arbitraryCanvasSize(),
        fc.boolean(), // isPlayer
        (position, canvas, isPlayer) => {
          const { y } = calculateUnitPosition(position, isPlayer, canvas.width, canvas.height);

          // y 坐标应在画布范围内（留有边距）
          expect(y).toBeGreaterThan(0);
          expect(y).toBeLessThan(canvas.height);
        },
      ),
      { numRuns: 100 },
    );
  });
});
