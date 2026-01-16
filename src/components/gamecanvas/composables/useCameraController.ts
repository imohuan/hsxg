/**
 * 视角控制器
 * 实现画布的缩放、平移、震动、聚焦功能
 * Requirements: 6.1-6.6, 11.1-11.6
 */

import { ref, computed, type Ref, type ComputedRef } from "vue";
import type { CameraState, EasingType, UnitPosition } from "@/types";

/** 缓动函数类型 */
type EasingFunction = (t: number) => number;

/** 缓动函数映射 */
const EASING_FUNCTIONS: Record<EasingType, EasingFunction> = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => t * (2 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  bounce: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  },
};

/** 视角控制器配置 */
export interface CameraControllerConfig {
  /** 画布宽度 */
  canvasWidth: number;
  /** 画布高度 */
  canvasHeight: number;
  /** 最小缩放 */
  minZoom?: number;
  /** 最大缩放 */
  maxZoom?: number;
  /** 是否启用变换 */
  enableTransform?: boolean;
}

/** 动画任务 */
interface CameraAnimationTask {
  type: "move" | "zoom" | "shake";
  startState: CameraState;
  targetState: CameraState;
  duration: number;
  easing: EasingFunction;
  startTime: number;
  resolve: () => void;
  // 震动专用
  shakeIntensity?: number;
}

const DEFAULT_CONFIG = {
  minZoom: 0.5,
  maxZoom: 2.5,
  enableTransform: true,
};

/**
 * 限制缩放范围
 * Requirements: 6.3
 */
export function clampZoom(zoom: number, min: number = 0.5, max: number = 2.5): number {
  return Math.max(min, Math.min(max, zoom));
}

/**
 * 视角控制器 Composable
 * Requirements: 6.1-6.6, 11.1-11.6
 */
