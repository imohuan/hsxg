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
export type StepType = "move" | "damage" | "effect" | "wait" | "camera" | "shake" | "background" | "sound";

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

  // 音效步骤
  soundId?: string;
  volume?: number;
  loop?: boolean;

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

// ============ 统一战斗画布类型 ============

/** 战斗单位（画布用） */
export interface BattleUnit {
  id: string;
  name: string;
  /** 是否为我方单位（可选，用于区分阵营） */
  isPlayer?: boolean;
  /** 精灵图配置 */
  sprite?: SpriteConfig;
  /** 当前血量 */
  hp: number;
  /** 最大血量 */
  maxHp: number;
  /** 当前蓝量 */
  mp: number;
  /** 最大蓝量 */
  maxMp: number;
  /** 速度值（用于排序） */
  speed: number;
  /** 是否死亡 */
  isDead?: boolean;
  /** 是否可选择 */
  selectable?: boolean;
}

/** 战斗场景配置 */
export interface BattleSceneConfig {
  /** 场景名称 */
  sceneName?: string;
  /** 背景图片 URL */
  backgroundUrl?: string;
  /** 背景颜色 */
  backgroundColor?: string;
  /** 敌方玩家名称 */
  enemyPlayerName?: string;
  /** 我方玩家名称 */
  playerName?: string;
  /** 敌方单位列表 */
  enemyUnits: BattleUnit[];
  /** 我方单位列表 */
  playerUnits: BattleUnit[];
  /** 当前行动角色 ID */
  activeUnitId?: string;
  /** 当前回合信息 */
  turnInfo?: string;
}

/** 缓动类型 */
export type EasingType = "linear" | "easeIn" | "easeOut" | "easeInOut" | "bounce";

/** 伤害类型 */
export type DamageType = "damage" | "heal" | "miss" | "critical";

/** 移动选项 */
export interface MoveOptions {
  duration?: number;
  easing?: EasingType;
}

/** 特效选项 */
export interface EffectOptions {
  scale?: number;
  rotation?: number;
  alpha?: number;
  loop?: boolean;
}

/** 音效选项 */
export interface SoundOptions {
  volume?: number;
  loop?: boolean;
  playbackRate?: number;
}

/** 单位位置 */
export interface UnitPosition {
  x: number;
  y: number;
}

/** 单位运行时状态 */
export interface UnitRuntimeState {
  id: string;
  /** 当前位置 */
  position: UnitPosition;
  /** 初始位置 */
  initialPosition: UnitPosition;
  /** 当前动画 */
  currentAnimation?: string;
  /** 是否选中 */
  isSelected?: boolean;
  /** 是否高亮（当前行动） */
  isActive?: boolean;
}

/** 相机状态 */
export interface CameraState {
  /** 缩放比例 */
  scale: number;
  /** X 偏移 */
  offsetX: number;
  /** Y 偏移 */
  offsetY: number;
}

/** 伤害数字显示 */
export interface DamageNumber {
  id: string;
  unitId: string;
  value: number;
  type: DamageType;
  x: number;
  y: number;
  alpha: number;
  offsetY: number;
  createdAt: number;
}

/** 特效实例 */
export interface EffectInstance {
  id: string;
  effectId: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  alpha: number;
  currentFrame: number;
  loop: boolean;
  createdAt: number;
}

/** 音效配置 */
export interface SoundConfig {
  id: string;
  url: string;
  volume?: number;
}

/** 物品配置 */
export interface ItemConfig {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  effect?: SkillStep[];
}

/** 技能配置 */
export interface SkillConfig {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  mpCost?: number;
  steps: SkillStep[];
}

// ============ GameData 统一数据结构 ============

/** 场景配置 */
export interface SceneConfig {
  /** 场景名称 */
  name: string;
  /** 背景图片 URL */
  backgroundUrl?: string;
  /** 背景颜色 */
  backgroundColor?: string;
}

/** 玩家信息 */
export interface PlayerInfo {
  /** 玩家 ID */
  id: string;
  /** 玩家名称 */
  name: string;
  /** 玩家头像 */
  avatar?: string;
}

/** 回合信息 */
export interface TurnInfo {
  /** 回合数 */
  number: number;
  /** 当前行动单位 ID */
  activeUnitId?: string;
  /** 回合阶段 */
  phase: "command" | "execute" | "result";
}

