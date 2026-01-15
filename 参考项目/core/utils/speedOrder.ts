/**
 * @file 速度顺序计算工具函数
 * @description 统一管理单位速度排序、阵营分离和位置排序等工具函数
 */

import type { BattleUnitConfig } from "../game/config";
import type { SkillSandboxUnit } from "./sandbox";
import { getUnitStats } from "./unitData";

/**
 * 带速度信息的单位接口
 * 用于在排序过程中临时存储单位配置和速度值
 */
export interface UnitWithSpeed {
  /** 单位配置 */
  config: BattleUnitConfig;
  /** 单位速度值 */
  speed: number;
}

/**
 * 计算所有单位的速度顺序映射
 *
 * @param units - 单位配置列表
 * @param sandboxUnits - 沙盒单位数据（用于获取速度值）
 * @returns 单位ID到速度顺序的映射表，速度顺序从 1 开始（1 为最快）
 *
 * @description
 * 此函数计算所有单位的行动顺序，流程如下：
 * 1. 从沙盒单位数据中获取每个单位的速度值
 * 2. 按速度降序排序（速度快的排在前面）
 * 3. 为每个单位分配速度顺序（从 1 开始）
 *
 * 用途：在战斗系统中，速度快的单位先行动，此函数用于确定行动顺序。
 */
export function calculateSpeedOrder(
  units: BattleUnitConfig[],
  sandboxUnits: SkillSandboxUnit[]
): Map<string, number> {
  const speedOrderMap = new Map<string, number>();

  // 第一步：为每个单位获取速度值
  const unitsWithSpeed: UnitWithSpeed[] = units.map((config) => {
    const stats = getUnitStats(config.id, sandboxUnits);
    return { config, speed: stats.speed };
  });

  // 第二步：按速度降序排序（速度快的在前）
  unitsWithSpeed.sort((a, b) => b.speed - a.speed);

  // 第三步：分配速度顺序（从 1 开始，1 为最快）
  unitsWithSpeed.forEach(({ config }, index) => {
    if (config.id) {
      // 速度顺序从 1 开始，所以使用 index + 1
      speedOrderMap.set(config.id, index + 1);
    }
  });

  return speedOrderMap;
}

/**
 * 按阵营分离单位
 *
 * @param units - 单位配置数组
 * @returns 分离后的玩家和敌人单位数组
 *
 * @description
 * 此函数将单位数组按阵营（玩家/敌人）分成两个数组。
 * 用于在战斗场景中分别处理玩家和敌人单位。
 */
export function separateUnitsBySide(units: BattleUnitConfig[]): {
  players: BattleUnitConfig[];
  enemies: BattleUnitConfig[];
} {
  const players: BattleUnitConfig[] = [];
  const enemies: BattleUnitConfig[] = [];

  // 遍历所有单位，根据 isPlayer 属性分类
  for (const unit of units) {
    if (unit.isPlayer) {
      players.push(unit);
    } else {
      enemies.push(unit);
    }
  }

  return { players, enemies };
}

/**
 * 按 Y 坐标排序单位（用于渲染顺序）
 *
 * @param units - 单位配置数组
 * @returns 按 Y 坐标升序排序后的单位数组（底部单位在最后）
 *
 * @description
 * 此函数按单位的 Y 坐标进行排序，Y 值小的单位排在前面。
 * 在渲染时，后面的单位会覆盖前面的单位，所以底部单位（Y 值大）应该最后渲染，
 * 这样它们会显示在最上层，符合视觉逻辑。
 */
export function sortUnitsByYPosition(
  units: BattleUnitConfig[]
): BattleUnitConfig[] {
  // 创建数组副本并排序，避免修改原数组
  return [...units].sort((a, b) => a.position.y - b.position.y);
}
