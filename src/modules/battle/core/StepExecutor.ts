/**
 * 步骤执行器
 * 执行技能编排中的各种步骤
 */

import type { SkillStep, EasingType, MoveOptions, EffectOptions, DamageType } from "@/types";

/** 步骤执行器依赖 */
export interface StepExecutorDeps {
  // 单位控制
  moveUnit: (unitId: string, x: number, y: number, options?: MoveOptions) => Promise<void>;
  setUnitPosition: (unitId: string, x: number, y: number) => void;
  resetUnitPosition: (unitId: string) => void;
  getUnitPosition: (unitId: string) => { x: number; y: number } | null;

  // 特效控制
  playEffect: (effectId: string, x: number, y: number, options?: EffectOptions) => Promise<string>;
  playEffectOnUnit: (effectId: string, unitId: string, options?: EffectOptions) => Promise<string>;
  stopEffect: (instanceId: string) => void;

  // 视角控制
  shakeCamera: (intensity: number, duration: number) => Promise<void>;
  moveCamera: (offsetX: number, offsetY: number, duration: number, easing?: EasingType) => Promise<void>;
  zoomCamera: (scale: number, duration: number, easing?: EasingType) => Promise<void>;
  resetCamera: (duration?: number) => Promise<void>;

  // 背景控制
  setBackground: (imageUrl: string) => Promise<void>;
  setBackgroundColor: (color: string) => void;
  flashScreen: (color: string, duration: number) => Promise<void>;

  // 音效控制
  playSound: (soundId: string, options?: { volume?: number; loop?: boolean }) => string;
  stopSound: (instanceId: string) => void;

  // 伤害显示
  showDamageNumber: (unitId: string, value: number, type?: DamageType) => void;
  updateUnitHp: (unitId: string, currentHp: number, maxHp?: number) => void;
  updateUnitMp: (unitId: string, currentMp: number, maxMp?: number) => void;
}

/** 步骤执行器 */
export class StepExecutor {
  constructor(private deps: StepExecutorDeps) {}

  /** 执行单个步骤 */
  async executeStep(step: SkillStep): Promise<void> {
    const { type, params } = step;

    switch (type) {
      case "move":
        await this.executeMove(params);
        break;
      case "damage":
        await this.executeDamage(params);
        break;
      case "effect":
        await this.executeEffect(params);
        break;
      case "wait":
        await this.executeWait(params);
        break;
      case "camera":
        await this.executeCamera(params);
        break;
      case "shake":
        await this.executeShake(params);
        break;
      case "background":
        await this.executeBackground(params);
        break;
      case "sound":
        await this.executeSound(params);
        break;
      default:
        console.warn(`未知步骤类型: ${type}`);
    }
  }

  /** 顺序执行多个步骤 */
  async executeSteps(steps: SkillStep[]): Promise<void> {
    for (const step of steps) {
      await this.executeStep(step);
    }
  }

  /** 并行执行多个步骤 */
  async executeStepsParallel(steps: SkillStep[]): Promise<void> {
    await Promise.all(steps.map((step) => this.executeStep(step)));
  }

  /** 执行移动步骤 */
  private async executeMove(params: SkillStep["params"]): Promise<void> {
    const { targetX, targetY, duration = 300, ease = "easeOut" } = params;
    const unitId = params.unitId as string | undefined;

    if (!unitId) {
      console.warn("移动步骤缺少 unitId");
      return;
    }

    // 解析目标位置
    const x = this.resolvePosition(targetX, "x", unitId);
    const y = this.resolvePosition(targetY, "y", unitId);

    if (x === null || y === null) return;

    await this.deps.moveUnit(unitId, x, y, {
      duration: duration as number,
      easing: ease as EasingType,
    });
  }

