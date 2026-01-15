import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { BattlePhase, UnitConfig, BattleAction, BattleConfig } from "@/types";

/**
 * 战斗状态 Store
 * 管理回合制战斗流程和角色行动
 */
export const useBattleStore = defineStore("battle", () => {
  // ============ 状态 ============

  /** 当前战斗阶段 */
  const phase = ref<BattlePhase>("init");

  /** 所有战斗单位 */
  const units = ref<UnitConfig[]>([]);

  /** 行动队列 */
  const actionQueue = ref<BattleAction[]>([]);

  /** 当前操作角色索引 */
  const currentActorIndex = ref(0);

  /** 操作阶段倒计时（秒） */
  const commandTimer = ref(60);

  /** 当前回合数 */
  const currentTurn = ref(1);

  // ============ 计算属性 ============

  /** 玩家单位列表 */
  const playerUnits = computed(() => units.value.filter((u) => u.isPlayer));

  /** 敌方单位列表 */
  const enemyUnits = computed(() => units.value.filter((u) => !u.isPlayer));

  /** 存活的玩家单位 */
  const alivePlayerUnits = computed(() => playerUnits.value.filter((u) => u.stats.hp > 0));

  /** 存活的敌方单位 */
  const aliveEnemyUnits = computed(() => enemyUnits.value.filter((u) => u.stats.hp > 0));

  /** 当前操作角色 */
  const currentActor = computed(() => alivePlayerUnits.value[currentActorIndex.value]);

  /** 是否战斗结束 */
  const isBattleOver = computed(
    () => alivePlayerUnits.value.length === 0 || aliveEnemyUnits.value.length === 0,
  );

  // ============ 方法 ============

  /** 开始战斗 */
  function startBattle(config: BattleConfig): void {
    units.value = [...config.playerUnits, ...config.enemyUnits];
    phase.value = "command";
    currentActorIndex.value = 0;
    currentTurn.value = 1;
    commandTimer.value = 60;
    actionQueue.value = [];
  }

  /** 提交行动 */
  function submitAction(action: BattleAction): void {
    actionQueue.value.push(action);
  }

  /** 切换到下一个角色 */
  function nextActor(): void {
    if (currentActorIndex.value < alivePlayerUnits.value.length - 1) {
      currentActorIndex.value++;
    } else {
      // 所有角色操作完毕，进入执行阶段
      startExecutePhase();
    }
  }

  /** 开始执行阶段 */
  function startExecutePhase(): void {
    phase.value = "execute";
    // 按 priority (speed + luck) 降序排序
    actionQueue.value.sort((a, b) => b.priority - a.priority);
  }

  /** 结束战斗 */
  function endBattle(result: "win" | "lose" | "escape"): void {
    phase.value = "result";
    console.log("战斗结束:", result);
  }

  /** 重置战斗状态 */
  function resetBattle(): void {
    phase.value = "init";
    units.value = [];
    actionQueue.value = [];
    currentActorIndex.value = 0;
    commandTimer.value = 60;
    currentTurn.value = 1;
  }

  return {
    // 状态
    phase,
    units,
    actionQueue,
    currentActorIndex,
    commandTimer,
    currentTurn,
    // 计算属性
    playerUnits,
    enemyUnits,
    alivePlayerUnits,
    aliveEnemyUnits,
    currentActor,
    isBattleOver,
    // 方法
    startBattle,
    submitAction,
    nextActor,
    startExecutePhase,
    endBattle,
    resetBattle,
  };
});
