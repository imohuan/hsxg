<script setup lang="ts">
/**
 * 统一游戏画布组件
 * 用于战斗页面、特效编辑和技能编排预览
 * Requirements: 1.1-1.7, 2.1-2.5, 6.1-6.5
 */

import { ref, watch, onMounted, onUnmounted, computed, useSlots } from "vue";
import type {
  GameData,
  BattleSceneConfig,
  BattleUnit,
  Point,
  CameraState,
  UnifiedBattleCanvasExpose,
  MoveOptions,
  EffectOptions,
  SoundOptions,
  EasingType,
  DamageType,
  SkillStep,
  FloatingTextOptions,
} from "@/types";
import { useCanvasRenderer } from "./composables/useCanvasRenderer";
import { useUnitManager } from "./composables/useUnitManager";
import { useCameraController } from "./composables/useCameraController";
import { useEffectManager } from "./composables/useEffectManager";
import { useAudioManager } from "./composables/useAudioManager";
import { StepExecutor } from "./core/StepExecutor";

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
    /** @deprecated 使用 gameData.effects 替代 */
    effects?: import("@/types").EffectConfig[];
    /** @deprecated 使用 gameData.sounds 替代 */
    sounds?: import("@/types").SoundConfig[];
  }>(),
  {
    width: 800,
    height: 500,
    enableTransform: false,
    showUnits: true,
    debug: false,
    effects: () => [],
    sounds: () => [],
  },
);

// ============ Emits 定义 ============

const emit = defineEmits<{
  // 交互事件
  /** 单位被点击 */
  "unit:click": [payload: { unit: BattleUnit; position: Point }];
  /** 单位悬停变化 */
  "unit:hover": [payload: { unit: BattleUnit | null }];
  /** 单位选中变化 */
  "unit:select": [payload: { unit: BattleUnit | null }];
  /** 画布空白区域被点击 */
  "canvas:click": [payload: { position: Point }];
  /** 画布初始化完成 */
  "canvas:ready": [];

  // 动画事件
  /** 动画开始 */
  "animation:start": [payload: { type: string; unitId?: string }];
  /** 动画结束 */
  "animation:end": [payload: { type: string; unitId?: string }];
  /** 特效开始播放 */
  "effect:start": [payload: { effectId: string; instanceId: string }];
  /** 特效播放结束 */
  "effect:end": [payload: { effectId: string; instanceId: string }];

  // 状态事件
  /** 血量变化 */
  "unit:hp-change": [payload: { unitId: string; oldHp: number; newHp: number }];
  /** 蓝量变化 */
  "unit:mp-change": [payload: { unitId: string; oldMp: number; newMp: number }];
  /** 单位死亡 */
  "unit:death": [payload: { unitId: string }];
  /** 相机状态变化 */
  "camera:change": [payload: { scale: number; offset: Point }];

  // ============ 旧版事件（向后兼容） ============
  /** @deprecated 使用 unit:click 替代 */
  unitClick: [unitId: string];
  /** @deprecated 使用 unit:select 替代 */
  unitSelect: [unitId: string | null];
}>();

// ============ Slots ============

const slots = useSlots();

// ============ 响应式状态 ============

// Canvas 元素引用
const canvasElement = ref<HTMLCanvasElement | null>(null);
const containerElement = ref<HTMLDivElement | null>(null);

// 实际渲染尺寸
const actualWidth = ref(props.width);
const actualHeight = ref(props.height);

// 当前选中的目标单位
const selectedUnit = ref<BattleUnit | null>(null);

// 当前悬停的单位
const hoveredUnit = ref<BattleUnit | null>(null);
const hoverPosition = ref<Point | null>(null);

// 拖拽状态
const isDragging = ref(false);
const dragStart = ref({ x: 0, y: 0 });

// ============ 计算属性 ============

// 从 gameData 或旧版 config 转换为内部使用的 BattleSceneConfig
const internalConfig = computed<BattleSceneConfig>(() => {
  // 优先使用新版 gameData
  if (props.gameData) {
    const { scene, players, units, turn } = props.gameData;

    // 分离敌方和我方单位
    const enemyUnits = units.filter((u) => !u.isPlayer);
    const playerUnits = units.filter((u) => u.isPlayer);

    return {
      sceneName: scene.name,
      backgroundUrl: scene.backgroundUrl,
      backgroundColor: scene.backgroundColor,
      enemyPlayerName: players.enemy.name,
      playerName: players.self.name,
      enemyUnits,
      playerUnits,
      activeUnitId: turn?.activeUnitId,
      turnInfo: turn ? `第 ${turn.number} 回合` : undefined,
    };
  }

  // 兼容旧版 config
  if (props.config) {
    return props.config;
  }

  // 默认空配置
  return {
    sceneName: "",
    backgroundColor: "#f9fafb",
    enemyPlayerName: "",
    playerName: "",
    enemyUnits: [],
    playerUnits: [],
  };
});

