/**
 * @file 胜负判定属性测试
 * Property 6: 胜负判定正确性
 * Validates: Requirements 3.7, 3.8, 3.9
 *
 * *For any* 战斗状态，当一方阵营的所有单位生命值均小于等于 0 时，
 * 战斗应结束并判定另一方获胜。
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

/**
 * 简化的单位状态（用于胜负判定）
 */
interface UnitState {
  id: string;
  hp: number;
  isPlayer: boolean;
}

/**
 * 战斗状态
 */
interface BattleState {
  playerUnits: UnitState[];
  enemyUnits: UnitState[];
}

/**
 * 战斗结果类型
 */
type BattleResult = "player" | "enemy" | null;

/**
 * 检查单位是否存活
 */
function isUnitAlive(unit: UnitState): boolean {
  return unit.hp > 0;
}

/**
 * 获取存活的玩家单位
 */
function getAlivePlayerUnits(state: BattleState): UnitState[] {
  return state.playerUnits.filter(isUnitAlive);
}

/**
 * 获取存活的敌方单位
 */
function getAliveEnemyUnits(state: BattleState): UnitState[] {
  return state.enemyUnits.filter(isUnitAlive);
}

/**
 * 检查战斗是否结束
 * 这是 BattleScene.checkBattleEnd 方法的核心逻辑提取
 * Requirements: 3.7, 3.8, 3.9
 */
function checkBattleEnd(state: BattleState): BattleResult {
  const alivePlayerUnits = getAlivePlayerUnits(state);
  const aliveEnemyUnits = getAliveEnemyUnits(state);

  // Requirements 3.8: 敌方全灭，玩家胜利
  if (aliveEnemyUnits.length === 0) {
    return "player";
  }

  // Requirements 3.8: 玩家全灭，敌方胜利
  if (alivePlayerUnits.length === 0) {
    return "enemy";
  }

  // Requirements 3.9: 双方均有存活，战斗继续
  return null;
}

/**
 * 生成有效的单位状态
 */
const arbitraryUnitState = (isPlayer: boolean): fc.Arbitrary<UnitState> =>
  fc.record({
    id: fc.uuid(),
    hp: fc.integer({ min: -100, max: 1000 }), // 允许负数 HP（已死亡）
    isPlayer: fc.constant(isPlayer),
  });

/**
 * 生成玩家单位列表（1-6 个）
 */
const arbitraryPlayerUnits = (): fc.Arbitrary<UnitState[]> =>
  fc.array(arbitraryUnitState(true), { minLength: 1, maxLength: 6 });

/**
 * 生成敌方单位列表（1-6 个）
 */
const arbitraryEnemyUnits = (): fc.Arbitrary<UnitState[]> =>
  fc.array(arbitraryUnitState(false), { minLength: 1, maxLength: 6 });

/**
 * 生成战斗状态
 */
const arbitraryBattleState = (): fc.Arbitrary<BattleState> =>
  fc.record({
    playerUnits: arbitraryPlayerUnits(),
    enemyUnits: arbitraryEnemyUnits(),
  });

/**
 * 生成所有单位都死亡的单位列表
 */
const arbitraryDeadUnits = (isPlayer: boolean): fc.Arbitrary<UnitState[]> =>
  fc.array(
    fc.record({
      id: fc.uuid(),
      hp: fc.integer({ min: -100, max: 0 }), // HP <= 0
      isPlayer: fc.constant(isPlayer),
    }),
    { minLength: 1, maxLength: 6 },
  );

/**
 * 生成至少有一个存活单位的列表
 */
const arbitraryAliveUnits = (isPlayer: boolean): fc.Arbitrary<UnitState[]> =>
  fc.tuple(
    // 至少一个存活单位
    fc.record({
      id: fc.uuid(),
      hp: fc.integer({ min: 1, max: 1000 }), // HP > 0
      isPlayer: fc.constant(isPlayer),
    }),
    // 可能有其他单位（存活或死亡）
    fc.array(arbitraryUnitState(isPlayer), { minLength: 0, maxLength: 5 }),
  ).map(([alive, others]) => [alive, ...others]);

