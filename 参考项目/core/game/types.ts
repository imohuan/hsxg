/**
 * @file 游戏核心类型定义
 * @description 定义游戏核心模块使用的类型和接口
 */

import type Phaser from "phaser";
export type { SkillDesign, SkillStep } from "../designer/types";

/**
 * 角色精灵图配置接口
 * @description 用于动态加载角色精灵图的配置
 */
export interface CharacterSpriteConfig {
  /** 精灵图资源URL */
  url: string;
  /** 精灵图行数 */
  rows: number;
  /** 精灵图列数 */
  cols: number;
  /** 动画帧率（可选，默认值由系统决定） */
  fps?: number;
}

/**
 * 战斗上下文接口
 * @description 定义技能执行时的上下文信息，包含施法者和目标
 */
export interface BattleContext {
  /** 施法者单位（Phaser容器对象，包含可选的精灵对象） */
  actor: Phaser.GameObjects.Container & { sprite?: Phaser.GameObjects.Sprite };
  /** 目标单位列表（Phaser容器对象，包含修改生命值的方法） */
  targets: Array<
    Phaser.GameObjects.Container & { modifyHp: (value: number) => void }
  >;
}
