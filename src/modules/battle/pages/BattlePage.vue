<script setup lang="ts">
/**
 * @file 战斗页面
 * @description 全屏画布战斗页面，使用 GameCanvas 进行渲染
 * 使用新版 slot 接口：header、overlay、unit-info
 */
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { useResizeObserver } from "@vueuse/core";
import GameCanvas from "@/components/gamecanvas/GameCanvas.vue";
import BattleHeader from "../components/BattleHeader.vue";
import DiamondMenu from "../components/DiamondMenu.vue";
import UnitInfoPopup from "../components/UnitInfoPopup.vue";
import type { ActionType, UnitConfig, GameData, BattleUnit, BattlePhase, Point } from "@/types";

// ============ 状态 ============

const showResultModal = ref(false);
const containerRef = ref<HTMLDivElement | null>(null);
const canvasWidth = ref(960);
const canvasHeight = ref(540);

// 战斗状态
const phase = ref<BattlePhase>("init");
const turn = ref(1);
const timer = ref(60);
const result = ref<"win" | "lose" | "escape" | null>(null);

// 单位数据
const playerUnits = ref<UnitConfig[]>([]);
const enemyUnits = ref<UnitConfig[]>([]);
const currentActorIndex = ref(0);

// 悬停单位（用于 unit-info slot）
const hoveredUnit = ref<BattleUnit | null>(null);

// 倒计时定时器
let timerInterval: ReturnType<typeof setInterval> | null = null;

// ============ 画布配置 ============

/** 将 UnitConfig 转换为 BattleUnit */
function toBattleUnit(config: UnitConfig, isPlayer: boolean): BattleUnit {
  return {
    id: config.id,
    name: config.name,
    isPlayer,
    hp: config.stats.hp,
    maxHp: config.stats.maxHp,
    mp: config.stats.mp,
    maxMp: config.stats.maxMp,
    speed: config.stats.speed,
    isDead: config.stats.hp <= 0,
    selectable: true,
    sprite: config.spriteConfig,
  };
}

/** 新版 GameData 配置 */
const gameData = computed<GameData>(() => {
  const players = playerUnits.value.filter((u) => u.stats.hp > 0).map((u) => toBattleUnit(u, true));
  const enemies = enemyUnits.value.filter((u) => u.stats.hp > 0).map((u) => toBattleUnit(u, false));
  const currentActor = playerUnits.value[currentActorIndex.value];

  return {
    scene: {
      name: "战斗",
      backgroundColor: "#f9fafb",
    },
    players: {
      enemy: { id: "enemy", name: "敌方" },
      self: { id: "player", name: "我方" },
    },
    units: [...enemies, ...players],
    effects: [],
    sounds: [],
    skills: [],
    items: [],
    turn: {
      number: turn.value,
      activeUnitId: currentActor?.id,
      phase:
        phase.value === "command" ? "command" : phase.value === "execute" ? "execute" : "result",
    },
  };
});

// ============ 计算属性 ============

const timerDisplay = computed(() => {
  const minutes = Math.floor(timer.value / 60);
  const seconds = timer.value % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
});

const timerColor = computed(() => {
  if (timer.value <= 10) return "text-red-600";
  if (timer.value <= 30) return "text-amber-600";
  return "text-gray-800";
});

