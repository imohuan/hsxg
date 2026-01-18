/**
 * @file 目标选择策略插件系统
 * @description 提供可插拔的目标选择逻辑，通过策略模式实现不同的选择行为
 */
import type { SkillTargetConfig, SkillTargetScope } from "@/types";
import type { SkillSandboxUnit } from "./sandboxConfig";
import { getSandboxUnitById } from "./sandboxConfig";

/** 选择上下文 */
export interface SelectionContext {
  /** 当前施法者 ID */
  casterId: string;
  /** 已选中的目标 ID 列表 */
  selectedIds: string[];
  /** 技能目标配置 */
  config: SkillTargetConfig;
  /** 点击的单位 ID */
  clickedUnitId: string;
}

/** 选择结果 */
export interface SelectionResult {
  /** 新的选中目标 ID 列表 */
  selectedIds: string[];
  /** 是否有变化 */
  changed: boolean;
}

/** 选择策略接口 */
export interface SelectionStrategy {
  /** 策略名称 */
  name: string;
  /** 处理单位点击 */
  handleUnitClick(context: SelectionContext): SelectionResult;
  /** 验证单位是否可选 */
  isUnitSelectable(unit: SkillSandboxUnit, context: Omit<SelectionContext, "clickedUnitId">): boolean;
}

// ============ 工具函数 ============

/** 检查单位是否在允许的目标范围内 */
function isInTargetScope(
  unit: SkillSandboxUnit,
  casterId: string,
  targetScope: SkillTargetScope[],
): boolean {
  if (unit.id === casterId) {
    return targetScope.includes("self");
  }
  if (unit.side === "enemy") {
    return targetScope.includes("enemy");
  }
  if (unit.side === "player") {
    return targetScope.includes("ally");
  }
  return false;
}

// ============ 默认策略：单选 ============

export const singleSelectStrategy: SelectionStrategy = {
  name: "single",

  isUnitSelectable(unit, context) {
    return isInTargetScope(unit, context.casterId, context.config.targetScope);
  },

  handleUnitClick(context) {
    const { clickedUnitId, selectedIds, casterId, config } = context;
    const unit = getSandboxUnitById(clickedUnitId);

    // 验证单位是否可选
    if (!unit || !isInTargetScope(unit, casterId, config.targetScope)) {
      return { selectedIds, changed: false };
    }

    // 单选：点击已选中的取消，否则替换
    if (selectedIds.includes(clickedUnitId)) {
      return { selectedIds: [], changed: true };
    }

    return { selectedIds: [clickedUnitId], changed: true };
  },
};

// ============ 多选策略：无限制 ============

export const multiSelectStrategy: SelectionStrategy = {
  name: "multi",

  isUnitSelectable(unit, context) {
    return isInTargetScope(unit, context.casterId, context.config.targetScope);
  },

  handleUnitClick(context) {
    const { clickedUnitId, selectedIds, casterId, config } = context;
    const unit = getSandboxUnitById(clickedUnitId);

    // 验证单位是否可选
    if (!unit || !isInTargetScope(unit, casterId, config.targetScope)) {
      return { selectedIds, changed: false };
    }

    // 多选：切换选中状态
    if (selectedIds.includes(clickedUnitId)) {
      return {
        selectedIds: selectedIds.filter((id) => id !== clickedUnitId),
        changed: true,
      };
    }

    return {
      selectedIds: [...selectedIds, clickedUnitId],
      changed: true,
    };
  },
};

// ============ 限制数量策略 ============

export const limitedSelectStrategy: SelectionStrategy = {
  name: "limited",

  isUnitSelectable(unit, context) {
    return isInTargetScope(unit, context.casterId, context.config.targetScope);
  },

  handleUnitClick(context) {
    const { clickedUnitId, selectedIds, casterId, config } = context;
    const unit = getSandboxUnitById(clickedUnitId);
    const maxCount = config.targetCount;

    // 验证单位是否可选
    if (!unit || !isInTargetScope(unit, casterId, config.targetScope)) {
      return { selectedIds, changed: false };
    }

    // 已选中：取消选择
    if (selectedIds.includes(clickedUnitId)) {
      return {
        selectedIds: selectedIds.filter((id) => id !== clickedUnitId),
        changed: true,
      };
    }

    // 未达上限：添加
    if (selectedIds.length < maxCount) {
      return {
        selectedIds: [...selectedIds, clickedUnitId],
        changed: true,
      };
    }

    // 已达上限：替换最早选中的
    return {
      selectedIds: [...selectedIds.slice(1), clickedUnitId],
      changed: true,
    };
  },
};

// ============ 策略工厂 ============

/** 根据配置获取对应的选择策略 */
export function getSelectionStrategy(config: SkillTargetConfig): SelectionStrategy {
  const { targetCount } = config;

  if (targetCount === 1) {
    return singleSelectStrategy;
  }

  if (targetCount === 0) {
    return multiSelectStrategy;
  }

  return limitedSelectStrategy;
}

// ============ 策略管理器 ============

/** 自定义策略注册表 */
const customStrategies = new Map<string, SelectionStrategy>();

/** 注册自定义选择策略 */
export function registerSelectionStrategy(strategy: SelectionStrategy): void {
  customStrategies.set(strategy.name, strategy);
}

/** 获取已注册的策略 */
export function getRegisteredStrategy(name: string): SelectionStrategy | undefined {
  return customStrategies.get(name);
}

/** 获取所有已注册的策略名称 */
export function getRegisteredStrategyNames(): string[] {
  return Array.from(customStrategies.keys());
}
