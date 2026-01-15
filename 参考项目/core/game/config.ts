/**
 * @file 战斗 JSON 配置类型
 * @description 定义战斗场景的配置数据结构
 */

import type {
  CharacterConfig,
  EffectConfig,
  SkillDesign,
} from "../designer/types";

/**
 * 战斗单位配置接口
 * @description 定义战斗场景中一个单位的配置信息
 */
export interface BattleUnitConfig {
  /** 单位唯一标识符（可选） */
  id?: string;
  /** 单位名称 */
  name: string;
  /** 单位在战斗场景中的位置坐标 */
  position: { x: number; y: number };
  /** 单位的精灵图配置 */
  sprite: CharacterConfig;
  /** 是否为玩家单位（true=玩家，false=敌人） */
  isPlayer?: boolean;
}

/**
 * 战斗JSON配置接口
 * @description 完整的战斗场景配置，包含所有单位、技能和特效
 */
export interface BattleJSONConfig {
  /** 玩家单位列表 */
  players: BattleUnitConfig[];
  /** 敌人单位列表 */
  enemies: BattleUnitConfig[];
  /** 技能列表（可选） */
  skills?: SkillDesign[];
  /** 特效列表（可选） */
  effects?: EffectConfig[];
}
