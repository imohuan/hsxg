/**
 * @file 容器可见性监听 Hook
 * @description 监听容器从隐藏变为可见时触发回调，用于处理 tab 切换等场景下的视图重置
 */

import type { Ref } from "vue";
import { useResizeObserver } from "@vueuse/core";

/**
 * 监听容器可见性变化
 * @param target 要监听的元素引用
 * @param callback 当容器从隐藏变为可见时触发的回调函数
 * @param options 配置选项
 */
export function useContainerVisibility(
  target: Ref<HTMLElement | null | undefined>,
  callback: () => void,
  options?: {
    /** 延迟执行回调的时间（毫秒），默认 50ms */
    delay?: number;
    /** 是否在挂载时如果容器已可见也触发回调，默认 true */
    triggerOnMount?: boolean;
  }
) {
  const delay = options?.delay ?? 50;
  const triggerOnMount = options?.triggerOnMount ?? true;

  let lastWidth = 0;
  let lastHeight = 0;
  let isInitialized = false;

  // 使用 VueUse 的 useResizeObserver 监听容器尺寸变化
  useResizeObserver(target, (entries) => {
    const entry = entries[0];
    if (!entry) return;

    const { width, height } = entry.contentRect;

    // 初始化时记录初始尺寸
    if (!isInitialized) {
      lastWidth = width;
      lastHeight = height;
      isInitialized = true;

      // 如果容器在挂载时已经可见，也触发回调
      if (triggerOnMount && width > 0 && height > 0) {
        setTimeout(() => {
          callback();
        }, delay * 2); // 挂载时延迟稍长一些
      }
      return;
    }

    // 当容器从隐藏变为可见时（尺寸从 0 变为有效值），触发回调
    if ((lastWidth === 0 || lastHeight === 0) && width > 0 && height > 0) {
      setTimeout(() => {
        callback();
      }, delay);
    }

    lastWidth = width;
    lastHeight = height;
  });
}
