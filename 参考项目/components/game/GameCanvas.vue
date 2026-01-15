<script setup lang="ts">
/**
 * @file 游戏画布组件
 * @description 封装 BattleCanvas 组件，提供菜单等UI
 */
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { generateBattleConfigFromSandbox } from "@/core/utils/battleConfig";
import { SKILL_SANDBOX_UNITS } from "@/core/config/sandboxConfig";
import BattleCanvas from "@/core/game/BattleCanvas.vue";
import { BattleCanvasAdapter } from "@/core/game/BattleCanvasAdapter";
import type { BattleJSONConfig } from "@/core/game/config";
import type { BattleController } from "@/core/game/BattleController";

const emit = defineEmits<{
  ready: [BattleController];
}>();

const battleCanvasRef = ref<InstanceType<typeof BattleCanvas> | null>(null);
const adapter = ref<BattleCanvasAdapter | null>(null);

// 战斗配置
const battleConfig = ref<BattleJSONConfig | null>(null);

// 初始化战斗配置
const initializeBattleConfig = () => {
  battleConfig.value = generateBattleConfigFromSandbox(
    SKILL_SANDBOX_UNITS,
    800,
    600
  );
};

// 游戏状态
const gameTitle = ref("山双吕奈");
const playerName = ref("三国新人");
const opponentName = ref("山贼");
const turnCounter = ref(59);
const actionTime = ref(0); // 操作时间（秒）

// 操作时间计时器
let timeInterval: number | null = null;

// 菱形菜单项 - 两列布局
// 左侧列（向上偏移）：攻击、物品、招将
const leftColumnItems = [
  { id: "attack", label: "攻击" },
  { id: "item", label: "物品" },
  { id: "recruit", label: "招将" },
];
// 右侧列（向下偏移）：技能、防御、逃跑、招降
const rightColumnItems = [
  { id: "skill", label: "技能" },
  { id: "defend", label: "防御" },
  { id: "flee", label: "逃跑" },
  { id: "surrender", label: "招降" },
];

const selectedMenuId = ref<string | null>(null);

// 处理菜单点击
const handleMenuClick = (menuId: string) => {
  selectedMenuId.value = menuId;
  console.log("选择菜单项:", menuId);
  // TODO: 实现菜单项的具体功能
};

// 开始计时
const startTimer = () => {
  if (timeInterval) return;
  actionTime.value = 0;
  timeInterval = window.setInterval(() => {
    actionTime.value += 1;
  }, 1000);
};

// 停止计时
const stopTimer = () => {
  if (timeInterval) {
    clearInterval(timeInterval);
    timeInterval = null;
  }
};

// 格式化时间显示
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
};

onMounted(() => {
  initializeBattleConfig();
  adapter.value = new BattleCanvasAdapter();
  startTimer();
});

// 当 BattleCanvas 就绪时，绑定适配器
const handleCanvasReady = () => {
  if (battleCanvasRef.value && adapter.value) {
    adapter.value.bindCanvas(battleCanvasRef.value);
    // 发出 ready 事件，传递适配器作为 BattleController
    emit("ready", adapter.value as unknown as BattleController);
  }
};

// 监听配置变化，自动应用到画布
const appliedConfig = computed(() => battleConfig.value);

// 销毁时清理资源
onBeforeUnmount(() => {
  stopTimer();
  adapter.value?.destroy();
  adapter.value = null;
});
</script>

