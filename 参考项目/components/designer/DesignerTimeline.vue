<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from "vue";
import type { TimelineEvent } from "@/core/designer/types";

const props = defineProps<{
  totalFrames: number;
  currentFrame: number;
  fps: number;
  playing: boolean;
  events?: TimelineEvent[];
}>();

const emit = defineEmits<{
  "update:currentFrame": [value: number];
  "update:fps": [value: number];
  "update:playing": [value: boolean];
  "add-event": [event: TimelineEvent];
  "remove-event": [index: number];
  "update-event": [index: number, event: TimelineEvent];
}>();

const timelineRef = ref<HTMLDivElement | null>(null);
const isDragging = ref(false);
const showEventDialog = ref(false);
const showContextMenu = ref(false);
const contextMenuPosition = ref({ x: 0, y: 0 });
const contextMenuFrame = ref(0);
const newEventFrame = ref(0);
const newEventName = ref("");
// 预定义的颜色列表（2行，每行4个）
const eventColors: string[] = [
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#3b82f6", // blue-500
  "#10b981", // emerald-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#06b6d4", // cyan-500
  "#f97316", // orange-500
  "#22d3ee", // sky-400
  "#84cc16", // lime-500
  "#d946ef", // fuchsia-500
  "#6366f1", // indigo-500
  "#14b8a6", // teal-500
  "#f43f5e", // rose-500
  "#eab308", // amber-600
  "#0ea5e9", // sky-500
];

const newEventColor = ref<string>("#f59e0b"); // 默认黄色

// 生成随机颜色
const generateRandomColor = (): string => {
  return (
    eventColors[Math.floor(Math.random() * eventColors.length)] || "#f59e0b"
  );
};

// 计算标签的垂直偏移位置（错开显示）
// 根据帧位置计算，避免同一帧位置的事件重叠
const getTagOffset = (eventIndex: number) => {
  const events = props.events || [];
  if (events.length === 0) return 0;

  const currentEvent = events[eventIndex];
  if (!currentEvent) return 0;

  // 找到同一帧位置的事件（按索引顺序）
  const sameFrameEvents = events
    .map((e, idx) => ({ event: e, index: idx }))
    .filter(({ event, index }) => {
      // 只考虑完全相同的帧位置，且索引小于等于当前事件
      return event.frame === currentEvent.frame && index <= eventIndex;
    })
    .sort((a, b) => a.index - b.index); // 按索引排序

  // 在当前事件之前的同一帧位置事件的数量，就是当前事件的偏移层数
  const offsetLayer = sameFrameEvents.findIndex(
    ({ index }) => index === eventIndex
  );
  const maxOffset = 3; // 最多3层
  const offset = Math.max(0, offsetLayer) % maxOffset;

  // 标签高度是20px (h-5)，间隔设为25px确保不重叠
  return offset * 25;
};

// 根据背景颜色计算文字颜色（深色背景用浅色文字，浅色背景用深色文字）
const getTextColor = (bgColor: string): string => {
  // 将颜色转换为RGB
  const hex = bgColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // 计算亮度（使用相对亮度公式）
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // 如果亮度大于0.5，使用深色文字，否则使用浅色文字
  return luminance > 0.5 ? "#1f2937" : "#ffffff";
};

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

// 切换播放状态
const togglePlay = () => {
  emit("update:playing", !props.playing);
};

// 播放到开始
const goToStart = () => {
  emit("update:currentFrame", 0);
};

// 播放到结束
const goToEnd = () => {
  emit("update:currentFrame", props.totalFrames - 1);
};

// 前一帧
const prevFrame = () => {
  if (props.currentFrame > 0) {
    emit("update:currentFrame", props.currentFrame - 1);
  }
};

// 后一帧
const nextFrame = () => {
  if (props.currentFrame < props.totalFrames - 1) {
    emit("update:currentFrame", props.currentFrame + 1);
  }
};

// 处理时间轴点击
const handleTimelineClick = (event: MouseEvent) => {
  if (!timelineRef.value) return;

  const rect = timelineRef.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const percent = x / rect.width;
  const frame = Math.floor(percent * props.totalFrames);

  emit(
    "update:currentFrame",
    Math.max(0, Math.min(frame, props.totalFrames - 1))
  );
};

