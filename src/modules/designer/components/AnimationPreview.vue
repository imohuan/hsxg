<script setup lang="ts">
/**
 * 动画预览组件
 * 实现动画播放、帧率调整
 */
import { ref, computed, watch, onUnmounted } from "vue";
import type { SpriteFrame } from "../composables/useSpriteSheet";

// ============ Props & Emits ============

const props = withDefaults(
  defineProps<{
    /** 图片 URL */
    imageUrl: string;
    /** 图片宽度 */
    imageWidth: number;
    /** 图片高度 */
    imageHeight: number;
    /** 帧序列 */
    frames: SpriteFrame[];
    /** 初始帧率 */
    initialFps?: number;
    /** 是否循环播放 */
    loop?: boolean;
    /** 缩放比例 */
    scale?: number;
  }>(),
  {
    initialFps: 12,
    loop: true,
    scale: 1,
  },
);

const emit = defineEmits<{
  /** 帧率变更事件 */
  fpsChange: [fps: number];
  /** 播放状态变更事件 */
  playStateChange: [isPlaying: boolean];
  /** 当前帧变更事件 */
  frameChange: [frameIndex: number];
}>();

// ============ 状态 ============

/** 是否正在播放 */
const isPlaying = ref(false);

/** 当前帧索引 */
const currentFrameIndex = ref(0);

/** 帧率 */
const fps = ref(props.initialFps);

/** 动画定时器 ID */
let animationTimer: number | null = null;

// ============ 计算属性 ============

/** 当前帧 */
const currentFrame = computed(() => {
  if (props.frames.length === 0) return null;
  return props.frames[currentFrameIndex.value] ?? props.frames[0];
});

/** 帧间隔（毫秒） */
const frameInterval = computed(() => {
  return fps.value > 0 ? 1000 / fps.value : 1000;
});

/** 预览区域样式 */
const previewStyle = computed(() => {
  if (!currentFrame.value) return {};
  return {
    width: `${currentFrame.value.width * props.scale}px`,
    height: `${currentFrame.value.height * props.scale}px`,
    backgroundImage: `url(${props.imageUrl})`,
    backgroundPosition: `-${currentFrame.value.x * props.scale}px -${currentFrame.value.y * props.scale}px`,
    backgroundSize: `${props.imageWidth * props.scale}px ${props.imageHeight * props.scale}px`,
  };
});

// ============ 方法 ============

/** 开始播放 */
function play(): void {
  if (isPlaying.value || props.frames.length === 0) return;

  isPlaying.value = true;
  emit("playStateChange", true);
  startAnimation();
}

/** 暂停播放 */
function pause(): void {
  if (!isPlaying.value) return;

  isPlaying.value = false;
  emit("playStateChange", false);
  stopAnimation();
}

/** 切换播放/暂停 */
function togglePlay(): void {
  if (isPlaying.value) {
    pause();
  } else {
    play();
  }
}

/** 停止播放并重置 */
function stop(): void {
  pause();
  currentFrameIndex.value = 0;
  emit("frameChange", 0);
}

/** 跳转到指定帧 */
function goToFrame(index: number): void {
  if (index < 0 || index >= props.frames.length) return;
  currentFrameIndex.value = index;
  emit("frameChange", index);
}

/** 上一帧 */
function prevFrame(): void {
  const newIndex = currentFrameIndex.value > 0 ? currentFrameIndex.value - 1 : props.frames.length - 1;
  goToFrame(newIndex);
}

/** 下一帧 */
function nextFrame(): void {
  const newIndex = currentFrameIndex.value < props.frames.length - 1 ? currentFrameIndex.value + 1 : 0;
  goToFrame(newIndex);
}

/** 开始动画循环 */
function startAnimation(): void {
  stopAnimation();

  const animate = () => {
    if (!isPlaying.value) return;

    const nextIndex = currentFrameIndex.value + 1;

    if (nextIndex >= props.frames.length) {
      if (props.loop) {
        currentFrameIndex.value = 0;
      } else {
        pause();
        return;
      }
    } else {
      currentFrameIndex.value = nextIndex;
    }

    emit("frameChange", currentFrameIndex.value);
    animationTimer = window.setTimeout(animate, frameInterval.value);
  };

  animationTimer = window.setTimeout(animate, frameInterval.value);
}

