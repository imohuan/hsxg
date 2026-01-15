<script setup lang="ts">
/**
 * 雪碧图编辑器组件
 * 实现图片上传、网格配置、帧预览
 */
import { ref, computed, watch } from "vue";
import { useSpriteSheet, type SpriteFrame } from "../composables/useSpriteSheet";
import type { SpriteConfig } from "../../../types";

// ============ Props & Emits ============

const props = defineProps<{
  /** 初始配置 */
  initialConfig?: SpriteConfig;
}>();

const emit = defineEmits<{
  /** 配置变更事件 */
  change: [config: SpriteConfig];
  /** 帧选中事件 */
  frameSelect: [frame: SpriteFrame];
}>();

// ============ Composables ============

const spriteSheet = useSpriteSheet();

// ============ 状态 ============

/** 文件输入引用 */
const fileInputRef = ref<HTMLInputElement | null>(null);

/** 选中的帧索引列表 */
const selectedFrames = ref<number[]>([]);

/** 是否显示网格 */
const showGrid = ref(true);

/** 悬停的帧索引 */
const hoveredFrame = ref<number | null>(null);

// ============ 计算属性 ============

/** 当前配置 */
const currentConfig = computed<SpriteConfig>(() => ({
  url: spriteSheet.imageUrl.value,
  rows: spriteSheet.rows.value,
  cols: spriteSheet.cols.value,
  frameCount: spriteSheet.frameCount.value,
  fps: 12,
  scale: 1,
}));

/** 画布样式 */
const canvasStyle = computed(() => {
  if (!spriteSheet.imageElement.value) return {};
  return {
    backgroundImage: `url(${spriteSheet.imageUrl.value})`,
    backgroundSize: "100% 100%",
    width: `${spriteSheet.imageElement.value.naturalWidth}px`,
    height: `${spriteSheet.imageElement.value.naturalHeight}px`,
  };
});

// ============ 方法 ============

/** 触发文件选择 */
function triggerFileInput(): void {
  fileInputRef.value?.click();
}

/** 处理文件选择 */
async function handleFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    await spriteSheet.loadFromFile(file);
    emitChange();
  }
  // 重置 input 以便重复选择同一文件
  input.value = "";
}

/** 处理帧点击 */
function handleFrameClick(frame: SpriteFrame, event: MouseEvent): void {
  if (event.ctrlKey || event.metaKey) {
    // 多选模式
    const index = selectedFrames.value.indexOf(frame.index);
    if (index === -1) {
      selectedFrames.value.push(frame.index);
    } else {
      selectedFrames.value.splice(index, 1);
    }
  } else {
    // 单选模式
    selectedFrames.value = [frame.index];
  }
  emit("frameSelect", frame);
}

/** 判断帧是否选中 */
function isFrameSelected(index: number): boolean {
  return selectedFrames.value.includes(index);
}

/** 发送配置变更事件 */
function emitChange(): void {
  emit("change", currentConfig.value);
}

/** 处理行数变更 */
function handleRowsChange(event: Event): void {
  const value = parseInt((event.target as HTMLInputElement).value, 10);
  if (value > 0) {
    spriteSheet.setGridSize(value, spriteSheet.cols.value);
    emitChange();
  }
}

/** 处理列数变更 */
function handleColsChange(event: Event): void {
  const value = parseInt((event.target as HTMLInputElement).value, 10);
  if (value > 0) {
    spriteSheet.setGridSize(spriteSheet.rows.value, value);
    emitChange();
  }
}

/** 处理帧数变更 */
function handleFrameCountChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  const value = input.value ? parseInt(input.value, 10) : undefined;
  spriteSheet.setFrameCount(value && value > 0 ? value : undefined);
  emitChange();
}

// ============ 初始化 ============

// 加载初始配置
if (props.initialConfig?.url) {
  spriteSheet.loadImage(props.initialConfig.url).then(() => {
    if (props.initialConfig) {
      spriteSheet.setGridSize(props.initialConfig.rows, props.initialConfig.cols);
      spriteSheet.setFrameCount(props.initialConfig.frameCount);
    }
  });
}