<template>
  <div class="relative flex h-full w-full flex-col bg-black">
    <!-- 顶部标题栏 - 游戏UI风格 -->
    <div
      class="absolute top-0 left-0 right-0 z-10 flex items-center justify-between border-b-4 border-blue-400 bg-gradient-to-r from-blue-800 via-blue-900 to-red-900 px-6 py-2"
      style="
        image-rendering: pixelated;
        image-rendering: -moz-crisp-edges;
        image-rendering: crisp-edges;
      "
    >
      <!-- 左侧：对手信息 -->
      <div class="flex items-center gap-2">
        <div
          class="border-2 border-blue-300 bg-blue-700 px-4 py-1 font-bold text-white shadow-lg"
          style="
            font-family: 'Courier New', monospace;
            text-shadow: 2px 2px 0px rgba(0, 0, 0, 0.8);
            letter-spacing: 1px;
          "
        >
          {{ opponentName }}
        </div>
      </div>

      <!-- 中间：游戏标题和回合信息 -->
      <div class="flex flex-col items-center">
        <div
          class="font-bold text-white"
          style="
            font-family: 'Courier New', monospace;
            font-size: 18px;
            text-shadow: 2px 2px 0px rgba(0, 0, 0, 0.8);
            letter-spacing: 2px;
          "
        >
          {{ gameTitle }}
        </div>
        <div
          class="text-yellow-200"
          style="
            font-family: 'Courier New', monospace;
            font-size: 14px;
            text-shadow: 1px 1px 0px rgba(0, 0, 0, 0.8);
            letter-spacing: 1px;
          "
        >
          {{ playerName }}-出招({{ turnCounter }})
        </div>
      </div>

      <!-- 右侧：玩家信息 -->
      <div class="flex items-center gap-2">
        <div
          class="border-2 border-red-300 bg-red-700 px-4 py-1 font-bold text-white shadow-lg"
          style="
            font-family: 'Courier New', monospace;
            text-shadow: 2px 2px 0px rgba(0, 0, 0, 0.8);
            letter-spacing: 1px;
          "
        >
          {{ playerName }}
        </div>
      </div>
    </div>

    <!-- 游戏画布区域（不允许缩放） -->
    <div class="flex-1 overflow-hidden pt-16">
      <BattleCanvas
        ref="battleCanvasRef"
        :config="appliedConfig"
        :disable-controls="true"
        class="h-full w-full"
        @ready="handleCanvasReady"
        @unit-click="
          (unitId) => {
            adapter?.setSelectedUnit(unitId);
          }
        "
      >
        <!-- 隐藏工具栏 -->
        <template #toolbar>
          <div style="display: none"></div>
        </template>
      </BattleCanvas>
    </div>

    <!-- 中间菱形菜单 - 两列布局，游戏UI风格 -->
    <div
      class="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
      style="
        image-rendering: pixelated;
        image-rendering: -moz-crisp-edges;
        image-rendering: crisp-edges;
      "
    >
      <div class="relative flex gap-4">
        <!-- 左侧列（向上偏移） -->
        <div class="flex flex-col gap-2 -translate-y-4">
          <button
            v-for="item in leftColumnItems"
            :key="item.id"
            :class="[
              'relative rotate-45 border-4 border-blue-400 bg-slate-800 text-white shadow-lg transition-all duration-150 hover:bg-blue-600 hover:border-blue-300 hover:shadow-xl',
              selectedMenuId === item.id
                ? 'bg-blue-600 border-blue-300 scale-110'
                : '',
            ]"
            style="
              width: 60px;
              height: 60px;
              clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
              font-family: 'Courier New', monospace;
              text-shadow: 1px 1px 0px rgba(0, 0, 0, 0.8);
            "
            type="button"
            @click="handleMenuClick(item.id)"
          >
            <span
              class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-45 text-xs font-bold leading-tight"
            >
              {{ item.label }}
            </span>
          </button>
        </div>

        <!-- 右侧列（向下偏移） -->
        <div class="flex flex-col gap-2 translate-y-4">
          <button
            v-for="item in rightColumnItems"
            :key="item.id"
            :class="[
              'relative rotate-45 border-4 border-blue-400 bg-slate-800 text-white shadow-lg transition-all duration-150 hover:bg-blue-600 hover:border-blue-300 hover:shadow-xl',
              selectedMenuId === item.id
                ? 'bg-blue-600 border-blue-300 scale-110'
                : '',
            ]"
            style="
              width: 60px;
              height: 60px;
              clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
              font-family: 'Courier New', monospace;
              text-shadow: 1px 1px 0px rgba(0, 0, 0, 0.8);
            "
            type="button"
            @click="handleMenuClick(item.id)"
          >
            <span
              class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-45 text-xs font-bold leading-tight"
            >
              {{ item.label }}
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- 右下角：操作时间 - 游戏UI风格 -->
    <div
      class="absolute bottom-4 right-4 z-20 flex items-center gap-2 border-2 border-blue-400 bg-slate-900/95 px-3 py-2 shadow-lg"
      style="
        image-rendering: pixelated;
        image-rendering: -moz-crisp-edges;
        image-rendering: crisp-edges;
        font-family: 'Courier New', monospace;
        text-shadow: 1px 1px 0px rgba(0, 0, 0, 0.8);
      "
    >
      <svg
        class="h-4 w-4 text-blue-400"
        fill="currentColor"
        viewBox="0 0 20 20"
        style="image-rendering: pixelated"
      >
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
          clip-rule="evenodd"
        />
      </svg>
      <span class="text-sm font-bold text-white" style="letter-spacing: 1px">
        {{ formatTime(actionTime) }}
      </span>
    </div>
  </div>
</template>
