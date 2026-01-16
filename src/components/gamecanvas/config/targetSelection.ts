/**
 * 目标选择规则配置
 * 定义不同行动类型可以选择的目标范围
 */

// ============ 目标选择范围 ============

/** 目标选择范围类型 */
export type TargetScope = "enemy" | "ally" | "both" | "self" | "all";

/** 目标选择规则 */
export interface TargetSelectionRule {
  /** 可选择的目标范围 */
  scope: TargetScope;
  /** 是否允许选择死亡单位 */
  allowDead?: boolean;
  /** 是否允许选择自己 */
  allowSelf?: boolean;
  /** 最小选择数量 */
  minTargets?: number;
  /** 最大选择数量 */
  maxTargets?: number;
}

// ============ 默认行动目标规则 ============

/** 攻击目标规则：只能选择敌方存活单位 */
export const ATTACK_TARGET_RULE: TargetSelectionRule = {
  scope: "enemy",
  allowDead: false,
  allowSelf: false,
  minTargets: 1,
  maxTargets: 1,
};

/** 防御目标规则：无需选择目标（自身） */
export const DEFEND_TARGET_RULE: TargetSelectionRule = {
  scope: "self",
  allowDead: false,
  allowSelf: true,
  minTargets: 0,
  maxTargets: 0,
};

/** 逃跑目标规则：无需选择目标 */
export const ESCAPE_TARGET_RULE: TargetSelectionRule = {
  scope: "self",
  allowDead: false,
  allowSelf: false,
  minTargets: 0,
  maxTargets: 0,
};

/** 物品目标规则：只能选择我方存活单位 */
export const ITEM_TARGET_RULE: TargetSelectionRule = {
  scope: "ally",
  allowDead: false,
  allowSelf: true,
  minTargets: 1,
  maxTargets: 1,
};

/** 召唤目标规则：无需选择目标 */
export const SUMMON_TARGET_RULE: TargetSelectionRule = {
  scope: "self",
  allowDead: false,
  allowSelf: false,
  minTargets: 0,
  maxTargets: 0,
};

// ============ 技能目标范围类型 ============

/** 技能目标范围配置（用于技能定义） */
export interface SkillTargetConfig {
  /** 目标范围 */
  scope: TargetScope;
  /** 是否允许选择死亡单位（如复活技能） */
  allowDead?: boolean;
  /** 是否允许选择自己 */
  allowSelf?: boolean;
  /** 选择数量（1 = 单体，-1 = 全体） */
  count?: number;
}

/** 默认技能目标配置（单体敌方） */
export const DEFAULT_SKILL_TARGET: SkillTargetConfig = {
  scope: "enemy",
  allowDead: false,
  allowSelf: false,
  count: 1,
};

// ============ 行动类型到目标规则的映射 ============

import type { ActionType } from "@/types";

/** 行动类型对应的默认目标规则 */
export const ACTION_TARGET_RULES: Record<ActionType, TargetSelectionRule> = {
  attack: ATTACK_TARGET_RULE,
  skill: { scope: "both", allowDead: false, allowSelf: true }, // 技能默认双方可选，具体由技能配置决定
  item: ITEM_TARGET_RULE,
  defend: DEFEND_TARGET_RULE,
  escape: ESCAPE_TARGET_RULE,
  summon: SUMMON_TARGET_RULE,
};

// ============ 工具函数 ============

import type { BattleUnit } from "@/types";

/**
 * 根据目标规则过滤可选单位
 * @param units 所有单位
 * @param rule 目标选择规则
 * @param actorId 当前行动者 ID
 * @param actorIsPlayer 当前行动者是否为我方
 */
export function filterSelectableUnits(
  units: BattleUnit[],
  rule: TargetSelectionRule,
  actorId: string,
  actorIsPlayer: boolean,
): BattleUnit[] {
  return units.filter((unit) => {
    // 检查死亡状态
    if (!rule.allowDead && unit.isDead) {
      return false;
    }

    // 检查是否为自己
    if (unit.id === actorId && !rule.allowSelf) {
      return false;
    }

    // 检查阵营
    const isAlly = unit.isPlayer === actorIsPlayer;
    const isEnemy = !isAlly;

    switch (rule.scope) {
      case "enemy":
        return isEnemy;
      case "ally":
        return isAlly;
      case "self":
        return unit.id === actorId;
      case "both":
      case "all":
        return true;
      default:
        return false;
    }
  });
}

/**
 * 获取默认选中目标
 * @param selectableUnits 可选单位列表
 * @param rule 目标选择规则
 * @param actorIsPlayer 当前行动者是否为我方
 */
export function getDefaultTarget(
  selectableUnits: BattleUnit[],
  rule: TargetSelectionRule,
  actorIsPlayer: boolean,
): BattleUnit | null {
  if (selectableUnits.length === 0) return null;

  // 根据范围决定默认选择
  switch (rule.scope) {
    case "enemy":
      // 攻击类：选择第一个敌方
      return selectableUnits[0] || null;
    case "ally":
      // 辅助类：选择第一个友方（通常是自己或血量最低的）
      return selectableUnits[0] || null;
    case "self":
      // 自身类：无需选择
      return null;
    case "both":
    case "all":
      // 双方可选：默认选择敌方第一个
      return selectableUnits.find((u) => u.isPlayer !== actorIsPlayer) || selectableUnits[0] || null;
    default:
      return selectableUnits[0] || null;
  }
}

/**
 * 检查目标是否需要选择
 */
export function needsTargetSelection(rule: TargetSelectionRule): boolean {
  return rule.scope !== "self" && (rule.minTargets ?? 1) > 0;
}

/**
 * 获取目标选择提示文本
 */
export function getTargetSelectionHint(rule: TargetSelectionRule): string {
  switch (rule.scope) {
    case "enemy":
      return "请选择敌方目标";
    case "ally":
      return "请选择我方目标";
    case "self":
      return "";
    case "both":
    case "all":
      return "请选择目标";
    default:
      return "请选择目标";
  }
}