/** 完整游戏数据 */
export interface GameData {
  /** 场景配置 */
  scene: SceneConfig;
  /** 玩家信息 */
  players: {
    enemy: PlayerInfo;
    self: PlayerInfo;
  };
  /** 所有战斗单位 */
  units: BattleUnit[];
  /** 特效配置列表 */
  effects: EffectConfig[];
  /** 音效配置列表 */
  sounds: SoundConfig[];
  /** 技能配置列表 */
  skills: SkillConfig[];
  /** 物品配置列表 */
  items: ItemConfig[];
  /** 回合信息 */
  turn?: TurnInfo;
}

/** 坐标点 */
export interface Point {
  x: number;
  y: number;
}

/** 浮动文字选项 */
export interface FloatingTextOptions {
  /** 字体大小 */
  fontSize?: number;
  /** 文字颜色 */
  color?: string;
  /** 持续时间（毫秒） */
  duration?: number;
  /** 是否向上飘动 */
  floatUp?: boolean;
}

/** 统一战斗画布 Props（新版） */
export interface UnifiedBattleCanvasProps {
  /** 完整游戏数据 */
  gameData: GameData;
  /** 画布宽度，默认 800 */
  width?: number;
  /** 画布高度，默认 500 */
  height?: number;
  /** 是否启用缩放平移，默认 false */
  enableTransform?: boolean;
  /** 是否显示单位，默认 true */
  showUnits?: boolean;
  /** 是否显示调试信息，默认 false */
  debug?: boolean;
}

/** 统一战斗画布 Props（旧版，兼容） */
export interface UnifiedBattleCanvasPropsLegacy {
  /** 场景配置 */
  config: BattleSceneConfig;
  /** 是否显示菜单 */
  showMenu?: boolean;
  /** 是否启用缩放平移 */
  enableTransform?: boolean;
  /** 画布宽度 */
  width?: number;
  /** 画布高度 */
  height?: number;
}

/** 菱形菜单项 */
export interface DiamondMenuItem {
  key: string;
  label: string;
  row: number;
  col: number;
  disabled?: boolean;
}

// ============ 统一战斗画布 Emits ============

/** 统一战斗画布事件定义 */
export interface UnifiedBattleCanvasEmits {
  // 交互事件
  /** 单位被点击 */
  (e: "unit:click", payload: { unit: BattleUnit; position: Point }): void;
  /** 单位悬停变化 */
  (e: "unit:hover", payload: { unit: BattleUnit | null }): void;
  /** 单位选中变化 */
  (e: "unit:select", payload: { unit: BattleUnit | null }): void;
  /** 画布空白区域被点击 */
  (e: "canvas:click", payload: { position: Point }): void;
  /** 画布初始化完成 */
  (e: "canvas:ready"): void;

  // 动画事件
  /** 动画开始 */
  (e: "animation:start", payload: { type: string; unitId?: string }): void;
  /** 动画结束 */
  (e: "animation:end", payload: { type: string; unitId?: string }): void;
  /** 特效开始播放 */
  (e: "effect:start", payload: { effectId: string; instanceId: string }): void;
  /** 特效播放结束 */
  (e: "effect:end", payload: { effectId: string; instanceId: string }): void;

  // 状态事件
  /** 血量变化 */
  (e: "unit:hp-change", payload: { unitId: string; oldHp: number; newHp: number }): void;
  /** 蓝量变化 */
  (e: "unit:mp-change", payload: { unitId: string; oldMp: number; newMp: number }): void;
  /** 单位死亡 */
  (e: "unit:death", payload: { unitId: string }): void;
  /** 相机状态变化 */
  (e: "camera:change", payload: { scale: number; offset: Point }): void;
}

// ============ Slots 作用域参数类型 ============

/** overlay 插槽作用域参数 */
export interface OverlaySlotProps {
  canvasSize: { width: number; height: number };
  cameraState: CameraState;
}

/** header 插槽作用域参数 */
export interface HeaderSlotProps {
  scene: SceneConfig;
  players: { enemy: PlayerInfo; self: PlayerInfo };
  turn?: TurnInfo;
}

/** footer 插槽作用域参数 */
export interface FooterSlotProps {
  selectedUnit: BattleUnit | null;
  activeUnit: BattleUnit | null;
}

/** unit-info 插槽作用域参数 */
export interface UnitInfoSlotProps {
  unit: BattleUnit | null;
  position: Point | null;
}

