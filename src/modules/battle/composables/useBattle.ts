/**
 * @file 战斗流程控制
 * 实现操作阶段、执行阶段切换和 60 秒倒计时
 * Requirements: 2.1, 2.10, 2.11
 */
import { ref, shallowRef, computed, watch, onUnmounted, type Ref, type ComputedRef, type ShallowRef } from "vue";
import type { BattleConfig, BattleAction, BattlePhase, UnitConfig, ActionType } from "@/types";
import { useActionQueue, type UseActionQueueReturn } from "./useActionQueue";
import { BattleScene } from "../core/BattleScene";
import { ActionExecutor, type SkillConfig, type ItemConfig } from "../core/ActionExecutor";
import type { Unit } from "../core/Unit";

/** 战斗状态 */
export interface BattleState {
  /** 当前阶段 */
  phase: BattlePhase;
  /** 当前回合数 */
  turn: number;
  /** 操作倒计时（秒） */
  timer: number;
  /** 当前操作角色索引 */
  currentActorIndex: number;
  /** 战斗结果 */
  result: "win" | "lose" | "escape" | null;
}

/** 战斗配置选项 */
export interface UseBattleOptions {
  /** 操作时间限制（秒） */
  commandTimeLimit?: number;
  /** 技能配置 */
  skills?: Map<string, SkillConfig>;
  /** 物品配置 */
  items?: Map<string, ItemConfig>;
  /** 可召唤单位 */
  summonableUnits?: Map<string, UnitConfig>;
}

/**
 * 战斗流程控制 Hook
 */
