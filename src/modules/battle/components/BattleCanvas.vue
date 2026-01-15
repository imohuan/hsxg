<script setup lang="ts">
/**
 * @file 战斗画布组件
 * 集成 Phaser 游戏实例，渲染战斗场景
 * Requirements: 1.1-1.5
 */
import { ref, onMounted, onUnmounted, watch } from "vue";
import Phaser from "phaser";
import { BattleScene } from "../core/BattleScene";
import type { BattleConfig } from "@/types";
import type { Unit } from "../core/Unit";

// ============ Props & Emits ============

const props = defineProps<{
  /** 战斗配置 */
  config?: BattleConfig;
  /** 画布宽度 */
  width?: number;
  /** 画布高度 */
  height?: number;
}>();

const emit = defineEmits<{
  /** 场景就绪 */
  ready: [scene: BattleScene];
  /** 单位被点击 */
  unitClick: [unit: Unit];
}>();

// ============ 状态 ============

/** 画布容器引用 */
const containerRef = ref<HTMLDivElement | null>(null);

/** Phaser 游戏实例 */
let game: Phaser.Game | null = null;

/** 战斗场景实例 */
let battleScene: BattleScene | null = null;

/** 是否已初始化 */
const isInitialized = ref(false);

/** 是否加载中 */
const isLoading = ref(false);

// ============ 生命周期 ============

onMounted(() => {
  initGame();
});

onUnmounted(() => {
  destroyGame();
});

// ============ 监听配置变化 ============

watch(
  () => props.config,
  async (newConfig) => {
    if (newConfig && battleScene) {
      isLoading.value = true;
      await battleScene.loadBattleConfig(newConfig);
      isLoading.value = false;
    }
  },
);

// ============ 方法 ============

/** 初始化 Phaser 游戏 */
function initGame(): void {
  if (!containerRef.value || game) return;

  // 创建战斗场景
  battleScene = new BattleScene();

  // 注册场景事件
  battleScene.on("sceneReady", () => {
    isInitialized.value = true;
    emit("ready", battleScene!);

    // 如果有初始配置，加载战斗
    if (props.config) {
      loadBattle(props.config);
    }
  });

  battleScene.on("unitClicked", (unit: Unit) => {
    emit("unitClick", unit);
  });

  // Phaser 配置
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: containerRef.value,
    width: props.width ?? 800,
    height: props.height ?? 450,
    backgroundColor: "#1a1a2e",
    scene: battleScene,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: {
      antialias: true,
      pixelArt: false,
    },
  };

  // 创建游戏实例
  game = new Phaser.Game(config);
}

/** 销毁游戏实例 */
function destroyGame(): void {
  if (game) {
    game.destroy(true);
    game = null;
    battleScene = null;
    isInitialized.value = false;
  }
}

/** 加载战斗配置 */
async function loadBattle(config: BattleConfig): Promise<void> {
  if (!battleScene) return;

  isLoading.value = true;
  await battleScene.loadBattleConfig(config);
  isLoading.value = false;
}

/** 获取场景实例 */
function getScene(): BattleScene | null {
  return battleScene;
}

// ============ 暴露方法 ============

defineExpose({
  getScene,
  loadBattle,
  isInitialized,
  isLoading,
});
</script>

<template>
  <div class="relative overflow-hidden rounded-lg bg-gray-900">
    <!-- Phaser 画布容器 -->
    <div
      ref="containerRef"
      class="battle-canvas"
      :style="{
        width: `${width ?? 800}px`,
        height: `${height ?? 450}px`,
      }"
    />

    <!-- 加载遮罩 -->
    <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-black/50">
      <div class="flex flex-col items-center gap-2">
        <div class="size-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        <span class="text-sm text-white">加载中...</span>
      </div>
    </div>

    <!-- 未初始化提示 -->
    <div v-if="!isInitialized && !isLoading" class="absolute inset-0 flex items-center justify-center bg-gray-900">
      <span class="text-gray-500">初始化战斗场景...</span>
    </div>
  </div>
</template>
