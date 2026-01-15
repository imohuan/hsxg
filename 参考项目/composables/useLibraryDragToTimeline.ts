import { onBeforeUnmount, ref } from "vue";

export interface LibraryDragPayload {
  type: string;
  label: string;
  clientX: number;
  clientY: number;
  // 由时间轴根据 ghostItem 写回的最终状态快照
  overTimeline?: boolean;
  targetTime?: number;
  trackId?: string;
}

export interface LibraryDragState {
  type: string;
  label: string;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  x: number;
  y: number;
  // 是否正在时间轴区域上方，由时间轴组件根据坐标计算并回写
  overTimeline?: boolean;
  // 当 overTimeline 为 true 时，时间轴可以把当前命中的时间与轨道写回这里
  targetTime?: number;
  trackId?: string;
}

// 全局共享的拖拽状态，供多个组件同时观察
export const libraryDraggingRef = ref<LibraryDragState | null>(null);

export function useLibraryDragToTimeline(
  emitDrop: (payload: LibraryDragPayload) => void
) {
  const onMouseDown = (event: MouseEvent, type: string, label: string) => {
    const target = event.currentTarget as HTMLElement | null;
    if (!target) return;

    const rect = target.getBoundingClientRect();
    libraryDraggingRef.value = {
      type,
      label,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      x: event.clientX,
      y: event.clientY,
      overTimeline: false,
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (event: MouseEvent) => {
    if (!libraryDraggingRef.value) return;
    libraryDraggingRef.value = {
      ...libraryDraggingRef.value,
      x: event.clientX,
      y: event.clientY,
    };
  };

  const handleMouseUp = (event: MouseEvent) => {
    if (libraryDraggingRef.value) {
      emitDrop({
        type: libraryDraggingRef.value.type,
        label: libraryDraggingRef.value.label,
        clientX: event.clientX,
        clientY: event.clientY,
        overTimeline: libraryDraggingRef.value.overTimeline,
        targetTime: libraryDraggingRef.value.targetTime,
        trackId: libraryDraggingRef.value.trackId,
      });
    }
    cleanup();
  };

  const cleanup = () => {
    libraryDraggingRef.value = null;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  onBeforeUnmount(() => {
    cleanup();
  });

  return {
    dragging: libraryDraggingRef,
    onMouseDown,
  };
}
