/**
 * @file 技能沙盒配置数据
 * @description 定义技能设计器中使用的测试单位数据
 */

import type { SkillSandboxUnit } from "../utils/sandbox";

/**
 * 默认施法者ID
 * @description 技能设计器中默认选中的施法者单位
 */
export const DEFAULT_ACTOR_ID = "player-front-1";

/**
 * 默认目标ID列表
 * @description 技能设计器中默认选中的目标单位列表
 */
export const DEFAULT_TARGET_IDS = ["enemy-front-1"];

/**
 * 技能编排沙盒单位数据
 * @description 包含玩家和敌人的测试单位，用于技能设计器的预览和测试
 *
 * 单位结构说明：
 * - id: 单位唯一标识符
 * - side: 单位阵营（player=玩家，enemy=敌人）
 * - name: 单位名称
 * - title: 单位称号/描述
 * - role: 单位角色（warrior=战士，mage=法师，support=辅助，dummy=稻草人）
 * - maxHp/hp: 最大生命值/当前生命值
 * - maxMp/mp: 最大魔法值/当前魔法值
 * - level: 单位等级
 */
export const SKILL_SANDBOX_UNITS: SkillSandboxUnit[] = [
  {
    id: "enemy-front-1",
    side: "enemy",
    name: "稻草人·甲",
    title: "前排拦截",
    role: "dummy",
    maxHp: 520,
    hp: 520,
    maxMp: 0,
    mp: 0,
    level: 12,
  },
  {
    id: "enemy-front-2",
    side: "enemy",
    name: "稻草人·乙",
    title: "前排磐石",
    role: "dummy",
    maxHp: 520,
    hp: 520,
    maxMp: 0,
    mp: 0,
    level: 12,
  },
  {
    id: "enemy-back-1",
    side: "enemy",
    name: "稻草人·丙",
    title: "后排靶子",
    role: "dummy",
    maxHp: 380,
    hp: 380,
    maxMp: 0,
    mp: 0,
    level: 12,
  },
  {
    id: "player-back-1",
    side: "player",
    name: "豪杰·弓手",
    title: "后排输出",
    role: "support",
    maxHp: 410,
    hp: 410,
    maxMp: 220,
    mp: 220,
    level: 15,
  },
  {
    id: "player-front-1",
    side: "player",
    name: "豪杰·剑士",
    title: "前排主角",
    role: "warrior",
    maxHp: 560,
    hp: 560,
    maxMp: 160,
    mp: 160,
    level: 15,
  },
  {
    id: "player-front-2",
    side: "player",
    name: "豪杰·医者",
    title: "前排辅助",
    role: "support",
    maxHp: 430,
    hp: 430,
    maxMp: 300,
    mp: 300,
    level: 15,
  },
];
