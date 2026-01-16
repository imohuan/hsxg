/**
 * 单位管理器
 * 管理战斗单位的位置、动画状态
 * Requirements: 9.1-9.7
 */

import { ref, computed, type Ref, type ComputedRef } from "vue";
import type { BattleUnit, BattleSceneConfig, UnitRuntimeState, UnitPosition, MoveOptions, EasingType } from "@/types";
import { calculateStaggeredPositions, type StaggeredLayoutConfig } from "./useStaggeredLayout";

/** 缓动函数类型 */
type EasingFunction = (t: number) => number;

/** 缓动函数映射 */
const EASING_FUNCTIONS: Record<EasingType, EasingFunction> = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => t * (2 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  bounce: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  },
};

/** 动画任务 */
interface AnimationTask {
  unitId: string;
  startPosition: UnitPosition;
  targetPosition: UnitPosition;
  duration: number;
  easing: EasingFunction;
  startTime: number;
  resolve: () => void;
}

/** 单位管理器配置 */
export interface UnitManagerConfig {
  /** 画布宽度 */
  canvasWidth: number;
  /** 画布高度 */
  canvasHeight: number;
}

/**
 * 单位管理器 Composable
 * Requirements: 9.1-9.7
 */
export function useUnitManager(config: UnitManagerConfig) {
  // 当前尺寸（可变）
  let currentWidth = config.canvasWidth;
  let currentHeight = config.canvasHeight;

  // ============ 状态 ============

  /** 单位运行时状态 */
  const unitStates: Ref<Map<string, UnitRuntimeState>> = ref(new Map());

  /** 单位数据 */
  const unitsData: Ref<Map<string, BattleUnit>> = ref(new Map());

  /** 当前动画任务 */
  const animationTasks: Ref<Map<string, AnimationTask>> = ref(new Map());

  /** 当前播放的动画 */
  const playingAnimations: Ref<Map<string, { key: string; resolve: () => void }>> = ref(new Map());

  /** 动画帧索引 */
  const frameIndices: Ref<Map<string, number>> = ref(new Map());

  /** 动画帧 ID */
  let animationFrameId: number | null = null;

  // ============ 计算属性 ============

  /** 所有单位状态列表 */
  const allUnitStates: ComputedRef<UnitRuntimeState[]> = computed(() => {
    return Array.from(unitStates.value.values());
  });

  /** 是否有正在进行的动画 */
  const hasActiveAnimations: ComputedRef<boolean> = computed(() => {
    return animationTasks.value.size > 0 || playingAnimations.value.size > 0;
  });

  // ============ 初始化 ============

  /**
   * 初始化单位
   */
  function initUnits(sceneConfig: BattleSceneConfig): void {
    // 保存配置用于 resize 时重新计算
    lastSceneConfig = sceneConfig;

    unitStates.value.clear();
    unitsData.value.clear();
    frameIndices.value.clear();

    // 计算交错布局位置
    const layoutConfig: StaggeredLayoutConfig = {
      canvasWidth: currentWidth,
      canvasHeight: currentHeight,
    };

    const layout = calculateStaggeredPositions(sceneConfig.enemyUnits, sceneConfig.playerUnits, layoutConfig);

    // 初始化敌方单位
    for (const result of layout.enemies) {
      const unit = sceneConfig.enemyUnits.find((u) => u.id === result.unitId);
      if (unit) {
        initUnitState(unit, result.position, sceneConfig.activeUnitId);
      }
    }

    // 初始化我方单位
    for (const result of layout.players) {
      const unit = sceneConfig.playerUnits.find((u) => u.id === result.unitId);
      if (unit) {
        initUnitState(unit, result.position, sceneConfig.activeUnitId);
      }
    }
  }

  /**
   * 初始化单个单位状态
   */
  function initUnitState(unit: BattleUnit, position: UnitPosition, activeUnitId?: string): void {
    const state: UnitRuntimeState = {
      id: unit.id,
      position: { ...position },
      initialPosition: { ...position },
      currentAnimation: "idle",
      isSelected: false,
      isActive: unit.id === activeUnitId,
    };

    unitStates.value.set(unit.id, state);
    unitsData.value.set(unit.id, unit);
    frameIndices.value.set(unit.id, 0);
  }

  /**
   * 更新单位数据
   */
  function updateUnitData(unit: BattleUnit): void {
    unitsData.value.set(unit.id, unit);
  }

  /**
   * 获取单位状态
   */
  function getUnitState(unitId: string): UnitRuntimeState | undefined {
    return unitStates.value.get(unitId);
  }

  /**
   * 获取单位数据
   */
  function getUnitData(unitId: string): BattleUnit | undefined {
    return unitsData.value.get(unitId);
  }

  // ============ 位置控制 ============

  /**
   * 移动单位到指定位置
   * Requirements: 9.1
   */
  function moveUnit(unitId: string, targetX: number, targetY: number, options: MoveOptions = {}): Promise<void> {
    return new Promise((resolve) => {
      const state = unitStates.value.get(unitId);
      if (!state) {
        resolve();
        return;
      }

      const { duration = 500, easing = "easeOut" } = options;
      const easingFn = EASING_FUNCTIONS[easing] || EASING_FUNCTIONS.linear;

      // 如果持续时间为 0，直接设置位置
      if (duration <= 0) {
        state.position = { x: targetX, y: targetY };
        resolve();
        return;
      }

      // 创建动画任务
      const task: AnimationTask = {
        unitId,
        startPosition: { ...state.position },
        targetPosition: { x: targetX, y: targetY },
        duration,
        easing: easingFn,
        startTime: performance.now(),
        resolve,
      };

      animationTasks.value.set(unitId, task);

      // 启动动画循环
      startAnimationLoop();
    });
  }

  /**
   * 直接设置单位位置
   * Requirements: 9.3
   */
  function setUnitPosition(unitId: string, x: number, y: number): void {
    const state = unitStates.value.get(unitId);
    if (state) {
      state.position = { x, y };
    }
  }

  /**
   * 重置单位到初始位置
   * Requirements: 9.4
   */
  function resetUnitPosition(unitId: string): void {
    const state = unitStates.value.get(unitId);
    if (state) {
      state.position = { ...state.initialPosition };
    }
  }

  /**
   * 重置所有单位位置
   */
  function resetAllUnitPositions(): void {
    for (const state of unitStates.value.values()) {
      state.position = { ...state.initialPosition };
    }
  }

  // ============ 动画控制 ============

  /**
   * 播放单位动画
   * Requirements: 9.2, 9.6
   */
  function playUnitAnimation(unitId: string, animationKey: string): Promise<void> {
    return new Promise((resolve) => {
      const state = unitStates.value.get(unitId);
      if (!state) {
        resolve();
        return;
      }

      // 设置当前动画
      state.currentAnimation = animationKey;
      frameIndices.value.set(unitId, 0);

      // 记录播放中的动画
      playingAnimations.value.set(unitId, { key: animationKey, resolve });

      // 模拟动画播放时间（实际应根据动画配置）
      const animationDurations: Record<string, number> = {
        idle: 0, // idle 不等待
        attack: 500,
        hit: 300,
        death: 800,
        skill: 600,
      };

      const duration = animationDurations[animationKey] || 500;

      if (duration === 0) {
        playingAnimations.value.delete(unitId);
        resolve();
        return;
      }

      setTimeout(() => {
        // 动画完成后恢复 idle
        if (state.currentAnimation === animationKey) {
          state.currentAnimation = "idle";
        }
        playingAnimations.value.delete(unitId);
        resolve();
      }, duration);
    });
  }

  /**
   * 设置单位选中状态
   */
  function setUnitSelected(unitId: string, selected: boolean): void {
    const state = unitStates.value.get(unitId);
    if (state) {
      state.isSelected = selected;
    }
  }

  /**
   * 设置单位高亮状态（当前行动）
   */
  function setUnitActive(unitId: string, active: boolean): void {
    const state = unitStates.value.get(unitId);
    if (state) {
      state.isActive = active;
    }
  }

  /**
   * 清除所有选中状态
   */
  function clearAllSelections(): void {
    for (const state of unitStates.value.values()) {
      state.isSelected = false;
    }
  }

  /**
   * 清除所有高亮状态
   */
  function clearAllActive(): void {
    for (const state of unitStates.value.values()) {
      state.isActive = false;
    }
  }

  // ============ 动画循环 ============

  /**
   * 启动动画循环
   */
  function startAnimationLoop(): void {
    if (animationFrameId !== null) return;

    const loop = (timestamp: number) => {
      updateAnimations(timestamp);

      if (animationTasks.value.size > 0) {
        animationFrameId = requestAnimationFrame(loop);
      } else {
        animationFrameId = null;
      }
    };

    animationFrameId = requestAnimationFrame(loop);
  }

  /**
   * 更新所有动画
   */
  function updateAnimations(timestamp: number): void {
    const completedTasks: string[] = [];

    for (const [unitId, task] of animationTasks.value) {
      const elapsed = timestamp - task.startTime;
      const progress = Math.min(1, elapsed / task.duration);
      const easedProgress = task.easing(progress);

      // 更新位置
      const state = unitStates.value.get(unitId);
      if (state) {
        state.position = {
          x: task.startPosition.x + (task.targetPosition.x - task.startPosition.x) * easedProgress,
          y: task.startPosition.y + (task.targetPosition.y - task.startPosition.y) * easedProgress,
        };
      }

      // 检查是否完成
      if (progress >= 1) {
        completedTasks.push(unitId);
        task.resolve();
      }
    }

    // 移除已完成的任务
    for (const unitId of completedTasks) {
      animationTasks.value.delete(unitId);
    }
  }

  /**
   * 停止所有动画
   */
  function stopAllAnimations(): void {
    // 完成所有移动动画
    for (const task of animationTasks.value.values()) {
      const state = unitStates.value.get(task.unitId);
      if (state) {
        state.position = { ...task.targetPosition };
      }
      task.resolve();
    }
    animationTasks.value.clear();

    // 完成所有播放动画
    for (const [unitId, anim] of playingAnimations.value) {
      const state = unitStates.value.get(unitId);
      if (state) {
        state.currentAnimation = "idle";
      }
      anim.resolve();
    }
    playingAnimations.value.clear();

    // 停止动画循环
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  // ============ HP/MP 更新 ============

  /**
   * 更新单位血量
   */
  function updateUnitHp(unitId: string, currentHp: number, maxHp?: number): void {
    const unit = unitsData.value.get(unitId);
    if (unit) {
      unit.hp = Math.max(0, currentHp);
      if (maxHp !== undefined) {
        unit.maxHp = maxHp;
      }
      // 检查死亡
      if (unit.hp <= 0) {
        unit.isDead = true;
      }
    }
  }

  /**
   * 更新单位蓝量
   */
  function updateUnitMp(unitId: string, currentMp: number, maxMp?: number): void {
    const unit = unitsData.value.get(unitId);
    if (unit) {
      unit.mp = Math.max(0, currentMp);
      if (maxMp !== undefined) {
        unit.maxMp = maxMp;
      }
    }
  }

  // ============ 清理 ============

  /**
   * 清理所有状态
   */
  function clear(): void {
    stopAllAnimations();
    unitStates.value.clear();
    unitsData.value.clear();
    frameIndices.value.clear();
  }

  /** 保存当前场景配置，用于 resize 时重新计算位置 */
  let lastSceneConfig: BattleSceneConfig | null = null;

  /**
   * 调整尺寸并重新计算单位位置
   */
  function resize(width: number, height: number): void {
    // 尺寸没变化则跳过
    if (width === currentWidth && height === currentHeight) return;

    currentWidth = width;
    currentHeight = height;

    // 重新计算所有单位位置
    if (lastSceneConfig) {
      recalculatePositions();
    }
  }

  /**
   * 重新计算所有单位位置（保持选中/激活状态）
   */
  function recalculatePositions(): void {
    if (!lastSceneConfig) return;

    const layoutConfig: StaggeredLayoutConfig = {
      canvasWidth: currentWidth,
      canvasHeight: currentHeight,
    };

    const layout = calculateStaggeredPositions(lastSceneConfig.enemyUnits, lastSceneConfig.playerUnits, layoutConfig);

    // 更新敌方单位位置
    for (const result of layout.enemies) {
      const state = unitStates.value.get(result.unitId);
      if (state) {
        state.position = { ...result.position };
        state.initialPosition = { ...result.position };
      }
    }

    // 更新我方单位位置
    for (const result of layout.players) {
      const state = unitStates.value.get(result.unitId);
      if (state) {
        state.position = { ...result.position };
        state.initialPosition = { ...result.position };
      }
    }
  }

  return {
    // 状态
    unitStates,
    unitsData,
    frameIndices,
    allUnitStates,
    hasActiveAnimations,

    // 初始化
    initUnits,
    updateUnitData,
    getUnitState,
    getUnitData,

    // 位置控制
    moveUnit,
    setUnitPosition,
    resetUnitPosition,
    resetAllUnitPositions,

    // 动画控制
    playUnitAnimation,
    setUnitSelected,
    setUnitActive,
    clearAllSelections,
    clearAllActive,
    stopAllAnimations,

    // HP/MP
    updateUnitHp,
    updateUnitMp,

    // 尺寸
    resize,

    // 清理
    clear,
  };
}

/** Hook 返回类型 */
export type UseUnitManagerReturn = ReturnType<typeof useUnitManager>;