/** debug 插槽作用域参数 */
export interface DebugSlotProps {
  fps: number;
  unitCount: number;
  effectCount: number;
  cameraState: CameraState;
}

/** 统一战斗画布导出的 API */
export interface UnifiedBattleCanvasExpose {
  // ============ 渲染控制 ============

  /** 强制重新渲染 */
  render(): void;

  /** 获取 Canvas 上下文 */
  getContext(): CanvasRenderingContext2D | null;

  /** 获取画布尺寸 */
  getCanvasSize(): { width: number; height: number };

  // ============ 角色控制 ============

  /** 移动角色到指定位置 */
  moveUnit(unitId: string, targetX: number, targetY: number, options?: MoveOptions): Promise<void>;

  /** 播放角色动画 */
  playUnitAnimation(unitId: string, animationKey: string): Promise<void>;

  /** 直接设置角色位置 */
  setUnitPosition(unitId: string, x: number, y: number): void;

  /** 重置角色到初始位置 */
  resetUnitPosition(unitId: string): void;

  /** 重置所有角色位置 */
  resetAllUnitPositions(): void;

  /** 设置当前行动单位 */
  setUnitActive(unitId: string | null): void;

  /** 设置选中单位 */
  setUnitSelected(unitId: string | null): void;

  /** 获取单位当前位置 */
  getUnitPosition(unitId: string): Point | null;

  /** 获取指定位置的单位 */
  getUnitAtPosition(x: number, y: number): BattleUnit | null;

  // ============ 特效控制 ============

  /** 在指定位置播放特效 */
  playEffect(effectId: string, x: number, y: number, options?: EffectOptions): Promise<string>;

  /** 在角色位置播放特效 */
  playEffectOnUnit(effectId: string, unitId: string, options?: EffectOptions): Promise<string>;

  /** 停止特效 */
  stopEffect(effectInstanceId: string): void;

  /** 停止所有特效 */
  stopAllEffects(): void;

  // ============ 视角控制 ============

  /** 视角震动 */
  shakeCamera(intensity: number, duration: number): Promise<void>;

  /** 视角位移 */
  moveCamera(offsetX: number, offsetY: number, duration: number, easing?: EasingType): Promise<void>;

  /** 视角缩放 */
  zoomCamera(scale: number, duration: number, easing?: EasingType): Promise<void>;

  /** 重置视角 */
  resetCamera(duration?: number): Promise<void>;

  /** 聚焦到角色 */
  focusOnUnit(unitId: string, duration?: number): Promise<void>;

  /** 获取相机状态 */
  getCameraState(): CameraState;

  // ============ 背景控制 ============

  /** 设置背景图片 */
  setBackground(imageUrl: string): Promise<void>;

  /** 设置背景颜色 */
  setBackgroundColor(color: string): void;

  /** 背景渐变 */
  fadeBackground(targetColor: string, duration: number): Promise<void>;

  /** 屏幕闪烁 */
  flashScreen(color: string, duration: number): Promise<void>;

  // ============ 音效控制 ============

  /** 播放音效 */
  playSound(soundId: string, options?: SoundOptions): string;

  /** 停止音效 */
  stopSound(soundInstanceId: string): void;

  /** 停止所有音效 */
  stopAllSounds(): void;

  // ============ 伤害/数值显示 ============

  /** 显示伤害数字 */
  showDamageNumber(unitId: string, value: number, type?: DamageType): void;

  /** 显示浮动文字 */
  showFloatingText(x: number, y: number, text: string, options?: FloatingTextOptions): void;

  /** 更新血量 */
  updateUnitHp(unitId: string, currentHp: number, maxHp?: number): void;

  /** 更新蓝量 */
  updateUnitMp(unitId: string, currentMp: number, maxMp?: number): void;

  // ============ 步骤执行 ============

  /** 执行单个步骤 */
  executeStep(step: SkillStep): Promise<void>;

  /** 顺序执行多个步骤 */
  executeSteps(steps: SkillStep[]): Promise<void>;

  /** 并行执行多个步骤 */
  executeStepsParallel(steps: SkillStep[]): Promise<void>;

  // ============ 选中控制（兼容旧版） ============

  /** 设置目标单位（红色边框高亮） */
  setTargetUnit(unitId: string | null): void;

  /** 设置当前行动单位（黄色光圈高亮） */
  setActiveUnit(unitId: string | null): void;
}