// 处理拖拽
const handleMouseDown = (event: MouseEvent) => {
  isDragging.value = true;
  handleTimelineClick(event);
};

const handleMouseMove = (event: MouseEvent) => {
  if (!isDragging.value) return;
  handleTimelineClick(event);
};

const handleMouseUp = () => {
  isDragging.value = false;
};

// 右键显示菜单
const handleContextMenu = (event: MouseEvent) => {
  event.preventDefault();
  if (!timelineRef.value) return;

  const rect = timelineRef.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const percent = x / rect.width;
  const frame = Math.floor(percent * props.totalFrames);

  contextMenuFrame.value = Math.max(0, Math.min(frame, props.totalFrames - 1));

  // 计算菜单位置，确保在视窗内完整显示
  const menuWidth = 220; // 菜单最小宽度
  // 预估菜单高度：添加按钮(40px) + 分隔线(1px) + 每个标签(40px) + 内边距(8px)
  const events = props.events || [];
  const eventsAtFrame = events
    .map((e, idx) => ({ event: e, index: idx }))
    .filter(({ event }) => event.frame === contextMenuFrame.value);
  const estimatedMenuHeight =
    40 + (eventsAtFrame.length > 0 ? 1 + eventsAtFrame.length * 40 : 0) + 8;

  let menuX = event.clientX;
  let menuY = event.clientY;

  // 检查右边界
  if (menuX + menuWidth > window.innerWidth) {
    menuX = window.innerWidth - menuWidth - 10;
  }

  // 检查下边界 - 如果下方空间不够，显示在上方
  if (menuY + estimatedMenuHeight > window.innerHeight) {
    menuY = Math.max(10, event.clientY - estimatedMenuHeight);
  }

  // 检查左边界
  if (menuX < 10) {
    menuX = 10;
  }

  // 检查上边界
  if (menuY < 10) {
    menuY = 10;
  }

  contextMenuPosition.value = { x: menuX, y: menuY };
  showContextMenu.value = true;
};

// 关闭右键菜单
const closeContextMenu = () => {
  showContextMenu.value = false;
};

// 点击添加新标签
const handleAddNewEvent = () => {
  const currentEvents = props.events || [];
  if (currentEvents.length >= 3) {
    alert("最多只能添加3个事件标签");
    closeContextMenu();
    return;
  }

  newEventFrame.value = contextMenuFrame.value;
  newEventName.value = "";
  newEventColor.value = generateRandomColor(); // 生成随机颜色
  showContextMenu.value = false;
  showEventDialog.value = true;
};

// 不需要这个函数了，使用 getEventsAtFrame

// 获取当前位置的所有标签
const getEventsAtFrame = (frame: number) => {
  const events = props.events || [];
  return events
    .map((e, index) => ({ event: e, index }))
    .filter(({ event }) => event.frame === frame);
};

// 添加事件
const addEvent = () => {
  if (!newEventName.value.trim()) return;

  const currentEvents = props.events || [];
  if (currentEvents.length >= 3) {
    alert("最多只能添加3个事件标签");
    return;
  }

  const newEvent: TimelineEvent = {
    frame: newEventFrame.value,
    name: newEventName.value.trim(),
    color: newEventColor.value,
  };

  emit("add-event", newEvent);
  showEventDialog.value = false;
};

