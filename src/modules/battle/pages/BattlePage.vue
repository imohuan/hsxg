<script setup lang="ts">
/**
 * @file 战斗页面
 * 整合画布、菜单、HUD 组件
 * Requirements: 1.1-3.9
 */
import { ref, computed, onMounted } from "vue";
import BattleCanvas from "../components/BattleCanvas.vue";
import BattleMenu from "../components/BattleMenu.vue";
import { useBattle } from "../composables/useBattle";
import type { BattleScene } from "../core/BattleScene";
import type { Unit } from "../core/Unit";
import type { BattleConfig, ActionType, UnitConfig } from "@/types";

// ============ 战斗控制 ============

const battle = useBattle({
  commandTimeLimit: 60,
});

// ============ 状态 ============

/** 是否显示战斗结果弹窗 */
const showResultModal = ref(false);

// ============ 计算属性 ============

/** 当前操作角色的 UnitConfig */
const currentActorConfig = computed<UnitConfig | undefined>(() => {
  return battle.currentActor.value?.config;
});

/** 可选目标列表（敌方存活单位） */
const targetConfigs = computed<UnitConfig[]>(() => {
  return battle.aliveEnemyUnits.value.map((unit) => unit.config);
});

/** 倒计时显示 */
const timerDisplay = computed(() => {
  const minutes = Math.floor(battle.timer.value / 60);
  const seconds = battle.timer.value % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
});

/** 倒计时颜色 */
const timerColor = computed(() => {
  if (battle.timer.value <= 10) return "text-red-500";
  if (battle.timer.value <= 30) return "text-yellow-500";
  return "text-white";
});

/** 战斗结果文本 */
const resultText = computed(() => {
  switch (battle.result.value) {
    case "win":
      return "战斗胜利！";
    case "lose":
      return "战斗失败...";
    case "escape":
      return "成功逃跑！";
    default:
      return "";
  }
});

/** 战斗结果颜色 */
const resultColor = computed(() => {
  switch (battle.result.value) {
    case "win":
      return "text-green-400";
    case "lose":
      return "text-red-400";
    case "escape":
      return "text-yellow-400";
    default:
      return "text-white";
  }
});

// ============ 示例数据 ============

/** 示例技能列表 */
const sampleSkills = [
  { id: "fireball", name: "火球术", mpCost: 10, description: "发射一颗火球" },
  { id: "heal", name: "治疗术", mpCost: 15, description: "恢复生命值" },
  { id: "thunder", name: "雷击", mpCost: 20, description: "召唤雷电攻击" },
];

/** 示例物品列表 */
const sampleItems = [
  { id: "potion", name: "生命药水", count: 3, description: "恢复 50 HP" },
  { id: "ether", name: "魔法药水", count: 2, description: "恢复 30 MP" },
];

/** 示例召唤列表 */
const sampleSummons = [
  { id: "wolf", name: "召唤狼", description: "召唤一只战狼" },
];

// ============ 方法 ============

/** 场景就绪回调 */
function handleSceneReady(scene: BattleScene): void {
  battle.setScene(scene);
}

/** 单位点击回调 */
function handleUnitClick(unit: Unit): void {
  console.log("[BattlePage] 单位被点击:", unit.config.name);
}

/** 处理行动选择 */
function handleAction(
  type: ActionType,
  targetId?: string,
  skillId?: string,
  itemId?: string,
): void {
  battle.submitAction(type, targetId, skillId, itemId);
}

/** 处理取消 */
function handleCancel(): void {
  console.log("[BattlePage] 取消操作");
}

/** 开始示例战斗 */
async function startDemoBattle(): Promise<void> {
  const demoConfig: BattleConfig = {
    playerUnits: [
      createDemoUnit("player1", "勇者", true, 0, 0),
      createDemoUnit("player2", "法师", true, 1, 0),
      createDemoUnit("player3", "牧师", true, 2, 0),
    ],
    enemyUnits: [
      createDemoUnit("enemy1", "哥布林", false, 0, 0),
      createDemoUnit("enemy2", "史莱姆", false, 1, 0),
    ],
  };

  await battle.startBattle(demoConfig);
}

/** 创建示例单位 */
function createDemoUnit(
  id: string,
  name: string,
  isPlayer: boolean,
  row: number,
  col: number,
): UnitConfig {
  return {
    id,
    name,
    isPlayer,
    position: { row, col },
    stats: {
      hp: 100,
      maxHp: 100,
      mp: 50,
      maxMp: 50,
      speed: Math.floor(Math.random() * 20) + 10,
      luck: Math.floor(Math.random() * 10) + 5,
      attack: Math.floor(Math.random() * 15) + 10,
      defense: Math.floor(Math.random() * 10) + 5,
    },
    spriteConfig: {
      url: "",
      rows: 1,
      cols: 1,
    },
    animations: {},
  };
}

/** 重新开始战斗 */
function restartBattle(): void {
  showResultModal.value = false;
  battle.resetBattle();
  startDemoBattle();
}

/** 返回主菜单 */
function goToMenu(): void {
  showResultModal.value = false;
  battle.resetBattle();
}

// ============ 生命周期 ============

onMounted(() => {
  // 页面加载后自动开始示例战斗
  // 实际使用时应该从路由参数或 store 获取战斗配置
});

