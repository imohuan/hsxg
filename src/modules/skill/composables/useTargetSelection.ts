/**
 * @file 目标选择 Hook
 * @description 管理技能目标选择逻辑，支持插件化策略
 */
import { ref, computed, watch } from "vue";
import type { SkillTargetConfig, SkillTargetScope } from "@/types";
import type { SkillSandboxUnit } from "../core/sandboxConfig";
import { getSandboxUnitById, SKILL_SANDBOX_UNITS } from "../core/sandboxConfig";
import {
  getSelectionStrategy,
  type SelectionStrategy,
  type SelectionContext,
} from "../core/selectionStrategies";

export interface UseTargetSelectionOptions {
  /** 施法者 ID */
  casterId: string;
  /** 初始目标配置 */
  initialConfig?: SkillTargetConfig;
  /** 配置变更回调 */
  onConfigChange?: (config: SkillTargetConfig) => void;
  /** 选择变更回调 */
  onSelectionChange?: (selectedIds: string[]) => void;
}

/** 默认配置 */
const DEFAULT_CONFIG: SkillTargetConfig = {
  isNormalAttack: false,
  targetRole: "any",
  targetScope: ["enemy"],
  targetCount: 1,
};

export function useTargetSelection(options: UseTargetSelectionOptions) {
  const { casterId, initialConfig, onConfigChange, onSelectionChange } = options;

  // ============ 状态 ============

  const config = ref<SkillTargetConfig>(initialConfig ?? { ...DEFAULT_CONFIG });
  const selectedTargetIds = ref<string[]>([]);
  const currentStrategy = ref<SelectionStrategy>(getSelectionStrategy(config.value));

  // ============ 计算属性 ============

  /** 当前选择模式描述 */
  const selectionModeLabel = computed(() => {
    const count = config.value.targetCount;
    if (count === 0) return "多选";
    if (count === 1) return "单选";
    return `最多 ${count} 个`;
  });

  /** 可选目标范围 */
  const targetingModes = computed<SkillTargetScope[]>(() => {
    return [...config.value.targetScope];
  });

  /** 获取所有可选单位 */
  const selectableUnits = computed(() => {
    const context = {
      casterId,
      selectedIds: selectedTargetIds.value,
      config: config.value,
    };
    return SKILL_SANDBOX_UNITS.filter((unit) =>
      currentStrategy.value.isUnitSelectable(unit, context),
    );
  });

  // ============ 方法 ============

  /** 处理单位点击 */
  function handleUnitClick(unitId: string): void {
    const context: SelectionContext = {
      casterId,
      selectedIds: selectedTargetIds.value,
      config: config.value,
      clickedUnitId: unitId,
    };

    const result = currentStrategy.value.handleUnitClick(context);

    if (result.changed) {
      selectedTargetIds.value = result.selectedIds;
      onSelectionChange?.(result.selectedIds);
    }
  }

  /** 更新配置 */
  function updateConfig(newConfig: SkillTargetConfig): void {
    config.value = newConfig;

    // 更新策略
    currentStrategy.value = getSelectionStrategy(newConfig);

    // 清理不符合新范围的已选目标
    const validIds = selectedTargetIds.value.filter((id) => {
      const unit = getSandboxUnitById(id);
      if (!unit) return false;
      return currentStrategy.value.isUnitSelectable(unit, {
        casterId,
        selectedIds: selectedTargetIds.value,
        config: newConfig,
      });
    });

    // 如果目标数量有限制，截断多余的
    if (newConfig.targetCount > 0 && validIds.length > newConfig.targetCount) {
      selectedTargetIds.value = validIds.slice(0, newConfig.targetCount);
    } else {
      selectedTargetIds.value = validIds;
    }

    onConfigChange?.(newConfig);
    onSelectionChange?.(selectedTargetIds.value);
  }

  /** 设置自定义策略 */
  function setStrategy(strategy: SelectionStrategy): void {
    currentStrategy.value = strategy;
  }

  /** 清空选择 */
  function clearSelection(): void {
    selectedTargetIds.value = [];
    onSelectionChange?.([]);
  }

  /** 判断单位是否可选 */
  function isUnitSelectable(unit: SkillSandboxUnit): boolean {
    return currentStrategy.value.isUnitSelectable(unit, {
      casterId,
      selectedIds: selectedTargetIds.value,
      config: config.value,
    });
  }

  /** 判断单位是否已选中 */
  function isUnitSelected(unitId: string): boolean {
    return selectedTargetIds.value.includes(unitId);
  }

  // ============ 监听配置变化 ============

  watch(
    () => config.value.targetCount,
    () => {
      currentStrategy.value = getSelectionStrategy(config.value);
    },
  );

  return {
    // 状态
    config,
    selectedTargetIds,
    currentStrategy,

    // 计算属性
    selectionModeLabel,
    targetingModes,
    selectableUnits,

    // 方法
    handleUnitClick,
    updateConfig,
    setStrategy,
    clearSelection,
    isUnitSelectable,
    isUnitSelected,
  };
}