// 删除事件
const removeEvent = (index: number) => {
  emit("remove-event", index);
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

// 格式化时间显示
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(2).padStart(5, "0")}`;
};

// 计算要显示的刻度数量和位置
const tickMarks = computed(() => {
  const maxTicks = 50; // 提高最大显示数量
  if (props.totalFrames <= maxTicks) {
    // 如果帧数少于等于最大值，显示所有帧
    return Array.from({ length: props.totalFrames }, (_, i) => ({
      frame: i,
      position: props.totalFrames > 1 ? (i / (props.totalFrames - 1)) * 100 : 0,
    }));
  } else {
    // 如果帧数过多，均匀采样显示固定数量的刻度，但确保包含首尾
    const tickCount = maxTicks;
    return Array.from({ length: tickCount }, (_, i) => {
      const frame = Math.round((i / (tickCount - 1)) * (props.totalFrames - 1));
      return {
        frame,
        position: (frame / (props.totalFrames - 1)) * 100,
      };
    });
  }
});

// FPS输入
const fpsInput = ref(props.fps);
const updateFPS = () => {
  const newFps = Math.max(1, Math.min(fpsInput.value, 120));
  fpsInput.value = newFps;
  emit("update:fps", newFps);
};

// 播放循环：根据 playing + fps 推进 currentFrame
const rafId = ref<number | null>(null);
const lastTick = ref(0);

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
      const next =
        props.currentFrame + 1 >= props.totalFrames
          ? props.totalFrames - 1
          : props.currentFrame + 1;
      emit("update:currentFrame", next);
      lastTick.value = timestamp;
    }
  }

  rafId.value = requestAnimationFrame(stepFrame);
};

watch(
  () => props.playing,
  (val) => {
    if (val) {
      // 开始播放循环
      if (rafId.value === null) {
        lastTick.value = performance.now();
        rafId.value = requestAnimationFrame(stepFrame);
      }
    } else {
      // 暂停播放
      stopLoop();
    }
  }
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
  <div
    class="flex h-full w-full flex-col bg-slate-900/60 border-t border-white/10"
  >
    <!-- 控制栏 -->
    <div class="flex items-center gap-4 border-b border-white/5 px-6 py-3">
      <!-- 播放控制 -->
      <div class="flex items-center gap-2">
        <button
          class="timeline-btn"
          type="button"
          title="跳到开始 (Home)"
          @click="goToStart"
        >
          <i class="fa fa-fast-backward" />
        </button>
        <button
          class="timeline-btn"
          type="button"
          title="上一帧 (←)"
          @click="prevFrame"
        >
          <i class="fa fa-step-backward" />
        </button>
        <button
          class="timeline-btn-play"
          type="button"
          title="播放/暂停 (Space)"
          @click="togglePlay"
        >
          <i :class="['fa', playing ? 'fa-pause' : 'fa-play']" />
        </button>
        <button
          class="timeline-btn"
          type="button"
          title="下一帧 (→)"
          @click="nextFrame"
        >
          <i class="fa fa-step-forward" />
        </button>
        <button
          class="timeline-btn"
          type="button"
          title="跳到结束 (End)"
          @click="goToEnd"
        >
          <i class="fa fa-fast-forward" />
        </button>
      </div>

      <!-- 时间显示 -->
      <div class="text-xs text-slate-400 font-mono">
        {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
      </div>

      <div class="h-4 w-px bg-white/10" />

      <!-- 帧数显示 -->
      <div class="text-xs text-slate-400">
        <span class="text-slate-500">帧:</span>
        <span class="font-mono text-emerald-400 ml-1">{{
          currentFrame + 1
        }}</span>
        <span class="text-slate-500 mx-1">/</span>
        <span class="font-mono">{{ totalFrames }}</span>
      </div>

      <div class="h-4 w-px bg-white/10" />

      <!-- FPS设置 -->
      <div class="flex items-center gap-2">
        <label class="text-xs text-slate-400">FPS:</label>
        <input
          v-model.number="fpsInput"
          class="timeline-input w-16"
          type="number"
          min="1"
          max="120"
          @change="updateFPS"
          @blur="updateFPS"
        />
      </div>

      <div class="flex-1" />

      <!-- 提示 -->
      <div class="text-xs text-slate-500">
        <i class="fa fa-keyboard mr-1" />
        空格:播放 · 方向键:切换帧 · 右键:添加/删除事件
      </div>
    </div>

    <!-- 时间轴轨道 -->
    <div class="flex-1 h-full overflow-hidden px-6 py-4">
      <slot name="timeline">
        <!-- 默认时间轴内容 -->
        <div class="relative h-full">
          <!-- 刻度标记 -->
          <div class="absolute inset-x-0 top-0 h-6 text-xs text-slate-500">
            <div
              v-for="tick in tickMarks"
              :key="tick.frame"
              class="absolute top-0 text-center"
              :style="{
                left: `${tick.position}%`,
                transform: 'translateX(-50%)',
              }"
            >
              {{ tick.frame }}
            </div>
          </div>

          <!-- 事件标签区域 -->
          <div
            class="absolute inset-x-0 top-6 h-20 overflow-visible pointer-events-none"
          >
            <div
              v-for="(event, index) in events || []"
              :key="`event-tag-${index}`"
              class="absolute h-5 min-w-fit px-2 rounded text-xs font-medium whitespace-nowrap shadow-sm z-10"
              :style="{
                left: `${(event.frame / Math.max(totalFrames - 1, 1)) * 100}%`,
                top: `${getTagOffset(index)}px`,
                backgroundColor: `${event.color || '#f59e0b'}E6`, // 添加透明度 E6 = 90%
                color: getTextColor(event.color || '#f59e0b'),
                transform: 'translateX(-50%)',
              }"
              :title="event.name"
            >
              <span class="shrink-0">{{ event.name }}</span>
            </div>
          </div>

          <!-- 时间轴背景 -->
          <div
            ref="timelineRef"
            class="absolute inset-x-0 top-8 bottom-0 cursor-pointer rounded-lg border border-white/10 bg-slate-950/50"
            @mousedown="handleMouseDown"
            @contextmenu="handleContextMenu"
          >
            <!-- 刻度线 -->
            <div class="absolute inset-0 pointer-events-none">
              <div
                v-for="tick in tickMarks"
                :key="`tick-${tick.frame}`"
                class="absolute top-0 h-full w-px bg-white/10"
                :style="{
                  left: `${tick.position}%`,
                  transform: 'translateX(-50%)',
                }"
              />
            </div>

            <!-- 进度条背景 -->
            <div class="absolute inset-0 overflow-hidden rounded-lg">
              <!-- 已播放区域 -->
              <div
                class="absolute left-0 top-0 h-full bg-emerald-500/20"
                :style="{
                  width: `${
                    (currentFrame / Math.max(totalFrames - 1, 1)) * 100
                  }%`,
                }"
              />
            </div>

            <!-- 播放头 -->
            <div
              class="absolute top-0 h-full w-1 bg-emerald-400 shadow-lg shadow-emerald-500/50 pointer-events-none -translate-x-1/2"
              :style="{
                left: `${(currentFrame / Math.max(totalFrames - 1, 1)) * 100}%`,
              }"
            >
              <!-- 播放头顶部三角形 -->
              <div
                class="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full"
              >
                <div class="border-8 border-transparent border-b-emerald-400" />
              </div>
            </div>
          </div>
        </div>
      </slot>
    </div>

    <!-- 右键菜单 -->
    <div
      v-if="showContextMenu"
      class="fixed z-50 rounded-lg border border-white/10 bg-slate-900 shadow-2xl min-w-[220px] max-w-[300px] max-h-[400px] overflow-y-auto"
      :style="{
        left: `${contextMenuPosition.x}px`,
        top: `${contextMenuPosition.y}px`,
      }"
      @click.stop
    >
      <div class="py-1">
        <!-- 添加新标签 -->
        <button
          class="w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-800 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          type="button"
          :disabled="(events || []).length >= 3"
          @click="handleAddNewEvent"
        >
          <i class="fa fa-plus text-xs" />
          <span>添加标签 (帧 {{ contextMenuFrame }})</span>
        </button>

        <!-- 分隔线 -->
        <div
          v-if="getEventsAtFrame(contextMenuFrame).length > 0"
          class="h-px bg-white/10 my-1"
        />

        <!-- 删除当前位置的标签 -->
        <template
          v-for="{ event, index } in getEventsAtFrame(contextMenuFrame)"
          :key="index"
        >
          <button
            class="w-full px-4 py-2 text-left text-sm hover:bg-slate-800 transition-colors flex items-center gap-2 group"
            type="button"
            @click="
              removeEvent(index);
              closeContextMenu();
            "
          >
            <div
              class="w-3 h-3 rounded shrink-0"
              :style="{
                backgroundColor: event.color || '#f59e0b',
              }"
            />
            <span class="flex-1 truncate">{{ event.name }}</span>
            <i
              class="fa fa-times text-xs opacity-0 group-hover:opacity-100 text-red-400 shrink-0"
            />
          </button>
        </template>
      </div>
    </div>

    <!-- 点击外部关闭右键菜单 -->
    <div
      v-if="showContextMenu"
      class="fixed inset-0 z-40"
      @click="closeContextMenu"
    />

    <!-- 添加事件对话框 -->
    <div
      v-if="showEventDialog"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="showEventDialog = false"
    >
      <div
        class="rounded-xl border border-white/10 bg-slate-900 p-6 shadow-2xl w-96"
      >
        <h3 class="text-lg font-semibold text-white mb-4">添加事件标记</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-xs text-slate-400 mb-1">帧位置</label>
            <input
              v-model.number="newEventFrame"
              class="timeline-input w-full"
              type="number"
              :min="0"
              :max="totalFrames - 1"
            />
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1">事件名称</label>
            <input
              v-model="newEventName"
              class="timeline-input w-full"
              type="text"
              placeholder="输入事件名称..."
              @keydown.enter="addEvent"
            />
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-2">标签颜色</label>
            <div class="flex items-start gap-6">
              <!-- 颜色选择器 -->
              <div class="grid grid-cols-8 gap-1.5">
                <button
                  v-for="color in eventColors"
                  :key="color"
                  class="w-8 h-8 rounded border-2 transition-all"
                  :class="{
                    'border-white scale-110': newEventColor === color,
                    'border-white/30 hover:border-white/50':
                      newEventColor !== color,
                  }"
                  :style="{ backgroundColor: color }"
                  type="button"
                  :title="color"
                  @click="newEventColor = color"
                />
              </div>
              <!-- 随机颜色和预览 -->
              <div class="flex flex-col items-center gap-1.5">
                <button
                  class="w-8 h-8 rounded border border-white/30 hover:border-white/50 flex items-center justify-center text-white/60 hover:text-white text-xs"
                  type="button"
                  title="随机颜色"
                  @click="newEventColor = generateRandomColor()"
                >
                  <i class="fa fa-random" />
                </button>
                <div
                  class="w-8 h-8 rounded border border-white/30"
                  :style="{ backgroundColor: newEventColor }"
                  title="当前选中颜色"
                />
              </div>
            </div>
          </div>
          <div class="flex gap-2">
            <button
              class="btn-secondary flex-1"
              type="button"
              @click="showEventDialog = false"
            >
              取消
            </button>
            <button
              class="btn-primary flex-1"
              type="button"
              :disabled="!newEventName.trim()"
              @click="addEvent"
            >
              添加
            </button>
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
  border-radius: 0.375rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background-color: rgba(0, 0, 0, 0.4);
  color: rgb(203, 213, 225);
  transition: all 0.15s;
}

.timeline-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
  border-color: rgba(110, 231, 183, 0.5);
  color: rgb(110, 231, 183);
}

.timeline-btn-play {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.5rem;
  background-color: rgb(16, 185, 129);
  color: white;
  transition: all 0.15s;
  box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.3);
}

.timeline-btn-play:hover {
  background-color: rgb(52, 211, 153);
  box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.4);
}

.timeline-input {
  border-radius: 0.25rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background-color: rgba(0, 0, 0, 0.4);
  padding: 0.375rem 0.5rem;
  font-size: 0.75rem;
  color: white;
  outline: none;
  transition: all 0.15s;
}

.timeline-input:focus {
  border-color: rgb(52, 211, 153);
  background-color: rgba(0, 0, 0, 0.6);
}

.btn-primary {
  border-radius: 0.375rem;
  background-color: rgb(16, 185, 129);
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: white;
  transition: all 0.15s;
}

.btn-primary:hover:not(:disabled) {
  background-color: rgb(52, 211, 153);
}

.btn-primary:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.btn-secondary {
  border-radius: 0.375rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: rgb(241, 245, 249);
  transition: all 0.15s;
}

.btn-secondary:hover {
  border-color: rgba(110, 231, 183, 0.5);
  background-color: rgba(255, 255, 255, 0.05);
}
</style>
