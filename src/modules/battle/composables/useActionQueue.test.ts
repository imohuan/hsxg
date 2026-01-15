/**
 * @file 行动队列排序属性测试
 * Property 2: 行动队列排序正确性
 * Validates: Requirements 3.1, 3.2
 *
 * *For any* 行动队列，队列中的行动应按照执行者的（速度 + 幸运）值降序排列。
 * 即对于队列中任意相邻的两个行动 A 和 B（A 在 B 之前），
 * A 的执行者的（速度 + 幸运）应大于等于 B 的执行者的（速度 + 幸运）。
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { sortActionQueue, type ActionQueueItem } from "./useActionQueue";
import type { UnitStats, ActionType } from "@/types";

/**
 * 生成有效的 UnitStats
 */
const arbitraryUnitStats = (): fc.Arbitrary<UnitStats> =>
  fc
    .record({
      hp: fc.integer({ min: 1, max: 1000 }),
      maxHp: fc.integer({ min: 1, max: 1000 }),
      mp: fc.integer({ min: 0, max: 500 }),
      maxMp: fc.integer({ min: 1, max: 500 }),
      speed: fc.integer({ min: 1, max: 100 }),
      luck: fc.integer({ min: 1, max: 100 }),
      attack: fc.integer({ min: 1, max: 200 }),
      defense: fc.integer({ min: 1, max: 200 }),
    })
    .filter((stats) => stats.hp <= stats.maxHp && stats.mp <= stats.maxMp);

/**
 * 生成有效的 ActionType
 */
const arbitraryActionType = (): fc.Arbitrary<ActionType> =>
  fc.constantFrom("attack", "skill", "item", "defend", "escape", "summon");

/**
 * 生成有效的 ActionQueueItem
 */
const arbitraryActionQueueItem = (): fc.Arbitrary<ActionQueueItem> =>
  fc.record({
    id: fc.uuid(),
    type: arbitraryActionType(),
    actorId: fc.uuid(),
    targetIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 3 }),
    priority: fc.integer({ min: 0, max: 200 }),
    actorStats: arbitraryUnitStats(),
  });

/**
 * 生成行动队列（包含多个行动）
 */
const arbitraryActionQueue = (): fc.Arbitrary<ActionQueueItem[]> =>
  fc.array(arbitraryActionQueueItem(), { minLength: 0, maxLength: 20 });

/**
 * 计算行动的优先级（速度 + 幸运）
 */
function calculatePriority(action: ActionQueueItem): number {
  return action.actorStats.speed + action.actorStats.luck;
}

/**
 * 检查队列是否按优先级降序排列
 */
function isSortedByPriorityDescending(queue: ActionQueueItem[]): boolean {
  for (let i = 0; i < queue.length - 1; i++) {
    const currentPriority = calculatePriority(queue[i]!);
    const nextPriority = calculatePriority(queue[i + 1]!);
    if (currentPriority < nextPriority) {
      return false;
    }
  }
  return true;
}

describe("行动队列排序属性测试", () => {
  /**
   * Feature: turn-based-battle-game, Property 2: 行动队列排序正确性
   * Validates: Requirements 3.1, 3.2
   *
   * *For any* 行动队列，队列中的行动应按照执行者的（速度 + 幸运）值降序排列。
   */
  it("Property 2: 行动队列排序正确性 - 按（速度 + 幸运）降序排列", () => {
    fc.assert(
      fc.property(arbitraryActionQueue(), (actions) => {
        // 执行排序
        const sorted = sortActionQueue(actions);

        // 验证：排序后的队列应按优先级降序排列
        expect(isSortedByPriorityDescending(sorted)).toBe(true);

        // 验证：对于任意相邻的两个行动，前者的优先级应 >= 后者
        for (let i = 0; i < sorted.length - 1; i++) {
          const priorityA = calculatePriority(sorted[i]!);
          const priorityB = calculatePriority(sorted[i + 1]!);
          expect(priorityA).toBeGreaterThanOrEqual(priorityB);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * 补充测试：排序应保持元素数量不变
   */
  it("Property 2 补充: 排序应保持元素数量不变", () => {
    fc.assert(
      fc.property(arbitraryActionQueue(), (actions) => {
        const sorted = sortActionQueue(actions);

        // 排序后的队列长度应与原队列相同
        expect(sorted.length).toBe(actions.length);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * 补充测试：排序应保持所有元素（不丢失、不重复）
   */
  it("Property 2 补充: 排序应保持所有元素", () => {
    fc.assert(
      fc.property(arbitraryActionQueue(), (actions) => {
        const sorted = sortActionQueue(actions);

        // 排序后的队列应包含所有原始元素
        const originalIds = actions.map((a) => a.id).sort();
        const sortedIds = sorted.map((a) => a.id).sort();
        expect(sortedIds).toEqual(originalIds);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * 补充测试：排序应是稳定的（相同优先级的元素保持相对顺序）
   * 注意：JavaScript 的 Array.sort 在 ES2019 后是稳定的
   */
  it("Property 2 补充: 相同优先级的行动应保持相对顺序（稳定排序）", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }), // 固定的 speed
        fc.integer({ min: 1, max: 50 }), // 固定的 luck
        fc.array(fc.uuid(), { minLength: 2, maxLength: 10 }), // 多个 actorId
        (speed, luck, actorIds) => {
          // 创建具有相同优先级的行动
          const actions: ActionQueueItem[] = actorIds.map((actorId, index) => ({
            id: `action-${index}`,
            type: "attack" as ActionType,
            actorId,
            targetIds: [],
            priority: speed + luck,
            actorStats: {
              hp: 100,
              maxHp: 100,
              mp: 50,
              maxMp: 50,
              speed,
              luck,
              attack: 50,
              defense: 50,
            },
          }));

          const sorted = sortActionQueue(actions);

          // 所有行动的优先级相同，应保持原始顺序
          for (let i = 0; i < sorted.length; i++) {
            expect(sorted[i]!.id).toBe(actions[i]!.id);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * 补充测试：空队列排序应返回空队列
   */
  it("Property 2 补充: 空队列排序应返回空队列", () => {
    const sorted = sortActionQueue([]);
    expect(sorted).toEqual([]);
    expect(sorted.length).toBe(0);
  });

  /**
   * 补充测试：单元素队列排序应返回相同元素
   */
  it("Property 2 补充: 单元素队列排序应返回相同元素", () => {
    fc.assert(
      fc.property(arbitraryActionQueueItem(), (action) => {
        const sorted = sortActionQueue([action]);
        expect(sorted.length).toBe(1);
        expect(sorted[0]).toEqual(action);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * 补充测试：排序不应修改原数组
   */
  it("Property 2 补充: 排序不应修改原数组", () => {
    fc.assert(
      fc.property(arbitraryActionQueue(), (actions) => {
        // 保存原数组的副本
        const originalCopy = actions.map((a) => ({ ...a }));

        // 执行排序
        sortActionQueue(actions);

        // 原数组应保持不变
        expect(actions.length).toBe(originalCopy.length);
        for (let i = 0; i < actions.length; i++) {
          expect(actions[i]!.id).toBe(originalCopy[i]!.id);
        }
      }),
      { numRuns: 100 },
    );
  });
});
