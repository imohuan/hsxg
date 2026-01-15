/**
 * @file 战斗控制器
 * @description 管理Phaser游戏实例和战斗场景的生命周期
 *
 * 主要功能：
 * - 初始化和管理Phaser游戏实例
 * - 处理战斗场景的挂载和卸载
 * - 提供技能执行、角色注入、配置应用等接口
 * - 处理场景未就绪时的配置缓存
 */

import Phaser from "phaser";
import { BattleScene } from "./BattleScene";
import { setBattleBridge } from "./battleBridge";
import type { SkillDesign, CharacterConfig } from "../designer/types";
import type { BattleJSONConfig } from "./config";

/**
 * 战斗控制器类
 * @description 战斗系统的入口控制器，管理游戏实例和场景
 */
export class BattleController {
  /** Phaser游戏实例 */
  private game?: Phaser.Game;

  /** 战斗场景实例 */
  private scene?: BattleScene;

  /** 游戏容器DOM元素 */
  private container?: HTMLElement;

  /** 待应用的配置（场景未就绪时缓存） */
  private pendingConfig?: BattleJSONConfig;

  /**
   * 挂载游戏到容器
   * @param container 游戏容器的DOM元素
   * @description
   * - 设置战斗桥接，监听场景就绪事件
   * - 创建Phaser游戏实例并启动战斗场景
   * - 如果有待应用的配置，在场景就绪后自动应用
   */
  mount(container: HTMLElement): void {
    this.container = container;
    // 设置战斗桥接，用于场景和外部通信
    setBattleBridge({
      onSceneReady: (scene) => {
        this.scene = scene;
        // 如果场景就绪前有配置待应用，现在应用它
        if (this.pendingConfig) {
          this.scene.applyConfig(this.pendingConfig);
          this.pendingConfig = undefined;
        }
      },
    });

    // 创建Phaser游戏实例
    this.game = new Phaser.Game({
      type: Phaser.AUTO, // 自动选择渲染器（WebGL或Canvas）
      parent: container, // 父容器
      width: 800, // 游戏宽度
      height: 600, // 游戏高度
      backgroundColor: "#000000", // 背景颜色（黑色）
      scene: [BattleScene], // 场景列表
    });
  }

  /**
   * 执行技能
   * @param skill 技能设计对象
   * @description 在战斗场景中执行指定的技能
   */
  executeSkill(skill: SkillDesign): void {
    this.scene?.executeDesignedSkill(skill);
  }

  /**
   * 注入角色
   * @param config 角色配置
   * @description 动态加载并注入一个新角色到战斗场景中
   */
  injectCharacter(config: CharacterConfig): void {
    this.scene?.loadDynamicCharacter({
      ...config,
      id: config.id ?? `char_${Date.now()}`, // 如果没有ID，使用时间戳生成
    });
  }

  /**
   * 应用战斗配置
   * @param config 战斗配置对象
   * @description
   * - 如果场景已就绪，立即应用配置
   * - 如果场景未就绪，缓存配置，待场景就绪后自动应用
   */
  applyConfig(config: BattleJSONConfig): void {
    if (this.scene) {
      this.scene.applyConfig(config);
    } else {
      this.pendingConfig = config;
    }
  }

  /**
   * 获取选中的单位名称
   * @returns 选中单位的名称，如果没有选中则返回null
   */
  getSelectedUnitName(): string | null {
    return this.scene?.getSelectedUnitName() ?? null;
  }

  /**
   * 销毁游戏实例
   * @description
   * - 销毁Phaser游戏实例，释放资源
   * - 清空容器内容
   * - 重置所有引用
   */
  destroy(): void {
    this.game?.destroy(true);
    this.game = undefined;
    this.scene = undefined;
    if (this.container) {
      this.container.innerHTML = "";
    }
  }
}
