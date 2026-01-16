/**
 * @file 可拖拽分割面板 Hook
 * @description 实现类似 split-view 的拖拽调整面板大小功能
 */
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useStorage } from "@vueuse/core";

export interface UseSplitPaneOptions {
  /** 存储键名，用于持久化 */
  storageKey?: string;
  /** 初始上方面板高度百分比 (0-100) */
  initialTopPercent?: number;
  /** 最小上方面板高度百分比 */
  minTopPercent?: number;
  /** 最大上方面板高度百分比 */
  maxTopPercent?: number;
}

export function useSplitPane(options: UseSplitPaneOptions = {}) {
  const { storageKey, initialTopPercent = 50, minTopPercent = 20, maxTopPercent = 80 } = options;

  // 使用 localStorage 持久化（如果提供了 storageKey）
  const topPercent = storageKey ? useStorage(storageKey, initialTopPercent) : ref(initialTopPercent);

  // 容器引用
  const containerRef = ref<HTMLElement | null>(null);

  // 拖拽状态
  const isDragging = ref(false);
  const startY = ref(0);
  const startPercent = ref(0);

  // 计算样式
  const topStyle = computed(() => ({
    height: `${topPercent.value}%`,
  }));

  const bottomStyle = computed(() => ({
    height: `${100 - topPercent.value}%`,
  }));

  // 开始拖拽
  const startDrag = (e: MouseEvent) => {
    e.preventDefault();
    isDragging.value = true;
    startY.value = e.clientY;
    startPercent.value = topPercent.value;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  };

  // 拖拽中
  const onDrag = (e: MouseEvent) => {
    if (!isDragging.value || !containerRef.value) return;

    const containerRect = containerRef.value.getBoundingClientRect();
    const containerHeight = containerRect.height;
    const deltaY = e.clientY - startY.value;
    const deltaPercent = (deltaY / containerHeight) * 100;

    let newPercent = startPercent.value + deltaPercent;
    newPercent = Math.max(minTopPercent, Math.min(maxTopPercent, newPercent));
    topPercent.value = newPercent;
  };

  // 结束拖拽
  const stopDrag = () => {
    if (!isDragging.value) return;
    isDragging.value = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };

  // 生命周期
  onMounted(() => {
    document.addEventListener("mousemove", onDrag);
    document.addEventListener("mouseup", stopDrag);
  });

  onBeforeUnmount(() => {
    document.removeEventListener("mousemove", onDrag);
    document.removeEventListener("mouseup", stopDrag);
  });

  return {
    containerRef,
    topPercent,
    topStyle,
    bottomStyle,
    isDragging,
    startDrag,
  };
}
