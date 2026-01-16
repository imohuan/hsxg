/**
 * 缓动函数模块
 * 提供常用的动画缓动效果
 */

import type { EasingType } from "@/types";

/** 缓动函数类型 */
export type EasingFunction = (t: number) => number;

/**
 * 线性缓动 - 匀速运动
 */
export function linear(t: number): number {
  return t;
}

/**
 * 缓入 - 慢启动
 */
export function easeIn(t: number): number {
  return t * t;
}

/**
 * 缓出 - 慢结束
 */
export function easeOut(t: number): number {
  return t * (2 - t);
}

/**
 * 缓入缓出 - 慢启动慢结束
 */
export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

/**
 * 弹跳效果
 */
export function bounce(t: number): number {
  if (t < 1 / 2.75) {
    return 7.5625 * t * t;
  } else if (t < 2 / 2.75) {
    const t2 = t - 1.5 / 2.75;
    return 7.5625 * t2 * t2 + 0.75;
  } else if (t < 2.5 / 2.75) {
    const t2 = t - 2.25 / 2.75;
    return 7.5625 * t2 * t2 + 0.9375;
  } else {
    const t2 = t - 2.625 / 2.75;
    return 7.5625 * t2 * t2 + 0.984375;
  }
}

/** 缓动函数映射表 */
const easingMap: Record<EasingType, EasingFunction> = {
  linear,
  easeIn,
  easeOut,
  easeInOut,
  bounce,
};

/**
 * 根据类型获取缓动函数
 */
export function getEasingFunction(type: EasingType): EasingFunction {
  return easingMap[type] || linear;
}

/**
 * 应用缓动计算插值
 * @param start 起始值
 * @param end 结束值
 * @param progress 进度 (0-1)
 * @param easing 缓动类型
 */
export function interpolate(start: number, end: number, progress: number, easing: EasingType = "linear"): number {
  const easingFn = getEasingFunction(easing);
  const t = Math.max(0, Math.min(1, progress)); // 限制在 0-1 范围
  return start + (end - start) * easingFn(t);
}
