/**
 * 特效管理器
 * 管理战斗特效的播放和渲染
 * Requirements: 10.1-10.6
 */

import { ref, readonly } from "vue";
import type { EffectInstance, EffectOptions, EffectConfig } from "@/types";

/** 特效管理器配置 */
export interface EffectManagerConfig {
  /** 特效配置列表 */
  effects?: EffectConfig[];
}

/** 获取单位位置的回调函数类型 */
export type GetUnitPositionFn = (unitId: string) => { x: number; y: number } | undefined;

export function useEffectManager(config: EffectManagerConfig = {}) {
  // 活跃特效实例
  const activeEffects = ref<Map<string, EffectInstance>>(new Map());

  // 特效配置缓存
  const effectConfigs = new Map<string, EffectConfig>();

  // 特效图片缓存
  const effectImages = new Map<string, HTMLImageElement>();

  // 动画帧 ID
  const animationIds = new Map<string, number>();

  // ID 计数器
  let instanceIdCounter = 0;

  // 获取单位位置的回调函数
  let getUnitPositionFn: GetUnitPositionFn | null = null;

  /** 设置获取单位位置的回调函数 */
  function setGetUnitPositionFn(fn: GetUnitPositionFn) {
    getUnitPositionFn = fn;
  }

  /** 注册特效配置 */
  function registerEffect(effectConfig: EffectConfig) {
    effectConfigs.set(effectConfig.id, effectConfig);
  }

  /** 批量注册特效 */
  function registerEffects(effects: EffectConfig[]) {
    effects.forEach(registerEffect);
  }

  /** 预加载特效图片 */
  async function preloadEffect(effectId: string): Promise<void> {
    const config = effectConfigs.get(effectId);
    if (!config || effectImages.has(effectId)) return;

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        effectImages.set(effectId, img);
        resolve();
      };
      img.onerror = reject;
      img.src = config.sprite.url;
    });
  }

  /** 生成实例 ID */
  function generateInstanceId(): string {
    return `effect_${++instanceIdCounter}_${Date.now()}`;
  }

  /** 播放特效 */
  async function playEffect(effectId: string, x: number, y: number, options: EffectOptions = {}): Promise<string> {
    const config = effectConfigs.get(effectId);
    if (!config) {
      console.warn(`特效 ${effectId} 未注册`);
      return "";
    }

    // 确保图片已加载
    if (!effectImages.has(effectId)) {
      await preloadEffect(effectId);
    }

    const instanceId = generateInstanceId();
    const { scale = 1, rotation = 0, alpha = 1, loop = false } = options;

    const instance: EffectInstance = {
      id: instanceId,
      effectId,
      x,
      y,
      scale,
      rotation,
      alpha,
      currentFrame: 0,
      loop,
      createdAt: Date.now(),
    };

    activeEffects.value.set(instanceId, instance);

    // 启动帧动画
    const animation = config.animations[0];
    if (animation) {
      const frameInterval = 1000 / animation.fps;
      const totalFrames = animation.frames.length;

      return new Promise((resolve) => {
        let lastFrameTime = performance.now();

        function animate() {
          const now = performance.now();
          const elapsed = now - lastFrameTime;

          if (elapsed >= frameInterval) {
            lastFrameTime = now - (elapsed % frameInterval);
            instance.currentFrame++;

            if (instance.currentFrame >= totalFrames) {
              if (loop) {
                instance.currentFrame = 0;
              } else {
                // 动画结束，移除特效
                stopEffect(instanceId);
                resolve(instanceId);
                return;
              }
            }
          }

          if (activeEffects.value.has(instanceId)) {
            const animId = requestAnimationFrame(animate);
            animationIds.set(instanceId, animId);
          }
        }

        const animId = requestAnimationFrame(animate);
        animationIds.set(instanceId, animId);

        // 如果是循环特效，立即返回
        if (loop) {
          resolve(instanceId);
        }
      });
    }

    return instanceId;
  }

  /**
   * 在角色位置播放特效
   * Requirements: 10.2
   */
  async function playEffectOnUnit(effectId: string, unitId: string, options: EffectOptions = {}): Promise<string> {
    if (!getUnitPositionFn) {
      console.warn("未设置获取单位位置的回调函数");
      return "";
    }

    const position = getUnitPositionFn(unitId);
    if (!position) {
      console.warn(`单位 ${unitId} 不存在`);
      return "";
    }

    return playEffect(effectId, position.x, position.y, options);
  }

  /** 停止特效 */
  function stopEffect(instanceId: string) {
    const animId = animationIds.get(instanceId);
    if (animId !== undefined) {
      cancelAnimationFrame(animId);
      animationIds.delete(instanceId);
    }
    activeEffects.value.delete(instanceId);
  }

  /** 停止所有特效 */
  function stopAllEffects() {
    animationIds.forEach((animId) => cancelAnimationFrame(animId));
    animationIds.clear();
    activeEffects.value.clear();
  }

  /** 绘制特效到 Canvas */
  function drawEffects(ctx: CanvasRenderingContext2D) {
    activeEffects.value.forEach((instance) => {
      const config = effectConfigs.get(instance.effectId);
      const img = effectImages.get(instance.effectId);
      if (!config || !img) return;

      const animation = config.animations[0];
      if (!animation) return;

      const frameIndex = animation.frames[instance.currentFrame] ?? 0;
      const { rows, cols } = config.sprite;
      const frameWidth = img.width / cols;
      const frameHeight = img.height / rows;

      const srcX = (frameIndex % cols) * frameWidth;
      const srcY = Math.floor(frameIndex / cols) * frameHeight;

      ctx.save();
      ctx.translate(instance.x, instance.y);
      ctx.rotate(instance.rotation);
      ctx.scale(instance.scale, instance.scale);
      ctx.globalAlpha = instance.alpha;

      ctx.drawImage(
        img,
        srcX,
        srcY,
        frameWidth,
        frameHeight,
        -frameWidth / 2,
        -frameHeight / 2,
        frameWidth,
        frameHeight,
      );

      ctx.restore();
    });
  }

  /** 获取特效配置 */
  function getEffectConfig(effectId: string): EffectConfig | undefined {
    return effectConfigs.get(effectId);
  }

  /** 销毁 */
  function dispose() {
    stopAllEffects();
    effectConfigs.clear();
    effectImages.clear();
  }

  // 初始化时注册配置
  if (config.effects) {
    registerEffects(config.effects);
  }

  return {
    activeEffects: readonly(activeEffects),
    setGetUnitPositionFn,
    registerEffect,
    registerEffects,
    preloadEffect,
    playEffect,
    playEffectOnUnit,
    stopEffect,
    stopAllEffects,
    drawEffects,
    getEffectConfig,
    dispose,
  };
}