  /** 执行伤害步骤 */
  private async executeDamage(params: SkillStep["params"]): Promise<void> {
    const { value = 0, targetId, type = "damage" } = params;
    const unitId = (targetId as string) || (params.unitId as string);

    if (!unitId) {
      console.warn("伤害步骤缺少目标 ID");
      return;
    }

    const damageValue = typeof value === "string" ? parseInt(value, 10) : (value as number);
    this.deps.showDamageNumber(unitId, damageValue, type as DamageType);
  }

  /** 执行特效步骤 */
  private async executeEffect(params: SkillStep["params"]): Promise<void> {
    const { effectId, x, y, targetId, scale = 1, rotation = 0, alpha = 1, loop = false } = params;

    if (!effectId) {
      console.warn("特效步骤缺少 effectId");
      return;
    }

    const options: EffectOptions = {
      scale: scale as number,
      rotation: rotation as number,
      alpha: alpha as number,
      loop: loop as boolean,
    };

    // 如果指定了目标单位，在单位位置播放
    if (targetId) {
      await this.deps.playEffectOnUnit(effectId as string, targetId as string, options);
    } else {
      // 否则在指定位置播放
      const posX = this.resolvePosition(x, "x") ?? 0;
      const posY = this.resolvePosition(y, "y") ?? 0;
      await this.deps.playEffect(effectId as string, posX, posY, options);
    }
  }

  /** 执行等待步骤 */
  private async executeWait(params: SkillStep["params"]): Promise<void> {
    const { delay = 0 } = params;
    const ms = typeof delay === "string" ? parseInt(delay, 10) : (delay as number);
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** 执行镜头步骤 */
  private async executeCamera(params: SkillStep["params"]): Promise<void> {
    const { zoom, offsetX, offsetY, duration = 300, ease = "easeOut", reset } = params;

    if (reset) {
      await this.deps.resetCamera(duration as number);
      return;
    }

    const promises: Promise<void>[] = [];

    if (zoom !== undefined) {
      promises.push(this.deps.zoomCamera(zoom as number, duration as number, ease as EasingType));
    }

    if (offsetX !== undefined || offsetY !== undefined) {
      promises.push(
        this.deps.moveCamera(
          (offsetX as number) ?? 0,
          (offsetY as number) ?? 0,
          duration as number,
          ease as EasingType,
        ),
      );
    }

    await Promise.all(promises);
  }

  /** 执行震动步骤 */
  private async executeShake(params: SkillStep["params"]): Promise<void> {
    const { intensity = 10, duration = 300 } = params;
    await this.deps.shakeCamera(intensity as number, duration as number);
  }

  /** 执行背景步骤 */
  private async executeBackground(params: SkillStep["params"]): Promise<void> {
    const { color, image, flash, duration = 300 } = params;

    if (flash) {
      await this.deps.flashScreen(flash as string, duration as number);
    } else if (image) {
      await this.deps.setBackground(image as string);
    } else if (color) {
      this.deps.setBackgroundColor(color as string);
    }
  }

  /** 执行音效步骤 */
  private async executeSound(params: SkillStep["params"]): Promise<void> {
    const { soundId, volume = 1, loop = false } = params;

    if (!soundId) {
      console.warn("音效步骤缺少 soundId");
      return;
    }

    this.deps.playSound(soundId as string, {
      volume: volume as number,
      loop: loop as boolean,
    });
  }

  /** 解析位置值（支持相对位置） */
  private resolvePosition(value: unknown, axis: "x" | "y", unitId?: string): number | null {
    if (value === undefined || value === null) return null;

    // 数字直接返回
    if (typeof value === "number") return value;

    // 字符串解析
    if (typeof value === "string") {
      // 相对位置：如 "+100" 或 "-50"
      if (value.startsWith("+") || value.startsWith("-")) {
        const offset = parseInt(value, 10);
        if (unitId) {
          const pos = this.deps.getUnitPosition(unitId);
          if (pos) {
            return axis === "x" ? pos.x + offset : pos.y + offset;
          }
        }
        return offset;
      }

      // 绝对位置
      return parseInt(value, 10);
    }

    return null;
  }
}