// 监听战斗结果
import { watch } from "vue";
watch(
  () => battle.result.value,
  (newResult) => {
    if (newResult) {
      setTimeout(() => {
        showResultModal.value = true;
      }, 1500);
    }
  },
);
</script>

<template>
  <div class="flex h-full flex-col bg-gray-900">
    <!-- 顶部状态栏 -->
    <div class="flex items-center justify-between border-b border-gray-700 bg-gray-800 px-4 py-2">
      <div class="flex items-center gap-4">
        <span class="text-lg font-bold text-white">回合 {{ battle.turn.value }}</span>
        <span class="text-sm text-gray-400">
          {{ battle.phase.value === "command" ? "操作阶段" : battle.phase.value === "execute" ? "执行阶段" : "" }}
        </span>
      </div>

      <!-- 倒计时 -->
      <div
        v-if="battle.phase.value === 'command'"
        class="flex items-center gap-2"
      >
        <span class="text-sm text-gray-400">剩余时间:</span>
        <span class="text-xl font-bold" :class="timerColor">
          {{ timerDisplay }}
        </span>
      </div>

      <!-- 执行进度 -->
      <div
        v-if="battle.phase.value === 'execute'"
        class="flex items-center gap-2"
      >
        <span class="text-sm text-gray-400">执行进度:</span>
        <div class="h-2 w-32 overflow-hidden rounded-full bg-gray-700">
          <div
            class="h-full bg-blue-500 transition-all duration-300"
            :style="{ width: `${battle.actionQueueProgress.value * 100}%` }"
          />
        </div>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="flex flex-1 overflow-hidden">
      <!-- 战斗画布 -->
      <div class="flex flex-1 items-center justify-center p-4">
        <BattleCanvas
          ref="canvasRef"
          :width="800"
          :height="450"
          @ready="handleSceneReady"
          @unit-click="handleUnitClick"
        />
      </div>

      <!-- 右侧面板 -->
      <div class="flex w-80 flex-col gap-4 border-l border-gray-700 bg-gray-800 p-4">
        <!-- 当前角色信息 -->
        <div
          v-if="currentActorConfig && battle.phase.value === 'command'"
          class="rounded-lg bg-gray-700 p-3"
        >
          <h4 class="mb-2 font-bold text-white">{{ currentActorConfig.name }}</h4>
          <div class="flex gap-4 text-sm">
            <div class="flex items-center gap-1">
              <span class="text-red-400">HP:</span>
              <span class="text-white">
                {{ currentActorConfig.stats.hp }}/{{ currentActorConfig.stats.maxHp }}
              </span>
            </div>
            <div class="flex items-center gap-1">
              <span class="text-blue-400">MP:</span>
              <span class="text-white">
                {{ currentActorConfig.stats.mp }}/{{ currentActorConfig.stats.maxMp }}
              </span>
            </div>
          </div>
        </div>

        <!-- 操作菜单 -->
        <BattleMenu
          v-if="battle.phase.value === 'command'"
          ref="menuRef"
          :current-actor="currentActorConfig"
          :targets="targetConfigs"
          :skills="sampleSkills"
          :items="sampleItems"
          :summons="sampleSummons"
          :team-size="battle.teamSize.value"
          :disabled="battle.phase.value !== 'command'"
          @action="handleAction"
          @cancel="handleCancel"
        />

        <!-- 执行阶段提示 -->
        <div
          v-if="battle.phase.value === 'execute'"
          class="flex flex-col items-center justify-center rounded-lg bg-gray-700 p-6"
        >
          <div class="mb-2 size-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <span class="text-white">执行中...</span>
        </div>

        <!-- 初始状态 -->
        <div
          v-if="battle.phase.value === 'init'"
          class="flex flex-col items-center justify-center gap-4 rounded-lg bg-gray-700 p-6"
        >
          <p class="text-center text-gray-400">点击下方按钮开始战斗</p>
          <button
            class="rounded-lg bg-blue-600 px-6 py-2 font-bold text-white transition-colors hover:bg-blue-500"
            @click="startDemoBattle"
          >
            开始战斗
          </button>
        </div>

        <!-- 行动队列预览 -->
        <div
          v-if="battle.actionQueueLength.value > 0"
          class="rounded-lg bg-gray-700 p-3"
        >
          <h4 class="mb-2 text-sm font-bold text-gray-400">行动队列</h4>
          <div class="text-sm text-white">
            剩余行动: {{ battle.actionQueueLength.value }}
          </div>
        </div>
      </div>
    </div>

    <!-- 战斗结果弹窗 -->
    <div
      v-if="showResultModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
    >
      <div class="rounded-xl bg-gray-800 p-8 text-center shadow-2xl">
        <h2 class="mb-4 text-3xl font-bold" :class="resultColor">
          {{ resultText }}
        </h2>
        <p class="mb-6 text-gray-400">
          战斗持续 {{ battle.turn.value }} 回合
        </p>
        <div class="flex justify-center gap-4">
          <button
            class="rounded-lg bg-blue-600 px-6 py-2 font-bold text-white transition-colors hover:bg-blue-500"
            @click="restartBattle"
          >
            再来一局
          </button>
          <button
            class="rounded-lg bg-gray-600 px-6 py-2 font-bold text-white transition-colors hover:bg-gray-500"
            @click="goToMenu"
          >
            返回
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
