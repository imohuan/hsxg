<script setup lang="ts">
/**
 * 统一战斗画布组件（兼容层）
 * 此组件已迁移到 @/components/gamecanvas/GameCanvas.vue
 * 保留此文件以保持向后兼容，新代码请直接使用 GameCanvas
 * @deprecated 请使用 @/components/gamecanvas/GameCanvas.vue
 */

import { ref, useSlots } from "vue";
import GameCanvas from "@/components/gamecanvas/GameCanvas.vue";
import type {
  GameData,
  BattleSceneConfig,
  BattleUnit,
  Point,
  UnifiedBattleCanvasExpose,
} from "@/types";
import DiamondMenu from "./DiamondMenu.vue";

// ============ Props 定义 ============

const props = withDefaults(
  defineProps<{
    /** 完整游戏数据（新版统一入口） */
    gameData?: GameData;
    /** 画布宽度，默认 800 */
    width?: number;
    /** 画布高度，默认 500 */
    height?: number;
    /** 是否启用缩放平移，默认 false */
    enableTransform?: boolean;
    /** 是否显示单位，默认 true */
    showUnits?: boolean;
    /** 是否显示调试信息，默认 false */
    debug?: boolean;
    // ============ 旧版 Props（向后兼容） ============
    /** @deprecated 使用 gameData 替代 */
    config?: BattleSceneConfig;
    /** @deprecated 使用 slots.overlay 替代 */
    showMenu?: boolean;
    /** @deprecated 使用 gameData.effects 替代 */
    effects?: import("@/types").EffectConfig[];
    /** @deprecated 使用 gameData.sounds 替代 */
    sounds?: import("@/types").SoundConfig[];
    /** @deprecated 使用 slots.overlay 替代 */
    disabledMenuItems?: string[];
  }>(),
  {
    width: 800,
    height: 500,
    enableTransform: false,
    showUnits: true,
    debug: false,
    showMenu: false,
    effects: () => [],
    sounds: () => [],
    disabledMenuItems: () => [],
  },
);

// ============ Emits 定义 ============

const emit = defineEmits<{
  // 交互事件
  "unit:click": [payload: { unit: BattleUnit; position: Point }];
  "unit:hover": [payload: { unit: BattleUnit | null }];
  "unit:select": [payload: { unit: BattleUnit | null }];
  "canvas:click": [payload: { position: Point }];
  "canvas:ready": [];
  "animation:start": [payload: { type: string; unitId?: string }];
  "animation:end": [payload: { type: string; unitId?: string }];
  "effect:start": [payload: { effectId: string; instanceId: string }];
  "effect:end": [payload: { effectId: string; instanceId: string }];
  "unit:hp-change": [payload: { unitId: string; oldHp: number; newHp: number }];
  "unit:mp-change": [payload: { unitId: string; oldMp: number; newMp: number }];
  "unit:death": [payload: { unitId: string }];
  "camera:change": [payload: { scale: number; offset: Point }];
  // 旧版事件
  unitClick: [unitId: string];
  unitSelect: [unitId: string | null];
  menuSelect: [key: string];
}>();

const slots = useSlots();
const canvasRef = ref<InstanceType<typeof GameCanvas> | null>(null);

// 转发所有事件
function handleUnitClick(payload: { unit: BattleUnit; position: Point }) {
  emit("unit:click", payload);
  emit("unitClick", payload.unit.id);
}

function handleUnitHover(payload: { unit: BattleUnit | null }) {
  emit("unit:hover", payload);
}

function handleUnitSelect(payload: { unit: BattleUnit | null }) {
  emit("unit:select", payload);
  emit("unitSelect", payload.unit?.id ?? null);
}

function handleCanvasClick(payload: { position: Point }) {
  emit("canvas:click", payload);
}

function handleCanvasReady() {
  emit("canvas:ready");
}

function handleAnimationStart(payload: { type: string; unitId?: string }) {
  emit("animation:start", payload);
}

function handleAnimationEnd(payload: { type: string; unitId?: string }) {
  emit("animation:end", payload);
}

function handleEffectStart(payload: { effectId: string; instanceId: string }) {
  emit("effect:start", payload);
}

function handleEffectEnd(payload: { effectId: string; instanceId: string }) {
  emit("effect:end", payload);
}

function handleHpChange(payload: { unitId: string; oldHp: number; newHp: number }) {
  emit("unit:hp-change", payload);
}

function handleMpChange(payload: { unitId: string; oldMp: number; newMp: number }) {
  emit("unit:mp-change", payload);
}

function handleDeath(payload: { unitId: string }) {
  emit("unit:death", payload);
}

function handleCameraChange(payload: { scale: number; offset: Point }) {
  emit("camera:change", payload);
}

