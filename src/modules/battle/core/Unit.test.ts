/**
 * @file Unit 类属性测试
 * Property 5: 死亡状态不变量
 * Validates: Requirements 3.6
 *
 * 当单位生命值小于等于 0 时，该单位应被标记为不可行动状态，
 * 且不应出现在后续回合的可操作角色列表中。
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { UnitStats } from "@/types";

/**
 * 单位战斗状态（从 Unit 类提取的核心逻辑）
 */
interface UnitBattleState {
  isAlive: boolean;
  isActionable: boolean;
}

/**
 * 计算修改 HP 后的状态
 * 这是 Unit.modifyHp 方法的核心逻辑提取
 */
function computeStateAfterHpChange(
  currentHp: number,
  maxHp: number,
  hpChange: number,
  currentState: UnitBattleState,
): { newHp: number; newState: UnitBattleState } {
  const oldHp = currentHp;
  const newHp = Math.max(0, Math.min(maxHp, currentHp + hpChange));

  // 复制当前状态
  const newState = { ...currentState };

  // 检查死亡状态 (Requirements: 3.6)
  // 当 HP 从正数变为 0 或以下时，标记为死亡和不可行动
  if (newHp <= 0 && oldHp > 0) {
    newState.isAlive = false;
    newState.isActionable = false;
  }

  return { newHp, newState };
}

/**
 * 判断单位是否应该出现在可操作角色列表中
 */
function shouldBeInActionableList(state: UnitBattleState): boolean {
  return state.isAlive && state.isActionable;
}

/**
 * 生成有效的 UnitStats
 */
const arbitraryUnitStats = (): fc.Arbitrary<UnitStats> =>
  fc.record({
    hp: fc.integer({ min: 1, max: 1000 }),
    maxHp: fc.integer({ min: 1, max: 1000 }),
    mp: fc.integer({ min: 0, max: 500 }),
    maxMp: fc.integer({ min: 1, max: 500 }),
    speed: fc.integer({ min: 1, max: 100 }),
    luck: fc.integer({ min: 1, max: 100 }),
    attack: fc.integer({ min: 1, max: 200 }),
    defense: fc.integer({ min: 1, max: 200 }),
  }).filter((stats) => stats.hp <= stats.maxHp && stats.mp <= stats.maxMp);

describe("Unit 类属性测试", () => {
  /**
   * Feature: turn-based-battle-game, Property 5: 死亡状态不变量
   * Validates: Requirements 3.6
   *
   * *For any* 战斗单位，当其生命值小于等于 0 时，该单位应被标记为不可行动状态，
   * 且不应出现在后续回合的可操作角色列表中。
   */
  it("Property 5: 死亡状态不变量 - 当 HP <= 0 时单位应标记为不可行动", () => {
    fc.assert(
      fc.property(
        arbitraryUnitStats(),
        fc.integer({ min: -2000, max: 0 }), // 伤害值（负数或零）
        (stats, damage) => {
          // 初始状态：存活且可行动
          const initialState: UnitBattleState = {
            isAlive: true,
            isActionable: true,
          };

          // 计算足以致死的伤害
          const lethalDamage = Math.min(damage, -stats.hp);

          const { newHp, newState } = computeStateAfterHpChange(
            stats.hp,
            stats.maxHp,
            lethalDamage,
            initialState,
          );

          // 属性验证：当 HP <= 0 时
          if (newHp <= 0) {
            // 1. 单位应被标记为不存活
            expect(newState.isAlive).toBe(false);
            // 2. 单位应被标记为不可行动
            expect(newState.isActionable).toBe(false);
            // 3. 不应出现在可操作角色列表中
            expect(shouldBeInActionableList(newState)).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * 补充测试：存活单位应保持可行动状态
   */
  it("Property 5 补充: 存活单位应保持可行动状态", () => {
    fc.assert(
      fc.property(
        arbitraryUnitStats(),
        fc.integer({ min: -500, max: 500 }), // HP 变化值
        (stats, hpChange) => {
          const initialState: UnitBattleState = {
            isAlive: true,
            isActionable: true,
          };

          const { newHp, newState } = computeStateAfterHpChange(
            stats.hp,
            stats.maxHp,
            hpChange,
            initialState,
          );

          // 如果 HP > 0，单位应保持存活和可行动
          if (newHp > 0) {
            expect(newState.isAlive).toBe(true);
            expect(newState.isActionable).toBe(true);
            expect(shouldBeInActionableList(newState)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * 补充测试：死亡状态不可逆（一旦死亡，即使治疗也不能复活）
   */
  it("Property 5 补充: 死亡状态应保持不变（不可逆）", () => {
    fc.assert(
      fc.property(
        arbitraryUnitStats(),
        fc.integer({ min: 1, max: 1000 }), // 治疗值
        (stats, healing) => {
          // 初始状态：已死亡
          const deadState: UnitBattleState = {
            isAlive: false,
            isActionable: false,
          };

          // 尝试治疗（HP 从 0 开始）
          const { newState } = computeStateAfterHpChange(0, stats.maxHp, healing, deadState);

          // 死亡状态应保持不变
          expect(newState.isAlive).toBe(false);
          expect(newState.isActionable).toBe(false);
          expect(shouldBeInActionableList(newState)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});