export function useBattle(options: UseBattleOptions = {}): UseBattleReturn {
  const { commandTimeLimit = 60 } = options;

  // ============ 状态 ============

  /** 战斗场景 */
  const scene = shallowRef<BattleScene | null>(null);

  /** 行动执行器 */
  let executor: ActionExecutor | null = null;

  /** 当前阶段 */
  const phase = ref<BattlePhase>("init");

  /** 当前回合数 */
  const turn = ref(1);

  /** 操作倒计时 */
  const timer = ref(commandTimeLimit);

  /** 当前操作角色索引 */
  const currentActorIndex = ref(0);

  /** 战斗结果 */
  const result = ref<"win" | "lose" | "escape" | null>(null);

  /** 倒计时定时器 */
  let timerInterval: ReturnType<typeof setInterval> | null = null;

  /** 玩家行动记录 */
  const playerActions = ref<Map<string, BattleAction>>(new Map());

  /** 行动队列管理 */
  const actionQueue: UseActionQueueReturn = useActionQueue();

  // ============ 计算属性 ============

  /** 可操作的玩家单位列表（按 Y 坐标排序）*/
  const actionablePlayerUnits = computed<Unit[]>(() => {
    if (!scene.value) return [];
    return scene.value.getActionablePlayerUnits();
  });

  /** 当前操作角色 */
  const currentActor = computed<Unit | null>(() => {
    const units = actionablePlayerUnits.value;
    return units[currentActorIndex.value] ?? null;
  });

  /** 敌方存活单位 */
  const aliveEnemyUnits = computed<Unit[]>(() => {
    if (!scene.value) return [];
    return scene.value.getAliveEnemyUnits();
  });

  /** 玩家存活单位 */
  const alivePlayerUnits = computed<Unit[]>(() => {
    if (!scene.value) return [];
    return scene.value.getAlivePlayerUnits();
  });

  /** 是否所有玩家角色都已选择行动 */
  const allActionsSelected = computed(() => {
    const units = actionablePlayerUnits.value;
    return units.every((unit) => playerActions.value.has(unit.config.id));
  });

  /** 是否战斗结束 */
  const isBattleOver = computed(() => result.value !== null);

  /** 当前队伍人数 */
  const teamSize = computed(() => alivePlayerUnits.value.length);

  // ============ 方法 ============

  /**
   * 设置战斗场景
   */
  function setScene(battleScene: BattleScene): void {
    scene.value = battleScene;

    // 创建行动执行器
    executor = new ActionExecutor({
      scene: battleScene,
      skills: options.skills ?? new Map(),
      items: options.items ?? new Map(),
      summonableUnits: options.summonableUnits ?? new Map(),
      onActionStart: (action) => {
        console.log("[Battle] 执行行动:", action);
      },
      onActionEnd: (result) => {
        console.log("[Battle] 行动结果:", result);
      },
    });
  }

  /**
   * 开始战斗
   */
  async function startBattle(config: BattleConfig): Promise<void> {
    if (!scene.value) {
      console.error("[useBattle] 场景未初始化");
      return;
    }

    // 加载战斗配置
    await scene.value.loadBattleConfig(config);

    // 重置状态
    phase.value = "command";
    turn.value = 1;
    currentActorIndex.value = 0;
    result.value = null;
    playerActions.value.clear();
    actionQueue.clear();

    // 开始操作阶段
    startCommandPhase();
  }

  /**
   * 开始操作阶段
   * Requirements: 2.1, 2.10
   */
  function startCommandPhase(): void {
    phase.value = "command";
    currentActorIndex.value = 0;
    timer.value = commandTimeLimit;
    playerActions.value.clear();

    // 高亮当前操作角色
    highlightCurrentActor();

    // 启动倒计时 (Requirements: 2.10)
    startTimer();

    scene.value?.showMessage(`回合 ${turn.value} - 选择行动`);
  }

  /**
   * 启动倒计时
   * Requirements: 2.10
   */
  function startTimer(): void {
    stopTimer();
    timerInterval = setInterval(() => {
      timer.value--;
      if (timer.value <= 0) {
        // 时间耗尽，自动防御 (Requirements: 2.11)
        handleTimeOut();
      }
    }, 1000);
  }

  /**
   * 停止倒计时
   */
  function stopTimer(): void {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  /**
   * 处理超时
   * Requirements: 2.11
   */
  function handleTimeOut(): void {
    stopTimer();

    // 为所有未操作的角色自动选择防御
    const units = actionablePlayerUnits.value;
    for (const unit of units) {
      if (!playerActions.value.has(unit.config.id)) {
        const action: BattleAction = {
          id: `action_${Date.now()}_${unit.config.id}`,
          type: "defend",
          actorId: unit.config.id,
          targetIds: [],
          priority: unit.priority,
        };
        playerActions.value.set(unit.config.id, action);
      }
    }

    // 进入执行阶段
    startExecutePhase();
  }

  /**
   * 高亮当前操作角色
   */
  function highlightCurrentActor(): void {
    if (!scene.value) return;

    // 取消所有选中
    const allUnits = [...scene.value.getPlayerUnits(), ...scene.value.getEnemyUnits()];
    for (const unit of allUnits) {
      unit.setSelected(false);
    }

    // 选中当前角色
    const actor = currentActor.value;
    if (actor) {
      actor.setSelected(true);
    }
  }

  /**
   * 提交玩家行动
   * Requirements: 2.2-2.9
   */
  function submitAction(type: ActionType, targetId?: string, skillId?: string, itemId?: string): void {
    const actor = currentActor.value;
    if (!actor || phase.value !== "command") return;

    const action: BattleAction = {
      id: `action_${Date.now()}_${actor.config.id}`,
      type,
      actorId: actor.config.id,
      targetIds: targetId ? [targetId] : [],
      skillId,
      itemId,
      priority: actor.priority,
    };

    // 记录行动
    playerActions.value.set(actor.config.id, action);

    // 切换到下一个角色 (Requirements: 2.1)
    nextActor();
  }

  /**
   * 切换到下一个操作角色
   * Requirements: 2.1
   */
  function nextActor(): void {
    const units = actionablePlayerUnits.value;

    if (currentActorIndex.value < units.length - 1) {
      currentActorIndex.value++;
      highlightCurrentActor();
    } else {
      // 所有角色操作完毕，进入执行阶段
      startExecutePhase();
    }
  }

  /**
   * 开始执行阶段
   */
  async function startExecutePhase(): Promise<void> {
    stopTimer();
    phase.value = "execute";

    // 取消所有选中
    if (scene.value) {
      const allUnits = [...scene.value.getPlayerUnits(), ...scene.value.getEnemyUnits()];
      for (const unit of allUnits) {
        unit.setSelected(false);
      }
    }

    // 收集所有行动（玩家 + 敌方 AI）
    const allActions = collectAllActions();

    // 排序并执行
    actionQueue.collectAndSort(allActions);
    actionQueue.startExecution();

    scene.value?.showMessage("执行阶段");

    // 执行行动队列
    await executeActionQueue();
  }

  /**
   * 收集所有行动
   */
  function collectAllActions(): Array<{ action: BattleAction; actorStats: typeof Unit.prototype.stats }> {
    const actions: Array<{ action: BattleAction; actorStats: typeof Unit.prototype.stats }> = [];

    // 添加玩家行动
    for (const [, action] of playerActions.value) {
      const unit = scene.value?.getUnit(action.actorId);
      if (unit && unit.isAlive) {
        actions.push({ action, actorStats: unit.stats });
      }
    }

    // 添加敌方 AI 行动
    const enemies = aliveEnemyUnits.value;
    const playerTargets = alivePlayerUnits.value;

    for (const enemy of enemies) {
      // 简单 AI：随机攻击一个玩家单位
      const target = playerTargets[Math.floor(Math.random() * playerTargets.length)];
      if (target) {
        const action: BattleAction = {
          id: `action_${Date.now()}_${enemy.config.id}`,
          type: "attack",
          actorId: enemy.config.id,
          targetIds: [target.config.id],
          priority: enemy.priority,
        };
        actions.push({ action, actorStats: enemy.stats });
      }
    }

    return actions;
  }

  /**
   * 执行行动队列
   */
  async function executeActionQueue(): Promise<void> {
    if (!executor) return;

    while (actionQueue.hasNext.value) {
      const action = actionQueue.advance();
      if (!action) break;

      // 检查执行者是否存活
      const actor = scene.value?.getUnit(action.actorId);
      if (!actor || !actor.isAlive) continue;

      // 执行行动
      const result = await executor.execute(action);

      // 检查是否有逃跑成功
      if (result.escaped) {
        endBattle("escape");
        return;
      }

      // 检查胜负
      const battleResult = scene.value?.checkBattleEnd();
      if (battleResult === "player") {
        endBattle("win");
        return;
      } else if (battleResult === "enemy") {
        endBattle("lose");
        return;
      }

      // 等待一小段时间再执行下一个行动
      await delay(500);
    }

    actionQueue.endExecution();

    // 进入下一回合
    nextTurn();
  }

  /**
   * 进入下一回合
   */
  function nextTurn(): void {
    turn.value++;
    startCommandPhase();
  }

  /**
   * 结束战斗
   */
  function endBattle(battleResult: "win" | "lose" | "escape"): void {
    stopTimer();
    phase.value = "result";
    result.value = battleResult;
    actionQueue.endExecution();

    const messages = {
      win: "战斗胜利！",
      lose: "战斗失败...",
      escape: "成功逃跑！",
    };
    scene.value?.showMessage(messages[battleResult]);
  }

  /**
   * 重置战斗
   */
  function resetBattle(): void {
    stopTimer();
    phase.value = "init";
    turn.value = 1;
    timer.value = commandTimeLimit;
    currentActorIndex.value = 0;
    result.value = null;
    playerActions.value.clear();
    actionQueue.clear();

    if (scene.value) {
      scene.value.clearUnits();
    }
  }

  /**
   * 延迟函数
   */
  function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============ 清理 ============

  onUnmounted(() => {
    stopTimer();
  });

  // 监听阶段变化
  watch(phase, (newPhase) => {
    console.log("[Battle] 阶段切换:", newPhase);
  });

  return {
    // 状态
    scene,
    phase,
    turn,
    timer,
    currentActorIndex,
    result,

    // 计算属性
    actionablePlayerUnits,
    currentActor,
    aliveEnemyUnits,
    alivePlayerUnits,
    allActionsSelected,
    isBattleOver,
    teamSize,

    // 行动队列（只暴露必要的属性）
    actionQueueLength: actionQueue.queueLength,
    actionQueueProgress: actionQueue.progress,
    isExecutingActions: actionQueue.isExecuting,

    // 方法
    setScene,
    startBattle,
    submitAction,
    nextActor,
    endBattle,
    resetBattle,
  };
}

/** Hook 返回类型 */
export interface UseBattleReturn {
  // 状态
  scene: ShallowRef<BattleScene | null>;
  phase: Ref<BattlePhase>;
  turn: Ref<number>;
  timer: Ref<number>;
  currentActorIndex: Ref<number>;
  result: Ref<"win" | "lose" | "escape" | null>;

  // 计算属性
  actionablePlayerUnits: ComputedRef<Unit[]>;
  currentActor: ComputedRef<Unit | null>;
  aliveEnemyUnits: ComputedRef<Unit[]>;
  alivePlayerUnits: ComputedRef<Unit[]>;
  allActionsSelected: ComputedRef<boolean>;
  isBattleOver: ComputedRef<boolean>;
  teamSize: ComputedRef<number>;

  // 行动队列
  actionQueueLength: ComputedRef<number>;
  actionQueueProgress: ComputedRef<number>;
  isExecutingActions: Readonly<Ref<boolean>>;

  // 方法
  setScene: (battleScene: BattleScene) => void;
  startBattle: (config: BattleConfig) => Promise<void>;
  submitAction: (type: ActionType, targetId?: string, skillId?: string, itemId?: string) => void;
  nextActor: () => void;
  endBattle: (battleResult: "win" | "lose" | "escape") => void;
  resetBattle: () => void;
}
