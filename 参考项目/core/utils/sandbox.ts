/**
 * @file 沙盒相关类型和工具函数
 * @description 定义沙盒单位的数据结构和查询函数
 */

/**
 * 沙盒单位阵营类型
 * 用于区分玩家和敌人单位
 */
export type SandboxSide = "player" | "enemy";

/**
 * 技能沙盒单位接口
 * 用于技能设计器中的测试单位数据
 */
export interface SkillSandboxUnit {
  /** 单位的唯一标识符 */
  id: string;
  /** 单位所属阵营（玩家或敌人） */
  side: SandboxSide;
  /** 单位名称 */
  name: string;
  /** 单位称号/描述 */
  title: string;
  /** 单位职业/角色类型 */
  role: "warrior" | "mage" | "support" | "dummy";
  /** 最大生命值 */
  maxHp: number;
  /** 当前生命值 */
  hp: number;
  /** 最大魔法值 */
  maxMp: number;
  /** 当前魔法值 */
  mp: number;
  /** 单位等级（当前也用作速度值） */
  level: number;
}

/**
 * 根据单位ID从数组中查找对应的沙盒单位
 *
 * @param id - 要查找的单位ID
 * @param units - 沙盒单位数组
 * @returns 找到的单位对象，如果未找到则返回 undefined
 *
 * @description
 * 此函数用于在沙盒单位数组中查找指定ID的单位。
 * 使用 Array.find() 方法，找到第一个匹配的单位即返回。
 *
 * 用途：在技能设计器中，需要根据单位ID获取单位的详细信息。
 */
export function getSandboxUnitById(
  id: string,
  units: SkillSandboxUnit[]
): SkillSandboxUnit | undefined {
  return units.find((unit) => unit.id === id);
}
