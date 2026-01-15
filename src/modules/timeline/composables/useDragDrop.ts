import { ref, computed, type Ref, type ComputedRef } from "vue";
import type { TimelineSegment } from "@/types";

/** 拖拽模式 */
export type DragMode = "move" | "resize-start" | "resize-end" | null;

/** 吸附点信息 */
export interface SnapPoint {
  frame: number;
  type: "segment-start" | "segment-end" | "indicator" | "grid";
}

/** 拖拽状态 */
export interface DragState {
  isDragging: boolean;
  mode: DragMode;
  segmentId: string | null;
  startX: number;
  startFrame: number;
  originalStartFrame: number;
  originalEndFrame: number;
}

/** useDragDrop 配置选项 */
export interface UseDragDropOptions {
  /** 当前帧（时间指示器位置） */
  currentFrame: Ref<number>;
  /** 帧率 */
  fps: Ref<number>;
  /** 所有片段 */
  segments: Ref<TimelineSegment[]>;
  /** 吸附阈值（像素） */
  snapThreshold?: number;
  /** 网格吸附间隔（帧） */
  gridSnapInterval?: number;
  /** 像素转帧数的转换函数 */
  pxToFrame: (px: number) => number;
  /** 帧数转像素的转换函数 */
  frameToPx: (frame: number) => number;
  /** 更新片段的回调 */
  onUpdateSegment?: (segmentId: string, startFrame: number, endFrame: number) => boolean;
}

/** useDragDrop 返回接口 */
export interface UseDragDropReturn {
  // 状态
  dragState: Ref<DragState>;
  snapPoints: ComputedRef<SnapPoint[]>;
  activeSnapPoint: Ref<SnapPoint | null>;

  // 方法
  startDrag: (segmentId: string, mode: DragMode, event: MouseEvent) => void;
  onDrag: (event: MouseEvent) => void;
  endDrag: () => void;

  // 工具方法
  findNearestSnapPoint: (frame: number, excludeSegmentId?: string) => SnapPoint | null;
  calculateSnappedFrame: (frame: number, excludeSegmentId?: string) => number;
}


/** 默认吸附阈值（像素） */
const DEFAULT_SNAP_THRESHOLD = 10;

/** 默认网格吸附间隔（帧） */
const DEFAULT_GRID_SNAP_INTERVAL = 5;

/**
 * 拖拽逻辑 Hook
 * 实现片段拖拽、缩放、吸附功能
 * @param options 配置选项
 */