describe("胜负判定属性测试", () => {
  /**
   * Feature: turn-based-battle-game, Property 6: 胜负判定正确性
   * Validates: Requirements 3.7, 3.8
   *
   * *For any* 战斗状态，当敌方阵营的所有单位生命值均小于等于 0 时，
   * 战斗应结束并判定玩家获胜。
   */
  it("Property 6: 敌方全灭时应判定玩家胜利", () => {
    fc.assert(
      fc.property(
        arbitraryAliveUnits(true), // 玩家至少有一个存活
        arbitraryDeadUnits(false), // 敌方全部死亡
        (playerUnits, enemyUnits) => {
          const state: BattleState = { playerUnits, enemyUnits };
          const result = checkBattleEnd(state);

          // 敌方全灭，应判定玩家胜利
          expect(result).toBe("player");
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Feature: turn-based-battle-game, Property 6: 胜负判定正确性
   * Validates: Requirements 3.7, 3.8
   *
   * *For any* 战斗状态，当玩家阵营的所有单位生命值均小于等于 0 时，
   * 战斗应结束并判定敌方获胜。
   */
  it("Property 6: 玩家全灭时应判定敌方胜利", () => {
    fc.assert(
      fc.property(
        arbitraryDeadUnits(true), // 玩家全部死亡
        arbitraryAliveUnits(false), // 敌方至少有一个存活
        (playerUnits, enemyUnits) => {
          const state: BattleState = { playerUnits, enemyUnits };
          const result = checkBattleEnd(state);

          // 玩家全灭，应判定敌方胜利
          expect(result).toBe("enemy");
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Feature: turn-based-battle-game, Property 6: 胜负判定正确性
   * Validates: Requirements 3.9
   *
   * *For any* 战斗状态，当双方阵营均有存活单位时，
   * 战斗应继续（返回 null）。
   */
  it("Property 6: 双方均有存活时战斗应继续", () => {
    fc.assert(
      fc.property(
        arbitraryAliveUnits(true), // 玩家至少有一个存活
        arbitraryAliveUnits(false), // 敌方至少有一个存活
        (playerUnits, enemyUnits) => {
          const state: BattleState = { playerUnits, enemyUnits };
          const result = checkBattleEnd(state);

          // 双方均有存活，战斗应继续
          expect(result).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * 补充测试：双方同时全灭时应判定玩家胜利（敌方先检查）
   * 这是一个边界情况，根据实现逻辑，先检查敌方全灭
   */
  it("Property 6 补充: 双方同时全灭时应判定玩家胜利", () => {
    fc.assert(
      fc.property(
        arbitraryDeadUnits(true), // 玩家全部死亡
        arbitraryDeadUnits(false), // 敌方全部死亡
        (playerUnits, enemyUnits) => {
          const state: BattleState = { playerUnits, enemyUnits };
          const result = checkBattleEnd(state);

          // 根据实现逻辑，先检查敌方全灭，所以判定玩家胜利
          expect(result).toBe("player");
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * 补充测试：HP 恰好为 0 的单位应视为死亡
   */
  it("Property 6 补充: HP 恰好为 0 的单位应视为死亡", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            hp: fc.constant(0), // HP 恰好为 0
            isPlayer: fc.constant(true),
          }),
          { minLength: 1, maxLength: 6 },
        ),
        arbitraryAliveUnits(false),
        (playerUnits, enemyUnits) => {
          const state: BattleState = { playerUnits, enemyUnits };
          const result = checkBattleEnd(state);

          // 玩家所有单位 HP = 0，应判定敌方胜利
          expect(result).toBe("enemy");
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * 补充测试：HP 为负数的单位应视为死亡
   */
  it("Property 6 补充: HP 为负数的单位应视为死亡", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            hp: fc.integer({ min: -1000, max: -1 }), // HP 为负数
            isPlayer: fc.constant(false),
          }),
          { minLength: 1, maxLength: 6 },
        ),
        arbitraryAliveUnits(true),
        (enemyUnits, playerUnits) => {
          const state: BattleState = { playerUnits, enemyUnits };
          const result = checkBattleEnd(state);

          // 敌方所有单位 HP < 0，应判定玩家胜利
          expect(result).toBe("player");
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * 补充测试：只有一个存活单位时的判定
   */
  it("Property 6 补充: 只有一个存活单位时的正确判定", () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          hp: fc.integer({ min: 1, max: 1000 }),
          isPlayer: fc.constant(true),
        }),
        arbitraryDeadUnits(false),
        (alivePlayer, deadEnemies) => {
          const state: BattleState = {
            playerUnits: [alivePlayer],
            enemyUnits: deadEnemies,
          };
          const result = checkBattleEnd(state);

          // 玩家有一个存活，敌方全灭，应判定玩家胜利
          expect(result).toBe("player");
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * 补充测试：胜负判定的一致性（多次调用结果相同）
   */
  it("Property 6 补充: 胜负判定应具有一致性", () => {
    fc.assert(
      fc.property(arbitraryBattleState(), (state) => {
        const result1 = checkBattleEnd(state);
        const result2 = checkBattleEnd(state);
        const result3 = checkBattleEnd(state);

        // 多次调用应返回相同结果
        expect(result1).toBe(result2);
        expect(result2).toBe(result3);
      }),
      { numRuns: 100 },
    );
  });
});
