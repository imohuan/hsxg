<script setup lang="ts">
/**
 * @file 技能时间轴组件
 * @description 多轨道时间轴编辑器，支持拖拽、缩放、吸附、防重叠
 * @note 最小单位为帧，参考 AE 轨道功能实现
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useStorage } from "@vueuse/core";
import type { SkillStep } from "@/types";
import { libraryDraggingRef } from "@/modules/skill/composables/useLibraryDragToTimeline";

// ============ 类型定义 ============

interface TimelineSegment {
  id?: string;
  stepId?: string;
  trackId?: string;
  startFrame?: number;
  endFrame?: number;
  start?: number;
  end?: number;
  step?: SkillStep;
  index?: number;
}

interface TimelineItem {
  id: string;
  trackId: string;
  startFrame: number;
  durationFrames: number;
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
  "update-segment": [index: number, start: number, end: number, trackId?: string];
  "drop-step": [stepIndex: number, targetTime: number, trackId: string];
}>();

// ============ 配置常量 ============

const TRACK_HEIGHT = 40;
const MIN_ZOOM = 5;
const MAX_ZOOM = 2000; // 允许更大的缩放
const SNAP_THRESHOLD_PX = 8;

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

// 缩放级别持久化到 localStorage，刷新后保持
const zoom = useStorage("skill-timeline-zoom", 20); // px per second
const dragging = ref<{
  type: "move" | "resize-left" | "resize-right";
  itemId: string;
  clickOffsetPx: number;
  startX: number;
  originalStartFrame: number;
  originalDurationFrames: number;
  originalTrackId: string;
} | null>(null);
const snapLine = ref<number | null>(null);
const insertLine = ref<{
  frame: number;
  trackId: string;
  position: "before" | "after";
} | null>(null);
const dragOverTrackId = ref<string | null>(null);
const ghostItem = ref<{
  stepType: string;
  startFrame: number;
  durationFrames: number;
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

const currentTime = computed(() => {
  if (props.fps <= 0) return 0;
  return props.currentFrame / props.fps;
});

const totalWidth = computed(() => {
  const contentW = (totalDuration.value + 20) * zoom.value;
  return Math.max(contentW, 800);
});

const visibleTracks = computed(() => tracks.value.filter((t) => !t.hidden));

// 计算标尺刻度（根据缩放级别动态调整）
const rulerTicks = computed(() => {
  const ticks: { frame: number; type: "major" | "minor" | "sub" }[] = [];
  const maxFrame = Math.ceil(totalDuration.value * props.fps) + props.fps * 5;
  const pxPerFrame = zoom.value / props.fps;

  // 根据缩放级别动态调整刻度间隔
  // 目标：大刻度之间至少 80px，中刻度之间至少 20px，小刻度之间至少 5px
  let majorInterval: number;
  let minorInterval: number;
  let subInterval: number;

  if (pxPerFrame >= 4) {
    // 高缩放：每秒大刻度，每10帧中刻度，每帧小刻度
    majorInterval = props.fps;
    minorInterval = Math.max(1, Math.floor(props.fps / 6));
    subInterval = 1;
  } else if (pxPerFrame >= 1.5) {
    // 中高缩放：每5秒大刻度，每秒中刻度，每5帧小刻度
    majorInterval = props.fps * 5;
    minorInterval = props.fps;
    subInterval = Math.max(1, Math.floor(props.fps / 2));
  } else if (pxPerFrame >= 0.5) {
    // 中缩放：每5秒大刻度，每秒中刻度，不显示小刻度
    majorInterval = props.fps * 5;
    minorInterval = props.fps;
    subInterval = props.fps; // 与中刻度相同，实际不显示小刻度
  } else if (pxPerFrame >= 0.2) {
    // 低缩放：每10秒大刻度，每5秒中刻度，不显示小刻度
    majorInterval = props.fps * 10;
    minorInterval = props.fps * 5;
    subInterval = props.fps * 5;
  } else {
    // 极低缩放：每30秒大刻度，每10秒中刻度，不显示小刻度
    majorInterval = props.fps * 30;
    minorInterval = props.fps * 10;
    subInterval = props.fps * 10;
  }

  // 只生成可见范围内的刻度，避免生成过多元素
  const minPxBetweenTicks = 3; // 刻度之间最小像素间隔
  const actualSubInterval =
    pxPerFrame * subInterval < minPxBetweenTicks ? Math.ceil(minPxBetweenTicks / pxPerFrame) : subInterval;

  for (let f = 0; f <= maxFrame; f += actualSubInterval) {
    if (f % majorInterval === 0) {
      ticks.push({ frame: f, type: "major" });
    } else if (f % minorInterval === 0) {
      ticks.push({ frame: f, type: "minor" });
    } else if (pxPerFrame >= 0.5) {
      // 只在缩放足够大时显示小刻度
      ticks.push({ frame: f, type: "sub" });
    }
  }

  return ticks;
});

// ============ 工具函数 ============

const frameToPx = (frame: number) => (frame / props.fps) * zoom.value;
const pxToFrame = (px: number) => Math.round((px / zoom.value) * props.fps);
const timeToPx = (t: number) => t * zoom.value;

const formatFrame = (frame: number): string => {
  const seconds = Math.floor(frame / props.fps);
  const remainingFrames = frame % props.fps;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}:${remainingFrames.toString().padStart(2, "0")}`;
};

const getTrackIndex = (trackId: string) => visibleTracks.value.findIndex((t) => t.id === trackId);

const isTrackLocked = (trackId: string) => {
  const track = tracks.value.find((t) => t.id === trackId);
  return track?.locked ?? false;
};

// ============ 同步 segments 到 timelineItems ============

const syncSegmentsToItems = () => {
  timelineItems.value = props.segments.map((segment, index) => {
    const startFrame = segment.startFrame ?? segment.start ?? 0;
    const endFrame = segment.endFrame ?? segment.end ?? startFrame + 30;
    const existing = timelineItems.value.find((it) => it.stepIndex === index);
    const stepType = segment.step?.type || "wait";

    return {
      id: segment.id || `step-${index}`,
      trackId: segment.trackId || existing?.trackId || "main-track",
      startFrame,
      durationFrames: endFrame - startFrame,
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

// ============ 碰撞检测与防重叠 ============

const getTrackItems = (trackId: string, ignoreId?: string) => {
  return timelineItems.value
    .filter((it) => it.trackId === trackId && it.id !== ignoreId)
    .sort((a, b) => a.startFrame - b.startFrame);
};

const checkOverlap = (
  trackId: string,
  startFrame: number,
  endFrame: number,
  ignoreId?: string,
): { hasOverlap: boolean; overlappingItem: TimelineItem | null } => {
  const trackItems = getTrackItems(trackId, ignoreId);

  for (const item of trackItems) {
    const itemStart = item.startFrame;
    const itemEnd = item.startFrame + item.durationFrames;

    if (startFrame < itemEnd && endFrame > itemStart) {
      return { hasOverlap: true, overlappingItem: item };
    }
  }

  return { hasOverlap: false, overlappingItem: null };
};

const findValidPosition = (
  trackId: string,
  targetStartFrame: number,
  durationFrames: number,
  ignoreId?: string,
  preferPosition?: "before" | "after",
  referenceItem?: TimelineItem,
): number => {
  const trackItems = getTrackItems(trackId, ignoreId);
  const targetEndFrame = targetStartFrame + durationFrames;

  if (trackItems.length === 0) {
    return Math.max(0, targetStartFrame);
  }

  // 如果有参考项和偏好位置，尝试按偏好放置
  if (referenceItem && preferPosition) {
    if (preferPosition === "before") {
      // 插入到参考项前面：拖拽标签的结尾对齐目标标签的开始位置
      const beforeStart = referenceItem.startFrame - durationFrames;
      // 检查前面是否有足够空间（不能小于0，也不能与前面的标签重叠）
      if (beforeStart >= 0) {
        const { hasOverlap } = checkOverlap(trackId, beforeStart, referenceItem.startFrame, ignoreId);
        if (!hasOverlap) {
          return beforeStart;
        }
      }
      // 前面空间不足，放到目标标签后面
      return referenceItem.startFrame + referenceItem.durationFrames;
    } else {
      // 插入到参考项后面：拖拽标签的开始对齐目标标签的结束位置
      return referenceItem.startFrame + referenceItem.durationFrames;
    }
  }

  // 没有指定插入位置时，检查是否有重叠
  const { hasOverlap } = checkOverlap(trackId, targetStartFrame, targetEndFrame, ignoreId);
  if (!hasOverlap) {
    return Math.max(0, targetStartFrame);
  }

  // 找到最近的可用位置
  for (const item of trackItems) {
    const itemEnd = item.startFrame + item.durationFrames;

    const afterStart = itemEnd;
    const { hasOverlap: afterOverlap } = checkOverlap(trackId, afterStart, afterStart + durationFrames, ignoreId);
    if (!afterOverlap) {
      return afterStart;
    }
  }

  const lastItem = trackItems[trackItems.length - 1];
  if (lastItem) {
    return lastItem.startFrame + lastItem.durationFrames;
  }

  return Math.max(0, targetStartFrame);
};

// ============ 吸附逻辑 ============

const calculateSnap = (targetFrame: number, ignoreItemId: string | null = null) => {
  const points = new Set<number>([0, props.currentFrame]);

  timelineItems.value.forEach((it) => {
    if (it.id === ignoreItemId) return;
    points.add(it.startFrame);
    points.add(it.startFrame + it.durationFrames);
  });

  const targetPx = frameToPx(targetFrame);
  let bestSnapFrame: number | null = null;
  let minDiff = SNAP_THRESHOLD_PX;

  for (const pFrame of points) {
    const pPx = frameToPx(pFrame);
    const diff = Math.abs(pPx - targetPx);
    if (diff < minDiff) {
      minDiff = diff;
      bestSnapFrame = pFrame;
    }
  }

  if (bestSnapFrame !== null) {
    return { snapped: true, frame: bestSnapFrame, px: frameToPx(bestSnapFrame) };
  }
  return { snapped: false, frame: targetFrame, px: null };
};

// ============ 拖拽处理 ============

// 使用标志位防止事件冲突
let isResizing = false;

// 调节柄专用处理函数
const handleResizeLeftMouseDown = (e: MouseEvent, item: TimelineItem) => {
  e.stopPropagation();
  e.preventDefault();
  isResizing = true;
  startDrag(e, item, "resize-left");
};

const handleResizeRightMouseDown = (e: MouseEvent, item: TimelineItem) => {
  e.stopPropagation();
  e.preventDefault();
  isResizing = true;
  startDrag(e, item, "resize-right");
};

// 标签主体的 mousedown 处理
const handleItemMouseDown = (e: MouseEvent, item: TimelineItem) => {
  // 如果是调节柄触发的，跳过
  if (isResizing) {
    isResizing = false;
    return;
  }
  startDrag(e, item, "move");
};

const startDrag = (e: MouseEvent, item: TimelineItem, type: "move" | "resize-left" | "resize-right") => {
  if (!rightScrollContainer.value || isTrackLocked(item.trackId)) return;

  const containerRect = rightScrollContainer.value.getBoundingClientRect();
  const itemLeftPx = frameToPx(item.startFrame) - rightScrollContainer.value.scrollLeft;

  dragging.value = {
    type,
    itemId: item.id,
    clickOffsetPx: e.clientX - containerRect.left - itemLeftPx,
    startX: e.clientX,
    originalStartFrame: item.startFrame,
    originalDurationFrames: item.durationFrames,
    originalTrackId: item.trackId,
  };

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
};

const onMouseMove = (e: MouseEvent) => {
  if (!dragging.value || !rightScrollContainer.value) return;

  const { type, itemId, clickOffsetPx, startX, originalStartFrame, originalDurationFrames } = dragging.value;
  const rect = rightScrollContainer.value.getBoundingClientRect();
  const item = timelineItems.value.find((i) => i.id === itemId);
  if (!item) return;

  if (type === "move") {
    // 计算新的轨道
    const relativeY = e.clientY - rect.top + rightScrollContainer.value.scrollTop - 32;
    const trackIndex = Math.floor(relativeY / TRACK_HEIGHT);
    const newTrack = visibleTracks.value[Math.max(0, Math.min(visibleTracks.value.length - 1, trackIndex))];
    if (!newTrack) {
      snapLine.value = null;
      insertLine.value = null;
      return;
    }

    // 计算新位置
    const currentMouseAbsX = e.clientX - rect.left + rightScrollContainer.value.scrollLeft;
    const rawNewStartPx = currentMouseAbsX - clickOffsetPx;
    let newStartFrame = Math.max(0, pxToFrame(rawNewStartPx));
    const newEndFrame = newStartFrame + originalDurationFrames;

    // 吸附处理
    const snapLeft = calculateSnap(newStartFrame, itemId);
    const snapRight = calculateSnap(newEndFrame, itemId);

    if (snapLeft.snapped) {
      newStartFrame = snapLeft.frame;
      snapLine.value = snapLeft.px;
    } else if (snapRight.snapped) {
      newStartFrame = snapRight.frame - originalDurationFrames;
      snapLine.value = snapRight.px;
    } else {
      snapLine.value = null;
    }

    // 碰撞检测
    const { hasOverlap, overlappingItem } = checkOverlap(
      newTrack.id,
      newStartFrame,
      newStartFrame + originalDurationFrames,
      itemId,
    );

    if (hasOverlap && overlappingItem) {
      // 根据鼠标位置决定插入方向
      const mouseFrame = pxToFrame(currentMouseAbsX);
      const itemCenter = overlappingItem.startFrame + overlappingItem.durationFrames / 2;
      const position = mouseFrame < itemCenter ? "before" : "after";

      // 显示插入指示线
      insertLine.value = {
        frame:
          position === "before"
            ? overlappingItem.startFrame
            : overlappingItem.startFrame + overlappingItem.durationFrames,
        trackId: newTrack.id,
        position,
      };

      // 关键修复：根据插入位置放置标签
      const validStartFrame = findValidPosition(
        newTrack.id,
        newStartFrame,
        originalDurationFrames,
        itemId,
        position,
        overlappingItem,
      );

      item.startFrame = validStartFrame;
      item.trackId = newTrack.id;
    } else {
      insertLine.value = null;
      item.startFrame = Math.max(0, newStartFrame);
      item.trackId = newTrack.id;
    }
  } else if (type === "resize-right") {
    const deltaX = e.clientX - startX;
    const deltaFrames = pxToFrame(deltaX);
    let newDurationFrames = Math.max(1, originalDurationFrames + deltaFrames);

    // 吸附处理
    const newEndFrame = originalStartFrame + newDurationFrames;
    const snap = calculateSnap(newEndFrame, itemId);
    if (snap.snapped) {
      newDurationFrames = snap.frame - originalStartFrame;
      snapLine.value = snap.px;
    } else {
      snapLine.value = null;
    }

    // 防止与右侧片段重叠
    const siblings = getTrackItems(item.trackId, item.id);
    const nextItem = siblings.find((s) => s.startFrame >= originalStartFrame + originalDurationFrames);
    if (nextItem) {
      const maxEndFrame = nextItem.startFrame;
      if (originalStartFrame + newDurationFrames > maxEndFrame) {
        newDurationFrames = maxEndFrame - originalStartFrame;
      }
    }

    item.durationFrames = Math.max(1, newDurationFrames);
  } else if (type === "resize-left") {
    const deltaX = e.clientX - startX;
    const deltaFrames = pxToFrame(deltaX);
    let newStartFrame = Math.max(0, originalStartFrame + deltaFrames);
    const originalEndFrame = originalStartFrame + originalDurationFrames;
    let newDurationFrames = originalEndFrame - newStartFrame;

    if (newDurationFrames >= 1) {
      // 吸附处理
      const snap = calculateSnap(newStartFrame, itemId);
      if (snap.snapped) {
        newStartFrame = snap.frame;
        newDurationFrames = originalEndFrame - newStartFrame;
        snapLine.value = snap.px;
      } else {
        snapLine.value = null;
      }

      // 防止与左侧片段重叠
      const siblings = getTrackItems(item.trackId, item.id);
      const prevItem = [...siblings].reverse().find((s) => s.startFrame + s.durationFrames <= originalStartFrame);
      if (prevItem) {
        const minStartFrame = prevItem.startFrame + prevItem.durationFrames;
        if (newStartFrame < minStartFrame) {
          newStartFrame = minStartFrame;
          newDurationFrames = originalEndFrame - newStartFrame;
        }
      }

      item.startFrame = Math.max(0, newStartFrame);
      item.durationFrames = Math.max(1, newDurationFrames);
    }
  }
};

const onMouseUp = () => {
  if (dragging.value) {
    const item = timelineItems.value.find((i) => i.id === dragging.value!.itemId);
    if (item) {
      const maxFrames = props.totalFrames > 0 ? props.totalFrames + 60 : 6000;
      const newStartFrame = Math.max(0, Math.min(item.startFrame, maxFrames));
      const newEndFrame = Math.max(newStartFrame + 1, Math.min(newStartFrame + item.durationFrames, maxFrames));

      // 传递 trackId，支持跨轨道拖拽
      emit("update-segment", item.stepIndex, newStartFrame, newEndFrame, item.trackId);
    }
  }

  dragging.value = null;
  snapLine.value = null;
  insertLine.value = null;
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
    let newFrame = Math.max(0, pxToFrame(offsetX));
    const snap = calculateSnap(newFrame);
    if (snap.snapped) newFrame = snap.frame;
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
  const newFrame = Math.max(0, pxToFrame(offsetX));
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
    const mouseFrame = pxToFrame(absoluteX);

    const segment = props.segments[data.stepIndex];
    const startFrame = segment?.startFrame ?? segment?.start ?? 0;
    const endFrame = segment?.endFrame ?? segment?.end ?? startFrame + 30;
    const defaultDurationFrames = segment != null ? endFrame - startFrame : 30;
    const halfDuration = Math.floor(defaultDurationFrames / 2);
    let targetStartFrame = Math.max(0, mouseFrame - halfDuration);

    const snap = calculateSnap(targetStartFrame);
    if (snap.snapped) targetStartFrame = snap.frame;

    targetStartFrame = findValidPosition(trackId, targetStartFrame, defaultDurationFrames);

    const targetTime = targetStartFrame / props.fps;
    emit("drop-step", data.stepIndex, targetTime, trackId);
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

    const mouseFrame = pxToFrame(relativeX);
    const defaultFrames = STEP_FRAME_DEFAULT[state.type] ?? 30;
    const halfDuration = Math.floor(defaultFrames / 2);
    let startFrame = Math.max(0, mouseFrame - halfDuration);

    const snap = calculateSnap(startFrame);
    if (snap.snapped) startFrame = snap.frame;

    startFrame = findValidPosition(targetTrack.id, startFrame, defaultFrames);

    ghostItem.value = {
      stepType: state.type,
      startFrame,
      durationFrames: defaultFrames,
      trackId: targetTrack.id,
    };
    state.overTimeline = true;
    state.targetTime = startFrame / props.fps;
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
            class="flex items-center justify-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600 hover:bg-indigo-100"
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
            class="group relative flex items-center justify-between border-b border-slate-100 px-3 hover:bg-slate-50"
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
            <div class="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100">
              <button
                class="rounded p-1 hover:bg-slate-200"
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
                class="rounded p-1 text-slate-400 hover:bg-slate-200"
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
                class="rounded p-1 text-rose-400 hover:bg-rose-50 hover:text-rose-500"
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
        <!-- 标尺（帧级别刻度） -->
        <div
          class="sticky top-0 z-30 h-8 min-w-full border-b border-slate-200 bg-white/95 backdrop-blur"
          :style="{ width: totalWidth + 'px' }"
        >
          <div class="relative h-full">
            <!-- 刻度线 -->
            <template v-for="tick in rulerTicks" :key="tick.frame">
              <!-- 大刻度（每5秒） -->
              <div
                v-if="tick.type === 'major'"
                class="absolute top-0 h-full"
                :style="{ left: frameToPx(tick.frame) + 'px' }"
              >
                <div class="h-full w-px bg-slate-400" />
                <div class="absolute top-0.5 left-1 font-mono text-[10px] whitespace-nowrap text-slate-600 select-none">
                  {{ formatFrame(tick.frame) }}
                </div>
              </div>
              <!-- 中刻度（每1秒） -->
              <div
                v-else-if="tick.type === 'minor'"
                class="absolute top-3 h-5"
                :style="{ left: frameToPx(tick.frame) + 'px' }"
              >
                <div class="h-full w-px bg-slate-300" />
              </div>
              <!-- 小刻度（帧级别） -->
              <div v-else class="absolute top-5 h-3" :style="{ left: frameToPx(tick.frame) + 'px' }">
                <div class="h-full w-px bg-slate-200" />
              </div>
            </template>
          </div>

          <!-- 播放头帽子 -->
          <div class="absolute top-0 bottom-0 z-40 w-0" :style="{ left: timeToPx(currentTime) + 'px' }">
            <div
              class="absolute top-0 h-0 w-0 -translate-x-1/2 cursor-ew-resize border-t-8 border-r-[6px] border-l-[6px] border-t-indigo-500 border-r-transparent border-l-transparent hover:scale-110"
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
            class="relative box-border w-full border-b border-slate-100"
            :class="{ 'border-indigo-300 bg-indigo-50': dragOverTrackId === track.id }"
            :style="{ height: TRACK_HEIGHT + 'px' }"
            @dragover.prevent="handleDragOver($event, track.id)"
            @dragleave="handleDragLeave"
            @drop="handleDrop($event, track.id)"
          />

          <!-- 步骤块 -->
          <div class="pointer-events-none absolute inset-0">
            <div
              v-for="item in timelineItems"
              :key="item.id"
              v-show="!tracks.find((t) => t.id === item.trackId)?.hidden"
              class="group pointer-events-auto absolute rounded-lg border-2 border-white/30 shadow-sm"
              :class="[
                item.colorClass,
                dragging && dragging.itemId === item.id
                  ? 'z-50 border-indigo-400 opacity-90 shadow-xl'
                  : 'z-10 hover:shadow-md hover:brightness-105',
                selectedStepIndex === item.stepIndex ? 'border-indigo-500 shadow-indigo-200' : '',
                isTrackLocked(item.trackId) ? 'cursor-not-allowed opacity-60' : 'cursor-grab',
              ]"
              :style="{
                left: frameToPx(item.startFrame) + 'px',
                top: getTrackIndex(item.trackId) * TRACK_HEIGHT + 2 + 'px',
                width: Math.max(4, frameToPx(item.durationFrames)) + 'px',
                height: TRACK_HEIGHT - 4 + 'px',
              }"
              @mousedown.stop="handleItemMouseDown($event, item)"
              @click.stop="handleItemClick(item)"
            >
              <!-- 内容（留出调节柄空间） -->
              <div class="pointer-events-none flex h-full w-full flex-col justify-center overflow-hidden px-4">
                <div class="truncate text-[11px] leading-tight font-bold text-white drop-shadow-sm select-none">
                  {{ item.name }}
                </div>
                <div class="truncate font-mono text-[9px] text-white/80">{{ item.durationFrames }}f</div>
              </div>

              <!-- 左侧调节柄（使用 capture 确保优先处理） -->
              <div
                class="absolute inset-y-0 left-0 z-50 w-4 cursor-w-resize hover:bg-white/30"
                @mousedown.capture.stop.prevent="handleResizeLeftMouseDown($event, item)"
              >
                <div class="absolute inset-y-0 left-1 flex items-center">
                  <div class="h-4 w-0.5 rounded-full bg-white/70 opacity-0 group-hover:opacity-100" />
                </div>
              </div>
              <!-- 右侧调节柄（使用 capture 确保优先处理） -->
              <div
                class="absolute inset-y-0 right-0 z-50 w-4 cursor-e-resize hover:bg-white/30"
                @mousedown.capture.stop.prevent="handleResizeRightMouseDown($event, item)"
              >
                <div class="absolute inset-y-0 right-1 flex items-center">
                  <div class="h-4 w-0.5 rounded-full bg-white/70 opacity-0 group-hover:opacity-100" />
                </div>
              </div>

              <!-- 删除按钮 -->
              <button
                class="absolute top-1 right-1 hidden rounded bg-white/20 p-0.5 text-white backdrop-blur-sm group-hover:block hover:bg-rose-500"
                title="删除"
                @click.stop="deleteItem(item)"
              >
                <svg class="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <!-- 选中指示小圆点（hover 时隐藏，让位给删除按钮） -->
              <div
                v-if="selectedStepIndex === item.stepIndex"
                class="absolute top-1 right-1 size-2 rounded-full bg-white shadow group-hover:hidden"
              />
            </div>

            <!-- 从库拖拽时的临时标签 -->
            <div
              v-if="ghostItem && !tracks.find((t) => t.id === ghostItem?.trackId)?.hidden"
              class="pointer-events-none absolute z-40 overflow-hidden rounded-lg border border-white/50 opacity-70 shadow-md"
              :class="ghostItem ? stepTypeColors[ghostItem.stepType] || 'bg-gray-500' : 'bg-gray-500'"
              :style="{
                left: ghostItem ? frameToPx(ghostItem.startFrame) + 'px' : '0',
                top: ghostItem ? getTrackIndex(ghostItem.trackId) * TRACK_HEIGHT + 2 + 'px' : '0',
                width: ghostItem ? Math.max(4, frameToPx(ghostItem.durationFrames)) + 'px' : '0',
                height: TRACK_HEIGHT - 4 + 'px',
              }"
            >
              <div class="flex h-full w-full flex-col justify-center overflow-hidden px-2">
                <div class="truncate text-[11px] leading-tight font-bold text-white drop-shadow-sm select-none">
                  {{ ghostItem ? stepTypeNames[ghostItem.stepType] || ghostItem.stepType : "" }}
                </div>
                <div class="truncate font-mono text-[9px] text-white/80">
                  {{ ghostItem ? ghostItem.durationFrames + "f" : "" }}
                </div>
              </div>
            </div>
          </div>

          <!-- 插入指示线 -->
          <div
            v-if="insertLine !== null"
            class="pointer-events-none absolute top-0 bottom-0 z-65"
            :style="{ left: frameToPx(insertLine.frame) + 'px' }"
          >
            <div class="absolute top-0 bottom-0 w-0.5 bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
            <div class="absolute top-0 flex -translate-x-1/2 flex-col items-center">
              <div
                class="h-0 w-0 border-r-[6px] border-b-8 border-l-[6px] border-r-transparent border-b-blue-400 border-l-transparent"
              />
              <div
                class="mt-1 rounded bg-blue-400 px-1.5 py-0.5 font-mono text-[10px] font-bold whitespace-nowrap text-blue-950"
              >
                {{ insertLine.position === "before" ? "插入前" : "插入后" }}
              </div>
            </div>
          </div>

          <!-- 吸附线 -->
          <div
            v-if="snapLine !== null && insertLine === null"
            class="pointer-events-none absolute top-0 bottom-0 z-60 w-px bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"
            :style="{ left: snapLine + 'px' }"
          >
            <div
              class="sticky top-10 ml-1 inline-block rounded bg-amber-400 px-1 font-mono text-[10px] font-bold text-amber-900"
            >
              {{ pxToFrame(snapLine) }}f
            </div>
          </div>

          <!-- 播放头线 -->
          <div
            class="pointer-events-none absolute top-0 bottom-0 z-40 w-px bg-indigo-500 shadow-lg shadow-indigo-500/50"
            :style="{ left: timeToPx(currentTime) + 'px' }"
          />
        </div>
      </div>
    </div>
  </div>
</template>