// 监听配置变化
watch(
  () => props.initialConfig,
  async (config) => {
    if (config?.url && config.url !== spriteSheet.imageUrl.value) {
      await spriteSheet.loadImage(config.url);
      spriteSheet.setGridSize(config.rows, config.cols);
      spriteSheet.setFrameCount(config.frameCount);
    }
  },
);
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- 上传按钮 -->
    <button
      class="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
      @click="triggerFileInput"
    >
      <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
        />
      </svg>
      上传雪碧图
    </button>
    <input ref="fileInputRef" type="file" accept="image/*" class="hidden" @change="handleFileChange" />

    <!-- 网格配置 -->
    <div class="grid grid-cols-3 gap-2">
      <div class="flex flex-col gap-1">
        <label class="text-xs text-slate-500">行数</label>
        <input
          type="number"
          min="1"
          :value="spriteSheet.rows.value"
          class="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-center text-sm outline-none focus:border-indigo-300"
          @change="handleRowsChange"
        />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs text-slate-500">列数</label>
        <input
          type="number"
          min="1"
          :value="spriteSheet.cols.value"
          class="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-center text-sm outline-none focus:border-indigo-300"
          @change="handleColsChange"
        />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs text-slate-500">帧数</label>
        <input
          type="number"
          min="1"
          :placeholder="`${spriteSheet.totalFrames.value}`"
          :value="spriteSheet.frameCount.value"
          class="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-center text-sm outline-none focus:border-indigo-300"
          @change="handleFrameCountChange"
        />
      </div>
    </div>

    <!-- 帧列表标题 -->
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium text-slate-700">帧列表 ({{ spriteSheet.totalFrames.value }})</span>
      <label class="flex cursor-pointer items-center gap-1.5">
        <input v-model="showGrid" type="checkbox" class="size-3.5 rounded border-slate-300 text-indigo-500" />
        <span class="text-xs text-slate-500">网格</span>
      </label>
    </div>

    <!-- 雪碧图预览区 -->
    <div class="overflow-auto rounded-lg border border-slate-200 bg-slate-50">
      <!-- 加载状态 -->
      <div v-if="spriteSheet.isLoading.value" class="flex h-32 items-center justify-center">
        <div class="text-sm text-slate-500">加载中...</div>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="spriteSheet.error.value" class="flex h-32 items-center justify-center text-sm text-red-500">
        {{ spriteSheet.error.value }}
      </div>

      <!-- 空状态 -->
      <div
        v-else-if="!spriteSheet.imageElement.value"
        class="flex h-32 flex-col items-center justify-center gap-2 text-slate-400"
      >
        <svg class="size-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <p class="text-xs">点击上方按钮上传雪碧图</p>
      </div>

      <!-- 雪碧图画布 -->
      <div v-else class="max-h-48 overflow-auto p-2">
        <div class="relative inline-block" :style="canvasStyle">
          <!-- 网格覆盖层 -->
          <div
            v-if="showGrid"
            class="pointer-events-none absolute inset-0"
            :style="{
              backgroundImage: `
                linear-gradient(to right, rgba(0,0,0,0.2) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(0,0,0,0.2) 1px, transparent 1px)
              `,
              backgroundSize: `${spriteSheet.frameWidth.value}px ${spriteSheet.frameHeight.value}px`,
            }"
          />

          <!-- 帧交互层 -->
          <div
            v-for="frame in spriteSheet.frames.value"
            :key="frame.index"
            class="absolute cursor-pointer transition-all"
            :class="{
              'ring-2 ring-indigo-500 ring-inset': isFrameSelected(frame.index),
              'bg-indigo-500/20': hoveredFrame === frame.index && !isFrameSelected(frame.index),
            }"
            :style="{
              left: `${frame.x}px`,
              top: `${frame.y}px`,
              width: `${frame.width}px`,
              height: `${frame.height}px`,
            }"
            @click="handleFrameClick(frame, $event)"
            @mouseenter="hoveredFrame = frame.index"
            @mouseleave="hoveredFrame = null"
          >
            <!-- 帧序号 -->
            <span class="absolute top-0.5 left-0.5 rounded bg-black/60 px-1 text-xs text-white">
              {{ frame.index }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 帧信息 -->
    <div v-if="spriteSheet.imageElement.value" class="text-center text-xs text-slate-500">
      {{ spriteSheet.frameWidth.value }} × {{ spriteSheet.frameHeight.value }} px
    </div>
  </div>
</template>