/** 停止动画循环 */
function stopAnimation(): void {
  if (animationTimer !== null) {
    clearTimeout(animationTimer);
    animationTimer = null;
  }
}

/** 处理帧率变更 */
function handleFpsChange(event: Event): void {
  const value = parseInt((event.target as HTMLInputElement).value, 10);
  if (value > 0 && value <= 60) {
    fps.value = value;
    emit("fpsChange", value);

    // 如果正在播放，重新启动动画以应用新帧率
    if (isPlaying.value) {
      startAnimation();
    }
  }
}

/** 处理进度条拖动 */
function handleProgressChange(event: Event): void {
  const value = parseInt((event.target as HTMLInputElement).value, 10);
  goToFrame(value);
}

// ============ 监听 ============

// 监听帧序列变化，重置当前帧
watch(
  () => props.frames,
  (newFrames) => {
    if (currentFrameIndex.value >= newFrames.length) {
      currentFrameIndex.value = 0;
    }
  },
);

// 监听初始帧率变化
watch(
  () => props.initialFps,
  (newFps) => {
    fps.value = newFps;
  },
);

// 组件卸载时清理
onUnmounted(() => {
  stopAnimation();
});
</script>

<template>
  <div class="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4">
    <!-- 标题栏 -->
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium text-gray-700">动画预览</span>
      <span class="text-xs text-gray-500"> {{ currentFrameIndex + 1 }} / {{ frames.length }} 帧 </span>
    </div>

    <!-- 预览区域 -->
    <div class="flex items-center justify-center rounded bg-gray-100" style="min-height: 120px">
      <div v-if="currentFrame" class="bg-checkerboard" :style="previewStyle" />
      <div v-else class="text-sm text-gray-400">无可预览的帧</div>
    </div>

    <!-- 进度条 -->
    <div class="flex items-center gap-2">
      <input
        type="range"
        min="0"
        :max="Math.max(0, frames.length - 1)"
        :value="currentFrameIndex"
        class="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-200"
        @input="handleProgressChange"
      />
    </div>

    <!-- 控制栏 -->
    <div class="flex items-center justify-between">
      <!-- 播放控制 -->
      <div class="flex items-center gap-1">
        <!-- 停止按钮 -->
        <button class="rounded p-2 transition-colors hover:bg-gray-100" title="停止" @click="stop">
          <svg class="size-4" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" />
          </svg>
        </button>

        <!-- 上一帧 -->
        <button class="rounded p-2 transition-colors hover:bg-gray-100" title="上一帧" @click="prevFrame">
          <svg class="size-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z" />
          </svg>
        </button>

        <!-- 播放/暂停按钮 -->
        <button
          class="rounded bg-blue-500 p-2 text-white transition-colors hover:bg-blue-600"
          :title="isPlaying ? '暂停' : '播放'"
          @click="togglePlay"
        >
          <!-- 暂停图标 -->
          <svg v-if="isPlaying" class="size-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
          <!-- 播放图标 -->
          <svg v-else class="size-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>

        <!-- 下一帧 -->
        <button class="rounded p-2 transition-colors hover:bg-gray-100" title="下一帧" @click="nextFrame">
          <svg class="size-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
          </svg>
        </button>
      </div>

      <!-- 帧率控制 -->
      <div class="flex items-center gap-2">
        <label class="text-xs text-gray-500">FPS:</label>
        <input
          type="number"
          min="1"
          max="60"
          :value="fps"
          class="w-14 rounded border border-gray-300 px-2 py-1 text-center text-sm"
          @change="handleFpsChange"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 棋盘格背景，用于显示透明区域 */
.bg-checkerboard {
  background-color: #fff;
  background-image:
    linear-gradient(45deg, #e0e0e0 25%, transparent 25%), linear-gradient(-45deg, #e0e0e0 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e0e0e0 75%), linear-gradient(-45deg, transparent 75%, #e0e0e0 75%);
  background-size: 16px 16px;
  background-position:
    0 0,
    0 8px,
    8px -8px,
    -8px 0px;
}

/* 自定义滑块样式 */
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
}

input[type="range"]::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  border: none;
}
</style>
