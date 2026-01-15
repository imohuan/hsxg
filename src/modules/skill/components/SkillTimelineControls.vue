<script setup lang="ts">
/**
 * @file 时间轴控制栏
 * @description 播放控制、时间显示、FPS 设置
 */
import { computed, ref, watch, onMounted, onBeforeUnmount } from "vue";
import {
  PlayArrowOutlined,
  PauseOutlined,
  SkipPreviousOutlined,
  SkipNextOutlined,
  FastRewindOutlined,
  FastForwardOutlined,
} from "@vicons/material";

// ============ Props/Emits ============

const props = defineProps<{
  totalFrames: number;
  currentFrame: number;
  fps: number;
  playing: boolean;
}>();

const emit = defineEmits<{
  "update:currentFrame": [value: number];
  "update:fps": [value: number];
  "update:playing": [value: boolean];
}>();

// ============ 状态 ============

const fpsInput = ref(props.fps);
const rafId = ref<number | null>(null);
const lastTick = ref(0);

// ============ 计算属性 ============

const duration = computed(() => {
  if (props.fps <= 0) return 0;
  return props.totalFrames / props.fps;
});

const currentTime = computed(() => {
  if (props.fps <= 0) return 0;
  return props.currentFrame / props.fps;
});

// ============ 方法 ============

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(2).padStart(5, "0")}`;
};

const togglePlay = () => emit("update:playing", !props.playing);
const goToStart = () => emit("update:currentFrame", 0);
const goToEnd = () => emit("update:currentFrame", props.totalFrames - 1);
const prevFrame = () => {
  if (props.currentFrame > 0) emit("update:currentFrame", props.currentFrame - 1);
};
const nextFrame = () => {
  if (props.currentFrame < props.totalFrames - 1) emit("update:currentFrame", props.currentFrame + 1);
};

const updateFPS = () => {
  const newFps = Math.max(1, Math.min(fpsInput.value, 120));
  fpsInput.value = newFps;
  emit("update:fps", newFps);
};

// 播放循环
const stopLoop = () => {
  if (rafId.value !== null) {
    cancelAnimationFrame(rafId.value);
    rafId.value = null;
  }
};

const stepFrame = (timestamp: number) => {
  if (!props.playing || props.fps <= 0 || props.totalFrames <= 1) {
    lastTick.value = timestamp;
  } else {
    const interval = 1000 / props.fps;
    if (timestamp - lastTick.value >= interval) {
      const next = props.currentFrame + 1 >= props.totalFrames ? 0 : props.currentFrame + 1;
      emit("update:currentFrame", next);
      lastTick.value = timestamp;
    }
  }
  rafId.value = requestAnimationFrame(stepFrame);
};

// 键盘快捷键
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.code === "Space") {
    event.preventDefault();
    togglePlay();
  } else if (event.code === "ArrowLeft") {
    event.preventDefault();
    prevFrame();
  } else if (event.code === "ArrowRight") {
    event.preventDefault();
    nextFrame();
  } else if (event.code === "Home") {
    event.preventDefault();
    goToStart();
  } else if (event.code === "End") {
    event.preventDefault();
    goToEnd();
  }
};

// ============ 生命周期 ============

watch(
  () => props.playing,
  (val) => {
    if (val) {
      if (rafId.value === null) {
        lastTick.value = performance.now();
        rafId.value = requestAnimationFrame(stepFrame);
      }
    } else {
      stopLoop();
    }
  },
);

onMounted(() => {
  window.addEventListener("keydown", handleKeyDown);
  fpsInput.value = props.fps;
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeyDown);
  stopLoop();
});
</script>

<template>
  <div class="flex items-center gap-4 border-b border-slate-200 bg-white px-6 py-3 shadow-sm">
    <!-- 播放控制 -->
    <div class="flex items-center gap-1.5">
      <button
        class="flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
        type="button"
        title="跳到开始 (Home)"
        @click="goToStart"
      >
        <FastRewindOutlined class="size-4" />
      </button>
      <button
        class="flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
        type="button"
        title="上一帧 (←)"
        @click="prevFrame"
      >
        <SkipPreviousOutlined class="size-4" />
      </button>
      <button
        class="flex size-10 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-md shadow-indigo-200 transition-all hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-300"
        type="button"
        title="播放/暂停 (Space)"
        @click="togglePlay"
      >
        <PauseOutlined v-if="playing" class="size-5" />
        <PlayArrowOutlined v-else class="size-5" />
      </button>
      <button
        class="flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
        type="button"
        title="下一帧 (→)"
        @click="nextFrame"
      >
        <SkipNextOutlined class="size-4" />
      </button>
      <button
        class="flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
        type="button"
        title="跳到结束 (End)"
        @click="goToEnd"
      >
        <FastForwardOutlined class="size-4" />
      </button>
    </div>

    <!-- 时间显示 -->
    <div class="rounded-lg bg-slate-100 px-3 py-1.5 font-mono text-xs text-slate-600">
      {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
    </div>

    <div class="h-5 w-px bg-slate-200" />

    <!-- 帧数显示 -->
    <div class="text-xs text-slate-500">
      <span class="text-slate-400">帧:</span>
      <span class="ml-1 font-mono font-medium text-indigo-600">{{ currentFrame + 1 }}</span>
      <span class="mx-1 text-slate-300">/</span>
      <span class="font-mono text-slate-600">{{ totalFrames }}</span>
    </div>

    <div class="h-5 w-px bg-slate-200" />

    <!-- FPS设置 -->
    <div class="flex items-center gap-2">
      <label class="text-xs font-medium text-slate-500">FPS:</label>
      <input
        v-model.number="fpsInput"
        class="w-16 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 transition-all outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
        type="number"
        min="1"
        max="120"
        @change="updateFPS"
        @blur="updateFPS"
      />
    </div>

    <div class="flex-1" />

    <!-- 提示 -->
    <div class="rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-400">
      空格:播放 · 方向键:切换帧 · Ctrl+滚轮:缩放
    </div>
  </div>
</template>
