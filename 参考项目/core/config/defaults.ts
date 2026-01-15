/**
 * @file 设计器默认配置
 * @description 提供设计器中角色、特效、技能的默认配置和预设值
 */

import type {
  CharacterConfig,
  EffectConfig,
  SkillDesign,
  SkillStep,
} from "../designer/types";
import { DEFAULT_ACTOR_ID, DEFAULT_TARGET_IDS } from "./sandboxConfig";

/**
 * 创建默认目标选择表达式
 * @returns 包含敌人、盟友、自身目标数量的表达式对象
 * @description
 * - enemy: 敌人数量 = 等级 + 1
 * - ally: 盟友数量 = max(1, floor(等级 / 5))
 * - self: 自身数量 = 1
 */
const createDefaultTargetExpressions = () => ({
  enemy: "level + 1",
  ally: "Math.max(1, Math.floor(level / 5))",
  self: "1",
});

/**
 * 默认角色配置
 * @description 用于创建新角色时的默认值，使用本地精灵图资源
 */
export const DEFAULT_CHARACTER: CharacterConfig = {
  name: "新角色",
  url: location.href + "sprite_5x5.webp",
  rows: 5,
  cols: 5,
  frameCount: 22,
  scale: 1, // 默认缩放
  fps: 20, // 默认帧率12
};

/**
 * 默认敌人配置
 * @description 用于创建新敌人时的默认值，使用在线示例资源
 */
export const DEFAULT_ENEMY: CharacterConfig = {
  name: "魔物",
  url: "https://labs.phaser.io/assets/sprites/wizball.png",
  rows: 1,
  cols: 1,
  frameCount: 1,
  scale: 0.8, // 默认缩放
  fps: 12, // 默认帧率12
};

/**
 * 默认特效配置
 * @description 用于创建新特效时的默认值，使用在线示例资源
 */
export const DEFAULT_EFFECT: EffectConfig = {
  name: "新特效",
  url: "https://labs.phaser.io/assets/sprites/explosion.png",
  rows: 5,
  cols: 5,
  frameCount: 23,
  fps: 12, // 默认帧率12
};

/**
 * 创建默认技能设计
 * @returns 包含默认配置的技能设计对象
 * @description
 * - 默认技能名称为"新技能"
 * - 默认施法者为第一个玩家单位
 * - 默认目标为第一个敌人单位
 * - 默认等级为10，精通为30，熟练度为0
 * - 默认目标模式为敌人，随机范围1-2个
 * - 包含两个缩放公式：基础伤害和额外跳数
 */
export const createDefaultSkill = (): SkillDesign => ({
  name: "新技能",
  steps: [],
  context: {
    casterId: DEFAULT_ACTOR_ID,
    selectedTargetIds: [...DEFAULT_TARGET_IDS],
    level: 10,
    mastery: 30,
    proficiency: 0,
    notes: "请在此描述技能的设计意图及测试要点",
  },
  targeting: {
    modes: ["enemy"],
    randomRange: [1, 2],
    expressions: createDefaultTargetExpressions(),
  },
  scaling: [
    {
      id: "damage",
      label: "基础伤害",
      expression: "level * 12 + mastery * 4",
    },
    {
      id: "extra",
      label: "额外跳数",
      expression: "Math.floor(level / 15) + 1",
    },
  ],
});

/**
 * 技能步骤预设
 * @description 提供常用的技能步骤模板，方便快速创建技能
 * - move: 移动到目标位置（目标X-60，目标Y，持续300ms）
 * - damage: 造成50点伤害
 * - wait: 等待200ms
 * - effect: 在目标位置播放爆炸特效，并等待播放完成
 */
export const stepPresets: Record<string, SkillStep> = {
  move: {
    type: "move",
    params: { targetX: "targetX - 60", targetY: "targetY", duration: 300 },
  },
  damage: {
    type: "damage",
    params: { val: 50 },
  },
  wait: {
    type: "wait",
    params: { duration: 200 },
  },
  effect: {
    type: "effect",
    params: { key: "explosion", x: "targetX", y: "targetY", wait: true },
  },
};