// 获取所有单位（用于内部查找）
const allUnits = computed<BattleUnit[]>(() => {
  if (props.gameData) {
    return props.gameData.units;
  }
  if (props.config) {
    return [...props.config.enemyUnits, ...props.config.playerUnits];
  }
  return [];
});

// 获取特效配置
const effectConfigs = computed(() => {
  if (props.gameData) {
    return props.gameData.effects;
  }
  return props.effects || [];
});

// 获取音效配置
const soundConfigs = computed(() => {
  if (props.gameData) {
    return props.gameData.sounds;
  }
  return props.sounds || [];
});

// 当前行动单位
const activeUnit = computed<BattleUnit | null>(() => {
  const activeId = props.gameData?.turn?.activeUnitId || props.config?.activeUnitId;
  if (!activeId) return null;
  return allUnits.value.find((u) => u.id === activeId) || null;
});

// 画布尺寸
const canvasSize = computed(() => ({
  width: actualWidth.value,
  height: actualHeight.value,
}));

// ============ 初始化各模块 ============

const renderer = useCanvasRenderer({
  width: actualWidth.value,
  height: actualHeight.value,
});

const unitManager = useUnitManager({
  canvasWidth: actualWidth.value,
  canvasHeight: actualHeight.value,
});

const cameraController = useCameraController({
  canvasWidth: actualWidth.value,
  canvasHeight: actualHeight.value,
});

const effectManager = useEffectManager({
  effects: effectConfigs.value,
});

const audioManager = useAudioManager();

// 步骤执行器
let stepExecutor: StepExecutor;

// 动画循环
let animationFrameId: number | null = null;
let isRunning = false;

// ============ 内部方法 ============

// 获取单位位置
function getUnitPosition(unitId: string): Point | null {
  const state = unitManager.getUnitState(unitId);
  return state ? { x: state.position.x, y: state.position.y } : null;
}

// 获取指定位置的单位
function getUnitAtPosition(x: number, y: number): BattleUnit | null {
  const unitWidth = 80;
  const unitHeight = 100;

  for (const unit of allUnits.value) {
    const state = unitManager.getUnitState(unit.id);
    if (!state) continue;

    const { x: ux, y: uy } = state.position;
    if (
      x >= ux - unitWidth / 2 &&
      x <= ux + unitWidth / 2 &&
      y >= uy - unitHeight / 2 &&
      y <= uy + unitHeight / 2
    ) {
      return unit;
    }
  }
  return null;
}

// 渲染循环
function renderLoop() {
  if (!isRunning) return;

  renderer.render(
    internalConfig.value,
    unitManager.unitStates.value,
    cameraController.cameraState.value,
    (ctx) => effectManager.drawEffects(ctx),
  );

  animationFrameId = requestAnimationFrame(renderLoop);
}

// 启动渲染
function startRendering() {
  if (isRunning) return;
  isRunning = true;
  renderLoop();
}

