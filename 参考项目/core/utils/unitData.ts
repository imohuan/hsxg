/**
 * @file 单位数据工具函数
 * @description 统一管理从沙盒单位获取数据的逻辑，提供单位统计数据的查询接口
 */

import type { SkillSandboxUnit } from "./sandbox";
import { getSandboxUnitById } from "./sandbox";
import type { UnitStats } from "../config/types";
import { DEFAULT_STATS } from "../config/battleConfig";

/**
 * 从沙盒单位数据中获取单位统计数据
 *
 * @param unitId - 单位ID，如果为 undefined 则返回默认值
 * @param sandboxUnits - 沙盒单位数组，用于查找单位数据
 * @returns 单位统计数据对象
 *
 * @description
 * 此函数根据单位ID从沙盒单位数组中查找对应的单位数据，
 * 并提取其战斗属性。如果找不到单位或ID无效，返回默认值。
 *
 * 注意：当前使用 level 作为 speed，后续可能需要调整。
 */
export function getUnitStats(
  unitId: string | undefined,
  sandboxUnits: SkillSandboxUnit[]
): UnitStats {
  // 如果单位ID无效，直接返回默认值
  if (!unitId) {
    return DEFAULT_STATS;
  }

  // 从沙盒单位数组中查找对应ID的单位
  const sandboxUnit = getSandboxUnitById(unitId, sandboxUnits);

  // 如果找不到单位，返回默认值
  if (!sandboxUnit) {
    return DEFAULT_STATS;
  }

  // 提取单位统计数据，使用空值合并运算符提供默认值
  return {
    hp: sandboxUnit.hp ?? DEFAULT_STATS.hp,
    maxHp: sandboxUnit.maxHp ?? DEFAULT_STATS.maxHp,
    mp: sandboxUnit.mp ?? DEFAULT_STATS.mp,
    maxMp: sandboxUnit.maxMp ?? DEFAULT_STATS.maxMp,
    // TODO: 暂时使用 level 作为速度，后续可能需要单独的速度属性
    speed: sandboxUnit.level ?? DEFAULT_STATS.speed,
  };
}

/**
 * 批量获取多个单位的统计数据
 *
 * @param unitIds - 单位ID数组（可能包含 undefined）
 * @param sandboxUnits - 沙盒单位数组
 * @returns 单位ID到统计数据的映射表
 *
 * @description
 * 此函数用于一次性获取多个单位的统计数据，返回一个 Map 对象。
 * 只有有效的单位ID（非 undefined）才会被处理。
 *
 * 使用场景：在战斗初始化时，需要获取所有单位的统计数据。
 */
export function getBatchUnitStats(
  unitIds: (string | undefined)[],
  sandboxUnits: SkillSandboxUnit[]
): Map<string, UnitStats> {
  const statsMap = new Map<string, UnitStats>();

  // 遍历所有单位ID，为每个有效ID获取统计数据
  for (const id of unitIds) {
    if (id) {
      statsMap.set(id, getUnitStats(id, sandboxUnits));
    }
  }

  return statsMap;
}
