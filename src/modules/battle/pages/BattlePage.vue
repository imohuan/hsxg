<script setup lang="ts">
/**
 * @file 战斗页面
 * @description 整合画布、菜单、HUD 组件
 * 现代 SaaS 风格：亮色主题
 */
import { ref, computed, watch } from "vue";
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

const showResultModal = ref(false);

// ============ 计算属性 ============

const currentActorConfig = computed<UnitConfig | undefined>(() => {
  return battle.currentActor.value?.config;
});

const targetConfigs = computed<UnitConfig[]>(() => {
  return battle.aliveEnemyUnits.value.map((unit) => unit.config);
});

const timerDisplay = computed(() => {
  const minutes = Math.floor(battle.timer.value / 60);
  const seconds = battle.timer.value % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
});

const timerColor = computed(() => {
  if (battle.timer.value <= 10) return "text-red-500";
  if (battle.timer.value <= 30) return "text-amber-500";
  return "text-slate-700";
});

const resultText = computed(() => {
  switch (battle.result.value) {
    case "win": return "战斗胜利！";
    case "lose": return "战斗失败...";
    case "escape": return "成功逃跑！";
    default: return "";
  }
});

const resultColor = computed(() => {
  switch (battle.result.value) {
    case "win": return "text-emerald-500";
    case "lose": return "text-red-500";
    case "escape": return "text-amber-500";
    default: return "text-slate-700";
  }
});

// ============ 示例数据 ============

const sampleSkills = [
  { id: "fireball", name: "火球术", mpCost: 10, description: "发射一颗火球" },
  { id: "heal", name: "治疗术", mpCost: 15, description: "恢复生命值" },
  { id: "thunder", name: "雷击", mpCost: 20, description: "召唤雷电攻击" },
];

const sampleItems = [
  { id: "potion", name: "生命药水", count: 3, description: "恢复 50 HP" },
  { id: "ether", name: "魔法药水", count: 2, description: "恢复 30 MP" },
];

const sampleSummons = [
  { id: "wolf", name: "召唤狼", description: "召唤一只战狼" },
];

// ============ 方法 ============

function handleSceneReady(scene: BattleScene): void {
  battle.setScene(scene);
}

function handleUnitClick(unit: Unit): void {
  console.log("[BattlePage] 单位被点击:", unit.config.name);
}

function handleAction(
  type: ActionType,
  targetId?: string,
  skillId?: string,
  itemId?: string,
): void {
  battle.submitAction(type, targetId, skillId, itemId);
}

function handleCancel(): void {
  console.log("[BattlePage] 取消操作");
}

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
    spriteConfig: { url: "", rows: 1, cols: 1 },
    animations: {},
  };
}

function restartBattle(): void {
  showResultModal.value = false;
  battle.resetBattle();
  startDemoBattle();
}

function goToMenu(): void {
  showResultModal.value = false;
  battle.resetBattle();
}

