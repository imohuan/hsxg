<script setup lang="ts">
/**
 * @file 设计器画布预览组件
 * @description 支持缩放、平移的精灵图预览（现代 SaaS 风格）
 * 效果模式：使用 canvas 绘制单帧动画
 * 图片模式：使用 img 元素显示完整雪碧图
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  RestartAltOutlined,
  VisibilityOutlined,
  VisibilityOffOutlined,
  ImageOutlined,
  AutoAwesomeOutlined,
} from "@vicons/material";
import CanvasContainer from "@/components/common/CanvasContainer.vue";
import {
  PreviewPlayer,
  type SpriteSheetPreviewConfig,
} from "@/modules/designer/core/PreviewPlayer";

const props = defineProps<{
  config: SpriteSheetPreviewConfig;
  fps: number;
  currentFrame: number;
  playing: boolean;
}>();

const emit = defineEmits<{
  "update:fps": [value: number];
  "update:currentFrame": [value: number];
  "update:playing": [value: boolean];
  refresh: [];
  save: [];
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const imageRef = ref<HTMLImageElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const canvasContainerRef = ref<InstanceType<typeof CanvasContainer> | null>(null);
const player = new PreviewPlayer(canvasRef);

const scale = ref(1);
const showInfo = ref(true);
const previewMode = ref<"effect" | "image">("effect");
const imageDisplayWidth = ref(0);
const imageDisplayHeight = ref(0);

const previewConfig = computed(() => props.config);

// 重置视图
function resetView(): void {
  if (canvasContainerRef.value) {
    if (previewMode.value === "image") {
      // 图片模式：使用图片的实际尺寸
      if (imageDisplayWidth.value > 0 && imageDisplayHeight.value > 0) {
        canvasContainerRef.value.resetView(true, imageDisplayWidth.value, imageDisplayHeight.value);
      } else {
        canvasContainerRef.value.resetView();
      }
    } else {
      // 效果模式：使用单帧尺寸
      const displaySize = player.getDisplaySize();
      if (displaySize.width > 0 && displaySize.height > 0) {
        canvasContainerRef.value.resetView(true, displaySize.width, displaySize.height);
      } else {
        canvasContainerRef.value.resetView();
      }
    }
  }
}

// 调整 canvas 尺寸（仅效果模式使用）
function resizeCanvas(onComplete?: () => void): void {
  if (!canvasRef.value || !containerRef.value) {
    onComplete?.();
    return;
  }
  requestAnimationFrame(() => {
    if (!canvasRef.value || !containerRef.value) {
      onComplete?.();
      return;
    }
    // 效果模式：canvas 尺寸等于单帧尺寸
    const displaySize = player.getDisplaySize();
    if (displaySize.width > 0 && displaySize.height > 0) {
      canvasRef.value.width = displaySize.width;
      canvasRef.value.height = displaySize.height;
    } else {
      canvasRef.value.width = 800;
      canvasRef.value.height = 600;
    }
    requestAnimationFrame(() => onComplete?.());
  });
}

// 更新图片尺寸（图片模式）
function updateImageSize(): void {
  if (previewMode.value !== "image" || !imageRef.value) return;
  if (imageRef.value.naturalWidth > 0 && imageRef.value.naturalHeight > 0) {
    imageDisplayWidth.value = imageRef.value.naturalWidth;
    imageDisplayHeight.value = imageRef.value.naturalHeight;
    setTimeout(() => resetView(), 50);
  }
}

function handleScaleChange(newScale: number): void {
  scale.value = newScale;
}

function togglePreviewMode(): void {
  previewMode.value = previewMode.value === "effect" ? "image" : "effect";
  player.setPreviewMode(previewMode.value);
  scale.value = 1;

  setTimeout(() => {
    if (previewMode.value === "image") {
      // 图片模式：等待图片加载后更新尺寸
      if (imageRef.value && imageRef.value.complete && imageRef.value.naturalWidth > 0) {
        updateImageSize();
      }
    } else {
      // 效果模式：调整 canvas 尺寸
      resizeCanvas(() => setTimeout(() => resetView(), 50));
    }
  }, 0);
}

function triggerManualRefresh(): void {
  isFirstLoad.value = true; // 手动刷新时重置标记，允许重置视图
  player.resetView();
  player.refresh();
  scale.value = 1;
  emit("refresh");
}

// 标记是否是首次加载
const isFirstLoad = ref(true);

onMounted(() => {
  player.bindConfig(previewConfig);
  player.setFPS(props.fps);
  player.setPlaying(props.playing);
  player.setPreviewMode(previewMode.value);
  player.setOnFrameChange((frame) => emit("update:currentFrame", frame));
  player.setOnImageLoad(() => {
    if (previewMode.value === "effect") {
      // 只在首次加载时重置视图，后续图片变化保持当前缩放和平移状态
      if (isFirstLoad.value) {
        isFirstLoad.value = false;
        player.setOffset(0, 0);
        resizeCanvas(() => {
          const displaySize = player.getDisplaySize();
          if (displaySize.width > 0 && displaySize.height > 0 && canvasContainerRef.value) {
            canvasContainerRef.value.resetView(true, displaySize.width, displaySize.height);
          }
        });
      } else {
        // 非首次加载：只调整 canvas 尺寸，不重置视图
        resizeCanvas();
      }
    }
  });
  player.setScale(1, 0, 0);
  player.setDisableBackground(true);
  player.start();
  resizeCanvas();
  window.addEventListener("resize", () => resizeCanvas());
});

onBeforeUnmount(() => {
  player.stop();
});

watch(
  () => props.playing,
  (newPlaying) => {
    if (newPlaying !== player.isPlaying()) player.togglePlay();
  },
);

watch(
  () => props.fps,
  (newFPS) => {
    player.setFPS(newFPS);
  },
);

watch(
  () => props.currentFrame,
  (newFrame) => {
    if (newFrame !== player.getCurrentFrame()) player.setFrame(newFrame);
  },
);

watch(
  () => props.config,
  () => {
    if (previewMode.value === "image") {
      // 图片模式：等待图片加载后更新尺寸
      setTimeout(() => {
        updateImageSize();
      }, 100);
    } else {
      player.setOffset(0, 0);
    }
  },
  { deep: true },
);

defineExpose({ triggerRefresh: triggerManualRefresh });
</script>

<template>
  <div class="h-full w-full">
    <CanvasContainer
      ref="canvasContainerRef"
      :min-scale="0.1"
      :max-scale="8"
      @scale-change="handleScaleChange"
    >
      <template #background>
        <div class="checkerboard-bg h-full w-full" />
      </template>

      <!-- 内容区域：根据预览模式显示 canvas 或 img -->
      <div
        ref="containerRef"
        class="relative"
        :class="previewMode === 'image' ? 'image-container' : 'h-full w-full'"
        :style="
          previewMode === 'image'
            ? { width: `${imageDisplayWidth}px`, height: `${imageDisplayHeight}px` }
            : {}
        "
      >
        <!-- Canvas - 效果模式显示 -->
        <canvas v-show="previewMode === 'effect'" ref="canvasRef" class="block" />
        <!-- 图片 - 图片模式显示完整雪碧图 -->
        <img
          v-show="previewMode === 'image'"
          ref="imageRef"
          :src="config.url"
          class="pointer-events-none block select-none"
          draggable="false"
          :style="{ width: `${imageDisplayWidth}px` }"
          @load="updateImageSize"
          @dragstart.prevent
        />
      </div>

      <template #toolbar>
        <div class="flex items-center gap-2">
          <button
            class="flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-white"
            type="button"
            @click="resetView"
          >
            <RestartAltOutlined class="size-4" />
            <span>重置视图</span>
          </button>
          <button
            class="flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-white"
            type="button"
            @click="showInfo = !showInfo"
          >
            <component :is="showInfo ? VisibilityOffOutlined : VisibilityOutlined" class="size-4" />
            <span>{{ showInfo ? "隐藏信息" : "显示信息" }}</span>
          </button>
          <button
            class="flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-white"
            type="button"
            @click="togglePreviewMode"
          >
            <component
              :is="previewMode === 'image' ? AutoAwesomeOutlined : ImageOutlined"
              class="size-4"
            />
            <span>{{ previewMode === "image" ? "显示效果" : "显示图片" }}</span>
          </button>
        </div>
      </template>

      <template #overlay>
        <div
          v-if="showInfo"
          class="absolute top-4 right-4 rounded-lg border border-slate-200 bg-white/95 p-3 text-xs shadow-lg backdrop-blur-sm"
        >
          <div class="space-y-1.5 text-slate-600">
            <div class="flex items-center justify-between gap-4">
              <span class="text-slate-400">缩放</span>
              <span class="font-mono font-medium text-slate-700">{{ scale.toFixed(2) }}x</span>
            </div>
            <div class="flex items-center justify-between gap-4">
              <span class="text-slate-400">帧数</span>
              <span class="font-mono font-medium text-slate-700"
                >{{ currentFrame + 1 }} / {{ player.getTotalFrames() }}</span
              >
            </div>
            <div class="flex items-center justify-between gap-4">
              <span class="text-slate-400">FPS</span>
              <span class="font-mono font-medium text-slate-700">{{ fps }}</span>
            </div>
          </div>
        </div>
      </template>
    </CanvasContainer>
  </div>
</template>

<style scoped>
canvas {
  display: block;
  background: transparent;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

img {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

.checkerboard-bg {
  background-color: #f1f5f9;
  background-image:
    linear-gradient(45deg, #e2e8f0 25%, transparent 25%, transparent 75%, #e2e8f0 75%, #e2e8f0),
    linear-gradient(45deg, #e2e8f0 25%, transparent 25%, transparent 75%, #e2e8f0 75%, #e2e8f0);
  background-size: 32px 32px;
  background-position:
    0 0,
    16px 16px;
}
</style>