export function useDragDrop(options: UseDragDropOptions): UseDragDropReturn {
  const {
    currentFrame,
    fps,
    segments,
    snapThreshold = DEFAULT_SNAP_THRESHOLD,
    gridSnapInterval = DEFAULT_GRID_SNAP_INTERVAL,
    pxToFrame,
    frameToPx,
    onUpdateSegment,
  } = options;

  // ============ 状态 ============

  const dragState = ref<DragState>({
    isDragging: false,
    mode: null,
    segmentId: null,
    startX: 0,
    startFrame: 0,
    originalStartFrame: 0,
    originalEndFrame: 0,
  });

  const activeSnapPoint = ref<SnapPoint | null>(null);

  // ============ 计算属性 ============

  /**
   * 计算所有可用的吸附点
   */
  const snapPoints = computed<SnapPoint[]>(() => {
    const points: SnapPoint[] = [];

    // 添加时间指示器位置
    points.push({
      frame: currentFrame.value,
      type: "indicator",
    });

    // 添加所有片段的起止点
    for (const segment of segments.value) {
      points.push({
        frame: segment.startFrame,
        type: "segment-start",
      });
      points.push({
        frame: segment.endFrame,
        type: "segment-end",
      });
    }

    // 添加网格吸附点（基于帧率）
    const maxFrame = Math.max(
      ...segments.value.map((s) => s.endFrame),
      currentFrame.value,
      fps.value * 10, // 至少 10 秒
    );

    for (let frame = 0; frame <= maxFrame; frame += gridSnapInterval) {
      // 避免重复添加已存在的点
      if (!points.some((p) => p.frame === frame)) {
        points.push({
          frame,
          type: "grid",
        });
      }
    }

    return points;
  });

  // ============ 工具方法 ============

  /**
   * 查找最近的吸附点
   * @param frame 当前帧
   * @param excludeSegmentId 排除的片段 ID（用于排除正在拖拽的片段自身）
   */
  function findNearestSnapPoint(
    frame: number,
    excludeSegmentId?: string,
  ): SnapPoint | null {
    const framePx = frameToPx(frame);
    let nearestPoint: SnapPoint | null = null;
    let minDistance = Infinity;

    for (const point of snapPoints.value) {
      // 排除正在拖拽的片段自身的吸附点
      if (excludeSegmentId) {
        const segment = segments.value.find((s) => s.id === excludeSegmentId);
        if (segment) {
          // 如果是当前片段的原始位置，跳过
          if (
            point.frame === dragState.value.originalStartFrame ||
            point.frame === dragState.value.originalEndFrame
          ) {
            continue;
          }
        }
      }

      const pointPx = frameToPx(point.frame);
      const distance = Math.abs(pointPx - framePx);

      if (distance < minDistance && distance <= snapThreshold) {
        minDistance = distance;
        nearestPoint = point;
      }
    }

    return nearestPoint;
  }

  /**
   * 计算吸附后的帧数
   */
  function calculateSnappedFrame(
    frame: number,
    excludeSegmentId?: string,
  ): number {
    const snapPoint = findNearestSnapPoint(frame, excludeSegmentId);
    if (snapPoint) {
      activeSnapPoint.value = snapPoint;
      return snapPoint.frame;
    }
    activeSnapPoint.value = null;
    return frame;
  }


  // ============ 拖拽方法 ============

  /**
   * 开始拖拽
   */
  function startDrag(
    segmentId: string,
    mode: DragMode,
    event: MouseEvent,
  ): void {
    const segment = segments.value.find((s) => s.id === segmentId);
    if (!segment || !mode) return;

    dragState.value = {
      isDragging: true,
      mode,
      segmentId,
      startX: event.clientX,
      startFrame: mode === "resize-end" ? segment.endFrame : segment.startFrame,
      originalStartFrame: segment.startFrame,
      originalEndFrame: segment.endFrame,
    };

    // 添加全局事件监听
    document.addEventListener("mousemove", onDrag);
    document.addEventListener("mouseup", endDrag);
  }

  /**
   * 拖拽中
   */
  function onDrag(event: MouseEvent): void {
    if (!dragState.value.isDragging || !dragState.value.segmentId) return;

    const deltaX = event.clientX - dragState.value.startX;
    const deltaFrames = pxToFrame(deltaX);

    const segment = segments.value.find(
      (s) => s.id === dragState.value.segmentId,
    );
    if (!segment) return;

    let newStartFrame = dragState.value.originalStartFrame;
    let newEndFrame = dragState.value.originalEndFrame;

    switch (dragState.value.mode) {
      case "move": {
        // 整体移动
        const duration = newEndFrame - newStartFrame;
        newStartFrame = calculateSnappedFrame(
          dragState.value.originalStartFrame + deltaFrames,
          dragState.value.segmentId,
        );
        // 确保不会移动到负数帧
        newStartFrame = Math.max(0, newStartFrame);
        newEndFrame = newStartFrame + duration;
        break;
      }

      case "resize-start": {
        // 调整起始位置
        newStartFrame = calculateSnappedFrame(
          dragState.value.originalStartFrame + deltaFrames,
          dragState.value.segmentId,
        );
        // 确保 startFrame < endFrame 且不为负
        newStartFrame = Math.max(0, Math.min(newStartFrame, newEndFrame - 1));
        break;
      }

      case "resize-end": {
        // 调整结束位置
        newEndFrame = calculateSnappedFrame(
          dragState.value.originalEndFrame + deltaFrames,
          dragState.value.segmentId,
        );
        // 确保 endFrame > startFrame
        newEndFrame = Math.max(newStartFrame + 1, newEndFrame);
        break;
      }
    }

    // 调用更新回调
    if (onUpdateSegment) {
      onUpdateSegment(dragState.value.segmentId, newStartFrame, newEndFrame);
    }
  }

  /**
   * 结束拖拽
   */
  function endDrag(): void {
    dragState.value = {
      isDragging: false,
      mode: null,
      segmentId: null,
      startX: 0,
      startFrame: 0,
      originalStartFrame: 0,
      originalEndFrame: 0,
    };
    activeSnapPoint.value = null;

    // 移除全局事件监听
    document.removeEventListener("mousemove", onDrag);
    document.removeEventListener("mouseup", endDrag);
  }

  // ============ 返回 ============

  return {
    // 状态
    dragState,
    snapPoints,
    activeSnapPoint,

    // 方法
    startDrag,
    onDrag,
    endDrag,

    // 工具方法
    findNearestSnapPoint,
    calculateSnappedFrame,
  };
}
