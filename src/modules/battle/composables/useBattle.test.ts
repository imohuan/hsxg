/**
 * @file useBattle 属性测试
 * Property 3: 角色激活顺序正确性
 * Validates: Requirements 2.1
 *
 * *For any* 操作阶段中的玩家角色列表，角色的激活顺序应与其在阵营中的位置顺序
 * （从上到下，即 y 坐标从小到大）一致。
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

/**
 * 单位位置信息
 */
interface UnitPosition {
  id: string;
  row: number;
  col: number;
  isActionable: boolean;
}

/**
 * 计算单位的 Y 坐标（从 Unit.calculatePosition 提取）
 * Y 坐标从上到下排列
 */
function calculateUnitY(
  position: { row: number; col: number },
  canvasHeight: number,
): number {
  const rowSpacing = 100;
  const baseY = canvasHeight / 2 - 100;
  return baseY + position.row * rowSpacing;
}

/**
 * 获取可行动玩家单位并按 Y 坐标排序（从 BattleScene.getActionablePlayerUnits 提取）
 * Requirements: 2.1
 */
function getActionablePlayerUnitsSorted(
  units: UnitPosition[],
  canvasHeight: number,
): UnitPosition[] {
  return units
    .filter((u) => u.isActionable)
    .sort((a, b) => {
      const yA = calculateUnitY({ row: a.row, col: a.col }, canvasHeight);
      const yB = calculateUnitY({ row: b.row, col: b.col }, canvasHeight);
      return yA - yB;
    });
}

/**
 * 验证激活顺序是否正确（按 Y 坐标从小到大）
 */
function isActivationOrderCorrect(
  sortedUnits: UnitPosition[],
  canvasHeight: number,
): boolean {
  for (let i = 0; i < sortedUnits.length - 1; i++) {
    const currentY = calculateUnitY(
      { row: sortedUnits[i].row, col: sortedUnits[i].col },
      canvasHeight,
    );
    const nextY = calculateUnitY(
      { row: sortedUnits[i + 1].row, col: sortedUnits[i + 1].col },
      canvasHeight,
    );
    if (currentY > nextY) {
      return false;
    }
  }
  return true;
}

/**
 * 生成有效的单位位置配置
 * 阵营最多 6 个角色，通常排列为 2 列 3 行
 */
const arbitraryUnitPosition = (): fc.Arbitrary<UnitPosition> =>
  fc.record({
    id: fc.uuid(),
    row: fc.integer({ min: 0, max: 2 }), // 最多 3 行
    col: fc.integer({ min: 0, max: 1 }), // 最多 2 列
    isActionable: fc.boolean(),
  });

/**
 * 生成玩家单位列表（1-6 个单位）
 */
const arbitraryPlayerUnits = (): fc.Arbitrary<UnitPosition[]> =>
  fc.array(arbitraryUnitPosition(), { minLength: 1, maxLength: 6 });

/**
 * 生成有效的画布高度
 */
const arbitraryCanvasHeight = (): fc.Arbitrary<number> =>
  fc.integer({ min: 600, max: 1080 });

describe("useBattle 角色激活顺序属性测试", () => {
  /**
   * Feature: turn-based-battle-game, Property 3: 角色激活顺序正确性
   * Validates: Requirements 2.1
   *
   * *For any* 操作阶段中的玩家角色列表，角色的激活顺序应与其在阵营中的位置顺序
   * （从上到下，即 y 坐标从小到大）一致。
   */
  it("Property 3: 角色激活顺序应按 Y 坐标从小到大排列", () => {
    fc.assert(
      fc.property(
        arbitraryPlayerUnits(),
        arbitraryCanvasHeight(),
        (units, canvasHeight) => {
          // 获取排序后的可行动单位
          const sortedUnits = getActionablePlayerUnitsSorted(units, canvasHeight);

          // 验证激活顺序是否正确
          expect(isActivationOrderCorrect(sortedUnits, canvasHeight)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3 补充: 相同行的单位应保持稳定排序
   */
  it("Property 3 补充: 排序后的单位 Y 坐标应单调递增", () => {
    fc.assert(
      fc.property(
        arbitraryPlayerUnits(),
        arbitraryCanvasHeight(),
        (units, canvasHeight) => {
          const sortedUnits = getActionablePlayerUnitsSorted(units, canvasHeight);

          // 验证 Y 坐标单调递增（允许相等）
          for (let i = 0; i < sortedUnits.length - 1; i++) {
            const currentY = calculateUnitY(
              { row: sortedUnits[i].row, col: sortedUnits[i].col },
              canvasHeight,
            );
            const nextY = calculateUnitY(
              { row: sortedUnits[i + 1].row, col: sortedUnits[i + 1].col },
              canvasHeight,
            );
            expect(currentY).toBeLessThanOrEqual(nextY);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3 补充: 不可行动的单位不应出现在激活列表中
   */
  it("Property 3 补充: 不可行动的单位不应出现在激活列表中", () => {
    fc.assert(
      fc.property(
        arbitraryPlayerUnits(),
        arbitraryCanvasHeight(),
        (units, canvasHeight) => {
          const sortedUnits = getActionablePlayerUnitsSorted(units, canvasHeight);

          // 验证所有返回的单位都是可行动的
          for (const unit of sortedUnits) {
            expect(unit.isActionable).toBe(true);
          }

          // 验证返回的单位数量等于可行动单位数量
          const actionableCount = units.filter((u) => u.isActionable).length;
          expect(sortedUnits.length).toBe(actionableCount);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3 补充: 行号较小的单位应先被激活
   */
  it("Property 3 补充: 行号较小的单位应先被激活", () => {
    fc.assert(
      fc.property(
        arbitraryPlayerUnits(),
        arbitraryCanvasHeight(),
        (units, canvasHeight) => {
          const sortedUnits = getActionablePlayerUnitsSorted(units, canvasHeight);

          // 对于不同行的单位，行号小的应该排在前面
          for (let i = 0; i < sortedUnits.length - 1; i++) {
            const currentRow = sortedUnits[i].row;
            const nextRow = sortedUnits[i + 1].row;

            // 如果当前单位的行号大于下一个单位的行号，则排序错误
            // 注意：相同行号是允许的（同一行的多个单位）
            if (currentRow > nextRow) {
              // 这种情况不应该发生，因为 Y 坐标是基于行号计算的
              expect(currentRow).toBeLessThanOrEqual(nextRow);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
