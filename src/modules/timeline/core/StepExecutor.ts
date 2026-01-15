/**
 * @file 步骤执行器
 * 实现各类技能步骤的执行逻辑
 * Requirements: 8.1-8.7
 */
import type { SkillStep, StepParams, StepType } from "@/types";

/** 执行上下文 - 提供步骤执行所需的环境 */
export interface ExecutionContext {
  /** 攻击方位置 */
  attackerPosition: { x: number; y: number };
  /** 攻击方原始位置 */
  attackerOriginPosition: { x: number; y: number };
  /** 被攻击方位置列表 */
  targetPositions: { x: number; y: number }[];
  /** 画布尺寸 */
  canvasSize: { width: number; height: number };
  /** 当前镜头状态 */
  cameraState: {
    x: number;
    y: number;
    zoom: number;
  };
  /** 当前背景 */
  background: {
    color?: string;
    image?: string;
  };
}

/** 步骤执行结果 */
export interface StepExecutionResult {
  /** 执行是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
  /** 执行产生的效果 */
  effects?: StepEffect[];
}

/** 步骤效果 - 描述步骤执行后的视觉/状态变化 */
export interface StepEffect {
  /** 效果类型 */
  type: "move" | "damage" | "effect" | "camera" | "shake" | "background";
  /** 效果目标 */
  target: "attacker" | "target" | "camera" | "scene";
  /** 效果参数 */
  params: Record<string, unknown>;
}

/** 步骤执行器回调 */
export interface StepExecutorCallbacks {
  /** 移动回调 */
  onMove?: (target: "attacker" | "target", x: number, y: number, duration: number, ease: string) => void;
  /** 伤害回调 */
  onDamage?: (targetIndex: number, value: number) => void;
  /** 特效回调 */
  onEffect?: (effectId: string, x: number, y: number) => void;
  /** 镜头移动回调 */
  onCameraMove?: (x: number, y: number, zoom: number, duration: number) => void;
  /** 震动回调 */
  onShake?: (intensity: number, duration: number) => void;
  /** 背景变化回调 */
  onBackgroundChange?: (color?: string, image?: string) => void;
  /** 等待回调 */
  onWait?: (duration: number) => void;
}

/**
 * 步骤执行器类
 * 负责解析和执行各类技能步骤
 */
export class StepExecutor {
  private context: ExecutionContext;
  private callbacks: StepExecutorCallbacks;

  constructor(context: ExecutionContext, callbacks: StepExecutorCallbacks = {}) {
    this.context = context;
    this.callbacks = callbacks;
  }

