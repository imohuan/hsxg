/**
 * @file 角色数据转换工具
 * 将设计工坊的 CharacterConfig 转换为战斗用的 BattleUnit
 * Requirements: 7.4, 7.5
 */

import type { CharacterConfig, BattleUnit, SpriteConfig, AnimationConfig } from "@/types";
import { generateRandomStats, DEFAULT_STATS_RANGE } from "../utils/randomStats";
import type { StatsRange } from "../utils/randomStats";

/** 扩展的战斗单位（包含精灵图渲染信息） */
export interface BattleUnitExtended extends BattleUnit {
  /** 精灵图配置（来自设计工坊） */
  spriteConfig?: SpriteConfig;
  /** 动画配置列表 */
  animations?: AnimationConfig[];
  /** 当前动画帧索引 */
  currentFrame?: number;
  /** 是否处于防御状态 */
  isDefending?: boolean;
  /** 攻击力 */
  attack?: number;
  /** 防御力 */
  defense?: number;
  /** 幸运值 */
  luck?: number;
}

/**
 * 将设计工坊的 CharacterConfig 转换为战斗用的 BattleUnitExtended
 * Requirements: 7.4, 7.5
 * @param character 角色配置
 * @param isPlayer 是否为玩家阵营
 * @param statsRange 数值范围配置
 * @returns 战斗单位
 */
export function convertCharacterToBattleUnit(
  character: CharacterConfig,
  isPlayer: boolean,
  statsRange: StatsRange = DEFAULT_STATS_RANGE,
): BattleUnitExtended {
  const stats = generateRandomStats(statsRange);
  const prefix = isPlayer ? "player" : "enemy";
  const uniqueId = `${prefix}_${character.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  return {
    // 基础信息
    id: uniqueId,
    name: character.name,

    // 战斗数值
    hp: stats.hp,
    maxHp: stats.maxHp,
    mp: stats.mp,
    maxMp: stats.maxMp,
    speed: stats.speed,
    attack: stats.attack,
    defense: stats.defense,
    luck: stats.luck,

    // 状态
    isDead: false,
    selectable: true,
    isDefending: false,
    currentFrame: 0,

    // 保留精灵图和动画配置 (Requirements: 7.4, 7.5)
    sprite: character.sprite,
    spriteConfig: character.sprite,
    animations: character.animations,
  };
}

/**
 * 批量转换角色列表
 * @param characters 角色配置列表
 * @param isPlayer 是否为玩家阵营
 * @param statsRange 数值范围配置
 * @returns 战斗单位列表
 */
export function convertCharactersToBattleUnits(
  characters: CharacterConfig[],
  isPlayer: boolean,
  statsRange: StatsRange = DEFAULT_STATS_RANGE,
): BattleUnitExtended[] {
  return characters.map((char) => convertCharacterToBattleUnit(char, isPlayer, statsRange));
}

/**
 * 角色数据转换 Composable
 * 提供响应式的角色转换功能
 */
export function useCharacterConverter() {
  return {
    convertCharacterToBattleUnit,
    convertCharactersToBattleUnits,
    DEFAULT_STATS_RANGE,
  };
}