// 导出 API（代理到 GameCanvas）
defineExpose<UnifiedBattleCanvasExpose>({
  render: () => canvasRef.value?.render(),
  getContext: () => canvasRef.value?.getContext() ?? null,
  getCanvasSize: () => canvasRef.value?.getCanvasSize() ?? { width: 0, height: 0 },
  moveUnit: (...args) => canvasRef.value?.moveUnit(...args) ?? Promise.resolve(),
  playUnitAnimation: (...args) => canvasRef.value?.playUnitAnimation(...args) ?? Promise.resolve(),
  setUnitPosition: (...args) => canvasRef.value?.setUnitPosition(...args),
  resetUnitPosition: (...args) => canvasRef.value?.resetUnitPosition(...args),
  resetAllUnitPositions: () => canvasRef.value?.resetAllUnitPositions(),
  setUnitActive: (...args) => canvasRef.value?.setUnitActive(...args),
  setUnitSelected: (...args) => canvasRef.value?.setUnitSelected(...args),
  getUnitPosition: (...args) => canvasRef.value?.getUnitPosition(...args) ?? null,
  getUnitAtPosition: (...args) => canvasRef.value?.getUnitAtPosition(...args) ?? null,
  playEffect: (...args) => canvasRef.value?.playEffect(...args) ?? Promise.resolve(""),
  playEffectOnUnit: (...args) => canvasRef.value?.playEffectOnUnit(...args) ?? Promise.resolve(""),
  stopEffect: (...args) => canvasRef.value?.stopEffect(...args),
  stopAllEffects: () => canvasRef.value?.stopAllEffects(),
  shakeCamera: (...args) => canvasRef.value?.shakeCamera(...args) ?? Promise.resolve(),
  moveCamera: (...args) => canvasRef.value?.moveCamera(...args) ?? Promise.resolve(),
  zoomCamera: (...args) => canvasRef.value?.zoomCamera(...args) ?? Promise.resolve(),
  resetCamera: (...args) => canvasRef.value?.resetCamera(...args) ?? Promise.resolve(),
  focusOnUnit: (...args) => canvasRef.value?.focusOnUnit(...args) ?? Promise.resolve(),
  getCameraState: () => canvasRef.value?.getCameraState() ?? { scale: 1, offsetX: 0, offsetY: 0 },
  setBackground: (...args) => canvasRef.value?.setBackground(...args) ?? Promise.resolve(),
  setBackgroundColor: (...args) => canvasRef.value?.setBackgroundColor(...args),
  fadeBackground: (...args) => canvasRef.value?.fadeBackground(...args) ?? Promise.resolve(),
  flashScreen: (...args) => canvasRef.value?.flashScreen(...args) ?? Promise.resolve(),
  playSound: (...args) => canvasRef.value?.playSound(...args) ?? "",
  stopSound: (...args) => canvasRef.value?.stopSound(...args),
  stopAllSounds: () => canvasRef.value?.stopAllSounds(),
  showDamageNumber: (...args) => canvasRef.value?.showDamageNumber(...args),
  showFloatingText: (...args) => canvasRef.value?.showFloatingText(...args),
  updateUnitHp: (...args) => canvasRef.value?.updateUnitHp(...args),
  updateUnitMp: (...args) => canvasRef.value?.updateUnitMp(...args),
  executeStep: (...args) => canvasRef.value?.executeStep(...args) ?? Promise.resolve(),
  executeSteps: (...args) => canvasRef.value?.executeSteps(...args) ?? Promise.resolve(),
  executeStepsParallel: (...args) =>
    canvasRef.value?.executeStepsParallel(...args) ?? Promise.resolve(),
  setTargetUnit: (...args) => canvasRef.value?.setTargetUnit(...args),
  setActiveUnit: (...args) => canvasRef.value?.setActiveUnit(...args),
});
</script>

<template>
  <GameCanvas
    ref="canvasRef"
    :game-data="gameData"
    :config="config"
    :width="width"
    :height="height"
    :enable-transform="enableTransform"
    :show-units="showUnits"
    :debug="debug"
    :effects="effects"
    :sounds="sounds"
    @unit:click="handleUnitClick"
    @unit:hover="handleUnitHover"
    @unit:select="handleUnitSelect"
    @canvas:click="handleCanvasClick"
    @canvas:ready="handleCanvasReady"
    @animation:start="handleAnimationStart"
    @animation:end="handleAnimationEnd"
    @effect:start="handleEffectStart"
    @effect:end="handleEffectEnd"
    @unit:hp-change="handleHpChange"
    @unit:mp-change="handleMpChange"
    @unit:death="handleDeath"
    @camera:change="handleCameraChange"
  >
    <!-- 转发 header 插槽 -->
    <template v-if="slots.header" #header="slotProps">
      <slot name="header" v-bind="slotProps" />
    </template>

    <!-- 转发 overlay 插槽，或显示旧版内置菜单 -->
    <template #overlay="slotProps">
      <slot v-if="slots.overlay" name="overlay" v-bind="slotProps" />
      <!-- 旧版内置菜单（向后兼容，当没有 overlay 插槽且 showMenu=true 时显示） -->
      <div
        v-else-if="showMenu"
        class="absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
      >
        <DiamondMenu
          :disabled-items="disabledMenuItems"
          @select="(key: string) => emit('menuSelect', key)"
        />
      </div>
    </template>

    <!-- 转发 footer 插槽 -->
    <template v-if="slots.footer" #footer="slotProps">
      <slot name="footer" v-bind="slotProps" />
    </template>

    <!-- 转发 unit-info 插槽 -->
    <template v-if="slots['unit-info']" #unit-info="slotProps">
      <slot name="unit-info" v-bind="slotProps" />
    </template>

    <!-- 转发 debug 插槽 -->
    <template v-if="slots.debug" #debug="slotProps">
      <slot name="debug" v-bind="slotProps" />
    </template>
  </GameCanvas>
</template>
