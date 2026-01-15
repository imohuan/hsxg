<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from "vue";

// Props
const props = withDefaults(
  defineProps<{
    /** 总帧数 */
    totalFrames: number;
    /** 帧率 */
    fps: number;
    /** 缩放比例 */
    zoom: number;
    /** 当前帧 */
    currentFrame: number;
    /** 每秒对应的像素数（基准值） */
    pixelsPerSecond?: number;
  }>(),
  {
    pixelsPerSecond: 100,
  },
);

// Emits
const emit = defineEmits<{
  /** 点击刻度尺跳转到指定帧 */
  seek: [frame: number];
  /** 缩放变化 */
  zoomChange: [zoom: number];
}>();

// 刻度尺容器引用
const rulerRef = ref<HTMLElement | null>(null);

// 计算总宽度（像素）
const totalWidth = computed(() => {
  const totalSeconds = props.totalFrames / props.fps;
  return totalSeconds * props.pixelsPerSecond * props.zoom;
});

// 计算时间指示器位置
const indicatorPosition = computed(() => {
  const currentSeconds = props.currentFrame / props.fps;
  return currentSeconds * props.pixelsPerSecond * props.zoom;
});

// 计算刻度标记
interface TickMark {
  position: number;
  label: string;
  isMajor: boolean;
}

const tickMarks = computed<TickMark[]>(() => {
  const marks: TickMark[] = [];
  const totalSeconds = props.totalFrames / props.fps;

  // 根据缩放级别决定刻度间隔
  let majorInterval: number; // 主刻度间隔（秒）
  let minorInterval: number; // 次刻度间隔（秒）

  if (props.zoom >= 2) {
    majorInterval = 0.5;
    minorInterval = 0.1;
  } else if (props.zoom >= 1) {
    majorInterval = 1;
    minorInterval = 0.25;
  } else if (props.zoom >= 0.5) {
    majorInterval = 2;
    minorInterval = 0.5;
  } else {
    majorInterval = 5;
    minorInterval = 1;
  }

  // 生成刻度
  for (let time = 0; time <= totalSeconds; time += minorInterval) {
    const isMajor = Math.abs(time % majorInterval) < 0.001 || Math.abs((time % majorInterval) - majorInterval) < 0.001;
    const position = time * props.pixelsPerSecond * props.zoom;

    marks.push({
      position,
      label: isMajor ? formatTime(time) : "",
      isMajor,
    });
  }

  return marks;
});

// 格式化时间显示
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}:${secs.toFixed(1).padStart(4, "0")}`;
  }
  return `${secs.toFixed(1)}s`;
}

// 点击刻度尺跳转
function handleRulerClick(event: MouseEvent) {
  if (!rulerRef.value) return;

  const rect = rulerRef.value.getBoundingClientRect();
  const x = event.clientX - rect.left + rulerRef.value.scrollLeft;
  const time = x / (props.pixelsPerSecond * props.zoom);
  const frame = Math.round(time * props.fps);

  emit("seek", Math.max(0, Math.min(frame, props.totalFrames)));
}

// 滚轮缩放
function handleWheel(event: WheelEvent) {
  if (!event.ctrlKey) return;

  event.preventDefault();

  const delta = event.deltaY > 0 ? -0.1 : 0.1;
  const newZoom = Math.max(0.25, Math.min(4, props.zoom + delta));

  emit("zoomChange", newZoom);
}

// 挂载时添加事件监听
onMounted(() => {
  rulerRef.value?.addEventListener("wheel", handleWheel, { passive: false });
});

onUnmounted(() => {
  rulerRef.value?.removeEventListener("wheel", handleWheel);
});
</script>

<template>
  <div
    ref="rulerRef"
    class="relative h-8 cursor-pointer overflow-hidden bg-slate-100 select-none"
    @click="handleRulerClick"
  >
    <!-- 刻度容器 -->
    <div class="relative h-full" :style="{ width: `${totalWidth}px` }">
      <!-- 刻度标记 -->
      <template v-for="(tick, index) in tickMarks" :key="index">
        <div
          class="absolute bottom-0"
          :class="tick.isMajor ? 'h-4 w-px bg-slate-400' : 'h-2 w-px bg-slate-300'"
          :style="{ left: `${tick.position}px` }"
        />
        <span
          v-if="tick.label"
          class="absolute top-1 -translate-x-1/2 font-mono text-[10px] text-slate-500"
          :style="{ left: `${tick.position}px` }"
        >
          {{ tick.label }}
        </span>
      </template>

      <!-- 时间指示器 -->
      <div class="absolute top-0 h-full w-0.5 bg-indigo-500 shadow-sm" :style="{ left: `${indicatorPosition}px` }">
        <!-- 指示器头部 -->
        <div
          class="absolute -top-0.5 -left-1.5 size-0 border-x-[6px] border-t-8 border-x-transparent border-t-indigo-500"
        />
      </div>
    </div>
  </div>
</template>
