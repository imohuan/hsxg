/**
 * @file 行动队列管理
 * 实现行动收集、排序、执行
 * Requirements: 3.1, 3.2
 */
import { ref, computed, readonly } from "vue";
import type { BattleAction, UnitStats } from "@/types";

/** 行动队列项（包含执行者属性用于排序） */
export interface ActionQueueItem extends BattleAction {
  actorStats: UnitStats;
}

/** 行动队列状态 */
export interface ActionQueueState {
  /** 待执行的行动队列 */
  queue: ActionQueueItem[];
  /** 当前执行索引 */
  currentIndex: number;
  /** 是否正在执行 */
  isExecuting: boolean;
}

/**
 * 行动队列排序函数
 * 按照 (速度 + 幸运) 降序排列
 * Requirements: 3.2
 */
export function sortActionQueue(actions: ActionQueueItem[]): ActionQueueItem[] {
  return [...actions].sort((a, b) => {
    const priorityA = a.actorStats.speed + a.actorStats.luck;
    const priorityB = b.actorStats.speed + b.actorStats.luck;
    return priorityB - priorityA;
  });
}

/**
 * 行动队列管理 Hook
 */
export function useActionQueue() {
  // ============ 状态 ============

  /** 行动队列 */
  const queue = ref<ActionQueueItem[]>([]);

  /** 当前执行索引 */
  const currentIndex = ref(0);

  /** 是否正在执行 */
  const isExecuting = ref(false);

  // ============ 计算属性 ============

  /** 队列长度 */
  const queueLength = computed(() => queue.value.length);

  /** 当前行动 */
  const currentAction = computed(() => queue.value[currentIndex.value] ?? null);

  /** 是否有下一个行动 */
  const hasNext = computed(() => currentIndex.value < queue.value.length);

  /** 剩余行动数 */
  const remainingCount = computed(() => queue.value.length - currentIndex.value);

  /** 是否队列为空 */
  const isEmpty = computed(() => queue.value.length === 0);

  /** 执行进度 (0-1) */
  const progress = computed(() => {
    if (queue.value.length === 0) return 0;
    return currentIndex.value / queue.value.length;
  });

  // ============ 方法 ============

  /**
   * 添加行动到队列
   * Requirements: 3.1
   */
  function addAction(action: BattleAction, actorStats: UnitStats): void {
    const queueItem: ActionQueueItem = {
      ...action,
      actorStats,
      priority: actorStats.speed + actorStats.luck,
    };
    queue.value.push(queueItem);
  }

  /**
   * 批量添加行动
   */
  function addActions(actions: Array<{ action: BattleAction; actorStats: UnitStats }>): void {
    for (const { action, actorStats } of actions) {
      addAction(action, actorStats);
    }
  }

  /**
   * 对队列进行排序
   * Requirements: 3.2
   */
  function sortQueue(): void {
    queue.value = sortActionQueue(queue.value);
  }

  /**
   * 收集并排序行动
   * 一次性完成收集和排序
   */
  function collectAndSort(actions: Array<{ action: BattleAction; actorStats: UnitStats }>): void {
    clear();
    addActions(actions);
    sortQueue();
  }

  /**
   * 获取下一个行动
   */
  function getNext(): ActionQueueItem | null {
    if (!hasNext.value) return null;
    return queue.value[currentIndex.value] ?? null;
  }

  /**
   * 推进到下一个行动
   */
  function advance(): ActionQueueItem | null {
    if (!hasNext.value) return null;
    const action = queue.value[currentIndex.value] ?? null;
    currentIndex.value++;
    return action;
  }

  /**
   * 开始执行队列
   */
  function startExecution(): void {
    isExecuting.value = true;
    currentIndex.value = 0;
  }

  /**
   * 结束执行
   */
  function endExecution(): void {
    isExecuting.value = false;
  }

  /**
   * 清空队列
   */
  function clear(): void {
    queue.value = [];
    currentIndex.value = 0;
    isExecuting.value = false;
  }

  /**
   * 移除指定角色的行动
   * 用于角色死亡时移除其待执行的行动
   */
  function removeActorActions(actorId: string): void {
    queue.value = queue.value.filter((action) => action.actorId !== actorId);
    // 调整当前索引
    if (currentIndex.value > queue.value.length) {
      currentIndex.value = queue.value.length;
    }
  }

  /**
   * 获取指定角色的行动
   */
  function getActorAction(actorId: string): ActionQueueItem | undefined {
    return queue.value.find((action) => action.actorId === actorId);
  }

  /**
   * 检查角色是否有待执行的行动
   */
  function hasActorAction(actorId: string): boolean {
    return queue.value.some((action, index) => action.actorId === actorId && index >= currentIndex.value);
  }

  /**
   * 获取队列快照（用于显示）
   */
  function getQueueSnapshot(): ActionQueueItem[] {
    return [...queue.value];
  }

  /**
   * 获取剩余行动列表
   */
  function getRemainingActions(): ActionQueueItem[] {
    return queue.value.slice(currentIndex.value);
  }

  return {
    // 状态（只读）
    queue: readonly(queue),
    currentIndex: readonly(currentIndex),
    isExecuting: readonly(isExecuting),

    // 计算属性
    queueLength,
    currentAction,
    hasNext,
    remainingCount,
    isEmpty,
    progress,

    // 方法
    addAction,
    addActions,
    sortQueue,
    collectAndSort,
    getNext,
    advance,
    startExecution,
    endExecution,
    clear,
    removeActorActions,
    getActorAction,
    hasActorAction,
    getQueueSnapshot,
    getRemainingActions,
  };
}

/** Hook 返回类型 */
export type UseActionQueueReturn = ReturnType<typeof useActionQueue>;
