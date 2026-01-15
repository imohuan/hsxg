// ============ Icon Types ============

// 图标信息
export interface IconInfo {
  name: string; // 图标名称
  component: unknown; // 图标组件
}

// ============ Event Types ============

export type Events = {
  "icon:selected": IconInfo;
  // 战斗事件
  "battle:start": BattleConfig;
  "battle:end": BattleResult;
  "battle:action": BattleAction;
  // 设计器事件
  "designer:save": ProjectConfig;
  "designer:load": ProjectConfig;
  // 时间轴事件
  "timeline:play": void;
  "timeline:pause": void;
  "timeline:seek": number;
};

// ============ 战斗系统类型 ============

/** 战斗单位属性 */
export interface UnitStats {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  speed: number;
  luck: number;
  attack: number;
  defense: number;
}

/** 战斗单位配置 */
export interface UnitConfig {
  id: string;
  name: string;
  isPlayer: boolean;
  position: { row: number; col: number };
  stats: UnitStats;
  spriteConfig: SpriteConfig;
  animations: Record<string, AnimationConfig>;
}

/** 行动类型 */
export type ActionType = "attack" | "skill" | "item" | "defend" | "escape" | "summon";

/** 战斗行动 */
export interface BattleAction {
  id: string;
  type: ActionType;
  actorId: string;
  targetIds: string[];
  skillId?: string;
  itemId?: string;
  priority: number; // speed + luck
}

/** 战斗阶段 */
export type BattlePhase = "init" | "command" | "execute" | "result";

/** 战斗配置 */
export interface BattleConfig {
  playerUnits: UnitConfig[];
  enemyUnits: UnitConfig[];
  background?: string;
}

/** 战斗结果 */
export interface BattleResult {
  winner: "player" | "enemy" | "escape";
  turns: number;
  rewards?: unknown;
}

// ============ 设计工坊类型 ============

/** 雪碧图配置 */
export interface SpriteConfig {
  url: string;
  rows: number;
  cols: number;
  frameCount?: number;
  fps?: number;
  scale?: number;
}

/** 动画配置 */
export interface AnimationConfig {
  key: string;
  frames: number[];
  fps: number;
  repeat: number; // -1 为循环
}

/** 角色配置 */
export interface CharacterConfig {
  id: string;
  name: string;
  sprite: SpriteConfig;
  animations: AnimationConfig[];
}

/** 特效配置 */
export interface EffectConfig {
  id: string;
  name: string;
  sprite: SpriteConfig;
  animations: AnimationConfig[];
  blendMode?: string;
}

// ============ 时间轴类型 ============

/** 步骤类型 */
export type StepType = "move" | "damage" | "effect" | "wait" | "camera" | "shake" | "background";

/** 步骤参数 */
export interface StepParams {
  // 移动步骤
  targetX?: number | string;
  targetY?: number | string;
  duration?: number;
  ease?: string;

  // 伤害步骤
  value?: number | string;

  // 特效步骤
  effectId?: string;
  x?: number | string;
  y?: number | string;

  // 等待步骤
  delay?: number;

  // 镜头步骤
  zoom?: number;
  offsetX?: number;
  offsetY?: number;

  // 震动步骤
  intensity?: number;

  // 背景步骤
  color?: string;
  image?: string;

  // 时间轴相关
  startFrame?: number;
  trackId?: string;

  // 允许动态属性
  [key: string]: unknown;
}

/** 技能步骤 */
export interface SkillStep {
  id?: string;
  type: StepType;
  params: StepParams;
}

/** 时间轴片段 */
export interface TimelineSegment {
  id: string;
  stepId: string;
  trackId: string;
  startFrame: number;
  endFrame: number;
  step?: SkillStep;
}

/** 时间轴轨道 */
export interface TimelineTrack {
  id: string;
  name: string;
  locked: boolean;
  hidden: boolean;
}

/** 技能设计 */
export interface SkillDesign {
  id: string;
  name: string;
  steps: SkillStep[];
  segments: TimelineSegment[];
  tracks: TimelineTrack[];
  totalFrames: number;
  fps: number;
}

// ============ 配置导出类型 ============

/** 项目配置 */
export interface ProjectConfig {
  version: string;
  characters: CharacterConfig[];
  effects: EffectConfig[];
  skills: SkillDesign[];
}

// ============ 错误处理类型 ============

/** 错误类型枚举 */
export enum ErrorType {
  INVALID_CONFIG = "INVALID_CONFIG",
  RESOURCE_LOAD_FAILED = "RESOURCE_LOAD_FAILED",
  INVALID_OPERATION = "INVALID_OPERATION",
  STORAGE_ERROR = "STORAGE_ERROR",
}

/** 应用错误类 */
export class AppError extends Error {
  constructor(
    public type: ErrorType,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}
