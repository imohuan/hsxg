/**
 * @file 战斗场景桥接
 * @description 提供战斗场景与外部系统的通信桥梁
 *
 * 设计目的：
 * - 解耦战斗场景和外部系统
 * - 允许外部系统向战斗场景发送请求
 * - 允许战斗场景向外部系统发送通知
 *
 * 使用模式：
 * - 外部系统通过 setBattleBridge 设置桥接实例
 * - 战斗场景通过 getBattleBridge 获取桥接实例
 * - 双方通过桥接接口进行通信
 */

import type { SkillDesign } from "../designer/types";
import type { CharacterSpriteConfig } from "./types";
import type { BattleScene } from "./BattleScene";

/**
 * 战斗桥接接口
 * @description 定义战斗场景与外部系统的通信接口
 */
export interface BattleBridge {
  /** 场景就绪回调（场景创建完成后调用） */
  onSceneReady?(scene: BattleScene): void;
  /** 消息通知回调（场景需要向外部发送消息时调用） */
  onMessage?(text: string): void;
  /** 请求执行技能（外部系统请求场景执行技能） */
  requestExecuteSkill?(skill: SkillDesign): void;
  /** 请求注入角色（外部系统请求场景加载新角色） */
  requestCharacterInjection?(config: CharacterSpriteConfig): void;
}

/** 桥接实例（单例） */
let bridge: BattleBridge | null = null;

/**
 * 设置战斗桥接实例
 * @param instance 桥接实例
 * @description 外部系统调用此函数设置桥接，战斗场景可以通过getBattleBridge获取
 */
export const setBattleBridge = (instance: BattleBridge) => {
  bridge = instance;
};

/**
 * 获取战斗桥接实例
 * @returns 桥接实例，如果未设置则返回null
 * @description 战斗场景调用此函数获取桥接，用于与外部系统通信
 */
export const getBattleBridge = (): BattleBridge | null => bridge;
