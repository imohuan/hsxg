import { computed, nextTick, onBeforeUnmount, ref, watch, type Ref } from "vue";
import type { SkillStep } from "@/core/designer/types";
import { libraryDraggingRef } from "@/composables/useLibraryDragToTimeline";

export interface TimelineSegment {
  start: number; // 帧
  end: number; // 帧
  step: SkillStep;
  index: number;
}

export interface TimelineItem {
  id: string;
  trackId: string;
  start: number; // 秒
  duration: number; // 秒
  name: string;
  colorClass: string;
  stepIndex: number;
}

export interface TimelineTrack {
  id: string;
  name: string;
  type: "step";
  locked?: boolean;
  hidden?: boolean;
}

export interface UseSkillTimelineOptions {
  segments: Ref<TimelineSegment[]>;
  totalFrames: Ref<number>;
  currentFrame: Ref<number>;
  fps: Ref<number>;
  selectedStepIndex: Ref<number | null>;
  leftScrollContainer: Ref<HTMLDivElement | null>;
  rightScrollContainer: Ref<HTMLDivElement | null>;
  emitUpdateCurrentFrame: (frame: number) => void;
  emitSelectStep: (index: number) => void;
  emitDeleteStep: (index: number) => void;
  emitUpdateSegment: (index: number, start: number, end: number) => void;
  emitDropStep: (
    stepIndex: number,
    targetTime: number,
    trackId: string
  ) => void;
}

interface DraggingState {
  type: "move" | "resize-left" | "resize-right";
  itemId: string;
  clickOffsetInItem: number;
  startX: number;
  originalStart: number;
  originalDuration: number;
  trackId: string;
}

interface GhostItemState {
  stepType: string;
  start: number;
  duration: number;
  trackId: string;
}

const TRACK_HEIGHT = 40;
const MIN_ZOOM = 5;
const MAX_ZOOM = 200;
const SNAP_THRESHOLD = 12; // px
const RULER_HEIGHT = 32;

const stepTypeColors: Record<string, string> = {
  move: "bg-emerald-600",
  damage: "bg-red-500",
  effect: "bg-violet-600",
  wait: "bg-amber-600",
};

const stepTypeNames: Record<string, string> = {
  move: "移动",
  damage: "伤害",
  effect: "特效",
  wait: "等待",
};

const STEP_FRAME_DEFAULT: Record<string, number> = {
  move: 50,
  damage: 30,
  effect: 40,
  wait: 30,
};