// ============ 生命周期 ============

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
  <div class="flex h-full flex-col bg-slate-100">
    <!-- 顶部状态栏 -->
    <div class="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 shadow-sm">
      <div class="flex items-center gap-4">
        <span class="rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700">
          回合 {{ battle.turn.value }}
        </span>
        <span class="text-sm text-slate-500">
          {{ battle.phase.value === "command" ? "操作阶段" : battle.phase.value === "execute" ? "执行阶段" : "准备中" }}
        </span>
      </div>

      <!-- 倒计时 -->
      <div v-if="battle.phase.value === 'command'" class="flex items-center gap-2">
        <span class="text-sm text-slate-500">剩余时间:</span>
        <span class="text-xl font-bold tabular-nums" :class="timerColor">
          {{ timerDisplay }}
        </span>
      </div>

      <!-- 执行进度 -->
      <div v-if="battle.phase.value === 'execute'" class="flex items-center gap-3">
        <span class="text-sm text-slate-500">执行进度:</span>
        <div class="h-2 w-32 overflow-hidden rounded-full bg-slate-200">
          <div
            class="h-full bg-indigo-500 transition-all duration-300"
            :style="{ width: `${battle.actionQueueProgress.value * 100}%` }"
          />
        </div>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="flex flex-1 overflow-hidden">
      <!-- 战斗画布 -->
      <div class="flex flex-1 items-center justify-center p-6">
        <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
          <BattleCanvas
            :width="800"
            :height="450"
            @ready="handleSceneReady"
            @unit-click="handleUnitClick"
          />
        </div>
      </div>

      <!-- 右侧面板 -->
      <div class="flex w-80 flex-col gap-4 border-l border-slate-200 bg-white p-4">
        <!-- 当前角色信息 -->
        <div
          v-if="currentActorConfig && battle.phase.value === 'command'"
          class="rounded-xl border border-slate-200 bg-slate-50 p-4"
        >
          <h4 class="mb-3 font-semibold text-slate-800">{{ currentActorConfig.name }}</h4>
          <div class="flex gap-4 text-sm">
            <div class="flex items-center gap-2">
              <span class="text-red-500">HP:</span>
              <div class="h-2 w-20 overflow-hidden rounded-full bg-slate-200">
                <div
                  class="h-full bg-red-500"
                  :style="{ width: `${(currentActorConfig.stats.hp / currentActorConfig.stats.maxHp) * 100}%` }"
                />
              </div>
              <span class="text-slate-600">{{ currentActorConfig.stats.hp }}/{{ currentActorConfig.stats.maxHp }}</span>
            </div>
          </div>
          <div class="mt-2 flex gap-4 text-sm">
            <div class="flex items-center gap-2">
              <span class="text-blue-500">MP:</span>
              <div class="h-2 w-20 overflow-hidden rounded-full bg-slate-200">
                <div
                  class="h-full bg-blue-500"
                  :style="{ width: `${(currentActorConfig.stats.mp / currentActorConfig.stats.maxMp) * 100}%` }"
                />
              </div>
              <span class="text-slate-600">{{ currentActorConfig.stats.mp }}/{{ currentActorConfig.stats.maxMp }}</span>
            </div>
          </div>
        </div>

        <!-- 操作菜单 -->
        <BattleMenu
          v-if="battle.phase.value === 'command'"
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
          class="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-8"
        >
          <div class="mb-3 size-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <span class="text-slate-600">执行中...</span>
        </div>

        <!-- 初始状态 -->
        <div
          v-if="battle.phase.value === 'init'"
          class="flex flex-col items-center justify-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-8"
        >
          <p class="text-center text-slate-500">点击下方按钮开始战斗</p>
          <button
            class="rounded-lg bg-indigo-500 px-6 py-2.5 font-semibold text-white shadow-md shadow-indigo-500/25 transition-all hover:bg-indigo-600 hover:shadow-lg"
            @click="startDemoBattle"
          >
            开始战斗
          </button>
        </div>

        <!-- 行动队列预览 -->
        <div
          v-if="battle.actionQueueLength.value > 0"
          class="rounded-xl border border-slate-200 bg-slate-50 p-4"
        >
          <h4 class="mb-2 text-sm font-semibold text-slate-500">行动队列</h4>
          <div class="text-sm text-slate-700">
            剩余行动: {{ battle.actionQueueLength.value }}
          </div>
        </div>
      </div>
    </div>

    <!-- 战斗结果弹窗 -->
    <div
      v-if="showResultModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <div class="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-2xl">
        <h2 class="mb-4 text-3xl font-bold" :class="resultColor">
          {{ resultText }}
        </h2>
        <p class="mb-6 text-slate-500">
          战斗持续 {{ battle.turn.value }} 回合
        </p>
        <div class="flex justify-center gap-4">
          <button
            class="rounded-lg bg-indigo-500 px-6 py-2.5 font-semibold text-white shadow-md transition-all hover:bg-indigo-600"
            @click="restartBattle"
          >
            再来一局
          </button>
          <button
            class="rounded-lg border border-slate-300 bg-white px-6 py-2.5 font-semibold text-slate-700 transition-all hover:bg-slate-50"
            @click="goToMenu"
          >
            返回
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