// 停止渲染
function stopRendering() {
  isRunning = false;
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

// 更新实际尺寸
let resizeObserver: ResizeObserver | null = null;

function updateActualSize(): void {
  if (containerElement.value) {
    const rect = containerElement.value.getBoundingClientRect();
    const newWidth = Math.max(rect.width, props.width);
    const newHeight = Math.max(rect.height, props.height);

    if (newWidth !== actualWidth.value || newHeight !== actualHeight.value) {
      actualWidth.value = newWidth;
      actualHeight.value = newHeight;

      // 更新各模块尺寸
      renderer.resize(newWidth, newHeight);
      unitManager.resize(newWidth, newHeight);
      cameraController.resize(newWidth, newHeight);
    }
  }
}

// ============ 生命周期 ============

onMounted(() => {
  // 更新实际尺寸
  updateActualSize();

  if (canvasElement.value) {
    renderer.bindCanvas(canvasElement.value);
    unitManager.initUnits(internalConfig.value);

    // 设置背景
    const bgUrl = props.gameData?.scene.backgroundUrl || props.config?.backgroundUrl;
    const bgColor = props.gameData?.scene.backgroundColor || props.config?.backgroundColor;
    if (bgUrl) {
      renderer.setBackground(bgUrl);
    } else if (bgColor) {
      renderer.setBackgroundColor(bgColor);
    }

    // 注册特效配置
    if (effectConfigs.value.length > 0) {
      effectManager.registerEffects(effectConfigs.value);
    }

    // 注册音效配置
    if (soundConfigs.value.length > 0) {
      audioManager.registerSounds(soundConfigs.value);
    }

    // 初始化步骤执行器
    stepExecutor = new StepExecutor({
      moveUnit: moveUnit,
      setUnitPosition: setUnitPosition,
      resetUnitPosition: resetUnitPosition,
      getUnitPosition: getUnitPosition,
      playEffect: playEffect,
      playEffectOnUnit: playEffectOnUnit,
      stopEffect: stopEffect,
      shakeCamera: shakeCamera,
      moveCamera: moveCamera,
      zoomCamera: zoomCamera,
      resetCamera: resetCamera,
      setBackground: setBackground,
      setBackgroundColor: setBackgroundColor,
      flashScreen: flashScreen,
      playSound: playSound,
      stopSound: stopSound,
      showDamageNumber: showDamageNumber,
      updateUnitHp: updateUnitHp,
      updateUnitMp: updateUnitMp,
    });

    startRendering();

    // 触发 canvas:ready 事件
    emit("canvas:ready");
  }

  // 监听容器尺寸变化
  if (containerElement.value) {
    resizeObserver = new ResizeObserver(updateActualSize);
    resizeObserver.observe(containerElement.value);
  }
});

// 监听 gameData 或 config 变化
watch(
  () => [props.gameData, props.config],
  () => {
    unitManager.initUnits(internalConfig.value);
  },
  { deep: true },
);

// 监听特效配置变化
watch(
  effectConfigs,
  (newEffects) => {
    if (newEffects) {
      effectManager.registerEffects(newEffects);
    }
  },
  { deep: true },
);

// 监听音效配置变化
watch(
  soundConfigs,
  (newSounds) => {
    if (newSounds) {
      audioManager.registerSounds(newSounds);
    }
  },
  { deep: true },
);

// 清理
onUnmounted(() => {
  stopRendering();
  renderer.dispose();
  unitManager.clear();
  cameraController.stopAnimation();
  effectManager.dispose();
  audioManager.dispose();

  // 清理 ResizeObserver
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
});

// ============ 鼠标交互 ============

function handleWheel(e: WheelEvent) {
  if (!props.enableTransform) return;
  e.preventDefault();

  const rect = canvasElement.value?.getBoundingClientRect();
  if (!rect) return;

  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  cameraController.handleWheel(e.deltaY, mouseX, mouseY);

  // 触发相机变化事件
  emit("camera:change", {
    scale: cameraController.cameraState.value.scale,
    offset: {
      x: cameraController.cameraState.value.offsetX,
      y: cameraController.cameraState.value.offsetY,
    },
  });
}

function handleMouseDown(e: MouseEvent) {
  if (!props.enableTransform) return;

  isDragging.value = true;
  dragStart.value = { x: e.clientX, y: e.clientY };
}

function handleMouseMove(e: MouseEvent) {
  const rect = canvasElement.value?.getBoundingClientRect();
  if (!rect) return;

  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // 处理拖拽
  if (isDragging.value && props.enableTransform) {
    const dx = e.clientX - dragStart.value.x;
    const dy = e.clientY - dragStart.value.y;
    dragStart.value = { x: e.clientX, y: e.clientY };
    cameraController.handleDrag(dx, dy);

    // 触发相机变化事件
    emit("camera:change", {
      scale: cameraController.cameraState.value.scale,
      offset: {
        x: cameraController.cameraState.value.offsetX,
        y: cameraController.cameraState.value.offsetY,
      },
    });
    return;
  }

  // 处理悬停检测
  if (!props.showUnits) return;

  const canvasPos = cameraController.screenToCanvas(mouseX, mouseY);
  const unitAtPos = getUnitAtPosition(canvasPos.x, canvasPos.y);

  // 检查悬停单位是否变化
  if (unitAtPos !== hoveredUnit.value) {
    hoveredUnit.value = unitAtPos;
    hoverPosition.value = unitAtPos ? { x: mouseX, y: mouseY } : null;

    // 触发 unit:hover 事件
    emit("unit:hover", { unit: unitAtPos });
  }
}

function handleMouseUp() {
  isDragging.value = false;
}

function handleMouseLeave() {
  isDragging.value = false;

  // 清除悬停状态
  if (hoveredUnit.value) {
    hoveredUnit.value = null;
    hoverPosition.value = null;
    emit("unit:hover", { unit: null });
  }
}

/**
 * 处理画布点击事件
 */
function handleCanvasClick(e: MouseEvent) {
  const rect = canvasElement.value?.getBoundingClientRect();
  if (!rect) return;

  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  // 转换为画布坐标（考虑相机变换）
  const canvasPos = cameraController.screenToCanvas(clickX, clickY);

  // 如果不显示单位，只触发画布点击事件
  if (!props.showUnits) {
    emit("canvas:click", { position: canvasPos });
    return;
  }

  // 检查是否点击了某个单位
  const clickedUnit = getUnitAtPosition(canvasPos.x, canvasPos.y);

  if (clickedUnit) {
    // 检查单位是否可选择
    if (clickedUnit.selectable !== false && !clickedUnit.isDead) {
      handleUnitClick(clickedUnit, canvasPos);
      return;
    }
  }

  // 点击空白区域
  emit("canvas:click", { position: canvasPos });

  // 取消选择
  if (selectedUnit.value) {
    unitManager.setUnitSelected(selectedUnit.value.id, false);
    selectedUnit.value = null;
    emit("unit:select", { unit: null });
    // 旧版事件（向后兼容）
    emit("unitSelect", null);
  }
}

/**
 * 处理单位点击
 */
function handleUnitClick(unit: BattleUnit, position: Point) {
  // 取消之前的选择
  if (selectedUnit.value) {
    unitManager.setUnitSelected(selectedUnit.value.id, false);
  }

  // 设置新的选择
  selectedUnit.value = unit;
  unitManager.setUnitSelected(unit.id, true);

  // 新版事件
  emit("unit:click", { unit, position });
  emit("unit:select", { unit });

  // 旧版事件（向后兼容）
  emit("unitClick", unit.id);
  emit("unitSelect", unit.id);
}

// ============ 导出 API：角色控制 ============

async function moveUnit(
  unitId: string,
  targetX: number,
  targetY: number,
  options?: MoveOptions,
): Promise<void> {
  emit("animation:start", { type: "move", unitId });
  await unitManager.moveUnit(unitId, targetX, targetY, options);
  emit("animation:end", { type: "move", unitId });
}

async function playUnitAnimation(unitId: string, animationKey: string): Promise<void> {
  emit("animation:start", { type: animationKey, unitId });
  await unitManager.playUnitAnimation(unitId, animationKey);
  emit("animation:end", { type: animationKey, unitId });
}

function setUnitPosition(unitId: string, x: number, y: number): void {
  unitManager.setUnitPosition(unitId, x, y);
}

function resetUnitPosition(unitId: string): void {
  unitManager.resetUnitPosition(unitId);
}

function resetAllUnitPositions(): void {
  unitManager.resetAllUnitPositions();
}

function setUnitActive(unitId: string | null): void {
  unitManager.clearAllActive();
  if (unitId) {
    unitManager.setUnitActive(unitId, true);
  }
}

function setUnitSelected(unitId: string | null): void {
  // 取消之前的选择
  if (selectedUnit.value) {
    unitManager.setUnitSelected(selectedUnit.value.id, false);
  }

  if (unitId) {
    const unit = allUnits.value.find((u) => u.id === unitId);
    if (unit) {
      selectedUnit.value = unit;
      unitManager.setUnitSelected(unitId, true);
    }
  } else {
    selectedUnit.value = null;
  }
}

// ============ 导出 API：特效控制 ============

async function playEffect(
  effectId: string,
  x: number,
  y: number,
  options?: EffectOptions,
): Promise<string> {
  const instanceId = await effectManager.playEffect(effectId, x, y, options);
  emit("effect:start", { effectId, instanceId });
  return instanceId;
}

async function playEffectOnUnit(
  effectId: string,
  unitId: string,
  options?: EffectOptions,
): Promise<string> {
  const pos = getUnitPosition(unitId);
  if (!pos) return "";
  const instanceId = await effectManager.playEffect(effectId, pos.x, pos.y, options);
  emit("effect:start", { effectId, instanceId });
  return instanceId;
}

function stopEffect(effectInstanceId: string): void {
  effectManager.stopEffect(effectInstanceId);
}

function stopAllEffects(): void {
  effectManager.stopAllEffects();
}

// ============ 导出 API：视角控制 ============

async function shakeCamera(intensity: number, duration: number): Promise<void> {
  return cameraController.shakeCamera(intensity, duration);
}

async function moveCamera(
  offsetX: number,
  offsetY: number,
  duration: number,
  easing?: EasingType,
): Promise<void> {
  return cameraController.moveCamera(offsetX, offsetY, duration, easing);
}

async function zoomCamera(scale: number, duration: number, easing?: EasingType): Promise<void> {
  return cameraController.zoomCamera(scale, duration, easing);
}

async function resetCamera(duration?: number): Promise<void> {
  return cameraController.resetCamera(duration);
}

async function focusOnUnit(unitId: string, duration: number = 500): Promise<void> {
  const pos = getUnitPosition(unitId);
  if (pos) {
    return cameraController.focusOnPosition(pos.x, pos.y, duration);
  }
}

function getCameraState(): CameraState {
  return { ...cameraController.cameraState.value };
}

// ============ 导出 API：背景控制 ============

async function setBackground(imageUrl: string): Promise<void> {
  return renderer.setBackground(imageUrl);
}

function setBackgroundColor(color: string): void {
  renderer.setBackgroundColor(color);
}

async function fadeBackground(targetColor: string, duration: number): Promise<void> {
  return renderer.fadeBackground(targetColor, duration);
}

async function flashScreen(color: string, duration: number): Promise<void> {
  return renderer.flashScreen(color, duration);
}

// ============ 导出 API：音效控制 ============

function playSound(soundId: string, options?: SoundOptions): string {
  return audioManager.playSound(soundId, options);
}

function stopSound(soundInstanceId: string): void {
  audioManager.stopSound(soundInstanceId);
}

function stopAllSounds(): void {
  audioManager.stopAllSounds();
}

// ============ 导出 API：伤害/数值显示 ============

function showDamageNumber(unitId: string, value: number, type?: DamageType): void {
  const pos = getUnitPosition(unitId);
  if (pos) {
    renderer.showDamageNumber(unitId, pos.x, pos.y, value, type);
  }
}

function showFloatingText(x: number, y: number, text: string, options?: FloatingTextOptions): void {
  renderer.showFloatingText(x, y, text, options);
}

function updateUnitHp(unitId: string, currentHp: number, maxHp?: number): void {
  const unit = allUnits.value.find((u) => u.id === unitId);
  const oldHp = unit?.hp ?? 0;

  unitManager.updateUnitHp(unitId, currentHp, maxHp);

  // 触发血量变化事件
  emit("unit:hp-change", { unitId, oldHp, newHp: currentHp });

  // 检查是否死亡
  if (currentHp <= 0 && oldHp > 0) {
    emit("unit:death", { unitId });
  }
}

function updateUnitMp(unitId: string, currentMp: number, maxMp?: number): void {
  const unit = allUnits.value.find((u) => u.id === unitId);
  const oldMp = unit?.mp ?? 0;

  unitManager.updateUnitMp(unitId, currentMp, maxMp);

  // 触发蓝量变化事件
  emit("unit:mp-change", { unitId, oldMp, newMp: currentMp });
}

// ============ 导出 API：步骤执行 ============

async function executeStep(step: SkillStep): Promise<void> {
  return stepExecutor.executeStep(step);
}

async function executeSteps(steps: SkillStep[]): Promise<void> {
  return stepExecutor.executeSteps(steps);
}

async function executeStepsParallel(steps: SkillStep[]): Promise<void> {
  return stepExecutor.executeStepsParallel(steps);
}

// ============ 导出 API：渲染控制 ============

function render(): void {
  renderer.render(
    internalConfig.value,
    unitManager.unitStates.value,
    cameraController.cameraState.value,
    (ctx) => effectManager.drawEffects(ctx),
  );
}

function getContext(): CanvasRenderingContext2D | null {
  return canvasElement.value?.getContext("2d") ?? null;
}

function getCanvasSize(): { width: number; height: number } {
  return { width: actualWidth.value, height: actualHeight.value };
}

// ============ 兼容旧版 API ============

function setTargetUnit(unitId: string | null): void {
  setUnitSelected(unitId);
}

// ============ 导出组件 API ============

defineExpose<UnifiedBattleCanvasExpose>({
  // 渲染控制
  render,
  getContext,
  getCanvasSize,

  // 角色控制
  moveUnit,
  playUnitAnimation,
  setUnitPosition,
  resetUnitPosition,
  resetAllUnitPositions,
  setUnitActive,
  setUnitSelected,
  getUnitPosition,
  getUnitAtPosition,

  // 特效控制
  playEffect,
  playEffectOnUnit,
  stopEffect,
  stopAllEffects,

  // 视角控制
  shakeCamera,
  moveCamera,
  zoomCamera,
  resetCamera,
  focusOnUnit,
  getCameraState,

  // 背景控制
  setBackground,
  setBackgroundColor,
  fadeBackground,
  flashScreen,

  // 音效控制
  playSound,
  stopSound,
  stopAllSounds,

  // 伤害/数值显示
  showDamageNumber,
  showFloatingText,
  updateUnitHp,
  updateUnitMp,

  // 步骤执行
  executeStep,
  executeSteps,
  executeStepsParallel,

  // 兼容旧版
  setTargetUnit,
  setActiveUnit: setUnitActive,
});
</script>

<template>
  <div
    ref="containerElement"
    class="relative h-full w-full overflow-hidden select-none"
    :style="{ minWidth: `${width}px`, minHeight: `${height}px` }"
  >
    <!-- Canvas 画布 -->
    <canvas
      ref="canvasElement"
      class="absolute inset-0 block h-full w-full"
      :class="{ 'cursor-grab': enableTransform, 'cursor-grabbing': isDragging }"
      @wheel="handleWheel"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseLeave"
      @click="handleCanvasClick"
    />

    <!-- header 插槽 -->
    <div v-if="slots.header" class="absolute top-0 right-0 left-0 z-10">
      <slot
        name="header"
        :scene="gameData?.scene || { name: config?.sceneName || '' }"
        :players="
          gameData?.players || {
            enemy: { id: '', name: config?.enemyPlayerName || '' },
            self: { id: '', name: config?.playerName || '' },
          }
        "
        :turn="gameData?.turn"
      />
    </div>

    <!-- 旧版内置 header（向后兼容，当没有 header 插槽且使用旧版 config 时显示） -->
    <div
      v-if="!slots.header && config"
      class="absolute top-0 right-0 left-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2 text-gray-800"
    >
      <span class="text-sm font-bold text-red-600">{{ config.enemyPlayerName || "敌方" }}</span>
      <div class="flex flex-col items-center">
        <span class="text-lg font-bold text-amber-600">{{ config.sceneName || "战斗" }}</span>
        <span v-if="config.turnInfo || activeUnit" class="text-xs text-gray-500">
          {{ config.turnInfo || (activeUnit ? `${activeUnit.name} 的回合` : "") }}
        </span>
      </div>
      <span class="text-sm font-bold text-blue-600">{{ config.playerName || "我方" }}</span>
    </div>

    <!-- overlay 插槽（覆盖层，用于菜单等） -->
    <slot
      name="overlay"
      :canvas-size="canvasSize"
      :camera-state="cameraController.cameraState.value"
    />

    <!-- footer 插槽 -->
    <div v-if="slots.footer" class="absolute right-0 bottom-0 left-0 z-10">
      <slot name="footer" :selected-unit="selectedUnit" :active-unit="activeUnit" />
    </div>

    <!-- unit-info 插槽（单位信息悬浮框） -->
    <slot name="unit-info" :unit="hoveredUnit" :position="hoverPosition" />

    <!-- 缩放比例显示 -->
    <div
      v-if="enableTransform"
      class="absolute top-2 right-2 z-10 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
    >
      {{ cameraController.zoomPercentage.value }}
    </div>

    <!-- 重置视图按钮 -->
    <button
      v-if="enableTransform"
      class="absolute top-2 right-16 z-10 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 transition-colors hover:bg-slate-100"
      @click="resetCamera()"
    >
      重置视图
    </button>

    <!-- debug 插槽 -->
    <div v-if="debug && slots.debug" class="absolute bottom-2 left-2 z-10">
      <slot
        name="debug"
        :fps="60"
        :unit-count="allUnits.length"
        :effect-count="0"
        :camera-state="cameraController.cameraState.value"
      />
    </div>

    <!-- 默认调试信息 -->
    <div
      v-if="debug && !slots.debug"
      class="absolute bottom-2 left-2 z-10 rounded bg-black/50 px-2 py-1 text-xs text-white"
    >
      <div>单位: {{ allUnits.length }}</div>
      <div>缩放: {{ cameraController.cameraState.value.scale.toFixed(2) }}</div>
      <div>
        偏移: ({{ cameraController.cameraState.value.offsetX.toFixed(0) }},
        {{ cameraController.cameraState.value.offsetY.toFixed(0) }})
      </div>
    </div>
  </div>
</template>
