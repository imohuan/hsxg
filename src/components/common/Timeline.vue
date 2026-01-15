<script setup lang="ts">
/**
 * @file 设计器时间轴组件
 * @description 提供播放控制、帧导航、FPS 设置（现代 SaaS 风格）
 */
import { computed, onMounted, onBeforeUnmount, ref, watch } from "vue";
import {
  SkipPreviousOutlined,
  SkipNextOutlined,
  PlayArrowOutlined,
  PauseOutlined,
  FastRewindOutlined,
  FastForwardOutlined,
} from "@vicons/material";

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

const timelineRef = ref<HTMLDivElement | null>(null);
const isDragging = ref(false);
const fpsInput = ref(props.fps);

// 计算总时长(秒)
const duration = computed(() => {
  if (props.fps <= 0) return 0;
  return props.totalFrames / props.fps;
});

// 计算当前时间(秒)
const currentTime = computed(() => {
  if (props.fps <= 0) return 0;
  return props.currentFrame / props.fps;
});

// 格式化时间显示
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(2).padStart(5, "0")}`;
}

// 计算刻度
const tickMarks = computed(() => {
  const maxTicks = 50;
  if (props.totalFrames <= maxTicks) {
    return Array.from({ length: props.totalFrames }, (_, i) => ({
      frame: i,
      position: props.totalFrames > 1 ? (i / (props.totalFrames - 1)) * 100 : 0,
    }));
  } else {
    const tickCount = maxTicks;
    return Array.from({ length: tickCount }, (_, i) => {
      const frame = Math.round((i / (tickCount - 1)) * (props.totalFrames - 1));
      return { frame, position: (frame / (props.totalFrames - 1)) * 100 };
    });
  }
});

// 播放控制
function togglePlay(): void {
  emit("update:playing", !props.playing);
}

function goToStart(): void {
  emit("update:currentFrame", 0);
}

function goToEnd(): void {
  emit("update:currentFrame", props.totalFrames - 1);
}

function prevFrame(): void {
  if (props.currentFrame > 0) {
    emit("update:currentFrame", props.currentFrame - 1);
  }
}

function nextFrame(): void {
  if (props.currentFrame < props.totalFrames - 1) {
    emit("update:currentFrame", props.currentFrame + 1);
  }
}

function updateFPS(): void {
  const newFps = Math.max(1, Math.min(fpsInput.value, 120));
  fpsInput.value = newFps;
  emit("update:fps", newFps);
}

// 时间轴点击
function handleTimelineClick(event: MouseEvent): void {
  if (!timelineRef.value) return;
  const rect = timelineRef.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const percent = x / rect.width;
  const frame = Math.floor(percent * props.totalFrames);
  emit("update:currentFrame", Math.max(0, Math.min(frame, props.totalFrames - 1)));
}

function handleMouseDown(event: MouseEvent): void {
  isDragging.value = true;
  handleTimelineClick(event);
}

function handleMouseMove(event: MouseEvent): void {
  if (!isDragging.value) return;
  handleTimelineClick(event);
}

function handleMouseUp(): void {
  isDragging.value = false;
}

// 键盘快捷键
function handleKeyDown(event: KeyboardEvent): void {
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
}

// 播放循环
const rafId = ref<number | null>(null);
const lastTick = ref(0);

function stopLoop(): void {
  if (rafId.value !== null) {
    cancelAnimationFrame(rafId.value);
    rafId.value = null;
  }
}

function stepFrame(timestamp: number): void {
  if (!props.playing || props.fps <= 0 || props.totalFrames <= 1) {
    lastTick.value = timestamp;
  } else {
    const interval = 1000 / props.fps;
    if (timestamp - lastTick.value >= interval) {
      const next = props.currentFrame + 1 >= props.totalFrames ? props.totalFrames - 1 : props.currentFrame + 1;
      emit("update:currentFrame", next);
      lastTick.value = timestamp;
    }
  }
  rafId.value = requestAnimationFrame(stepFrame);
}

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
  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("mouseup", handleMouseUp);
  fpsInput.value = props.fps;
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeyDown);
  window.removeEventListener("mousemove", handleMouseMove);
  window.removeEventListener("mouseup", handleMouseUp);
  stopLoop();
});
</script>

<template>
  <div class="flex h-full w-full flex-col border-t border-slate-200 bg-white">
    <!-- 控制栏 -->
    <div class="flex items-center gap-4 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
      <!-- 播放控制 -->
      <div class="flex items-center gap-1">
        <button class="timeline-btn" type="button" title="跳到开始 (Home)" @click="goToStart">
          <FastRewindOutlined class="size-4" />
        </button>
        <button class="timeline-btn" type="button" title="上一帧 (←)" @click="prevFrame">
          <SkipPreviousOutlined class="size-4" />
        </button>
        <button class="timeline-btn-play" type="button" title="播放/暂停 (Space)" @click="togglePlay">
          <PauseOutlined v-if="playing" class="size-5" />
          <PlayArrowOutlined v-else class="size-5" />
        </button>
        <button class="timeline-btn" type="button" title="下一帧 (→)" @click="nextFrame">
          <SkipNextOutlined class="size-4" />
        </button>
        <button class="timeline-btn" type="button" title="跳到结束 (End)" @click="goToEnd">
          <FastForwardOutlined class="size-4" />
        </button>
      </div>

      <div class="h-5 w-px bg-slate-200" />

      <!-- FPS设置 -->
      <div class="flex items-center gap-1.5">
        <label class="text-xs text-slate-500">FPS</label>
        <input
          v-model.number="fpsInput"
          class="w-14 rounded-lg border border-slate-200 bg-white px-2 py-1 text-center text-xs text-slate-700 transition outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          type="number"
          min="1"
          max="120"
          @change="updateFPS"
          @blur="updateFPS"
        />
      </div>

      <div class="h-5 w-px bg-slate-200" />

      <!-- 时间显示 -->
      <div class="font-mono text-xs text-slate-500">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</div>

      <div class="h-5 w-px bg-slate-200" />

      <!-- 帧数显示 -->
      <div class="text-xs text-slate-500">
        帧
        <span class="ml-1 font-mono font-semibold text-indigo-600">{{ currentFrame + 1 }}</span>
        <span class="mx-0.5">/</span>
        <span class="font-mono">{{ totalFrames }}</span>
      </div>

      <div class="flex-1" />

      <!-- 提示 -->
      <div class="text-xs text-slate-400">空格:播放 · 方向键:切换帧</div>
    </div>

    <!-- 时间轴轨道 -->
    <div class="flex-1 overflow-hidden px-4 py-3">
      <div class="relative h-full">
        <!-- 刻度标记 -->
        <div class="absolute inset-x-0 top-0 h-5 font-mono text-[10px] text-slate-400">
          <div
            v-for="tick in tickMarks"
            :key="tick.frame"
            class="absolute top-0 text-center"
            :style="{ left: `${tick.position}%`, transform: 'translateX(-50%)' }"
          >
            {{ tick.frame }}
          </div>
        </div>

        <!-- 时间轴背景 -->
        <div
          ref="timelineRef"
          class="absolute inset-x-0 top-6 bottom-0 cursor-pointer rounded-lg border border-slate-200 bg-slate-50"
          @mousedown="handleMouseDown"
        >
          <!-- 刻度线 -->
          <div class="pointer-events-none absolute inset-0">
            <div
              v-for="tick in tickMarks"
              :key="`tick-${tick.frame}`"
              class="absolute top-0 h-full w-px bg-slate-200"
              :style="{ left: `${tick.position}%`, transform: 'translateX(-50%)' }"
            />
          </div>

          <!-- 进度条背景 -->
          <div class="absolute inset-0 overflow-hidden rounded-lg">
            <div
              class="absolute top-0 left-0 h-full bg-indigo-100"
              :style="{ width: `${(currentFrame / Math.max(totalFrames - 1, 1)) * 100}%` }"
            />
          </div>

          <!-- 播放头 -->
          <div
            class="pointer-events-none absolute top-0 h-full w-0.5 -translate-x-1/2 bg-indigo-500 shadow-sm"
            :style="{ left: `${(currentFrame / Math.max(totalFrames - 1, 1)) * 100}%` }"
          >
            <div class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full">
              <div class="border-6 border-transparent border-b-indigo-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timeline-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
  background: white;
  color: #64748b;
  transition: all 0.15s;
}
.timeline-btn:hover {
  border-color: #a5b4fc;
  background: #eef2ff;
  color: #4f46e5;
}
.timeline-btn-play {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  background: #4f46e5;
  color: white;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: all 0.15s;
}
.timeline-btn-play:hover {
  background: #4338ca;
}
</style>
