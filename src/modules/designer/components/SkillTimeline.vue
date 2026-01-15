<script setup lang="ts">
/**
 * @file 技能时间轴组件
 * @description 多轨道时间轴编辑器，支持拖拽、缩放、吸附
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { SkillStep } from "@/types";
import { libraryDraggingRef } from "../composables/useLibraryDragToTimeline";

// ============ 类型定义 ============

// 内部使用的时间轴片段类型（兼容全局类型）
interface TimelineSegment {
  id?: string;
  stepId?: string;
  trackId?: string;
  startFrame?: number;
  endFrame?: number;
  start?: number; // 帧数（兼容旧格式）
  end?: number; // 帧数（兼容旧格式）
  step?: SkillStep;
  index?: number;
}

interface TimelineItem {
  id: string;
  trackId: string;
  start: number; // 秒
  duration: number; // 秒
  name: string;
  colorClass: string;
  stepIndex: number;
  stepType: string;
}

interface TimelineTrack {
  id: string;
  name: string;
  locked?: boolean;
  hidden?: boolean;
}

// ============ Props/Emits ============

const props = defineProps<{
  segments: TimelineSegment[];
  totalFrames: number;
  currentFrame: number;
  fps: number;
  selectedStepIndex: number | null;
}>();

const emit = defineEmits<{
  "update:current-frame": [frame: number];
  "select-step": [index: number];
  "delete-step": [index: number];
  "update-segment": [index: number, start: number, end: number];
  "drop-step": [stepIndex: number, targetTime: number, trackId: string];
}>();

// ============ 配置常量 ============

const TRACK_HEIGHT = 40;
const MIN_ZOOM = 5;
const MAX_ZOOM = 200;
const SNAP_THRESHOLD = 12;

// 步骤类型颜色映射
const stepTypeColors: Record<string, string> = {
  move: "bg-emerald-500",
  damage: "bg-rose-500",
  effect: "bg-violet-500",
  wait: "bg-amber-500",
};

// 步骤类型名称映射
const stepTypeNames: Record<string, string> = {
  move: "移动",
  damage: "伤害",
  effect: "特效",
  wait: "等待",
};

// 步骤默认帧数
const STEP_FRAME_DEFAULT: Record<string, number> = {
  move: 50,
  damage: 30,
  effect: 40,
  wait: 30,
};

// ============ 状态 ============

const zoom = ref(20); // px per second
const dragging = ref<{
  type: "move" | "resize-left" | "resize-right";
  itemId: string;
  clickOffsetInItem: number;
  startX: number;
  originalStart: number;
  originalDuration: number;
  trackId: string;
} | null>(null);
const snapLine = ref<number | null>(null);
const dragOverTrackId = ref<string | null>(null);
const ghostItem = ref<{
  stepType: string;
  start: number;
  duration: number;
  trackId: string;
} | null>(null);

// DOM 引用
const leftScrollContainer = ref<HTMLDivElement | null>(null);
const rightScrollContainer = ref<HTMLDivElement | null>(null);

// 轨道管理
const tracks = ref<TimelineTrack[]>([{ id: "main-track", name: "轨道 1", locked: false, hidden: false }]);
let trackCounter = 1;

// 时间轴项目
const timelineItems = ref<TimelineItem[]>([]);

// ============ 计算属性 ============

const totalDuration = computed(() => {
  if (props.totalFrames <= 0 || props.fps <= 0) return 30;
  return props.totalFrames / props.fps;
});

const MAX_ITEM_DURATION = computed(() => Math.max(5, totalDuration.value + 10));

const currentTime = computed(() => {
  if (props.fps <= 0) return 0;
  return props.currentFrame / props.fps;
});

const totalWidth = computed(() => {
  const contentW = (totalDuration.value + 20) * zoom.value;
  return Math.max(contentW, 800);
});

const visibleTracks = computed(() => tracks.value.filter((t) => !t.hidden));

// ============ 工具函数 ============

const timeToPx = (t: number) => t * zoom.value;
const pxToTime = (p: number) => p / zoom.value;

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const getTrackIndex = (trackId: string) => visibleTracks.value.findIndex((t) => t.id === trackId);

const isTrackLocked = (trackId: string) => {
  const track = tracks.value.find((t) => t.id === trackId);
  return track?.locked ?? false;
};

// 同步 segments 到 timelineItems
const syncSegmentsToItems = () => {
  timelineItems.value = props.segments.map((segment, index) => {
    // 兼容两种格式：start/end 或 startFrame/endFrame
    const startFrame = segment.startFrame ?? segment.start ?? 0;
    const endFrame = segment.endFrame ?? segment.end ?? startFrame + 30;
    const startTime = startFrame / props.fps;
    const duration = (endFrame - startFrame) / props.fps;
    const existing = timelineItems.value.find((it) => it.stepIndex === index);
    const stepType = segment.step?.type || "wait";

    return {
      id: segment.id || `step-${index}`,
      trackId: segment.trackId || existing?.trackId || "main-track",
      start: startTime,
      duration: duration,
      name: stepTypeNames[stepType] || stepType,
      colorClass: stepTypeColors[stepType] || "bg-gray-600",
      stepIndex: index,
      stepType,
    };
  });
};

syncSegmentsToItems();
watch(() => props.segments, syncSegmentsToItems, { deep: true });

// ============ 轨道管理 ============

const addTrack = () => {
  const newTrack: TimelineTrack = {
    id: `track-${Date.now()}`,
    name: `轨道 ${++trackCounter}`,
    locked: false,
    hidden: false,
  };
  tracks.value.push(newTrack);
};

const deleteTrack = (trackId: string) => {
  if (tracks.value.length <= 1) return;
  tracks.value = tracks.value.filter((t) => t.id !== trackId);
};

const toggleLockTrack = (trackId: string) => {
  const track = tracks.value.find((t) => t.id === trackId);
  if (track) track.locked = !track.locked;
};

const toggleHideTrack = (trackId: string) => {
  const track = tracks.value.find((t) => t.id === trackId);
  if (track) track.hidden = !track.hidden;
};

// ============ 滚动与缩放 ============

const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement;
  if (leftScrollContainer.value && target === rightScrollContainer.value) {
    leftScrollContainer.value.scrollTop = target.scrollTop;
  }
};

const handleWheel = (e: WheelEvent) => {
  if (e.ctrlKey && rightScrollContainer.value) {
    e.preventDefault();
    e.stopPropagation();

    const oldZoom = zoom.value;
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    let newZoom = oldZoom * (1 + delta);
    newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));

    if (newZoom !== oldZoom) {
      const rect = rightScrollContainer.value.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const scrollLeft = rightScrollContainer.value.scrollLeft;
      const anchorTime = (scrollLeft + mouseX) / oldZoom;

      zoom.value = newZoom;

      nextTick(() => {
        if (rightScrollContainer.value) {
          rightScrollContainer.value.scrollLeft = anchorTime * newZoom - mouseX;
        }
      });
    }
  }
};

// ============ 吸附逻辑 ============

const calculateSnap = (targetTime: number, ignoreItemId: string | null = null) => {
  const points = new Set<number>([0, currentTime.value]);
  timelineItems.value.forEach((it) => {
    if (it.id === ignoreItemId) return;
    points.add(it.start);
    points.add(it.start + it.duration);
  });

  const targetPx = timeToPx(targetTime);
  let bestSnapPx: number | null = null;
  let minDiff = SNAP_THRESHOLD;

  for (const pTime of points) {
    const pPx = timeToPx(pTime);
    const diff = Math.abs(pPx - targetPx);
    if (diff < minDiff) {
      minDiff = diff;
      bestSnapPx = pPx;
    }
  }

  if (bestSnapPx !== null) {
    return { snapped: true, time: pxToTime(bestSnapPx), px: bestSnapPx };
  }
  return { snapped: false, time: targetTime, px: null };
};

// ============ 拖拽处理 ============

const HANDLE_HIT_WIDTH_PX = 6;

const handleItemMouseDown = (e: MouseEvent, item: TimelineItem) => {
  if (!rightScrollContainer.value || isTrackLocked(item.trackId)) return;

  const targetEl = e.currentTarget as HTMLElement | null;
  if (!targetEl) return;

  const rect = targetEl.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const itemWidthPx = timeToPx(item.duration);

  let type: "move" | "resize-left" | "resize-right" = "move";
  if (clickX <= HANDLE_HIT_WIDTH_PX) {
    type = "resize-left";
  } else if (clickX >= itemWidthPx - HANDLE_HIT_WIDTH_PX) {
    type = "resize-right";
  }

  dragging.value = {
    type,
    itemId: item.id,
    clickOffsetInItem:
      e.clientX -
      (rightScrollContainer.value.getBoundingClientRect().left +
        timeToPx(item.start) -
        rightScrollContainer.value.scrollLeft),
    startX: e.clientX,
    originalStart: item.start,
    originalDuration: item.duration,
    trackId: item.trackId,
  };

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
};

const onMouseMove = (e: MouseEvent) => {
  if (!dragging.value || !rightScrollContainer.value) return;

  const { type, itemId, clickOffsetInItem, startX, originalStart, originalDuration } = dragging.value;
  const rect = rightScrollContainer.value.getBoundingClientRect();

  if (type === "move") {
    // 计算新的轨道
    const relativeY = e.clientY - rect.top + rightScrollContainer.value.scrollTop - 32;
    const trackIndex = Math.floor(relativeY / TRACK_HEIGHT);
    const newTrack = visibleTracks.value[Math.max(0, Math.min(visibleTracks.value.length - 1, trackIndex))];
    if (!newTrack) {
      snapLine.value = null;
      return;
    }

    // 计算新位置
    const currentMouseAbsX = e.clientX - rect.left + rightScrollContainer.value.scrollLeft;
    const rawNewStartPx = currentMouseAbsX - clickOffsetInItem;
    let newStart = Math.max(0, pxToTime(rawNewStartPx));

    // 吸附处理
    const snapLeft = calculateSnap(newStart, itemId);
    const snapRight = calculateSnap(newStart + originalDuration, itemId);

    if (snapLeft.snapped) {
      newStart = snapLeft.time;
      snapLine.value = snapLeft.px;
    } else if (snapRight.snapped) {
      newStart = snapRight.time - originalDuration;
      snapLine.value = snapRight.px;
    } else {
      snapLine.value = null;
    }

    // 更新项目位置
    const item = timelineItems.value.find((i) => i.id === itemId);
    if (item) {
      item.start = newStart;
      item.trackId = newTrack.id;
    }
  } else if (type === "resize-right") {
    const item = timelineItems.value.find((i) => i.id === itemId);
    if (!item) return;

    const deltaX = e.clientX - startX;
    const deltaTime = pxToTime(deltaX);
    let newDur = Math.max(0.1, originalDuration + deltaTime);
    let newEnd = originalStart + newDur;

    if (newEnd > originalStart + MAX_ITEM_DURATION.value) {
      newEnd = originalStart + MAX_ITEM_DURATION.value;
      newDur = newEnd - originalStart;
    }

    const snap = calculateSnap(newEnd, itemId);
    if (snap.snapped) {
      newDur = snap.time - originalStart;
      snapLine.value = snap.px;
    } else {
      snapLine.value = null;
    }

    item.duration = Math.min(MAX_ITEM_DURATION.value, Math.max(0.1, newDur));
  } else if (type === "resize-left") {
    const item = timelineItems.value.find((i) => i.id === itemId);
    if (!item) return;

    const deltaX = e.clientX - startX;
    const deltaTime = pxToTime(deltaX);
    let newStart = Math.max(0, originalStart + deltaTime);
    let newDur = originalDuration - (newStart - originalStart);

    if (newDur > 0.1) {
      const snap = calculateSnap(newStart, itemId);
      if (snap.snapped) {
        newStart = snap.time;
        newDur = originalDuration - (newStart - originalStart);
        snapLine.value = snap.px;
      } else {
        snapLine.value = null;
      }

      item.start = Math.max(0, newStart);
      item.duration = Math.min(MAX_ITEM_DURATION.value, Math.max(0.1, newDur));
    }
  }
};

const onMouseUp = () => {
  if (dragging.value) {
    const item = timelineItems.value.find((i) => i.id === dragging.value!.itemId);
    if (item) {
      const maxFrames = props.totalFrames > 0 ? props.totalFrames + 60 : 6000;
      let newStartFrame = Math.round(item.start * props.fps);
      let newEndFrame = newStartFrame + Math.round(item.duration * props.fps);

      newStartFrame = Math.max(0, Math.min(newStartFrame, maxFrames));
      newEndFrame = Math.max(newStartFrame + 1, Math.min(newEndFrame, maxFrames));

      emit("update-segment", item.stepIndex, Math.max(0, newStartFrame), Math.max(0, newEndFrame));
    }
  }

  dragging.value = null;
  snapLine.value = null;
  document.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("mouseup", onMouseUp);
};

// ============ 播放头拖拽 ============

const startScrubbing = () => {
  if (!rightScrollContainer.value) return;

  const handleScrub = (ev: MouseEvent) => {
    if (!rightScrollContainer.value) return;
    const rect = rightScrollContainer.value.getBoundingClientRect();
    const offsetX = ev.clientX - rect.left + rightScrollContainer.value.scrollLeft;
    let newTime = Math.max(0, pxToTime(offsetX));
    const snap = calculateSnap(newTime);
    if (snap.snapped) newTime = snap.time;
    const newFrame = Math.round(newTime * props.fps);
    emit("update:current-frame", newFrame);
  };

  const stopScrub = () => {
    document.removeEventListener("mousemove", handleScrub);
    document.removeEventListener("mouseup", stopScrub);
  };

  document.addEventListener("mousemove", handleScrub);
  document.addEventListener("mouseup", stopScrub);
};

// ============ 时间轴点击 ============

const handleTimelineClick = (e: MouseEvent) => {
  if (dragging.value || !rightScrollContainer.value) return;
  const rect = rightScrollContainer.value.getBoundingClientRect();
  const offsetX = e.clientX - rect.left + rightScrollContainer.value.scrollLeft;
  const newTime = Math.max(0, pxToTime(offsetX));
  const newFrame = Math.round(newTime * props.fps);
  emit("update:current-frame", newFrame);
};

// ============ 拖放处理 ============

const handleDragOver = (e: DragEvent, trackId: string) => {
  e.preventDefault();
  e.stopPropagation();
  if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  dragOverTrackId.value = trackId;
};

const handleDragLeave = () => {
  dragOverTrackId.value = null;
};

const handleDrop = (e: DragEvent, trackId: string) => {
  e.preventDefault();
  e.stopPropagation();
  dragOverTrackId.value = null;

  if (!rightScrollContainer.value) return;

  const dataStr = e.dataTransfer?.getData("application/json");
  if (!dataStr) return;

  try {
    const data = JSON.parse(dataStr);
    if (data.type !== "skill-step" || typeof data.stepIndex !== "number") return;

    const rect = rightScrollContainer.value.getBoundingClientRect();
    const absoluteX = e.clientX - rect.left + rightScrollContainer.value.scrollLeft;
    const mouseTime = pxToTime(absoluteX);

    const segment = props.segments[data.stepIndex];
    // 兼容两种格式
    const startFrame = segment?.startFrame ?? segment?.start ?? 0;
    const endFrame = segment?.endFrame ?? segment?.end ?? startFrame + 30;
    const defaultDuration = segment != null ? (endFrame - startFrame) / props.fps : 0.5;
    const halfDuration = defaultDuration / 2;
    let startTime = Math.max(0, mouseTime - halfDuration);

    const snap = calculateSnap(startTime);
    if (snap.snapped) startTime = snap.time;

    emit("drop-step", data.stepIndex, startTime, trackId);
  } catch (error) {
    console.warn("拖拽数据解析失败", error);
  }
};

// ============ 点击与删除 ============

const handleItemClick = (item: TimelineItem) => {
  emit("select-step", item.stepIndex);
};

const deleteItem = (item: TimelineItem) => {
  emit("delete-step", item.stepIndex);
};

// ============ 生命周期 ============

onMounted(() => {
  if (rightScrollContainer.value) {
    rightScrollContainer.value.addEventListener("scroll", handleScroll);
  }
});

onBeforeUnmount(() => {
  if (rightScrollContainer.value) {
    rightScrollContainer.value.removeEventListener("scroll", handleScroll);
  }
  document.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("mouseup", onMouseUp);
});

// 监听库拖拽状态
watch(
  libraryDraggingRef,
  (state) => {
    if (!rightScrollContainer.value || !state) {
      ghostItem.value = null;
      return;
    }

    const rect = rightScrollContainer.value.getBoundingClientRect();
    const { x, y } = state;
    const inside = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

    if (!inside) {
      ghostItem.value = null;
      state.overTimeline = false;
      return;
    }

    const scrollLeft = rightScrollContainer.value.scrollLeft;
    const scrollTop = rightScrollContainer.value.scrollTop;
    const relativeX = x - rect.left + scrollLeft;
    const relativeY = y - rect.top + scrollTop - 32;

    const trackIndex = Math.max(0, Math.min(visibleTracks.value.length - 1, Math.floor(relativeY / TRACK_HEIGHT)));
    const targetTrack = visibleTracks.value[trackIndex];
    if (!targetTrack) {
      ghostItem.value = null;
      state.overTimeline = false;
      return;
    }

    const mouseTime = pxToTime(relativeX);
    const defaultFrames = STEP_FRAME_DEFAULT[state.type] ?? 30;
    const defaultDuration = props.fps > 0 ? defaultFrames / props.fps : defaultFrames / 10;
    const halfDuration = defaultDuration / 2;
    let startTime = Math.max(0, mouseTime - halfDuration);

    const snap = calculateSnap(startTime);
    if (snap.snapped) startTime = snap.time;

    ghostItem.value = {
      stepType: state.type,
      start: startTime,
      duration: defaultDuration,
      trackId: targetTrack.id,
    };
    state.overTimeline = true;
    state.targetTime = startTime;
    state.trackId = targetTrack.id;
  },
  { deep: true },
);
</script>

<template>
  <div class="flex h-full flex-col border-t border-slate-200 bg-white select-none">
    <div class="relative flex flex-1 overflow-scroll">
      <!-- 左侧：轨道头 -->
      <div
        ref="leftScrollContainer"
        class="relative z-20 flex w-48 shrink-0 flex-col border-r border-slate-200 bg-white"
      >
        <!-- 左上角：添加轨道按钮 -->
        <div
          class="sticky top-0 z-20 flex h-8 shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-3 shadow-sm"
        >
          <div></div>
          <button
            class="flex items-center justify-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600 transition-colors hover:bg-indigo-100"
            title="添加轨道"
            @click="addTrack"
          >
            <svg class="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            添加轨道
          </button>
        </div>

        <!-- 轨道头列表 -->
        <div class="relative flex-1 pb-10">
          <div
            v-for="track in tracks"
            :key="track.id"
            class="group relative flex items-center justify-between border-b border-slate-100 px-3 transition-colors hover:bg-slate-50"
            :class="{ 'opacity-50': track.hidden, 'bg-amber-50': track.locked }"
            :style="{ height: TRACK_HEIGHT + 'px' }"
          >
            <div class="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
              <div class="h-4 w-1 shrink-0 rounded-full" :class="track.hidden ? 'bg-slate-300' : 'bg-indigo-500'" />
              <span
                class="truncate text-xs font-medium text-slate-600"
                :class="{ 'line-through': track.hidden, 'text-amber-600': track.locked }"
              >
                {{ track.name }}
              </span>
              <span v-if="track.locked" class="shrink-0 text-[10px] text-amber-500" title="已锁定">🔒</span>
              <span v-if="track.hidden" class="shrink-0 text-[10px] text-slate-400" title="已隐藏">👁️</span>
            </div>

            <!-- 操作按钮组 -->
            <div class="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                class="rounded p-1 transition-colors hover:bg-slate-200"
                :class="track.locked ? 'text-amber-500' : 'text-slate-400'"
                :title="track.locked ? '解锁' : '锁定'"
                @click.stop="toggleLockTrack(track.id)"
              >
                <svg class="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    v-if="track.locked"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                  <path
                    v-else
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                  />
                </svg>
              </button>
              <button
                class="rounded p-1 transition-colors hover:bg-slate-200"
                :class="track.hidden ? 'text-slate-400' : 'text-slate-400'"
                :title="track.hidden ? '显示' : '隐藏'"
                @click.stop="toggleHideTrack(track.id)"
              >
                <svg class="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    v-if="track.hidden"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                  <template v-else>
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </template>
                </svg>
              </button>
              <button
                class="rounded p-1 text-rose-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
                :disabled="tracks.length <= 1"
                :class="{ 'cursor-not-allowed opacity-50': tracks.length <= 1 }"
                title="删除轨道"
                @click.stop="deleteTrack(track.id)"
              >
                <svg class="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：时间轴内容 -->
      <div
        ref="rightScrollContainer"
        class="relative flex-1 bg-slate-50"
        @scroll="handleScroll"
        @wheel="handleWheel"
        @click="handleTimelineClick"
      >
        <!-- 标尺 -->
        <div
          class="sticky top-0 z-30 h-8 min-w-full border-b border-slate-200 bg-white/90 backdrop-blur"
          :style="{ width: totalWidth + 'px' }"
        >
          <div
            class="pointer-events-none absolute inset-0"
            :style="{
              backgroundSize: `${zoom * 5}px 100%, ${zoom}px 100%`,
              backgroundImage:
                'linear-gradient(to right, #cbd5e1 1px, transparent 1px), linear-gradient(to right, #e2e8f0 1px, transparent 1px)',
            }"
          >
            <!-- 大刻度数字 -->
            <div
              v-for="i in Math.ceil(totalDuration / 5) + 2"
              :key="i"
              class="absolute top-0.5 pl-1.5 font-mono text-[10px] text-slate-500 select-none"
              :style="{ left: (i - 1) * 5 * zoom + 'px' }"
            >
              {{ formatTime((i - 1) * 5) }}
            </div>
          </div>

          <!-- 播放头帽子 -->
          <div class="absolute top-0 bottom-0 z-40 w-0" :style="{ left: timeToPx(currentTime) + 'px' }">
            <div
              class="absolute top-0 h-0 w-0 -translate-x-1/2 cursor-ew-resize border-t-[8px] border-r-[6px] border-l-[6px] border-t-indigo-500 border-r-transparent border-l-transparent transition-transform hover:scale-110"
              @mousedown.stop="startScrubbing"
            />
          </div>
        </div>

        <!-- 轨道容器 -->
        <div class="relative min-w-full pb-20" :style="{ width: totalWidth + 'px' }">
          <!-- 轨道背景线 -->
          <div
            v-for="track in visibleTracks"
            :key="'bg-' + track.id"
            class="relative box-border w-full border-b border-slate-100 transition-colors"
            :class="{ 'border-indigo-300 bg-indigo-50': dragOverTrackId === track.id }"
            :style="{ height: TRACK_HEIGHT + 'px' }"
            @dragover.prevent="handleDragOver($event, track.id)"
            @dragleave="handleDragLeave"
            @drop="handleDrop($event, track.id)"
          >
            <div
              class="pointer-events-none absolute inset-0 border-r border-slate-100"
              :style="{ width: zoom + 'px', backgroundSize: zoom + 'px 100%' }"
            />
          </div>

          <!-- 步骤块 -->
          <div class="pointer-events-none absolute inset-0">
            <div
              v-for="item in timelineItems"
              :key="item.id"
              v-show="!tracks.find((t) => t.id === item.trackId)?.hidden"
              class="group pointer-events-auto absolute overflow-hidden rounded-lg border border-white/50 shadow-sm transition-all"
              :class="[
                item.colorClass,
                dragging && dragging.itemId === item.id
                  ? 'z-50 opacity-90 shadow-xl ring-2 ring-indigo-400'
                  : 'z-10 hover:shadow-md hover:brightness-105',
                selectedStepIndex === item.stepIndex ? 'ring-2 ring-indigo-500 ring-offset-1' : '',
                isTrackLocked(item.trackId) ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
              ]"
              :style="{
                left: timeToPx(item.start) + 'px',
                top: getTrackIndex(item.trackId) * TRACK_HEIGHT + 2 + 'px',
                width: Math.max(4, timeToPx(item.duration)) + 'px',
                height: TRACK_HEIGHT - 4 + 'px',
              }"
              @mousedown.stop="handleItemMouseDown($event, item)"
              @click.stop="handleItemClick(item)"
            >
              <!-- 内容 -->
              <div class="flex h-full w-full flex-col justify-center overflow-hidden px-2">
                <div class="truncate text-[11px] leading-tight font-bold text-white drop-shadow-sm select-none">
                  {{ item.name }}
                </div>
                <div class="truncate font-mono text-[9px] text-white/80">{{ item.duration.toFixed(2) }}s</div>
              </div>

              <!-- 调节柄 -->
              <div
                class="absolute top-0 bottom-0 left-0 z-20 flex w-3 cursor-w-resize items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/30"
              >
                <div class="h-3 w-0.5 rounded-full bg-white/70" />
              </div>
              <div
                class="absolute top-0 right-0 bottom-0 z-20 flex w-3 cursor-e-resize items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/30"
              >
                <div class="h-3 w-0.5 rounded-full bg-white/70" />
              </div>

              <!-- 删除按钮 -->
              <button
                class="absolute top-1 right-1 hidden rounded bg-white/20 p-0.5 text-white backdrop-blur-sm transition-colors group-hover:block hover:bg-rose-500"
                title="删除"
                @click.stop="deleteItem(item)"
              >
                <svg class="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- 从库拖拽时的临时标签 -->
            <div
              v-if="ghostItem && !tracks.find((t) => t.id === ghostItem?.trackId)?.hidden"
              class="pointer-events-none absolute z-40 overflow-hidden rounded-lg border border-white/50 opacity-70 shadow-md"
              :class="ghostItem ? stepTypeColors[ghostItem.stepType] || 'bg-gray-500' : 'bg-gray-500'"
              :style="{
                left: ghostItem ? timeToPx(ghostItem.start) + 'px' : '0',
                top: ghostItem ? getTrackIndex(ghostItem.trackId) * TRACK_HEIGHT + 2 + 'px' : '0',
                width: ghostItem ? Math.max(4, timeToPx(ghostItem.duration)) + 'px' : '0',
                height: TRACK_HEIGHT - 4 + 'px',
              }"
            >
              <div class="flex h-full w-full flex-col justify-center overflow-hidden px-2">
                <div class="truncate text-[11px] leading-tight font-bold text-white drop-shadow-sm select-none">
                  {{ ghostItem ? stepTypeNames[ghostItem.stepType] || ghostItem.stepType : "" }}
                </div>
                <div class="truncate font-mono text-[9px] text-white/80">
                  {{ ghostItem ? ghostItem.duration.toFixed(2) + "s" : "" }}
                </div>
              </div>
            </div>
          </div>

          <!-- 吸附线 -->
          <div
            v-if="snapLine !== null"
            class="pointer-events-none absolute top-0 bottom-0 z-[60] w-px bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"
            :style="{ left: snapLine + 'px' }"
          >
            <div
              class="sticky top-10 ml-1 inline-block rounded bg-amber-400 px-1 font-mono text-[10px] font-bold text-amber-900"
            >
              {{ formatTime(pxToTime(snapLine)) }}
            </div>
          </div>

          <!-- 播放头线 -->
          <div
            class="pointer-events-none absolute top-0 bottom-0 z-40 w-px bg-indigo-500 shadow-lg shadow-indigo-300"
            :style="{ left: timeToPx(currentTime) + 'px' }"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "@/style.css";

/* 自定义滚动条 - 亮色主题 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f5f9;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
  border: 2px solid #f1f5f9;
}

::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