export function useCameraController(config: CameraControllerConfig) {
  const fullConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  // 当前尺寸（可变）
  let currentWidth = fullConfig.canvasWidth;
  let currentHeight = fullConfig.canvasHeight;

  // ============ 状态 ============

  /** 相机状态 */
  const cameraState: Ref<CameraState> = ref({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });

  /** 初始相机状态 */
  const initialState: CameraState = {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  };

  /** 当前动画任务 */
  const currentTask: Ref<CameraAnimationTask | null> = ref(null);

  /** 动画帧 ID */
  let animationFrameId: number | null = null;

  /** 是否启用变换 */
  const transformEnabled: Ref<boolean> = ref(fullConfig.enableTransform);

  // ============ 计算属性 ============

  /** 当前缩放比例 */
  const currentZoom: ComputedRef<number> = computed(() => cameraState.value.scale);

  /** 缩放百分比显示 */
  const zoomPercentage: ComputedRef<string> = computed(() => {
    return `${Math.round(cameraState.value.scale * 100)}%`;
  });

  /** 是否正在动画中 */
  const isAnimating: ComputedRef<boolean> = computed(() => currentTask.value !== null);

  // ============ 缩放控制 ============

  /**
   * 设置缩放
   * Requirements: 6.3
   */
  function setZoom(scale: number): void {
    cameraState.value.scale = clampZoom(scale, fullConfig.minZoom, fullConfig.maxZoom);
  }

  /**
   * 缩放相机（带动画）
   * Requirements: 11.3
   */
  function zoomCamera(scale: number, duration: number, easing: EasingType = "easeOut"): Promise<void> {
    return new Promise((resolve) => {
      if (!transformEnabled.value || duration <= 0) {
        setZoom(scale);
        resolve();
        return;
      }

      const targetScale = clampZoom(scale, fullConfig.minZoom, fullConfig.maxZoom);
      const easingFn = EASING_FUNCTIONS[easing] || EASING_FUNCTIONS.linear;

      const task: CameraAnimationTask = {
        type: "zoom",
        startState: { ...cameraState.value },
        targetState: {
          ...cameraState.value,
          scale: targetScale,
        },
        duration,
        easing: easingFn,
        startTime: performance.now(),
        resolve,
      };

      currentTask.value = task;
      startAnimationLoop();
    });
  }

  /**
   * 鼠标滚轮缩放
   * 以鼠标位置为中心进行缩放
   * Requirements: 6.1
   */
  function handleWheel(deltaY: number, mouseX: number, mouseY: number): void {
    if (!transformEnabled.value) return;

    const oldScale = cameraState.value.scale;
    const zoomFactor = deltaY > 0 ? 0.9 : 1.1;
    const newScale = clampZoom(oldScale * zoomFactor, fullConfig.minZoom, fullConfig.maxZoom);

    // 如果缩放没有变化，直接返回
    if (newScale === oldScale) return;

    // 以鼠标位置为中心缩放
    // 计算鼠标在画布坐标系中的位置
    const canvasX = (mouseX - cameraState.value.offsetX) / oldScale;
    const canvasY = (mouseY - cameraState.value.offsetY) / oldScale;

    // 更新缩放
    cameraState.value.scale = newScale;

    // 调整偏移，使鼠标位置保持不变
    cameraState.value.offsetX = mouseX - canvasX * newScale;
    cameraState.value.offsetY = mouseY - canvasY * newScale;
  }

  // ============ 平移控制 ============

  /**
   * 设置偏移
   */
  function setOffset(offsetX: number, offsetY: number): void {
    cameraState.value.offsetX = offsetX;
    cameraState.value.offsetY = offsetY;
  }

  /**
   * 移动相机（带动画）
   * Requirements: 11.2
   */
  function moveCamera(
    offsetX: number,
    offsetY: number,
    duration: number,
    easing: EasingType = "easeOut",
  ): Promise<void> {
    return new Promise((resolve) => {
      if (!transformEnabled.value || duration <= 0) {
        setOffset(offsetX, offsetY);
        resolve();
        return;
      }

      const easingFn = EASING_FUNCTIONS[easing] || EASING_FUNCTIONS.linear;

      const task: CameraAnimationTask = {
        type: "move",
        startState: { ...cameraState.value },
        targetState: {
          ...cameraState.value,
          offsetX,
          offsetY,
        },
        duration,
        easing: easingFn,
        startTime: performance.now(),
        resolve,
      };

      currentTask.value = task;
      startAnimationLoop();
    });
  }

  /**
   * 鼠标拖拽平移
   * Requirements: 6.2
   */
  function handleDrag(deltaX: number, deltaY: number): void {
    if (!transformEnabled.value) return;

    cameraState.value.offsetX += deltaX;
    cameraState.value.offsetY += deltaY;
  }

  // ============ 震动效果 ============

  /**
   * 视角震动
   * Requirements: 11.1
   */
  function shakeCamera(intensity: number, duration: number): Promise<void> {
    return new Promise((resolve) => {
      const task: CameraAnimationTask = {
        type: "shake",
        startState: { ...cameraState.value },
        targetState: { ...cameraState.value },
        duration,
        easing: EASING_FUNCTIONS.linear,
        startTime: performance.now(),
        resolve,
        shakeIntensity: intensity,
      };

      currentTask.value = task;
      startAnimationLoop();
    });
  }

  // ============ 聚焦功能 ============

  /**
   * 聚焦到指定位置
   * Requirements: 11.5
   */
  function focusOnPosition(x: number, y: number, duration: number = 500): Promise<void> {
    const canvasCenterX = currentWidth / 2;
    const canvasCenterY = currentHeight / 2;

    // 计算目标偏移量，使指定位置显示在画布中心
    const targetOffsetX = canvasCenterX - x * cameraState.value.scale;
    const targetOffsetY = canvasCenterY - y * cameraState.value.scale;

    return moveCamera(targetOffsetX, targetOffsetY, duration, "easeOut");
  }

  /**
   * 聚焦到单位
   * Requirements: 11.5
   */
  function focusOnUnit(unitPosition: UnitPosition, duration: number = 500): Promise<void> {
    return focusOnPosition(unitPosition.x, unitPosition.y, duration);
  }

  // ============ 重置功能 ============

  /**
   * 重置相机
   * Requirements: 6.4, 11.4
   */
  function resetCamera(duration: number = 300): Promise<void> {
    return new Promise((resolve) => {
      if (duration <= 0) {
        cameraState.value = { ...initialState };
        resolve();
        return;
      }

      const easingFn = EASING_FUNCTIONS.easeOut;

      const task: CameraAnimationTask = {
        type: "move",
        startState: { ...cameraState.value },
        targetState: { ...initialState },
        duration,
        easing: easingFn,
        startTime: performance.now(),
        resolve,
      };

      currentTask.value = task;
      startAnimationLoop();
    });
  }

  // ============ 动画循环 ============

  /**
   * 启动动画循环
   */
  function startAnimationLoop(): void {
    if (animationFrameId !== null) return;

    const loop = (timestamp: number) => {
      updateAnimation(timestamp);

      if (currentTask.value !== null) {
        animationFrameId = requestAnimationFrame(loop);
      } else {
        animationFrameId = null;
      }
    };

    animationFrameId = requestAnimationFrame(loop);
  }

  /**
   * 更新动画
   */
  function updateAnimation(timestamp: number): void {
    const task = currentTask.value;
    if (!task) return;

    const elapsed = timestamp - task.startTime;
    const progress = Math.min(1, elapsed / task.duration);

    if (task.type === "shake") {
      // 震动效果
      const intensity = task.shakeIntensity || 10;
      const decay = 1 - progress; // 衰减
      const shakeX = (Math.random() - 0.5) * 2 * intensity * decay;
      const shakeY = (Math.random() - 0.5) * 2 * intensity * decay;

      cameraState.value.offsetX = task.startState.offsetX + shakeX;
      cameraState.value.offsetY = task.startState.offsetY + shakeY;
    } else {
      // 移动/缩放动画
      const easedProgress = task.easing(progress);

      cameraState.value.scale =
        task.startState.scale + (task.targetState.scale - task.startState.scale) * easedProgress;

      cameraState.value.offsetX =
        task.startState.offsetX + (task.targetState.offsetX - task.startState.offsetX) * easedProgress;

      cameraState.value.offsetY =
        task.startState.offsetY + (task.targetState.offsetY - task.startState.offsetY) * easedProgress;
    }

    // 检查是否完成
    if (progress >= 1) {
      if (task.type === "shake") {
        // 震动结束后恢复原位
        cameraState.value.offsetX = task.startState.offsetX;
        cameraState.value.offsetY = task.startState.offsetY;
      }
      task.resolve();
      currentTask.value = null;
    }
  }

  /**
   * 停止动画
   */
  function stopAnimation(): void {
    if (currentTask.value) {
      currentTask.value.resolve();
      currentTask.value = null;
    }

    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  // ============ 变换控制 ============

  /**
   * 启用/禁用变换
   * Requirements: 6.6
   */
  function setTransformEnabled(enabled: boolean): void {
    transformEnabled.value = enabled;
    if (!enabled) {
      // 禁用时重置相机
      cameraState.value = { ...initialState };
    }
  }

  /**
   * 调整尺寸
   */
  function resize(width: number, height: number): void {
    currentWidth = width;
    currentHeight = height;
  }

  // ============ 坐标转换 ============

  /**
   * 屏幕坐标转画布坐标
   */
  function screenToCanvas(screenX: number, screenY: number): UnitPosition {
    return {
      x: (screenX - cameraState.value.offsetX) / cameraState.value.scale,
      y: (screenY - cameraState.value.offsetY) / cameraState.value.scale,
    };
  }

  /**
   * 画布坐标转屏幕坐标
   */
  function canvasToScreen(canvasX: number, canvasY: number): UnitPosition {
    return {
      x: canvasX * cameraState.value.scale + cameraState.value.offsetX,
      y: canvasY * cameraState.value.scale + cameraState.value.offsetY,
    };
  }

  return {
    // 状态
    cameraState,
    currentZoom,
    zoomPercentage,
    isAnimating,
    transformEnabled,

    // 缩放
    setZoom,
    zoomCamera,
    handleWheel,

    // 平移
    setOffset,
    moveCamera,
    handleDrag,

    // 震动
    shakeCamera,

    // 聚焦
    focusOnPosition,
    focusOnUnit,

    // 重置
    resetCamera,

    // 变换控制
    setTransformEnabled,

    // 尺寸调整
    resize,

    // 坐标转换
    screenToCanvas,
    canvasToScreen,

    // 动画控制
    stopAnimation,
  };
}

/** Hook 返回类型 */
export type UseCameraControllerReturn = ReturnType<typeof useCameraController>;
