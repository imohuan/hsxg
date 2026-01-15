/**
 * @file 战斗配置生成工具函数
 * @description 负责将沙盒单位数据转换为战斗场景所需的配置格式
 */

import type { BattleJSONConfig, BattleUnitConfig } from "../game/config";
import type { CharacterConfig } from "../designer/types";
import type { SkillSandboxUnit } from "./sandbox";
import { DEFAULT_CHARACTER, DEFAULT_ENEMY } from "../config/defaults";
import { calculateStaggeredPositions } from "./position";

/**
 * 从沙盒单位数据创建战斗单位配置
 *
 * @param unit - 沙盒单位数据（包含ID、名称、阵营等信息）
 * @param position - 单位在画布上的位置坐标 {x, y}
 * @param spriteConfig - 可选的精灵图配置，如果不提供则使用默认配置
 * @returns 战斗单位配置对象
 *
 * @description
 * 此函数将沙盒单位数据转换为战斗场景需要的单位配置格式。
 * 会根据单位阵营（玩家/敌人）自动选择合适的默认精灵图。
 */
export function createBattleUnitConfig(
  unit: SkillSandboxUnit,
  position: { x: number; y: number },
  spriteConfig?: CharacterConfig
): BattleUnitConfig {
  // 如果没有提供精灵图配置，则根据阵营获取默认配置
  // 玩家单位使用玩家默认精灵图，敌人使用敌人默认精灵图
  const sprite =
    spriteConfig ||
    (unit.side === "player" ? DEFAULT_CHARACTER : DEFAULT_ENEMY);

  return {
    id: unit.id,
    name: unit.name,
    position,
    sprite: {
      id: unit.id,
      ...sprite,
      // 确保使用单位名称覆盖精灵图配置中的名称
      name: unit.name,
    },
    isPlayer: unit.side === "player",
  };
}

/**
 * 从沙盒单位列表生成完整的战斗配置
 *
 * @param units - 沙盒单位数组
 * @param canvasWidth - 画布宽度，默认 800
 * @param canvasHeight - 画布高度，默认 600
 * @param skills - 技能列表，默认为空数组
 * @param effects - 特效列表，默认为空数组
 * @returns 完整的战斗JSON配置对象
 *
 * @description
 * 此函数是战斗配置生成的主入口，主要流程：
 * 1. 将单位按阵营分组（玩家/敌人）
 * 2. 为每个阵营计算交错站位
 * 3. 为每个单位创建配置并分配到对应阵营
 * 4. 返回包含所有单位、技能、特效的完整配置
 */
export function generateBattleConfigFromSandbox(
  units: SkillSandboxUnit[],
  canvasWidth: number = 800,
  canvasHeight: number = 600,
  skills: BattleJSONConfig["skills"] = [],
  effects: BattleJSONConfig["effects"] = []
): BattleJSONConfig {
  // 按阵营分组单位
  const playerUnits = units.filter((u) => u.side === "player");
  const enemyUnits = units.filter((u) => u.side === "enemy");

  // 分别计算玩家和敌人的站位
  // 站位采用交错布局，使画面更有层次感
  const playerPositions = calculateStaggeredPositions(
    playerUnits,
    canvasWidth,
    canvasHeight
  );
  const enemyPositions = calculateStaggeredPositions(
    enemyUnits,
    canvasWidth,
    canvasHeight
  );

  // 初始化配置对象
  const config: BattleJSONConfig = {
    players: [],
    enemies: [],
    skills,
    effects,
  };

  // 遍历所有单位，为每个单位创建配置并分配到对应阵营
  for (const unit of units) {
    // 根据单位阵营获取对应的站位
    const positionMap =
      unit.side === "player" ? playerPositions : enemyPositions;
    const position = positionMap.get(unit.id) || { x: 0, y: 0 };

    // 创建单位配置
    const unitConfig = createBattleUnitConfig(unit, position);

    // 根据阵营添加到对应数组
    if (unit.side === "player") {
      config.players.push(unitConfig);
    } else {
      config.enemies.push(unitConfig);
    }
  }

  return config;
}