const resultText = computed(() => {
  switch (result.value) {
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

const resultColor = computed(() => {
  switch (result.value) {
    case "win":
      return "text-emerald-600";
    case "lose":
      return "text-red-600";
    case "escape":
      return "text-amber-600";
    default:
      return "text-gray-800";
  }
});

const actionQueueProgress = computed(() => 0);

// ============ 方法 ============

function handleUnitClick(payload: { unit: BattleUnit; position: Point }): void {
  console.log("[BattlePage] 单位被点击:", payload.unit.name, payload.position);
}

function handleUnitHover(payload: { unit: BattleUnit | null }): void {
  hoveredUnit.value = payload.unit;
}

function handleMenuSelect(key: string): void {
  console.log("[BattlePage] 菜单选择:", key);
  switch (key) {
    case "attack":
      break;
    case "skill":
      break;
    case "item":
      break;
    case "defend":
      handleAction("defend");
      break;
    case "escape":
      handleAction("escape");
      break;
    default:
      break;
  }
}

function handleAction(
  type: ActionType,
  _targetId?: string,
  _skillId?: string,
  _itemId?: string,
): void {
  console.log("[BattlePage] 执行行动:", type);
  if (currentActorIndex.value < playerUnits.value.length - 1) {
    currentActorIndex.value++;
  } else {
    startExecutePhase();
  }
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

async function startDemoBattle(): Promise<void> {
  // 默认 6 个我方角色
  playerUnits.value = [
    createDemoUnit("player1", "勇者", true, 0, 0),
    createDemoUnit("player2", "法师", true, 1, 0),
    createDemoUnit("player3", "牧师", true, 2, 0),
    createDemoUnit("player4", "刺客", true, 0, 1),
    createDemoUnit("player5", "弓手", true, 1, 1),
    createDemoUnit("player6", "骑士", true, 2, 1),
  ];
  // 默认 6 个敌方角色
  enemyUnits.value = [
    createDemoUnit("enemy1", "哥布林", false, 0, 0),
    createDemoUnit("enemy2", "史莱姆", false, 1, 0),
    createDemoUnit("enemy3", "骷髅兵", false, 2, 0),
    createDemoUnit("enemy4", "蝙蝠", false, 0, 1),
    createDemoUnit("enemy5", "狼人", false, 1, 1),
    createDemoUnit("enemy6", "巨魔", false, 2, 1),
  ];

  phase.value = "command";
  turn.value = 1;
  currentActorIndex.value = 0;
  result.value = null;
  timer.value = 60;
  startTimer();
}

function startTimer(): void {
  stopTimer();
  timerInterval = setInterval(() => {
    timer.value--;
    if (timer.value <= 0) {
      handleTimeOut();
    }
  }, 1000);
}

function stopTimer(): void {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function handleTimeOut(): void {
  stopTimer();
  startExecutePhase();
}

async function startExecutePhase(): Promise<void> {
  stopTimer();
  phase.value = "execute";
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const random = Math.random();
  if (random < 0.3) {
    endBattle("win");
  } else if (random < 0.1) {
    endBattle("lose");
  } else {
    nextTurn();
  }
}

function nextTurn(): void {
  turn.value++;
  phase.value = "command";
  currentActorIndex.value = 0;
  timer.value = 60;
  startTimer();
}

function endBattle(battleResult: "win" | "lose" | "escape"): void {
  stopTimer();
  phase.value = "result";
  result.value = battleResult;
  setTimeout(() => {
    showResultModal.value = true;
  }, 1000);
}

function restartBattle(): void {
  showResultModal.value = false;
  resetBattle();
  startDemoBattle();
}

function resetBattle(): void {
  stopTimer();
  phase.value = "init";
  turn.value = 1;
  timer.value = 60;
  currentActorIndex.value = 0;
  result.value = null;
  playerUnits.value = [];
  enemyUnits.value = [];
}

function goToMenu(): void {
  showResultModal.value = false;
  resetBattle();
}

// ============ 生命周期 ============

// 监听容器 resize，自动更新画布尺寸
useResizeObserver(containerRef, (entries) => {
  const entry = entries[0];
  if (entry) {
    canvasWidth.value = entry.contentRect.width;
    canvasHeight.value = entry.contentRect.height;
  }
});

onUnmounted(() => {
  stopTimer();
});

watch(result, (newResult) => {
  if (newResult) {
    setTimeout(() => {
      showResultModal.value = true;
    }, 1500);
  }
});
</script>

<template>
  <!-- 全屏画布容器 -->
  <div ref="containerRef" class="relative h-full w-full overflow-hidden bg-gray-50">
    <!-- 战斗画布 - 使用 GameCanvas -->
    <GameCanvas
      ref="canvasRef"
      :game-data="gameData"
      :enable-transform="false"
      :width="canvasWidth"
      :height="canvasHeight"
      class="absolute inset-0"
      @unit:click="handleUnitClick"
      @unit:hover="handleUnitHover"
    >
      <!-- header slot：顶部信息栏 -->
      <template #header="{ scene, players, turn: turnInfo }">
        <BattleHeader :scene="scene" :players="players" :turn="turnInfo" />
      </template>

      <!-- overlay slot：菱形菜单（指令阶段显示） -->
      <template #overlay="{ canvasSize }">
        <div
          v-if="phase === 'command'"
          class="absolute z-20"
          :style="{
            left: `${canvasSize.width / 2}px`,
            top: `${canvasSize.height / 2}px`,
            transform: 'translate(-50%, -50%)',
          }"
        >
          <DiamondMenu @select="handleMenuSelect" />
        </div>
      </template>

      <!-- unit-info slot：单位信息悬浮框 -->
      <template #unit-info="{ unit, position }">
        <UnitInfoPopup :unit="unit" :position="position" />
      </template>
    </GameCanvas>

    <!-- 倒计时（操作阶段显示） -->
    <div
      v-if="phase === 'command'"
      class="absolute bottom-0 right-0 m-2 z-20 rounded-lg border border-gray-200 bg-white px-4 py-2 shadow-sm"
    >
      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-600">剩余时间</span>
        <span class="text-2xl font-bold tabular-nums" :class="timerColor">
          {{ timerDisplay }}
        </span>
      </div>
    </div>

    <!-- 右上角：执行进度（执行阶段显示） -->
    <div
      v-if="phase === 'execute'"
      class="absolute top-14 right-4 z-20 rounded-lg border border-gray-200 bg-white px-4 py-2 shadow-sm"
    >
      <div class="flex items-center gap-3">
        <div
          class="size-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"
        />
        <span class="text-sm text-gray-600">执行中...</span>
        <div class="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
          <div
            class="h-full bg-indigo-500 transition-all duration-300"
            :style="{ width: `${actionQueueProgress * 100}%` }"
          />
        </div>
      </div>
    </div>

    <!-- 中央：开始战斗按钮（初始状态显示） -->
    <div v-if="phase === 'init'" class="absolute inset-0 z-30 flex items-center justify-center">
      <div class="flex flex-col items-center gap-4">
        <button
          class="rounded-xl bg-indigo-500 px-8 py-4 text-xl font-bold text-white shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 hover:bg-indigo-600 hover:shadow-xl"
          @click="startDemoBattle"
        >
          开始战斗
        </button>
        <p class="text-sm text-gray-400">点击开始演示战斗</p>
      </div>
    </div>

    <!-- 战斗结果弹窗 -->
    <div
      v-if="showResultModal"
      class="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <div class="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-2xl">
        <h2 class="mb-4 text-3xl font-bold" :class="resultColor">
          {{ resultText }}
        </h2>
        <p class="mb-6 text-gray-600">战斗持续 {{ turn }} 回合</p>
        <div class="flex justify-center gap-4">
          <button
            class="rounded-lg bg-indigo-500 px-6 py-2.5 font-semibold text-white shadow-md transition-all hover:bg-indigo-600"
            @click="restartBattle"
          >
            再来一局
          </button>
          <button
            class="rounded-lg border border-gray-300 bg-gray-50 px-6 py-2.5 font-semibold text-gray-700 transition-all hover:bg-gray-100"
            @click="goToMenu"
          >
            返回
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
