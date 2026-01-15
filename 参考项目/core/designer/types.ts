/**
 * @file 设计器类型定义
 * @description 定义设计器中使用的所有类型和接口
 */

/**
 * 设计器工具类型
 * @description 设计器支持的工具类型：角色、特效、技能
 */
export type DesignerTool = "character" | "effect" | "skill";

/**
 * 角色配置接口
 * @description 定义角色的精灵图配置信息
 */
export interface CharacterConfig {
  /** 角色唯一标识符（可选） */
  id?: string;
  /** 角色名称 */
  name: string;
  /** 精灵图资源URL */
  url: string;
  /** 精灵图行数 */
  rows: number;
  /** 精灵图列数 */
  cols: number;
  /** 实际帧数（可选，默认为 rows * cols） */
  frameCount?: number;
  /** 角色缩放比例（可选，默认为 0.8 玩家 / 2.5 敌人） */
  scale?: number;
  /** 动画帧率（可选，默认值由系统决定） */
  fps?: number;
}

/**
 * 特效配置接口
 * @description 定义特效的精灵图配置信息
 */
export interface EffectConfig {
  /** 特效唯一标识符（可选） */
  id?: string;
  /** 特效名称（可选） */
  name?: string;
  /** 特效资源URL */
  url: string;
  /** 精灵图行数 */
  rows: number;
  /** 精灵图列数 */
  cols: number;
  /** 实际帧数（可选，默认为 rows * cols） */
  frameCount?: number;
  /** 动画帧率（可选，默认值由系统决定） */
  fps?: number;
}

/**
 * 技能步骤类型
 * @description 技能执行步骤的类型
 * - move: 移动步骤
 * - damage: 伤害步骤
 * - effect: 特效步骤
 * - wait: 等待步骤
 */
export type SkillStepType = "move" | "damage" | "effect" | "wait";

/**
 * 技能步骤接口
 * @description 定义技能执行的一个步骤
 */
export interface SkillStep {
  /** 步骤类型 */
  type: SkillStepType;
  /** 步骤参数（键值对，值可以是字符串表达式、数字或布尔值） */
  params: Record<string, string | number | boolean>;
}

/**
 * 技能目标模式类型
 * @description 技能可以选择的目标类型
 * - enemy: 敌人
 * - ally: 盟友
 * - self: 自身
 */
export type SkillTargetMode = "enemy" | "ally" | "self";

/**
 * 技能目标选择配置接口
 * @description 定义技能如何选择目标
 */
export interface SkillTargetingConfig {
  /** 允许的目标模式列表 */
  modes: SkillTargetMode[];
  /** 随机选择目标的数量范围 [最小值, 最大值] */
  randomRange: [number, number];
  /** 每种目标模式的数量表达式（JavaScript表达式字符串） */
  expressions: Record<SkillTargetMode, string>;
}

/**
 * 技能缩放公式接口
 * @description 定义技能数值的缩放公式
 */
export interface SkillScalingFormula {
  /** 公式唯一标识符 */
  id: string;
  /** 公式显示标签 */
  label: string;
  /** 公式表达式（JavaScript表达式字符串，可使用 level、mastery、proficiency 等变量） */
  expression: string;
}

/**
 * 技能上下文配置接口
 * @description 定义技能执行的上下文信息
 */
export interface SkillContextConfig {
  /** 施法者单位ID */
  casterId: string;
  /** 选中的目标单位ID列表 */
  selectedTargetIds: string[];
  /** 技能等级 */
  level: number;
  /** 精通值 */
  mastery: number;
  /** 熟练度 */
  proficiency: number;
  /** 备注信息（可选） */
  notes?: string;
}

/**
 * 技能设计接口
 * @description 完整的技能设计数据结构
 */
export interface SkillDesign {
  /** 技能唯一标识符（可选） */
  id?: string;
  /** 技能名称 */
  name: string;
  /** 技能执行步骤列表 */
  steps: SkillStep[];
  /** 技能上下文配置 */
  context: SkillContextConfig;
  /** 技能目标选择配置 */
  targeting: SkillTargetingConfig;
  /** 技能缩放公式列表 */
  scaling: SkillScalingFormula[];
}

/**
 * 精灵图预览配置接口
 * @description 用于预览精灵图的配置信息
 */
export interface SpriteSheetPreviewConfig {
  /** 精灵图资源URL */
  url: string;
  /** 精灵图行数 */
  rows: number;
  /** 精灵图列数 */
  cols: number;
  /** 实际帧数（可选） */
  frameCount?: number;
}

/**
 * 时间轴事件标记接口
 * @description 用于在时间轴上标记特定事件
 */
export interface TimelineEvent {
  /** 事件发生的帧数 */
  frame: number;
  /** 事件名称 */
  name: string;
  /** 标签颜色（可选，用于UI显示） */
  color?: string;
  /** 事件附加数据（可选） */
  data?: Record<string, any>;
}
