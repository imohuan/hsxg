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
  <div class="flex h-full flex-col gap-4">
    <!-- 工具栏 -->
    <div class="flex items-center gap-4 rounded-lg bg-gray-100 p-3">
      <!-- 上传按钮 -->
      <button
        class="rounded bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
        @click="triggerFileInput"
      >
        上传雪碧图
      </button>
      <input
        ref="fileInputRef"
        type="file"
        accept="image/*"
        class="hidden"
        @change="handleFileChange"
      />

      <!-- 网格配置 -->
      <div class="flex items-center gap-2">
        <label class="text-sm text-gray-600">行数:</label>
        <input
          type="number"
          min="1"
          :value="spriteSheet.rows.value"
          class="w-16 rounded border border-gray-300 px-2 py-1 text-center"
          @change="handleRowsChange"
        />
      </div>

      <div class="flex items-center gap-2">
        <label class="text-sm text-gray-600">列数:</label>
        <input
          type="number"
          min="1"
          :value="spriteSheet.cols.value"
          class="w-16 rounded border border-gray-300 px-2 py-1 text-center"
          @change="handleColsChange"
        />
      </div>

      <div class="flex items-center gap-2">
        <label class="text-sm text-gray-600">帧数:</label>
        <input
          type="number"
          min="1"
          :placeholder="`${spriteSheet.totalFrames.value}`"
          :value="spriteSheet.frameCount.value"
          class="w-16 rounded border border-gray-300 px-2 py-1 text-center"
          @change="handleFrameCountChange"
        />
      </div>

      <!-- 显示网格开关 -->
      <label class="flex cursor-pointer items-center gap-2">
        <input v-model="showGrid" type="checkbox" class="size-4" />
        <span class="text-sm text-gray-600">显示网格</span>
      </label>

      <!-- 帧信息 -->
      <div v-if="spriteSheet.imageElement.value" class="ml-auto text-sm text-gray-500">
        {{ spriteSheet.frameWidth.value }} × {{ spriteSheet.frameHeight.value }} px |
        {{ spriteSheet.totalFrames.value }} 帧
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="flex flex-1 gap-4 overflow-hidden">
      <!-- 雪碧图预览区 -->
      <div class="flex-1 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-4">
        <!-- 加载状态 -->
        <div v-if="spriteSheet.isLoading.value" class="flex h-full items-center justify-center">
          <div class="text-gray-500">加载中...</div>
        </div>

        <!-- 错误状态 -->
        <div
          v-else-if="spriteSheet.error.value"
          class="flex h-full items-center justify-center text-red-500"
        >
          {{ spriteSheet.error.value }}
        </div>

        <!-- 空状态 -->
        <div
          v-else-if="!spriteSheet.imageElement.value"
          class="flex h-full flex-col items-center justify-center gap-4 text-gray-400"
        >
          <div class="flex size-16 items-center justify-center rounded-xl bg-slate-200">
            <svg class="size-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>点击上方按钮上传雪碧图</div>
        </div>

        <!-- 雪碧图画布 -->
        <div v-else class="relative inline-block" :style="canvasStyle">
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
              'ring-2 ring-blue-500 ring-inset': isFrameSelected(frame.index),
              'bg-blue-500/20': hoveredFrame === frame.index && !isFrameSelected(frame.index),
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
            <span
              class="absolute left-1 top-1 rounded bg-black/50 px-1 text-xs text-white"
            >
              {{ frame.index }}
            </span>
          </div>
        </div>
      </div>

      <!-- 帧列表侧边栏 -->
      <div class="w-48 overflow-auto rounded-lg border border-gray-200 bg-white">
        <div class="border-b border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium">
          帧列表 ({{ spriteSheet.totalFrames.value }})
        </div>
        <div class="grid grid-cols-3 gap-1 p-2">
          <div
            v-for="frame in spriteSheet.frames.value"
            :key="frame.index"
            class="relative aspect-square cursor-pointer overflow-hidden rounded border transition-all"
            :class="{
              'border-blue-500 ring-2 ring-blue-500': isFrameSelected(frame.index),
              'border-gray-200 hover:border-gray-400': !isFrameSelected(frame.index),
            }"
            @click="handleFrameClick(frame, $event)"
          >
            <!-- 帧缩略图 -->
            <div
              v-if="spriteSheet.imageElement.value"
              class="size-full"
              :style="{
                backgroundImage: `url(${spriteSheet.imageUrl.value})`,
                backgroundPosition: `-${frame.x}px -${frame.y}px`,
                backgroundSize: `${spriteSheet.imageElement.value.naturalWidth}px ${spriteSheet.imageElement.value.naturalHeight}px`,
                transform: `scale(${Math.min(48 / frame.width, 48 / frame.height)})`,
                transformOrigin: 'top left',
              }"
            />
            <!-- 帧序号 -->
            <span
              class="absolute bottom-0 right-0 rounded-tl bg-black/50 px-1 text-xs text-white"
            >
              {{ frame.index }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
