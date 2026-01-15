<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import type { SkillStep } from "@/core/designer/types";
import { libraryDraggingRef } from "@/composables/useLibraryDragToTimeline";

interface TimelineSegment {
  start: number; // 帧数
  end: number; // 帧数
  step: SkillStep;
  index: number;
}

interface TimelineItem {
  id: string;
  trackId: string;
  start: number; // 秒
  duration: number; // 秒
  name: string;
  colorClass: string;
  stepIndex: number;
}

interface TimelineTrack {
  id: string;
  name: string;
  type: "step";
  locked?: boolean;
  hidden?: boolean;
}

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

// 配置
const TRACK_HEIGHT = 40;
const MIN_ZOOM = 5;
const MAX_ZOOM = 200;
const SNAP_THRESHOLD = 12;

// 状态
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

// 插入指示线（类似 AE 的插入位置指示）
const insertLine = ref<{
  time: number;
  trackId: string;
  position: "before" | "after"; // 插入到目标片段的前面还是后面
} | null>(null);

// 从左侧库拖拽到时间轴时的临时标签
const ghostItem = ref<{
  stepType: string;
  start: number;
  duration: number;
  trackId: string;
} | null>(null);

// DOM 引用
const leftScrollContainer = ref<HTMLDivElement | null>(null);
const rightScrollContainer = ref<HTMLDivElement | null>(null);

// 步骤类型颜色映射（使用 emerald 色系保持主题一致）
const stepTypeColors: Record<string, string> = {
  move: "bg-emerald-600",
  damage: "bg-red-500",
  effect: "bg-violet-600",
  wait: "bg-amber-600",
};

// 步骤类型名称映射
const stepTypeNames: Record<string, string> = {
  move: "移动",
  damage: "伤害",
  effect: "特效",
  wait: "等待",
};

// 计算属性
const totalDuration = computed(() => {
  if (props.totalFrames <= 0 || props.fps <= 0) return 30;
  return props.totalFrames / props.fps;
});

// 限制单个片段的最大时长，避免无穷变大导致卡死
const MAX_ITEM_DURATION = computed(() => {
  // 允许单个片段最长为总时长 + 10 秒缓冲
  return Math.max(5, totalDuration.value + 10);
});

const currentTime = computed(() => {
  if (props.fps <= 0) return 0;
  return props.currentFrame / props.fps;
});

const totalWidth = computed(() => {
  const contentW = (totalDuration.value + 20) * zoom.value;
  return Math.max(contentW, window.innerWidth - 256);
});

// 与 SkillTab.vue 中 STEP_FRAME_DEFAULT 保持一致，用于计算预览标签的默认时长
const STEP_FRAME_DEFAULT: Record<string, number> = {
  move: 50,
  damage: 30,
  effect: 40,
  wait: 30,
};

// 将 segments 转换为 timeline items - 使用 ref 以便直接修改
const timelineItems = ref<TimelineItem[]>([]);

// 同步 segments 到 timelineItems
const syncSegmentsToItems = () => {
  timelineItems.value = props.segments.map((segment, index) => {
    const startTime = segment.start / props.fps;
    const duration = (segment.end - segment.start) / props.fps;

    // 如果之前已经存在同一个 stepIndex 的 item，则尽量复用其轨道信息，
    // 避免每次 recompute 时把所有块都重置到主轨道。
    const existing = timelineItems.value.find((it) => it.stepIndex === index);

    return {
      id: `step-${index}`,
      trackId: existing?.trackId ?? "main-track",
      start: startTime,
      duration: duration,
      name: `${stepTypeNames[segment.step.type] || segment.step.type}`,
      colorClass: stepTypeColors[segment.step.type] || "bg-gray-600",
      stepIndex: index,
    };
  });
};

// 初始化并监听 segments 变化
syncSegmentsToItems();
watch(() => props.segments, syncSegmentsToItems, { deep: true });

// 轨道管理
const tracks = ref<TimelineTrack[]>([
  {
    id: "main-track",
    name: "技能步骤",
    type: "step",
    locked: false,
    hidden: false,
  },
]);

let trackCounter = 1;

// 添加轨道
const addTrack = () => {
  const newTrack: TimelineTrack = {
    id: `track-${Date.now()}`,
    name: `轨道 ${trackCounter++}`,
    type: "step",
    locked: false,
    hidden: false,
  };
  tracks.value.push(newTrack);
};

// 删除轨道
const deleteTrack = (trackId: string) => {
  // 不允许删除最后一个轨道
  if (tracks.value.length <= 1) return;

  // 如果删除的轨道有步骤，需要先处理（这里简单处理，实际可能需要迁移步骤）
  const trackItems = timelineItems.value.filter(
    (item) => item.trackId === trackId
  );
  if (trackItems.length > 0) {
    // 可以提示用户或自动迁移到其他轨道
    console.warn(
      `轨道 ${trackId} 包含 ${trackItems.length} 个步骤，删除前请先处理`
    );
  }

  tracks.value = tracks.value.filter((t) => t.id !== trackId);
};

// 切换锁定状态
const toggleLockTrack = (trackId: string) => {
  const track = tracks.value.find((t) => t.id === trackId);
  if (track) {
    track.locked = !track.locked;
  }
};

// 切换隐藏状态
const toggleHideTrack = (trackId: string) => {
  const track = tracks.value.find((t) => t.id === trackId);
  if (track) {
    track.hidden = !track.hidden;
  }
};

