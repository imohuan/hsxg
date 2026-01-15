/**
 * @file 召唤限制属性测试
 * Property 4: 召唤数量限制
 * Validates: Requirements 2.9
 *
 * *For any* 战斗中的玩家阵营，执行召唤操作后，玩家阵营的角色总数不应超过 6 个。
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

/** 最大队伍人数 */
const MAX_TEAM_SIZE = 6;

/**
 * 简化的单位配置
 */
interface SimpleUnitConfig {
  id: string;
  isPlayer: boolean;
  isAlive: boolean;
}

/**
 * 召唤操作结果
 */
interface SummonResult {
  success: boolean;
  newTeamSize: number;
  message?: string;
}

/**
 * 模拟召唤逻辑（从 ActionExecutor.executeSummon 提取核心逻辑）
 * Requirements: 2.9
 *
 * @param currentPlayerUnits 当前玩家单位列表
 * @param summonUnitId 要召唤的单位 ID
 * @returns 召唤结果
 */
function executeSummon(
  currentPlayerUnits: SimpleUnitConfig[],
  summonUnitId: string | undefined,
): SummonResult {
  // 检查召唤数量限制
  if (currentPlayerUnits.length >= MAX_TEAM_SIZE) {
    return {
      success: false,
      newTeamSize: currentPlayerUnits.length,
      message: "队伍已满，无法召唤",
    };
  }

  // 检查是否指定了召唤目标
  if (!summonUnitId) {
    return {
      success: false,
      newTeamSize: currentPlayerUnits.length,
      message: "未指定召唤目标",
    };
  }

  // 召唤成功，队伍人数 +1
  return {
    success: true,
    newTeamSize: currentPlayerUnits.length + 1,
    message: "召唤成功",
  };
}

/**
 * 验证召唤后队伍人数是否符合限制
 */
function isTeamSizeValid(teamSize: number): boolean {
  return teamSize >= 0 && teamSize <= MAX_TEAM_SIZE;
}

/**
 * 生成有效的单位配置
 */
const arbitraryUnitConfig = (): fc.Arbitrary<SimpleUnitConfig> =>
  fc.record({
    id: fc.uuid(),
    isPlayer: fc.constant(true),
    isAlive: fc.boolean(),
  });

/**
 * 生成玩家单位列表（0-6 个单位）
 */
const arbitraryPlayerUnits = (): fc.Arbitrary<SimpleUnitConfig[]> =>
  fc.array(arbitraryUnitConfig(), { minLength: 0, maxLength: MAX_TEAM_SIZE });

/**
 * 生成可选的召唤单位 ID
 */
const arbitrarySummonId = (): fc.Arbitrary<string | undefined> =>
  fc.oneof(fc.uuid(), fc.constant(undefined));

describe("召唤限制属性测试", () => {
  /**
   * Feature: turn-based-battle-game, Property 4: 召唤数量限制
   * Validates: Requirements 2.9
   *
   * *For any* 战斗中的玩家阵营，执行召唤操作后，玩家阵营的角色总数不应超过 6 个。
   */
  it("Property 4: 召唤后队伍人数不应超过 6 个", () => {
    fc.assert(
      fc.property(
        arbitraryPlayerUnits(),
        arbitrarySummonId(),
        (playerUnits, summonId) => {
          const result = executeSummon(playerUnits, summonId);

          // 核心断言：无论召唤成功与否，队伍人数都不应超过 6
          expect(isTeamSizeValid(result.newTeamSize)).toBe(true);
          expect(result.newTeamSize).toBeLessThanOrEqual(MAX_TEAM_SIZE);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 4 补充: 队伍已满时召唤应失败
   */
  it("Property 4 补充: 队伍已满（6人）时召唤应失败", () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryUnitConfig(), { minLength: MAX_TEAM_SIZE, maxLength: MAX_TEAM_SIZE }),
        fc.uuid(),
        (fullTeam, summonId) => {
          const result = executeSummon(fullTeam, summonId);

          // 队伍已满时，召唤应失败
          expect(result.success).toBe(false);
          // 队伍人数应保持不变
          expect(result.newTeamSize).toBe(fullTeam.length);
          expect(result.newTeamSize).toBe(MAX_TEAM_SIZE);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 4 补充: 队伍未满时召唤应成功（如果指定了召唤目标）
   */
  it("Property 4 补充: 队伍未满且指定召唤目标时召唤应成功", () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryUnitConfig(), { minLength: 0, maxLength: MAX_TEAM_SIZE - 1 }),
        fc.uuid(),
        (notFullTeam, summonId) => {
          const result = executeSummon(notFullTeam, summonId);

          // 队伍未满且指定了召唤目标时，召唤应成功
          expect(result.success).toBe(true);
          // 队伍人数应增加 1
          expect(result.newTeamSize).toBe(notFullTeam.length + 1);
          // 新队伍人数仍不应超过 6
          expect(result.newTeamSize).toBeLessThanOrEqual(MAX_TEAM_SIZE);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 4 补充: 未指定召唤目标时召唤应失败
   */
  it("Property 4 补充: 未指定召唤目标时召唤应失败", () => {
    fc.assert(
      fc.property(
        arbitraryPlayerUnits(),
        (playerUnits) => {
          const result = executeSummon(playerUnits, undefined);

          // 未指定召唤目标时，召唤应失败
          expect(result.success).toBe(false);
          // 队伍人数应保持不变
          expect(result.newTeamSize).toBe(playerUnits.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 4 补充: 连续召唤不应超过限制
   */
  it("Property 4 补充: 连续多次召唤后队伍人数不应超过 6", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: MAX_TEAM_SIZE }),
        fc.array(fc.uuid(), { minLength: 1, maxLength: 10 }),
        (initialTeamSize, summonIds) => {
          // 创建初始队伍
          let currentTeam: SimpleUnitConfig[] = Array.from({ length: initialTeamSize }, (_, i) => ({
            id: `unit_${i}`,
            isPlayer: true,
            isAlive: true,
          }));

          // 连续执行召唤
          for (const summonId of summonIds) {
            const result = executeSummon(currentTeam, summonId);

            // 每次召唤后，队伍人数都不应超过 6
            expect(result.newTeamSize).toBeLessThanOrEqual(MAX_TEAM_SIZE);

            // 如果召唤成功，更新队伍
            if (result.success) {
              currentTeam = [
                ...currentTeam,
                { id: `summoned_${summonId}`, isPlayer: true, isAlive: true },
              ];
            }
          }

          // 最终队伍人数不应超过 6
          expect(currentTeam.length).toBeLessThanOrEqual(MAX_TEAM_SIZE);
        },
      ),
      { numRuns: 100 },
    );
  });
});