export function useSkillTimeline(options: UseSkillTimelineOptions) {
  const {
    segments,
    totalFrames,
    currentFrame,
    fps,
    leftScrollContainer,
    rightScrollContainer,
    emitUpdateCurrentFrame,
    emitSelectStep,
    emitDeleteStep,
    emitUpdateSegment,
    emitDropStep,
  } = options;

  const zoom = ref(20); // px / second

  const tracks = ref<TimelineTrack[]>([
    {
      id: "main-track",
      name: "技能步骤",
      type: "step",
      locked: false,
      hidden: false,
    },
  ]);

  const timelineItems = ref<TimelineItem[]>([]);
  const dragging = ref<DraggingState | null>(null);
  const snapLine = ref<number | null>(null);
  const dragOverTrackId = ref<string | null>(null);
  const ghostItem = ref<GhostItemState | null>(null);

  const totalDuration = computed(() => {
    if (totalFrames.value <= 0 || fps.value <= 0) return 30;
    return totalFrames.value / fps.value;
  });

  const MAX_ITEM_DURATION = computed(() => {
    return Math.max(5, totalDuration.value + 10);
  });

  const currentTime = computed(() => {
    if (fps.value <= 0) return 0;
    return currentFrame.value / fps.value;
  });

  const totalWidth = computed(() => {
    const contentW = (totalDuration.value + 20) * zoom.value;
    if (typeof window === "undefined") return contentW;
    return Math.max(contentW, window.innerWidth - 256);
  });

  const visibleTracks = computed(() => tracks.value.filter((t) => !t.hidden));

  const timeToPx = (t: number) => t * zoom.value;
  const pxToTime = (p: number) => p / zoom.value;

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const getTrackIndex = (trackId: string) =>
    visibleTracks.value.findIndex((t) => t.id === trackId);

  const isTrackLocked = (trackId: string) => {
    const track = tracks.value.find((t) => t.id === trackId);
    return track?.locked ?? false;
  };

  const syncSegmentsToItems = () => {
    const existing = timelineItems.value;

    timelineItems.value = segments.value.map((segment, index) => {
      const startTime = fps.value > 0 ? segment.start / fps.value : 0;
      const durationFromSegment =
        fps.value > 0 ? (segment.end - segment.start) / fps.value : 0;

      const prev = existing.find((it) => it.stepIndex === index);

      const params = segment.step.params as any;
      const segmentTrackId = (segment as any).trackId as string | undefined;
      const persistedTrackId =
        segmentTrackId && typeof segmentTrackId === "string"
          ? segmentTrackId
          : params && typeof params.trackId === "string"
          ? params.trackId
          : null;

      // 如果是从拖拽/缩放刚刚同步回来的，existing 里已经有更准确的 start/duration，
      // 优先用 existing，避免 mouseup 之后又被 segment 覆盖“弹回”。
      const start = prev ? prev.start : startTime;
      const duration = prev ? prev.duration : durationFromSegment;

      // 对于已经存在的标签，优先保留它当前所在的轨道（prev.trackId）；
      // 对于新创建的标签（prev 不存在），再使用 segment/params 中持久化的轨道信息。
      const trackId = prev?.trackId ?? persistedTrackId ?? "main-track";

      return {
        id: prev?.id ?? `step-${index}`,
        trackId,
        start,
        duration,
        name: stepTypeNames[segment.step.type] || segment.step.type,
        colorClass: stepTypeColors[segment.step.type] || "bg-gray-600",
        stepIndex: index,
      };
    });
  };

  watch(segments, syncSegmentsToItems, { deep: true, immediate: true });

  let trackCounter = 1;

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

  const deleteTrack = (trackId: string) => {
    if (tracks.value.length <= 1) return;
    const hasItems = timelineItems.value.some((it) => it.trackId === trackId);
    if (hasItems) {
      console.warn(
        `[SkillTimeline] 轨道 ${trackId} 仍有片段，删除前请先处理这些片段`
      );
      return;
    }
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

  const handleScroll = (e: Event) => {
    const target = e.target as HTMLElement;
    if (leftScrollContainer.value && target === rightScrollContainer.value) {
      leftScrollContainer.value.scrollTop = target.scrollTop;
    }
  };

  const handleWheel = (e: WheelEvent) => {
    if (!e.ctrlKey || !rightScrollContainer.value) return;
    e.preventDefault();
    e.stopPropagation();

    const oldZoom = zoom.value;
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    let newZoom = oldZoom * (1 + delta);
    newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));

    if (newZoom === oldZoom) return;

    const rect = rightScrollContainer.value.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const scrollLeft = rightScrollContainer.value.scrollLeft;
    const anchorTime = (scrollLeft + mouseX) / oldZoom;

    zoom.value = newZoom;

    nextTick(() => {
      if (!rightScrollContainer.value) return;
      rightScrollContainer.value.scrollLeft = anchorTime * newZoom - mouseX;
    });
  };

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

    for (const t of points) {
      const px = timeToPx(t);
      const diff = Math.abs(px - targetPx);
      if (diff < minDiff) {
        minDiff = diff;
        bestSnapPx = px;
      }
    }

    if (bestSnapPx !== null) {
      return { snapped: true, time: pxToTime(bestSnapPx), px: bestSnapPx };
    }
    return { snapped: false, time: targetTime, px: null };
  };

  const getTrackItems = (trackId: string, ignoreId?: string) => {
    return timelineItems.value
      .filter((it) => it.trackId === trackId && it.id !== ignoreId)
      .sort((a, b) => a.start - b.start);
  };

  const findNonOverlappingStart = (
    trackId: string,
    desiredStart: number,
    duration: number,
    ignoreId?: string
  ) => {
    const items = getTrackItems(trackId, ignoreId);
    let start = Math.max(0, desiredStart);
    let prevEnd = 0;

    for (const item of items) {
      const gapStart = prevEnd;
      const gapEnd = item.start - duration;

      if (gapEnd < gapStart) {
        prevEnd = item.start + item.duration;
        continue;
      }

      if (start < gapStart) {
        return gapStart;
      }

      if (start >= gapStart && start <= gapEnd) {
        return start;
      }

      prevEnd = item.start + item.duration;
    }

    return Math.max(start, prevEnd);
  };

  const startDragging = (
    type: DraggingState["type"],
    e: MouseEvent,
    item: TimelineItem
  ) => {
    if (!rightScrollContainer.value) return;
    if (isTrackLocked(item.trackId)) return;

    const containerRect = rightScrollContainer.value.getBoundingClientRect();

    dragging.value = {
      type,
      itemId: item.id,
      clickOffsetInItem:
        e.clientX -
        (containerRect.left +
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

  const handleItemMouseDownBody = (e: MouseEvent, item: TimelineItem) => {
    startDragging("move", e, item);
  };

  const handleItemMouseDownResizeLeft = (e: MouseEvent, item: TimelineItem) => {
    startDragging("resize-left", e, item);
  };

  const handleItemMouseDownResizeRight = (
    e: MouseEvent,
    item: TimelineItem
  ) => {
    startDragging("resize-right", e, item);
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
      trackId,
    } = dragging.value;

    const rect = rightScrollContainer.value.getBoundingClientRect();

    if (type === "move") {
      const relativeY =
        e.clientY -
        rect.top +
        rightScrollContainer.value.scrollTop -
        RULER_HEIGHT;
      const trackIndex = Math.floor(relativeY / TRACK_HEIGHT);
      const visible = visibleTracks.value;
      const newTrack =
        visible[Math.max(0, Math.min(visible.length - 1, trackIndex))] ??
        tracks.value[0];

      if (!newTrack) return;

      const contentX =
        e.clientX - rect.left + rightScrollContainer.value.scrollLeft;
      const rawNewStartPx = contentX - clickOffsetInItem;
      const desiredStart = Math.max(0, pxToTime(rawNewStartPx));
      const duration = originalDuration;

      let newStart = findNonOverlappingStart(
        newTrack.id,
        desiredStart,
        duration,
        itemId
      );

      const snapLeft = calculateSnap(newStart, itemId);
      const snapRight = calculateSnap(newStart + duration, itemId);

      let finalStart = newStart;
      let activeSnapPx: number | null = null;

      if (snapLeft.snapped) {
        finalStart = snapLeft.time;
        activeSnapPx = snapLeft.px;
      } else if (snapRight.snapped) {
        finalStart = snapRight.time - duration;
        activeSnapPx = snapRight.px;
      }

      // 再做一次防重叠修正，确保吸附后也不会与其他标签相交
      finalStart = findNonOverlappingStart(
        newTrack.id,
        finalStart,
        duration,
        itemId
      );

      const item = timelineItems.value.find((i) => i.id === itemId);
      if (!item) return;

      item.start = Math.max(0, finalStart);
      item.trackId = newTrack.id;
      snapLine.value = activeSnapPx;
      dragOverTrackId.value = newTrack.id;
    } else {
      const item = timelineItems.value.find((i) => i.id === itemId);
      if (!item) return;

      const deltaX = e.clientX - startX;
      const deltaTime = pxToTime(deltaX);

      if (type === "resize-right") {
        let newDur = Math.max(0.1, originalDuration + deltaTime);
        let newEnd = originalStart + newDur;

        if (newEnd > originalStart + MAX_ITEM_DURATION.value) {
          newEnd = originalStart + MAX_ITEM_DURATION.value;
          newDur = newEnd - originalStart;
        }

        const siblings = getTrackItems(trackId, itemId);
        let nextStart = Number.POSITIVE_INFINITY;
        for (const s of siblings) {
          if (s.start >= originalStart && s.start < nextStart) {
            nextStart = s.start;
          }
        }
        if (nextStart !== Number.POSITIVE_INFINITY && newEnd > nextStart) {
          newEnd = nextStart;
          newDur = Math.max(0.1, newEnd - originalStart);
        }

        const snap = calculateSnap(newEnd, itemId);
        if (snap.snapped) {
          newEnd = snap.time;
          newDur = Math.max(0.1, newEnd - originalStart);
        }

        // 再和右侧最近标签的 start 做一次约束，吸附后也不允许越界
        if (nextStart !== Number.POSITIVE_INFINITY && newEnd > nextStart) {
          newEnd = nextStart;
          newDur = Math.max(0.1, newEnd - originalStart);
        }

        snapLine.value = calculateSnap(newEnd, itemId).px;

        item.duration = Math.min(MAX_ITEM_DURATION.value, newDur);
      } else if (type === "resize-left") {
        let newStart = Math.max(0, originalStart + deltaTime);
        let newDur = originalDuration - (newStart - originalStart);

        if (newDur > MAX_ITEM_DURATION.value) {
          newDur = MAX_ITEM_DURATION.value;
          newStart = originalStart + (originalDuration - newDur);
        }

        const siblings = getTrackItems(trackId, itemId);
        let prevEnd = 0;
        for (const s of siblings) {
          const sEnd = s.start + s.duration;
          if (sEnd <= originalStart && sEnd > prevEnd) {
            prevEnd = sEnd;
          }
        }
        if (newStart < prevEnd) {
          newStart = prevEnd;
          newDur = originalStart + originalDuration - newStart;
        }

        const snap = calculateSnap(newStart, itemId);
        if (snap.snapped) {
          newStart = snap.time;
          newDur = originalStart + originalDuration - newStart;
        }

        // 再与左侧最近标签的 end 做一次约束，确保不会与其重叠
        if (newStart < prevEnd) {
          newStart = prevEnd;
          newDur = originalStart + originalDuration - newStart;
        }

        newStart = Math.max(0, newStart);
        newDur = Math.min(MAX_ITEM_DURATION.value, Math.max(0.1, newDur));

        snapLine.value = calculateSnap(newStart, itemId).px;

        item.start = newStart;
        item.duration = newDur;
      }
    }
  };

  const onMouseUp = () => {
    if (dragging.value) {
      const { itemId, type } = dragging.value;
      const item = timelineItems.value.find((i) => i.id === itemId);
      if (item) {
        const segment = segments.value[item.stepIndex];
        if (segment) {
          const maxFrames =
            totalFrames.value > 0 ? totalFrames.value + 60 : 6000;
          let newStartFrame = Math.round(item.start * fps.value);

          let newEndFrame: number;
          if (type === "move") {
            // 纯移动：保持原来的帧长度不变
            const originalFrames = segment.end - segment.start;
            newEndFrame = newStartFrame + originalFrames;
          } else {
            // 缩放：根据当前 duration 重新计算长度
            newEndFrame = newStartFrame + Math.round(item.duration * fps.value);
          }

          newStartFrame = Math.max(0, Math.min(newStartFrame, maxFrames));
          newEndFrame = Math.max(
            newStartFrame + 1,
            Math.min(newEndFrame, maxFrames)
          );

          emitUpdateSegment(
            item.stepIndex,
            Math.max(0, newStartFrame),
            Math.max(0, newEndFrame)
          );
        }
      }
    }

    dragging.value = null;
    snapLine.value = null;
    dragOverTrackId.value = null;
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  };

  const handleItemClick = (item: TimelineItem) => {
    emitSelectStep(item.stepIndex);
  };

  const deleteItem = (item: TimelineItem) => {
    emitDeleteStep(item.stepIndex);
  };

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
      const newFrame = Math.round(newTime * fps.value);
      emitUpdateCurrentFrame(newFrame);
    };

    const stopScrub = () => {
      document.removeEventListener("mousemove", handleScrub);
      document.removeEventListener("mouseup", stopScrub);
    };

    document.addEventListener("mousemove", handleScrub);
    document.addEventListener("mouseup", stopScrub);
  };

  const handleTimelineClick = (e: MouseEvent) => {
    if (dragging.value || !rightScrollContainer.value) return;
    const rect = rightScrollContainer.value.getBoundingClientRect();
    const offsetX =
      e.clientX - rect.left + rightScrollContainer.value.scrollLeft;
    const newTime = Math.max(0, pxToTime(offsetX));
    const newFrame = Math.round(newTime * fps.value);
    emitUpdateCurrentFrame(newFrame);
  };

  const handleDragOver = (e: DragEvent, trackId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "copy";
    }
    dragOverTrackId.value = trackId;
  };

  const handleDragLeave = (e: DragEvent) => {
    const target = e.target as HTMLElement;
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (!relatedTarget || !target.contains(relatedTarget)) {
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
      const absoluteX =
        e.clientX - rect.left + rightScrollContainer.value.scrollLeft;
      const mouseTime = pxToTime(absoluteX);

      const segment = segments.value[data.stepIndex];
      const defaultDuration =
        segment != null && fps.value > 0
          ? (segment.end - segment.start) / fps.value
          : 0.5;
      const halfDuration = defaultDuration / 2;
      let startTime = Math.max(0, mouseTime - halfDuration);

      const snap = calculateSnap(startTime);
      if (snap.snapped) startTime = snap.time;

      emitDropStep(data.stepIndex, startTime, trackId);
    } catch (error) {
      console.warn("[SkillTimeline] 拖拽数据解析失败", error);
    }
  };

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

      const scrollLeft = rightScrollContainer.value.scrollLeft;
      const scrollTop = rightScrollContainer.value.scrollTop;

      const relativeX = x - rect.left + scrollLeft;
      const relativeY = y - rect.top + scrollTop - RULER_HEIGHT;

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
        fps.value > 0 ? defaultFrames / fps.value : defaultFrames / 10;
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

  onBeforeUnmount(() => {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  });

  return {
    TRACK_HEIGHT,
    zoom,
    tracks,
    visibleTracks,
    timelineItems,
    totalDuration,
    totalWidth,
    currentTime,
    snapLine,
    dragOverTrackId,
    ghostItem,

    timeToPx,
    pxToTime,
    formatTime,
    getTrackIndex,
    isTrackLocked,

    addTrack,
    deleteTrack,
    toggleLockTrack,
    toggleHideTrack,

    handleScroll,
    handleWheel,

    handleItemMouseDownBody,
    handleItemMouseDownResizeLeft,
    handleItemMouseDownResizeRight,
    handleItemClick,
    deleteItem,

    startScrubbing,
    handleTimelineClick,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}

export const SkillTimelineConstants = {
  TRACK_HEIGHT,
  RULER_HEIGHT,
};