// 获取可见轨道
const visibleTracks = computed(() => tracks.value.filter((t) => !t.hidden));

// 工具函数
const timeToPx = (t: number) => t * zoom.value;
const pxToTime = (p: number) => p / zoom.value;

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const getTrackIndex = (trackId: string) =>
  visibleTracks.value.findIndex((t) => t.id === trackId);

// 检查轨道是否锁定
const isTrackLocked = (trackId: string) => {
  const track = tracks.value.find((t) => t.id === trackId);
  return track?.locked ?? false;
};

// 滚动同步
const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement;
  if (leftScrollContainer.value && target === rightScrollContainer.value) {
    leftScrollContainer.value.scrollTop = target.scrollTop;
  }
};

// Ctrl + 滚轮缩放
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

// 吸附逻辑
const calculateSnap = (
  targetTime: number,
  ignoreItemId: string | null = null
) => {
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

// 统一处理步骤块按下，根据点击位置自动区分移动或左右缩放
const HANDLE_HIT_WIDTH_PX = 6; // 距离左右边缘多少像素内算缩放

const handleItemMouseDown = (e: MouseEvent, item: TimelineItem) => {
  if (!rightScrollContainer.value) return;

  // 已锁定轨道不允许操作
  if (isTrackLocked(item.trackId)) {
    return;
  }

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

  handleMouseDown(e, item, type);
};

// 拖拽处理 - 严格按照参考代码实现
const handleMouseDown = (
  e: MouseEvent,
  item: TimelineItem,
  type: "move" | "resize-left" | "resize-right"
) => {
  if (!rightScrollContainer.value) return;

  // 检查轨道是否锁定
  if (isTrackLocked(item.trackId)) {
    return;
  }

  // 记录初始状态 - 严格按照参考代码的公式
  dragging.value = {
    type,
    itemId: item.id,
    // 记录鼠标点击位置相对于 Item 左边缘的偏移量 (px)
    // 修复拖拽偏移的关键：记录鼠标相对于 item 左边缘的距离
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

  // 监听全局鼠标 - 使用 document 与参考代码一致
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
};

// 获取同一轨道上的其它片段（可选排除某个 item）
const getTrackItems = (trackId: string, ignoreId?: string) => {
  return timelineItems.value
    .filter((it) => it.trackId === trackId && it.id !== ignoreId)
    .sort((a, b) => a.start - b.start);
};

// 检测鼠标下方的片段，返回插入位置信息
const detectInsertPosition = (
  mouseTime: number,
  mouseTrackId: string,
  draggingItemId: string
): { targetItem: TimelineItem | null; position: "before" | "after" | null } => {
  // 获取同一轨道上的其他片段（排除正在拖拽的）
  const trackItems = getTrackItems(mouseTrackId, draggingItemId);

  if (trackItems.length === 0) {
    // 轨道为空，可以自由放置
    return { targetItem: null, position: null };
  }

  // 找到鼠标位置所在的片段
  for (const item of trackItems) {
    const itemStart = item.start;
    const itemEnd = item.start + item.duration;

    // 如果鼠标在这个片段的时间范围内
    if (mouseTime >= itemStart && mouseTime <= itemEnd) {
      // 判断是插入到前面还是后面（根据鼠标在片段中的位置）
      const itemCenter = itemStart + item.duration / 2;
      const position = mouseTime < itemCenter ? "before" : "after";
      return { targetItem: item, position };
    }
  }

  // 如果没有找到重叠的片段，检查是否可以插入到两个片段之间
  for (let i = 0; i < trackItems.length; i++) {
    const item = trackItems[i];
    if (!item) continue;
    const itemEnd = item.start + item.duration;

    // 检查是否在这个片段之后、下一个片段之前
    if (mouseTime >= itemEnd) {
      const nextItem = trackItems[i + 1];
      if (!nextItem || mouseTime <= nextItem.start) {
        // 可以插入到这两个片段之间，插入到当前片段后面
        return { targetItem: item, position: "after" };
      }
    }
  }

  // 检查是否可以插入到第一个片段之前
  const firstItem = trackItems[0];
  if (firstItem && mouseTime < firstItem.start) {
    return { targetItem: firstItem, position: "before" };
  }

  // 检查是否可以插入到最后一个片段之后
  const lastItem = trackItems[trackItems.length - 1];
  if (lastItem && mouseTime >= lastItem.start + lastItem.duration) {
    return { targetItem: lastItem, position: "after" };
  }

  return { targetItem: null, position: null };
};

const onMouseMove = (e: MouseEvent) => {
  if (!dragging.value || !rightScrollContainer.value) return;

  const {
    type,
    itemId,
    clickOffsetInItem,
    startX,
    originalStart,
    originalDuration,
  } = dragging.value;
  const rect = rightScrollContainer.value.getBoundingClientRect();

  if (type === "move") {
    // 1. 计算新的轨道 (Y轴)
    const relativeY =
      e.clientY - rect.top + rightScrollContainer.value.scrollTop - 32; // 32 is Ruler height
    const trackIndex = Math.floor(relativeY / TRACK_HEIGHT);
    const newTrack =
      visibleTracks.value[
        Math.max(0, Math.min(visibleTracks.value.length - 1, trackIndex))
      ];

    if (!newTrack) {
      insertLine.value = null;
      snapLine.value = null;
      return;
    }

    // 2. 计算鼠标位置对应的时间
    const currentMouseAbsX =
      e.clientX - rect.left + rightScrollContainer.value.scrollLeft;
    const mouseTime = Math.max(0, pxToTime(currentMouseAbsX));

    const draggingItem = timelineItems.value.find((i) => i.id === itemId);
    if (!draggingItem) return;

    // 3. 先计算拖拽项的新位置（基于鼠标位置）
    const rawNewStartPx = currentMouseAbsX - clickOffsetInItem;
    let newStart = Math.max(0, pxToTime(rawNewStartPx));
    const newEnd = newStart + originalDuration;

    // 4. 检查是否与同一轨道上的其他片段重叠
    const trackItems = getTrackItems(newTrack.id, itemId);
    let hasOverlap = false;
    let overlappingItem: TimelineItem | null = null;

    for (const item of trackItems) {
      const itemStart = item.start;
      const itemEnd = item.start + item.duration;

      // 检查重叠
      if (
        (newStart >= itemStart && newStart < itemEnd) ||
        (newEnd > itemStart && newEnd <= itemEnd) ||
        (newStart <= itemStart && newEnd >= itemEnd)
      ) {
        hasOverlap = true;
        overlappingItem = item;
        break;
      }
    }

    // 5. 如果重叠，检查是否可以放在空白区域（前面或后面）
    if (hasOverlap && trackItems.length > 0) {
      // 检查是否可以放在第一个片段之前
      const firstItem = trackItems[0];
      if (firstItem && newEnd <= firstItem.start) {
        // 前面有足够空间，允许自由放置
        hasOverlap = false;
      } else {
        // 检查是否可以放在两个片段之间的空白区域
        for (let i = 0; i < trackItems.length; i++) {
          const item = trackItems[i];
          if (!item) continue;
          const itemEnd = item.start + item.duration;
          const nextItem = trackItems[i + 1];

          // 检查是否可以放在这个片段之后、下一个片段之前
          if (newStart >= itemEnd && (!nextItem || newEnd <= nextItem.start)) {
            // 有足够空间，允许自由放置
            hasOverlap = false;
            break;
          }
        }

        // 如果还没找到空白区域，检查是否可以放在最后一个片段之后
        if (hasOverlap) {
          const lastItem = trackItems[trackItems.length - 1];
          if (lastItem && newStart >= lastItem.start + lastItem.duration) {
            // 后面有足够空间，允许自由放置
            hasOverlap = false;
          }
        }
      }
    }

    // 6. 只有在真正重叠且无法放在空白区域的情况下，才检测插入位置
    if (hasOverlap && overlappingItem) {
      // 检查鼠标是否在重叠标签的左侧
      const itemStart = overlappingItem.start;
      const itemEnd = overlappingItem.start + overlappingItem.duration;
      const mouseInLeftHalf = mouseTime < (itemStart + itemEnd) / 2;

      // 如果鼠标在标签左侧，尝试放在标签前面
      if (mouseInLeftHalf) {
        // 尝试将拖拽项放在目标标签前面
        const tryStart = itemStart - originalDuration;
        const tryEnd = itemStart;

        // 检查放在前面后是否与其他标签重叠
        let canPlaceBefore = tryStart >= 0; // 不能小于0
        if (canPlaceBefore) {
          for (const item of trackItems) {
            if (item.id === overlappingItem.id) continue; // 跳过目标标签本身
            const otherStart = item.start;
            const otherEnd = item.start + item.duration;

            // 检查是否与这个标签重叠
            if (
              (tryStart >= otherStart && tryStart < otherEnd) ||
              (tryEnd > otherStart && tryEnd <= otherEnd) ||
              (tryStart <= otherStart && tryEnd >= otherEnd)
            ) {
              canPlaceBefore = false;
              break;
            }
          }
        }

        if (canPlaceBefore) {
          // 可以放在前面，允许自由放置，不显示插入指示
          const snap = calculateSnap(tryStart, itemId);
          const finalStart = snap.snapped ? snap.time : tryStart;

          draggingItem.start = finalStart;
          draggingItem.trackId = newTrack.id;
          insertLine.value = null; // 清除插入线
          snapLine.value = snap.snapped ? snap.px : null;
          return; // 直接返回，不继续插入逻辑
        }
      } else {
        // 鼠标在标签右侧，尝试放在标签后面
        const tryStart = itemEnd;
        const tryEnd = itemEnd + originalDuration;

        // 检查放在后面后是否与其他标签重叠
        let canPlaceAfter = true;
        for (const item of trackItems) {
          if (item.id === overlappingItem.id) continue; // 跳过目标标签本身
          const otherStart = item.start;
          const otherEnd = item.start + item.duration;

          // 检查是否与这个标签重叠
          if (
            (tryStart >= otherStart && tryStart < otherEnd) ||
            (tryEnd > otherStart && tryEnd <= otherEnd) ||
            (tryStart <= otherStart && tryEnd >= otherEnd)
          ) {
            canPlaceAfter = false;
            break;
          }
        }

        if (canPlaceAfter) {
          // 可以放在后面，允许自由放置，不显示插入指示
          const snap = calculateSnap(tryStart, itemId);
          const finalStart = snap.snapped ? snap.time : tryStart;

          draggingItem.start = finalStart;
          draggingItem.trackId = newTrack.id;
          insertLine.value = null; // 清除插入线
          snapLine.value = snap.snapped ? snap.px : null;
          return; // 直接返回，不继续插入逻辑
        }
      }

      // 检测插入位置（基于鼠标位置，而不是拖拽项的新位置）
      const { targetItem, position } = detectInsertPosition(
        mouseTime,
        newTrack.id,
        itemId
      );

      if (targetItem && position) {
        // 有明确的插入位置
        let insertTime: number;
        if (position === "before") {
          insertTime = targetItem.start;
        } else {
          insertTime = targetItem.start + targetItem.duration;
        }

        // 吸附处理
        const snap = calculateSnap(insertTime, itemId);
        const finalInsertTime = snap.snapped ? snap.time : insertTime;

        // 显示插入线
        insertLine.value = {
          time: finalInsertTime,
          trackId: newTrack.id,
          position,
        };
        snapLine.value = snap.snapped ? snap.px : null;

        // 临时更新拖拽项的位置（仅用于视觉反馈）
        draggingItem.start = finalInsertTime;
        draggingItem.trackId = newTrack.id;
      } else {
        // 没有找到插入位置，清除插入线，但仍不允许重叠
        insertLine.value = null;
        snapLine.value = null;
        // 保持当前位置不变，或者找到最近的插入位置
        const { targetItem: nearestItem, position: nearestPos } =
          detectInsertPosition(mouseTime, newTrack.id, itemId);

        if (nearestItem && nearestPos) {
          let insertTime: number;
          if (nearestPos === "before") {
            insertTime = nearestItem.start;
          } else {
            insertTime = nearestItem.start + nearestItem.duration;
          }

          const snap = calculateSnap(insertTime, itemId);
          const finalInsertTime = snap.snapped ? snap.time : insertTime;

          insertLine.value = {
            time: finalInsertTime,
            trackId: newTrack.id,
            position: nearestPos,
          };
          snapLine.value = snap.snapped ? snap.px : null;
          draggingItem.start = finalInsertTime;
        }
        draggingItem.trackId = newTrack.id;
      }
    } else {
      // 没有重叠，允许自由拖拽
      const snapLeft = calculateSnap(newStart, itemId);
      const snapRight = calculateSnap(newEnd, itemId);

      let finalStart = newStart;
      let activeSnapPx: number | null = null;

      if (snapLeft.snapped) {
        finalStart = snapLeft.time;
        activeSnapPx = snapLeft.px;
      } else if (snapRight.snapped) {
        finalStart = snapRight.time - originalDuration;
        activeSnapPx = snapRight.px;
      }

      draggingItem.start = finalStart;
      draggingItem.trackId = newTrack.id;
      insertLine.value = null; // 清除插入线
      snapLine.value = activeSnapPx;
    }
  } else if (type.startsWith("resize")) {
    const item = timelineItems.value.find((i) => i.id === itemId);
    if (!item) return;

    const deltaX = e.clientX - startX;
    const deltaTime = pxToTime(deltaX);

    if (type === "resize-right") {
      let newDur = Math.max(0.1, originalDuration + deltaTime);
      let newEnd = originalStart + newDur;

      // 不允许超出最大时长
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

      // 同轨道防重叠：右侧缩放不能超过右边最近块的 start
      const siblings = getTrackItems(item.trackId, item.id);
      const next = siblings.find((s) => s.start >= originalStart);
      if (next) {
        const maxEnd = next.start;
        if (originalStart + newDur > maxEnd) {
          newDur = Math.max(0.1, maxEnd - originalStart);
        }
      }

      // 再次 Clamp，避免负值或超过最大时长
      item.duration = Math.min(MAX_ITEM_DURATION.value, Math.max(0.1, newDur));
    } else {
      // Resize Left (Complex: changes start & duration)
      let newStart = Math.max(0, originalStart + deltaTime);
      let newDur = originalDuration - (newStart - originalStart);

      // 保证整体不超过最大时长
      if (newDur > MAX_ITEM_DURATION.value) {
        newDur = MAX_ITEM_DURATION.value;
        newStart = originalStart + (originalDuration - newDur);
      }

      if (newDur > 0.1) {
        const snap = calculateSnap(newStart, itemId);
        if (snap.snapped) {
          newStart = snap.time;
          newDur = originalDuration - (newStart - originalStart);
          snapLine.value = snap.px;
        } else {
          snapLine.value = null;
        }

        // 同轨道防重叠：左侧缩放不能越过左边最近块的 end
        const siblings = getTrackItems(item.trackId, item.id);
        const prev = [...siblings]
          .reverse()
          .find((s) => s.start <= originalStart);
        if (prev) {
          const minStart = prev.start + prev.duration;
          if (newStart < minStart) {
            newStart = minStart;
            newDur = originalStart + originalDuration - newStart;
          }
        }

        // Clamp 起始与时长
        newStart = Math.max(0, newStart);
        newDur = Math.min(MAX_ITEM_DURATION.value, Math.max(0.1, newDur));

        item.start = newStart;
        item.duration = newDur;
      }
    }
  }
};

const onMouseUp = () => {
  // 在 mouseup 时同步所有更改到 segments
  if (dragging.value) {
    const item = timelineItems.value.find(
      (i) => i.id === dragging.value!.itemId
    );
    if (item && dragging.value.type === "move") {
      // 如果是移动操作且有插入线，需要应用插入逻辑
      if (insertLine.value) {
        const { time: insertTime, trackId, position } = insertLine.value;
        const itemDuration = item.duration;

        // 获取目标轨道上的所有片段（包括拖拽项，但需要排除它来找到目标）
        const allTrackItems = timelineItems.value
          .filter((it) => it.trackId === trackId)
          .sort((a, b) => a.start - b.start);

        // 找到插入位置的目标片段（排除拖拽项本身）
        const trackItemsWithoutDragging = allTrackItems.filter(
          (it) => it.id !== item.id
        );

        let targetItem: TimelineItem | null = null;
        let targetIndex = -1;

        // 根据插入位置找到目标片段
        for (let i = 0; i < trackItemsWithoutDragging.length; i++) {
          const it = trackItemsWithoutDragging[i];
          if (!it) continue;
          if (position === "before") {
            // 插入到前面：找到起始位置匹配的片段
            if (Math.abs(it.start - insertTime) < 0.01) {
              targetItem = it;
              targetIndex = i;
              break;
            }
          } else {
            // 插入到后面：找到结束位置匹配的片段
            if (Math.abs(it.start + it.duration - insertTime) < 0.01) {
              targetItem = it;
              targetIndex = i;
              break;
            }
          }
        }

        if (targetItem) {
          // 需要移动其他片段为新片段让出空间
          const itemsToShift: TimelineItem[] = [];

          if (position === "before") {
            // 插入到前面：目标片段及其后面的所有片段都需要右移
            itemsToShift.push(...trackItemsWithoutDragging.slice(targetIndex));
          } else {
            // 插入到后面：目标片段后面的所有片段都需要右移
            itemsToShift.push(
              ...trackItemsWithoutDragging.slice(targetIndex + 1)
            );
          }

          // 移动这些片段（按时间顺序从后往前移动，避免覆盖）
          itemsToShift
            .sort((a, b) => b.start - a.start)
            .forEach((shiftItem) => {
              const newStart = shiftItem.start + itemDuration;
              shiftItem.start = newStart;

              // 同步到 segments
              const segment = props.segments[shiftItem.stepIndex];
              if (segment) {
                const newStartFrame = Math.round(newStart * props.fps);
                const newEndFrame =
                  newStartFrame + Math.round(shiftItem.duration * props.fps);
                emit(
                  "update-segment",
                  shiftItem.stepIndex,
                  Math.max(0, newStartFrame),
                  Math.max(0, newEndFrame)
                );
              }
            });
        }

        // 设置拖拽项的新位置
        item.start = insertTime;
        item.trackId = trackId;
      }

      // 同步拖拽项的位置到 segments
      const segment = props.segments[item.stepIndex];
      if (segment) {
        const maxFrames = props.totalFrames > 0 ? props.totalFrames + 60 : 6000;
        let newStartFrame = Math.round(item.start * props.fps);
        let newEndFrame = newStartFrame + Math.round(item.duration * props.fps);

        // Clamp 到合理范围，避免无穷大
        newStartFrame = Math.max(0, Math.min(newStartFrame, maxFrames));
        newEndFrame = Math.max(
          newStartFrame + 1,
          Math.min(newEndFrame, maxFrames)
        );

        emit(
          "update-segment",
          item.stepIndex,
          Math.max(0, newStartFrame),
          Math.max(0, newEndFrame)
        );
      }
    } else if (item && dragging.value.type.startsWith("resize")) {
      // Resize 操作直接同步
      const segment = props.segments[item.stepIndex];
      if (segment) {
        const maxFrames = props.totalFrames > 0 ? props.totalFrames + 60 : 6000;
        let newStartFrame = Math.round(item.start * props.fps);
        let newEndFrame = newStartFrame + Math.round(item.duration * props.fps);

        newStartFrame = Math.max(0, Math.min(newStartFrame, maxFrames));
        newEndFrame = Math.max(
          newStartFrame + 1,
          Math.min(newEndFrame, maxFrames)
        );

        emit(
          "update-segment",
          item.stepIndex,
          Math.max(0, newStartFrame),
          Math.max(0, newEndFrame)
        );
      }
    }
  }

  dragging.value = null;
  snapLine.value = null;
  insertLine.value = null;
  document.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("mouseup", onMouseUp);
};

// 播放头拖拽
const startScrubbing = () => {
  if (!rightScrollContainer.value) return;

  const handleScrub = (ev: MouseEvent) => {
    if (!rightScrollContainer.value) return;
    const rect = rightScrollContainer.value.getBoundingClientRect();
    const offsetX =
      ev.clientX - rect.left + rightScrollContainer.value.scrollLeft;
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

// 点击时间轴
const handleTimelineClick = (e: MouseEvent) => {
  if (dragging.value || !rightScrollContainer.value) return;
  const rect = rightScrollContainer.value.getBoundingClientRect();
  const offsetX = e.clientX - rect.left + rightScrollContainer.value.scrollLeft;
  const newTime = Math.max(0, pxToTime(offsetX));
  const newFrame = Math.round(newTime * props.fps);
  emit("update:current-frame", newFrame);
};

// 拖拽放置处理
const handleDragOver = (e: DragEvent, trackId: string) => {
  e.preventDefault();
  e.stopPropagation();
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = "copy";
  }
  dragOverTrackId.value = trackId;
};

const handleDragLeave = (e: DragEvent) => {
  // 只有当离开整个轨道区域时才清除高亮
  const target = e.target as HTMLElement;
  const relatedTarget = e.relatedTarget as HTMLElement;
  if (!target.contains(relatedTarget)) {
    dragOverTrackId.value = null;
  }
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
    if (data.type !== "skill-step" || typeof data.stepIndex !== "number") {
      return;
    }

    const rect = rightScrollContainer.value.getBoundingClientRect();
    // 鼠标在内容全景图中的绝对像素位置
    const absoluteX =
      e.clientX - rect.left + rightScrollContainer.value.scrollLeft;

    // 关键修复：让步骤的中心对齐鼠标位置，而不是左边缘
    const mouseTime = pxToTime(absoluteX);

    // 获取步骤的时长（从 segments 中查找，或使用默认值）
    const segment = props.segments[data.stepIndex];
    const defaultDuration =
      segment != null ? (segment.end - segment.start) / props.fps : 0.5; // 默认 0.5 秒
    const halfDuration = defaultDuration / 2;
    let startTime = Math.max(0, mouseTime - halfDuration);

    // Drop 吸附
    const snap = calculateSnap(startTime);
    if (snap.snapped) startTime = snap.time;

    emit("drop-step", data.stepIndex, startTime, trackId);
  } catch (error) {
    console.warn("拖拽数据解析失败", error);
  }
};

// 点击步骤块
const handleItemClick = (item: TimelineItem) => {
  emit("select-step", item.stepIndex);
};

// 删除步骤
const deleteItem = (item: TimelineItem) => {
  emit("delete-step", item.stepIndex);
};

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

// 监听库拖拽状态，在鼠标进入时间轴内容区域时渲染临时标签
watch(
  libraryDraggingRef,
  (state) => {
    if (!rightScrollContainer.value || !state) {
      ghostItem.value = null;
      return;
    }

    const rect = rightScrollContainer.value.getBoundingClientRect();
    const x = state.x;
    const y = state.y;

    const inside =
      x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

    if (!inside) {
      ghostItem.value = null;
      state.overTimeline = false;
      return;
    }

    // 鼠标位于时间轴矩形内部：计算对应的时间和轨道
    const scrollLeft = rightScrollContainer.value.scrollLeft;
    const scrollTop = rightScrollContainer.value.scrollTop;

    const relativeX = x - rect.left + scrollLeft;
    const relativeY = y - rect.top + scrollTop - 32; // 32 为标尺高度

    const trackIndex = Math.max(
      0,
      Math.min(
        visibleTracks.value.length - 1,
        Math.floor(relativeY / TRACK_HEIGHT)
      )
    );
    const targetTrack = visibleTracks.value[trackIndex];
    if (!targetTrack) {
      ghostItem.value = null;
      state.overTimeline = false;
      return;
    }

    const mouseTime = pxToTime(relativeX);
    const defaultFrames = STEP_FRAME_DEFAULT[state.type] ?? 30;
    const defaultDuration =
      props.fps > 0 ? defaultFrames / props.fps : defaultFrames / 10;
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
  { deep: true }
);
</script>

<template>
  <div
    class="h-full flex flex-col border-t border-white/10 bg-slate-900/60 select-none"
  >
    <!-- 轨道与内容区域 -->
    <div class="flex-1 flex overflow-scroll custom-scrollbar relative group">
      <!-- 左侧：轨道头 -->
      <div
        class="w-48 border-r border-white/10 flex flex-col shrink-0 z-20 relative"
      >
        <!-- 左上角占位块 - 添加轨道按钮 -->
        <div
          class="sticky top-0 h-8 border-b border-white/10 shrink-0 shadow-sm z-20 px-3 flex items-center justify-between bg-slate-950"
        >
          <div></div>
          <button
            class="flex items-center justify-center gap-1 px-1.5 py-0.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded text-[10px] font-medium transition-colors"
            @click="addTrack"
            title="添加轨道"
          >
            <svg
              class="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v16m8-8H4"
              ></path>
            </svg>
            添加轨道
          </button>
        </div>

        <!-- 轨道头列表 -->
        <div class="flex-1 relative" ref="leftScrollContainer">
          <div class="pb-10">
            <!-- 轨道列表 -->
            <div
              v-for="track in tracks"
              :key="track.id"
              class="border-b border-white/10 px-3 flex items-center justify-between hover:bg-black/60 transition-colors relative group"
              :class="{
                'opacity-50': track.hidden,
                'bg-amber-900/20': track.locked,
              }"
              :style="{ height: TRACK_HEIGHT + 'px' }"
            >
              <div
                class="flex items-center gap-2 overflow-hidden flex-1 min-w-0"
              >
                <div
                  class="w-1 h-4 rounded-full flex-shrink-0"
                  :class="track.hidden ? 'bg-slate-500' : 'bg-emerald-500'"
                ></div>
                <span
                  class="text-xs text-slate-300 font-medium truncate"
                  :class="{
                    'line-through': track.hidden,
                    'text-amber-400': track.locked,
                  }"
                >
                  {{ track.name }}
                </span>
                <span
                  v-if="track.locked"
                  class="text-[10px] text-amber-400 flex-shrink-0"
                  title="已锁定"
                >
                  🔒
                </span>
                <span
                  v-if="track.hidden"
                  class="text-[10px] text-slate-500 flex-shrink-0"
                  title="已隐藏"
                >
                  👁️
                </span>
              </div>

              <!-- 操作按钮组 -->
              <div
                class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              >
                <!-- 锁定/解锁按钮 -->
                <button
                  class="p-1 hover:bg-white/10 rounded transition-colors"
                  :class="track.locked ? 'text-amber-400' : 'text-slate-400'"
                  @click.stop="toggleLockTrack(track.id)"
                  :title="track.locked ? '解锁' : '锁定'"
                >
                  <svg
                    class="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      v-if="track.locked"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    ></path>
                    <path
                      v-else
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                    ></path>
                  </svg>
                </button>

                <!-- 隐藏/显示按钮 -->
                <button
                  class="p-1 hover:bg-white/10 rounded transition-colors"
                  :class="track.hidden ? 'text-slate-500' : 'text-slate-400'"
                  @click.stop="toggleHideTrack(track.id)"
                  :title="track.hidden ? '显示' : '隐藏'"
                >
                  <svg
                    class="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      v-if="track.hidden"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    ></path>
                    <path
                      v-else
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    ></path>
                    <path
                      v-if="!track.hidden"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    ></path>
                  </svg>
                </button>

                <!-- 删除按钮 -->
                <button
                  class="p-1 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                  @click.stop="deleteTrack(track.id)"
                  :disabled="tracks.length <= 1"
                  :class="{
                    'opacity-50 cursor-not-allowed': tracks.length <= 1,
                  }"
                  title="删除轨道"
                >
                  <svg
                    class="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    ></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：时间轴内容 -->
      <div
        class="flex-1 relative bg-slate-950/50"
        ref="rightScrollContainer"
        @scroll="handleScroll"
        @wheel="handleWheel"
        @click="handleTimelineClick"
      >
        <!-- 标尺 -->
        <div
          class="sticky top-0 z-30 h-8 border-b border-white/10 backdrop-blur min-w-full"
          :style="{ width: totalWidth + 'px' }"
        >
          <div
            class="absolute inset-0 ruler-bg pointer-events-none bg-slate-950/50"
            :style="{
              backgroundSize: `${zoom * 5}px 100%, ${zoom}px 100%`,
              backgroundImage: `linear-gradient(to right, #94a3b8 1px, transparent 1px), linear-gradient(to right, #475569 1px, transparent 1px)`,
            }"
          >
            <!-- 大刻度数字 -->
            <div
              v-for="i in Math.ceil(totalDuration / 5) + 2"
              :key="i"
              class="absolute top-0.5 text-[10px] font-mono text-slate-400 pl-1.5 select-none"
              :style="{ left: (i - 1) * 5 * zoom + 'px' }"
            >
              {{ formatTime((i - 1) * 5) }}
            </div>
          </div>

          <!-- 播放头帽子 -->
          <div
            class="absolute top-0 bottom-0 w-0 z-40"
            :style="{ left: timeToPx(currentTime) + 'px' }"
          >
            <div
              class="absolute -translate-x-1/2 top-0 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-emerald-400 cursor-ew-resize hover:scale-110 transition-transform"
              @mousedown.stop="startScrubbing"
            ></div>
          </div>
        </div>

        <!-- 轨道容器 -->
        <div
          class="relative min-w-full pb-20"
          :style="{ width: totalWidth + 'px' }"
        >
          <!-- 轨道背景线 -->
          <div
            v-for="track in visibleTracks"
            :key="'bg-' + track.id"
            class="border-b border-white/10 w-full relative box-border transition-colors"
            :class="{
              'bg-emerald-500/10 border-emerald-400/30':
                dragOverTrackId === track.id,
            }"
            :style="{ height: TRACK_HEIGHT + 'px' }"
            @dragover.prevent="handleDragOver($event, track.id)"
            @dragleave="handleDragLeave"
            @drop="handleDrop($event, track.id)"
          >
            <!-- 辅助网格 -->
            <div
              class="absolute inset-0 pointer-events-none border-r border-white/5"
              :style="{ width: zoom + 'px', backgroundSize: zoom + 'px 100%' }"
            ></div>
          </div>

          <!-- 步骤块 -->
          <div class="absolute inset-0 pointer-events-none">
            <div
              v-for="item in timelineItems"
              :key="item.id"
              v-show="!tracks.find((t) => t.id === item.trackId)?.hidden"
              class="absolute rounded-md overflow-hidden border border-black/30 shadow-md group pointer-events-auto transition-opacity"
              :class="[
                item.colorClass,
                dragging && dragging.itemId === item.id
                  ? 'z-50 shadow-xl ring-2 ring-white/80 opacity-90'
                  : 'z-10 hover:brightness-110',
                selectedStepIndex === item.stepIndex
                  ? 'ring-2 ring-emerald-400'
                  : '',
                isTrackLocked(item.trackId)
                  ? 'cursor-not-allowed opacity-60'
                  : 'cursor-pointer',
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
              <div
                class="w-full h-full px-2 flex flex-col justify-center overflow-hidden"
              >
                <div
                  class="text-[11px] font-bold text-white/90 truncate leading-tight select-none"
                >
                  {{ item.name }}
                </div>
                <div class="text-[9px] text-white/60 truncate font-mono">
                  {{ item.duration.toFixed(2) }}s
                </div>
              </div>

              <!-- 调节柄 -->
              <div
                class="absolute left-0 top-0 bottom-0 w-3 cursor-w-resize hover:bg-white/20 z-20 group/handle flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <div class="w-0.5 h-3 bg-white/50 rounded-full"></div>
              </div>
              <div
                class="absolute right-0 top-0 bottom-0 w-3 cursor-e-resize hover:bg-white/20 z-20 group/handle flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <div class="w-0.5 h-3 bg-white/50 rounded-full"></div>
              </div>

              <!-- 删除按钮 -->
              <button
                class="absolute right-1 top-1 hidden group-hover:block bg-slate-900/60 hover:bg-red-500 text-white rounded p-0.5 backdrop-blur-sm transition-colors"
                @click.stop="deleteItem(item)"
                title="删除"
              >
                <svg
                  class="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              </button>
            </div>

            <!-- 从库拖拽时的临时标签，复用标准标签结构（仅禁用交互、略微透明） -->
            <div
              v-if="
                ghostItem &&
                !tracks.find((t) => t.id === ghostItem?.trackId)?.hidden
              "
              class="absolute rounded-md overflow-hidden border border-black/30 shadow-md pointer-events-none opacity-70"
              :class="[
                ghostItem
                  ? stepTypeColors[ghostItem.stepType] || 'bg-gray-600'
                  : 'bg-gray-600',
                'z-40',
              ]"
              :style="{
                left: ghostItem ? timeToPx(ghostItem.start) + 'px' : '0',
                top: ghostItem
                  ? getTrackIndex(ghostItem.trackId) * TRACK_HEIGHT + 2 + 'px'
                  : '0',
                width: ghostItem
                  ? Math.max(4, timeToPx(ghostItem.duration)) + 'px'
                  : '0',
                height: TRACK_HEIGHT - 4 + 'px',
              }"
            >
              <div
                class="w-full h-full px-2 flex flex-col justify-center overflow-hidden"
              >
                <div
                  class="text-[11px] font-bold text-white/90 truncate leading-tight select-none"
                >
                  {{
                    ghostItem
                      ? stepTypeNames[ghostItem.stepType] || ghostItem.stepType
                      : ""
                  }}
                </div>
                <div class="text-[9px] text-white/60 truncate font-mono">
                  {{ ghostItem ? ghostItem.duration.toFixed(2) + "s" : "" }}
                </div>
              </div>
            </div>
          </div>

          <!-- 辅助线 -->
          <!-- 插入指示线（类似 AE 的插入位置） -->
          <div
            v-if="insertLine !== null"
            class="absolute top-0 bottom-0 z-[65] pointer-events-none"
            :style="{ left: timeToPx(insertLine.time) + 'px' }"
          >
            <!-- 垂直插入线 -->
            <div
              class="absolute top-0 bottom-0 w-0.5 bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]"
            ></div>
            <!-- 插入方向指示箭头 -->
            <div
              class="absolute top-0 -translate-x-1/2 flex flex-col items-center"
              :style="{
                left: insertLine.position === 'before' ? '0' : '0',
              }"
            >
              <!-- 上箭头 -->
              <div
                class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-blue-400"
              ></div>
              <!-- 插入位置标签 -->
              <div
                class="mt-1 text-[10px] bg-blue-400 text-blue-950 px-1.5 py-0.5 rounded font-mono font-bold whitespace-nowrap"
              >
                {{ insertLine.position === "before" ? "插入前" : "插入后" }}
              </div>
            </div>
            <!-- 轨道高亮区域 -->
            <div
              v-if="
                insertLine &&
                !tracks.find((t) => t.id === insertLine?.trackId)?.hidden &&
                insertLine &&
                getTrackIndex(insertLine.trackId) >= 0
              "
              class="absolute left-0 right-0 bg-blue-400/20 border-y border-blue-400/50"
              :style="{
                top: insertLine
                  ? getTrackIndex(insertLine.trackId) * TRACK_HEIGHT + 'px'
                  : '0',
                height: TRACK_HEIGHT + 'px',
              }"
            ></div>
          </div>

          <!-- 吸附线 -->
          <div
            v-if="snapLine !== null && insertLine === null"
            class="absolute top-0 bottom-0 w-px bg-yellow-400 z-[60] pointer-events-none shadow-[0_0_8px_rgba(250,204,21,0.6)]"
            :style="{ left: snapLine + 'px' }"
          >
            <div
              class="sticky top-10 ml-1 text-[10px] bg-yellow-400 text-black px-1 rounded font-mono font-bold inline-block"
            >
              {{ formatTime(pxToTime(snapLine)) }}
            </div>
          </div>

          <!-- 播放头线 -->
          <div
            class="absolute top-0 bottom-0 w-px bg-emerald-400 z-40 pointer-events-none shadow-lg shadow-emerald-500/50"
            :style="{ left: timeToPx(currentTime) + 'px' }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: #0f172a;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #475569;
  border-radius: 4px;
  border: 2px solid #0f172a;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}

.hide-v-scrollbar::-webkit-scrollbar {
  width: 0 !important;
  height: 0 !important;
}

.hide-v-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.ruler-bg {
  background-image: linear-gradient(to right, #475569 1px, transparent 1px),
    linear-gradient(to right, #334155 1px, transparent 1px);
  background-position: 0 0;
  background-repeat: repeat-x;
}
</style>