  /**
   * 更新执行上下文
   */
  updateContext(context: Partial<ExecutionContext>): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * 更新回调
   */
  updateCallbacks(callbacks: Partial<StepExecutorCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * 执行步骤
   * @param step 要执行的步骤
   * @param progress 步骤执行进度（0-1）
   */
  execute(step: SkillStep, progress: number): StepExecutionResult {
    try {
      switch (step.type) {
        case "move":
          return this.executeMove(step.params, progress);
        case "damage":
          return this.executeDamage(step.params, progress);
        case "effect":
          return this.executeEffect(step.params, progress);
        case "wait":
          return this.executeWait(step.params, progress);
        case "camera":
          return this.executeCamera(step.params, progress);
        case "shake":
          return this.executeShake(step.params, progress);
        case "background":
          return this.executeBackground(step.params, progress);
        default:
          return {
            success: false,
            error: `未知的步骤类型: ${step.type}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "执行步骤时发生错误",
      };
    }
  }

  /**
   * 执行移动步骤
   * Requirements: 8.1
   */
  private executeMove(params: StepParams, progress: number): StepExecutionResult {
    const targetX = this.resolveValue(params.targetX, "x");
    const targetY = this.resolveValue(params.targetY, "y");
    const duration = params.duration ?? 500;
    const ease = params.ease ?? "Power2";

    // 只在进度为 0 时触发移动（避免重复触发）
    if (progress === 0 && this.callbacks.onMove) {
      this.callbacks.onMove("attacker", targetX, targetY, duration, ease);
    }

    return {
      success: true,
      effects: [
        {
          type: "move",
          target: "attacker",
          params: { x: targetX, y: targetY, duration, ease, progress },
        },
      ],
    };
  }

  /**
   * 执行伤害步骤
   * Requirements: 8.2
   */
  private executeDamage(params: StepParams, progress: number): StepExecutionResult {
    const value = this.resolveNumericValue(params.value);

    // 只在进度达到一定阈值时触发伤害（通常在动画中间）
    if (progress >= 0.5 && progress < 0.6 && this.callbacks.onDamage) {
      // 对所有目标造成伤害
      this.context.targetPositions.forEach((_, index) => {
        this.callbacks.onDamage!(index, value);
      });
    }

    return {
      success: true,
      effects: [
        {
          type: "damage",
          target: "target",
          params: { value, progress },
        },
      ],
    };
  }

  /**
   * 执行特效步骤
   * Requirements: 8.3
   */
  private executeEffect(params: StepParams, progress: number): StepExecutionResult {
    const effectId = params.effectId ?? "";
    const x = this.resolveValue(params.x, "x");
    const y = this.resolveValue(params.y, "y");

    // 只在进度为 0 时触发特效
    if (progress === 0 && this.callbacks.onEffect && effectId) {
      this.callbacks.onEffect(effectId, x, y);
    }

    return {
      success: true,
      effects: [
        {
          type: "effect",
          target: "scene",
          params: { effectId, x, y, progress },
        },
      ],
    };
  }

  /**
   * 执行等待步骤
   * Requirements: 8.4
   */
  private executeWait(params: StepParams, progress: number): StepExecutionResult {
    const delay = params.delay ?? 1000;

    // 只在进度为 0 时触发等待
    if (progress === 0 && this.callbacks.onWait) {
      this.callbacks.onWait(delay);
    }

    return {
      success: true,
      effects: [],
    };
  }

  /**
   * 执行镜头步骤
   * Requirements: 8.6
   */
  private executeCamera(params: StepParams, progress: number): StepExecutionResult {
    const zoom = params.zoom ?? 1;
    const offsetX = params.offsetX ?? 0;
    const offsetY = params.offsetY ?? 0;
    const duration = params.duration ?? 500;

    const targetX = this.context.canvasSize.width / 2 + offsetX;
    const targetY = this.context.canvasSize.height / 2 + offsetY;

    // 只在进度为 0 时触发镜头移动
    if (progress === 0 && this.callbacks.onCameraMove) {
      this.callbacks.onCameraMove(targetX, targetY, zoom, duration);
    }

    return {
      success: true,
      effects: [
        {
          type: "camera",
          target: "camera",
          params: { x: targetX, y: targetY, zoom, duration, progress },
        },
      ],
    };
  }

  /**
   * 执行震动步骤
   * Requirements: 8.7
   */
  private executeShake(params: StepParams, progress: number): StepExecutionResult {
    const intensity = params.intensity ?? 10;
    const duration = params.duration ?? 200;

    // 只在进度为 0 时触发震动
    if (progress === 0 && this.callbacks.onShake) {
      this.callbacks.onShake(intensity, duration);
    }

    return {
      success: true,
      effects: [
        {
          type: "shake",
          target: "scene",
          params: { intensity, duration, progress },
        },
      ],
    };
  }

  /**
   * 执行背景步骤
   * Requirements: 8.5
   */
  private executeBackground(params: StepParams, progress: number): StepExecutionResult {
    const color = params.color;
    const image = params.image;

    // 只在进度为 0 时触发背景变化
    if (progress === 0 && this.callbacks.onBackgroundChange) {
      this.callbacks.onBackgroundChange(color, image);
    }

    // 更新上下文中的背景状态
    if (progress === 0) {
      this.context.background = { color, image };
    }

    return {
      success: true,
      effects: [
        {
          type: "background",
          target: "scene",
          params: { color, image, progress },
        },
      ],
    };
  }

  /**
   * 解析位置值
   * 支持数字、字符串表达式（如 "attacker.x", "target.x", "center"）
   */
  private resolveValue(value: number | string | undefined, axis: "x" | "y"): number {
    if (value === undefined) {
      return axis === "x" ? this.context.attackerPosition.x : this.context.attackerPosition.y;
    }

    if (typeof value === "number") {
      return value;
    }

    // 解析字符串表达式
    const expr = value.toLowerCase().trim();

    // 攻击方位置
    if (expr === "attacker.x" || expr === "attacker") {
      return this.context.attackerPosition.x;
    }
    if (expr === "attacker.y") {
      return this.context.attackerPosition.y;
    }

    // 攻击方原始位置
    if (expr === "origin.x" || expr === "origin") {
      return this.context.attackerOriginPosition.x;
    }
    if (expr === "origin.y") {
      return this.context.attackerOriginPosition.y;
    }

    // 目标位置（第一个目标）
    if (expr === "target.x" || expr === "target") {
      return this.context.targetPositions[0]?.x ?? this.context.canvasSize.width / 2;
    }
    if (expr === "target.y") {
      return this.context.targetPositions[0]?.y ?? this.context.canvasSize.height / 2;
    }

    // 画布中心
    if (expr === "center.x" || expr === "center") {
      return this.context.canvasSize.width / 2;
    }
    if (expr === "center.y") {
      return this.context.canvasSize.height / 2;
    }

    // 尝试解析为数字
    const num = parseFloat(value);
    if (!isNaN(num)) {
      return num;
    }

    // 默认返回当前位置
    return axis === "x" ? this.context.attackerPosition.x : this.context.attackerPosition.y;
  }

  /**
   * 解析数值
   */
  private resolveNumericValue(value: number | string | undefined): number {
    if (value === undefined) {
      return 0;
    }

    if (typeof value === "number") {
      return value;
    }

    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  }

  /**
   * 获取步骤类型的默认参数
   */
  static getDefaultParams(type: StepType): StepParams {
    switch (type) {
      case "move":
        return {
          targetX: "target.x",
          targetY: "target.y",
          duration: 500,
          ease: "Power2",
        };
      case "damage":
        return {
          value: 100,
        };
      case "effect":
        return {
          effectId: "",
          x: "target.x",
          y: "target.y",
        };
      case "wait":
        return {
          delay: 500,
        };
      case "camera":
        return {
          zoom: 1,
          offsetX: 0,
          offsetY: 0,
          duration: 500,
        };
      case "shake":
        return {
          intensity: 10,
          duration: 200,
        };
      case "background":
        return {
          color: "#1a1a2e",
        };
      default:
        return {};
    }
  }

  /**
   * 获取步骤类型的显示名称
   */
  static getStepTypeName(type: StepType): string {
    const names: Record<StepType, string> = {
      move: "移动",
      damage: "伤害",
      effect: "特效",
      wait: "等待",
      camera: "镜头",
      shake: "震动",
      background: "背景",
    };
    return names[type] ?? type;
  }

  /**
   * 获取步骤类型的颜色
   */
  static getStepTypeColor(type: StepType): string {
    const colors: Record<StepType, string> = {
      move: "#3b82f6",     // 蓝色
      damage: "#ef4444",   // 红色
      effect: "#8b5cf6",   // 紫色
      wait: "#6b7280",     // 灰色
      camera: "#f59e0b",   // 橙色
      shake: "#ec4899",    // 粉色
      background: "#10b981", // 绿色
    };
    return colors[type] ?? "#6b7280";
  }
}

/**
 * 创建默认执行上下文
 */
export function createDefaultContext(canvasWidth = 800, canvasHeight = 600): ExecutionContext {
  return {
    attackerPosition: { x: canvasWidth * 0.25, y: canvasHeight * 0.5 },
    attackerOriginPosition: { x: canvasWidth * 0.25, y: canvasHeight * 0.5 },
    targetPositions: [{ x: canvasWidth * 0.75, y: canvasHeight * 0.5 }],
    canvasSize: { width: canvasWidth, height: canvasHeight },
    cameraState: { x: canvasWidth / 2, y: canvasHeight / 2, zoom: 1 },
    background: { color: "#1a1a2e" },
  };
}
