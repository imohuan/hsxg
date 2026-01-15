import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { ref } from "vue";
import { useDragDrop, type DragMode } from "./useDragDrop";
import type { TimelineSegment } from "@/types";

describe("useDragDrop", () => {
  // 测试数据
  let currentFrame: ReturnType<typeof ref<number>>;
  let fps: ReturnType<typeof ref<number>>;
  let segments: ReturnType<typeof ref<TimelineSegment[]>>;
  let updateSegmentMock: ReturnType<typeof vi.fn>;

  // 像素与帧的转换（简化：1帧 = 10像素）
  const pxToFrame = (px: number) => Math.round(px / 10);
  const frameToPx = (frame: number) => frame * 10;

  beforeEach(() => {
    currentFrame = ref(0);
    fps = ref(30);
    segments = ref([
      { id: "seg1", stepId: "step1", trackId: "track1", startFrame: 0, endFrame: 30 },
      { id: "seg2", stepId: "step2", trackId: "track1", startFrame: 60, endFrame: 90 },
    ]);
    updateSegmentMock = vi.fn().mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function createDragDrop() {
    return useDragDrop({
      currentFrame,
      fps,
      segments,
      pxToFrame,
      frameToPx,
      onUpdateSegment: updateSegmentMock,
      snapThreshold: 10,
      gridSnapInterval: 5,
    });
  }

  // ============ 吸附点测试 ============

  describe("吸附点计算", () => {
    it("snapPoints 应包含时间指示器位置", () => {
      currentFrame.value = 50;
      const dragDrop = createDragDrop();
      const indicatorPoint = dragDrop.snapPoints.value.find(
        (p) => p.type === "indicator" && p.frame === 50,
      );
      expect(indicatorPoint).toBeDefined();
    });

    it("snapPoints 应包含所有片段的起止点", () => {
      const dragDrop = createDragDrop();
      const points = dragDrop.snapPoints.value;

      // seg1: 0-30
      expect(points.some((p) => p.frame === 0 && p.type === "segment-start")).toBe(true);
      expect(points.some((p) => p.frame === 30 && p.type === "segment-end")).toBe(true);

      // seg2: 60-90
      expect(points.some((p) => p.frame === 60 && p.type === "segment-start")).toBe(true);
      expect(points.some((p) => p.frame === 90 && p.type === "segment-end")).toBe(true);
    });

    it("snapPoints 应包含网格吸附点", () => {
      const dragDrop = createDragDrop();
      const gridPoints = dragDrop.snapPoints.value.filter((p) => p.type === "grid");
      // 应该有 5, 10, 15, 20, 25 等网格点（排除已有的片段点）
      expect(gridPoints.some((p) => p.frame === 5)).toBe(true);
      expect(gridPoints.some((p) => p.frame === 10)).toBe(true);
    });
  });

  // ============ 吸附逻辑测试 ============

  describe("吸附逻辑", () => {
    it("findNearestSnapPoint 应找到最近的吸附点", () => {
      const dragDrop = createDragDrop();
      // 帧 28 距离帧 30（seg1 结束点）只有 2 帧 = 20 像素，在阈值内
      const nearestPoint = dragDrop.findNearestSnapPoint(29);
      expect(nearestPoint).not.toBeNull();
      expect(nearestPoint?.frame).toBe(30);
    });

    it("findNearestSnapPoint 超出阈值时应返回 null", () => {
      const dragDrop = createDragDrop();
      // 帧 43 距离最近的吸附点（45 网格点）有 2 帧 = 20 像素，超过阈值 10
      const nearestPoint = dragDrop.findNearestSnapPoint(43);
      expect(nearestPoint).toBeNull();
    });

    it("calculateSnappedFrame 应返回吸附后的帧数", () => {
      const dragDrop = createDragDrop();
      // 帧 29 应该吸附到 30
      const snappedFrame = dragDrop.calculateSnappedFrame(29);
      expect(snappedFrame).toBe(30);
    });

    it("calculateSnappedFrame 无吸附时应返回原始帧数", () => {
      const dragDrop = createDragDrop();
      // 帧 45 无吸附点
      const snappedFrame = dragDrop.calculateSnappedFrame(45);
      expect(snappedFrame).toBe(45);
    });
  });


  // ============ 拖拽状态测试 ============

  describe("拖拽状态", () => {
    it("初始状态应为非拖拽", () => {
      const dragDrop = createDragDrop();
      expect(dragDrop.dragState.value.isDragging).toBe(false);
      expect(dragDrop.dragState.value.mode).toBeNull();
    });

    it("startDrag 应设置拖拽状态", () => {
      const dragDrop = createDragDrop();
      const mockEvent = { clientX: 100 } as MouseEvent;

      dragDrop.startDrag("seg1", "move", mockEvent);

      expect(dragDrop.dragState.value.isDragging).toBe(true);
      expect(dragDrop.dragState.value.mode).toBe("move");
      expect(dragDrop.dragState.value.segmentId).toBe("seg1");
      expect(dragDrop.dragState.value.startX).toBe(100);
    });

    it("startDrag 对不存在的片段应不生效", () => {
      const dragDrop = createDragDrop();
      const mockEvent = { clientX: 100 } as MouseEvent;

      dragDrop.startDrag("nonexistent", "move", mockEvent);

      expect(dragDrop.dragState.value.isDragging).toBe(false);
    });

    it("endDrag 应重置拖拽状态", () => {
      const dragDrop = createDragDrop();
      const mockEvent = { clientX: 100 } as MouseEvent;

      dragDrop.startDrag("seg1", "move", mockEvent);
      dragDrop.endDrag();

      expect(dragDrop.dragState.value.isDragging).toBe(false);
      expect(dragDrop.dragState.value.mode).toBeNull();
      expect(dragDrop.dragState.value.segmentId).toBeNull();
    });
  });

  // ============ 拖拽操作测试 ============

  describe("拖拽操作", () => {
    it("move 模式应整体移动片段", () => {
      const dragDrop = createDragDrop();
      const startEvent = { clientX: 0 } as MouseEvent;
      const moveEvent = { clientX: 100 } as MouseEvent; // 移动 100 像素 = 10 帧

      dragDrop.startDrag("seg1", "move", startEvent);
      dragDrop.onDrag(moveEvent);

      // 应该调用更新回调，新位置为 10-40（原 0-30 + 10帧偏移）
      expect(updateSegmentMock).toHaveBeenCalledWith("seg1", 10, 40);
    });

    it("resize-start 模式应调整起始位置", () => {
      const dragDrop = createDragDrop();
      const startEvent = { clientX: 0 } as MouseEvent;
      const moveEvent = { clientX: 50 } as MouseEvent; // 移动 50 像素 = 5 帧

      dragDrop.startDrag("seg1", "resize-start", startEvent);
      dragDrop.onDrag(moveEvent);

      // 起始位置从 0 变为 5，结束位置保持 30
      expect(updateSegmentMock).toHaveBeenCalledWith("seg1", 5, 30);
    });

    it("resize-end 模式应调整结束位置", () => {
      const dragDrop = createDragDrop();
      const startEvent = { clientX: 300 } as MouseEvent; // 帧 30 的位置
      const moveEvent = { clientX: 400 } as MouseEvent; // 移动 100 像素 = 10 帧

      dragDrop.startDrag("seg1", "resize-end", startEvent);
      dragDrop.onDrag(moveEvent);

      // 起始位置保持 0，结束位置从 30 变为 40
      expect(updateSegmentMock).toHaveBeenCalledWith("seg1", 0, 40);
    });

    it("move 模式不应允许移动到负数帧", () => {
      const dragDrop = createDragDrop();
      const startEvent = { clientX: 100 } as MouseEvent;
      const moveEvent = { clientX: -100 } as MouseEvent; // 向左移动 200 像素

      dragDrop.startDrag("seg1", "move", startEvent);
      dragDrop.onDrag(moveEvent);

      // 起始位置应该被限制为 0
      expect(updateSegmentMock).toHaveBeenCalled();
      const [, startFrame] = updateSegmentMock.mock.calls[0];
      expect(startFrame).toBeGreaterThanOrEqual(0);
    });

    it("resize-start 不应使 startFrame >= endFrame", () => {
      const dragDrop = createDragDrop();
      const startEvent = { clientX: 0 } as MouseEvent;
      const moveEvent = { clientX: 500 } as MouseEvent; // 移动 500 像素 = 50 帧，超过 endFrame

      dragDrop.startDrag("seg1", "resize-start", startEvent);
      dragDrop.onDrag(moveEvent);

      // startFrame 应该被限制为 endFrame - 1 = 29
      expect(updateSegmentMock).toHaveBeenCalled();
      const [, startFrame, endFrame] = updateSegmentMock.mock.calls[0];
      expect(startFrame).toBeLessThan(endFrame);
    });

    it("resize-end 不应使 endFrame <= startFrame", () => {
      const dragDrop = createDragDrop();
      const startEvent = { clientX: 300 } as MouseEvent;
      const moveEvent = { clientX: -100 } as MouseEvent; // 向左移动 400 像素

      dragDrop.startDrag("seg1", "resize-end", startEvent);
      dragDrop.onDrag(moveEvent);

      // endFrame 应该被限制为 startFrame + 1 = 1
      expect(updateSegmentMock).toHaveBeenCalled();
      const [, startFrame, endFrame] = updateSegmentMock.mock.calls[0];
      expect(endFrame).toBeGreaterThan(startFrame);
    });
  });

  // ============ 吸附激活测试 ============

  describe("吸附激活", () => {
    it("拖拽时接近吸附点应激活吸附", () => {
      const dragDrop = createDragDrop();
      const startEvent = { clientX: 0 } as MouseEvent;
      // 移动到接近 seg2 起始点（帧 60）的位置
      const moveEvent = { clientX: 590 } as MouseEvent; // 59 帧位置

      dragDrop.startDrag("seg1", "move", startEvent);
      dragDrop.onDrag(moveEvent);

      // 应该吸附到帧 60
      expect(dragDrop.activeSnapPoint.value).not.toBeNull();
    });

    it("endDrag 应清除激活的吸附点", () => {
      const dragDrop = createDragDrop();
      const startEvent = { clientX: 0 } as MouseEvent;
      const moveEvent = { clientX: 590 } as MouseEvent;

      dragDrop.startDrag("seg1", "move", startEvent);
      dragDrop.onDrag(moveEvent);
      dragDrop.endDrag();

      expect(dragDrop.activeSnapPoint.value).toBeNull();
    });
  });
});
