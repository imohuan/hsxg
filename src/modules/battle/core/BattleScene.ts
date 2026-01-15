/**
 * @file 战斗场景
 * 管理战斗单位的加载、布局、动画和特效播放
 * Requirements: 1.1, 1.2, 1.4, 3.3, 3.4
 */
import Phaser from "phaser";
import { Unit } from "./Unit";
import type { UnitConfig, BattleConfig, EffectConfig } from "@/types";

/** 场景事件类型 */
export interface BattleSceneEvents {
  unitClicked: (unit: Unit) => void;
  actionComplete: () => void;
  sceneReady: () => void;
}

/**
 * 战斗场景类
 * 继承 Phaser.Scene，管理战斗画面渲染
 */
export class BattleScene extends Phaser.Scene {
  /** 所有单位 */
  private units: Map<string, Unit> = new Map();

  /** 玩家单位列表 */
  private playerUnits: Unit[] = [];

  /** 敌方单位列表 */
  private enemyUnits: Unit[] = [];

  /** 当前选中的单位 */
  private selectedUnit: Unit | null = null;

  /** 特效配置缓存 */
  private effectConfigs: Map<string, EffectConfig> = new Map();

  /** 消息文本 */
  private messageText: Phaser.GameObjects.Text | null = null;

  /** 背景图片 */
  private background: Phaser.GameObjects.Image | null = null;

  /** 事件回调 */
  private eventCallbacks: Partial<BattleSceneEvents> = {};

  constructor() {
    super({ key: "BattleScene" });
  }

  // ============ 生命周期 ============

  preload(): void {
    // 加载默认资源
    this.load.setBaseURL("");

    // 加载默认背景（如果存在）
    // this.load.image("battle_bg", "/assets/battle/background.png");
  }

  create(): void {
    // 创建背景
    this.createBackground();

    // 创建消息文本
    this.createMessageText();

    // 触发场景就绪事件
    this.eventCallbacks.sceneReady?.();
  }

  // ============ 初始化 ============

  /** 创建背景 */
  private createBackground(): void {
    const { width, height } = this.scale;

    // 使用渐变背景
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
    graphics.fillRect(0, 0, width, height);

    // 添加网格线效果
    graphics.lineStyle(1, 0x333355, 0.3);
    const gridSize = 50;
    for (let x = 0; x <= width; x += gridSize) {
      graphics.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y <= height; y += gridSize) {
      graphics.lineBetween(0, y, width, y);
    }

    // 添加中线
    graphics.lineStyle(2, 0x444466, 0.5);
    graphics.lineBetween(width / 2, 0, width / 2, height);
  }

  /** 创建消息文本 */
  private createMessageText(): void {
    const { width } = this.scale;
    this.messageText = this.add.text(width / 2, 30, "", {
      fontSize: "18px",
      color: "#ffffff",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      padding: { x: 12, y: 6 },
    });
    this.messageText.setOrigin(0.5);
    this.messageText.setDepth(100);
  }

  // ============ 单位管理 ============

  /**
   * 加载战斗配置
   * Requirements: 1.1, 1.2
   */
  async loadBattleConfig(config: BattleConfig): Promise<void> {
    // 清空现有单位
    this.clearUnits();

    // 加载玩家单位（左侧）
    for (const unitConfig of config.playerUnits) {
      await this.loadUnit(unitConfig);
    }

    // 加载敌方单位（右侧）
    for (const unitConfig of config.enemyUnits) {
      await this.loadUnit(unitConfig);
    }

    // 设置背景
    if (config.background) {
      this.setBackground(config.background);
    }

    this.showMessage("战斗开始！");
  }

  /**
   * 加载单个单位
   */
  async loadUnit(config: UnitConfig): Promise<Unit> {
    // 预加载单位纹理
    await this.loadUnitTexture(config);

    // 创建单位
    const unit = new Unit(this, config);

    // 存储单位
    this.units.set(config.id, unit);
    if (config.isPlayer) {
      this.playerUnits.push(unit);
    } else {
      this.enemyUnits.push(unit);
    }

    // 设置点击事件
    unit.on("pointerdown", () => this.handleUnitClick(unit));

    return unit;
  }

  /**
   * 预加载单位纹理
   */
  private loadUnitTexture(config: UnitConfig): Promise<void> {
    return new Promise((resolve) => {
      const textureKey = `unit_${config.id}`;

      // 如果纹理已存在，直接返回
      if (this.textures.exists(textureKey)) {
        resolve();
        return;
      }

      const { spriteConfig } = config;

      // 加载雪碧图
      this.load.spritesheet(textureKey, spriteConfig.url, {
        frameWidth: 0, // 将在加载后计算
        frameHeight: 0,
      });

      // 监听加载完成
      this.load.once("complete", () => {
        resolve();
      });

      this.load.start();
    });
  }

  /**
   * 清空所有单位
   */
  clearUnits(): void {
    this.units.forEach((unit) => unit.destroy());
    this.units.clear();
    this.playerUnits = [];
    this.enemyUnits = [];
    this.selectedUnit = null;
  }

  /**
   * 获取单位
   */
  getUnit(id: string): Unit | undefined {
    return this.units.get(id);
  }

  /**
   * 获取所有玩家单位
   */
  getPlayerUnits(): Unit[] {
    return this.playerUnits;
  }

  /**
   * 获取所有敌方单位
   */
  getEnemyUnits(): Unit[] {
    return this.enemyUnits;
  }

  /**
   * 获取存活的玩家单位
   */
  getAlivePlayerUnits(): Unit[] {
    return this.playerUnits.filter((u) => u.isAlive);
  }

  /**
   * 获取存活的敌方单位
   */
  getAliveEnemyUnits(): Unit[] {
    return this.enemyUnits.filter((u) => u.isAlive);
  }

  /**
   * 获取可行动的玩家单位（按 Y 坐标排序）
   * Requirements: 2.1
   */
  getActionablePlayerUnits(): Unit[] {
    return this.playerUnits.filter((u) => u.isActionable).sort((a, b) => a.y - b.y);
  }

  // ============ 交互处理 ============

  /**
   * 处理单位点击
   */
  private handleUnitClick(unit: Unit): void {
    // 取消之前的选中
    if (this.selectedUnit) {
      this.selectedUnit.setSelected(false);
    }

    // 选中新单位
    unit.setSelected(true);
    this.selectedUnit = unit;

    // 触发事件
    this.eventCallbacks.unitClicked?.(unit);
  }

  /**
   * 设置选中单位
   */
  setSelectedUnit(unit: Unit | null): void {
    if (this.selectedUnit) {
      this.selectedUnit.setSelected(false);
    }
    this.selectedUnit = unit;
    if (unit) {
      unit.setSelected(true);
    }
  }

  /**
   * 获取选中单位
   */
  getSelectedUnit(): Unit | null {
    return this.selectedUnit;
  }

  // ============ 动画播放 ============

  /**
   * 播放单位动画
   * Requirements: 1.4, 3.3
   */
  playUnitAnimation(unitId: string, animKey: string): void {
    const unit = this.units.get(unitId);
    if (unit) {
      unit.playAnimation(animKey as "idle" | "attack" | "hit" | "death" | "skill");
    }
  }

  /**
   * 播放单位动画并等待完成
   */
  async playUnitAnimationAsync(unitId: string, animKey: "idle" | "attack" | "hit" | "death" | "skill"): Promise<void> {
    const unit = this.units.get(unitId);
    if (unit) {
      await unit.playAnimationOnce(animKey);
    }
  }

  // ============ 伤害显示 ============

  /**
   * 显示伤害数字
   * Requirements: 3.5
   */
  showDamageNumber(unitId: string, value: number): void {
    const unit = this.units.get(unitId);
    if (unit) {
      unit.showDamageNumber(value);
    }
  }

  /**
   * 对单位造成伤害
   */
  applyDamage(unitId: string, damage: number): void {
    const unit = this.units.get(unitId);
    if (unit) {
      unit.modifyHp(-damage);
    }
  }

  /**
   * 治疗单位
   */
  applyHeal(unitId: string, amount: number): void {
    const unit = this.units.get(unitId);
    if (unit) {
      unit.modifyHp(amount);
    }
  }

  // ============ 特效播放 ============

  /**
   * 注册特效配置
   */
  registerEffect(config: EffectConfig): void {
    this.effectConfigs.set(config.id, config);
  }

  /**
   * 播放特效
   * Requirements: 3.4
   */
  async playEffect(effectId: string, x: number, y: number): Promise<void> {
    const config = this.effectConfigs.get(effectId);
    if (!config) {
      console.warn(`[BattleScene] 特效未找到: ${effectId}`);
      return;
    }

    const textureKey = `effect_${effectId}`;

    // 确保纹理已加载
    if (!this.textures.exists(textureKey)) {
      await this.loadEffectTexture(config, textureKey);
    }

    // 创建特效精灵
    const sprite = this.add.sprite(x, y, textureKey);
    sprite.setDepth(500);

    // 设置混合模式
    if (config.blendMode) {
      sprite.setBlendMode(
        Phaser.BlendModes[config.blendMode as keyof typeof Phaser.BlendModes] || Phaser.BlendModes.NORMAL,
      );
    }

    // 播放动画
    const animKey = `${effectId}_play`;
    const animConfig = config.animations[0];
    if (!this.anims.exists(animKey) && animConfig) {
      this.anims.create({
        key: animKey,
        frames: animConfig.frames.map((frame) => ({
          key: textureKey,
          frame,
        })),
        frameRate: animConfig.fps,
        repeat: animConfig.repeat,
      });
    }

    return new Promise((resolve) => {
      sprite.play(animKey);
      sprite.once("animationcomplete", () => {
        sprite.destroy();
        resolve();
      });

      // 如果是循环动画，设置超时销毁
      if (animConfig?.repeat === -1) {
        this.time.delayedCall(2000, () => {
          sprite.destroy();
          resolve();
        });
      }
    });
  }

  /**
   * 在单位位置播放特效
   */
  async playEffectOnUnit(effectId: string, unitId: string): Promise<void> {
    const unit = this.units.get(unitId);
    if (unit) {
      await this.playEffect(effectId, unit.x, unit.y);
    }
  }

  /**
   * 加载特效纹理
   */
  private loadEffectTexture(config: EffectConfig, textureKey: string): Promise<void> {
    return new Promise((resolve) => {
      const { sprite } = config;

      this.load.spritesheet(textureKey, sprite.url, {
        frameWidth: 0,
        frameHeight: 0,
      });

      this.load.once("complete", () => {
        resolve();
      });

      this.load.start();
    });
  }

  // ============ 场景效果 ============

  /**
   * 设置背景
   */
  setBackground(imageUrl: string): void {
    if (this.background) {
      this.background.destroy();
    }

    const textureKey = `bg_${Date.now()}`;
    this.load.image(textureKey, imageUrl);
    this.load.once("complete", () => {
      const { width, height } = this.scale;
      this.background = this.add.image(width / 2, height / 2, textureKey);
      this.background.setDisplaySize(width, height);
      this.background.setDepth(-1);
    });
    this.load.start();
  }

  /**
   * 震动效果
   */
  shake(intensity: number = 10, duration: number = 200): void {
    this.cameras.main.shake(duration, intensity / 1000);
  }

  /**
   * 闪烁效果
   */
  flash(color: number = 0xffffff, duration: number = 100): void {
    this.cameras.main.flash(duration, (color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff);
  }

  /**
   * 移动镜头
   */
  moveCamera(x: number, y: number, duration: number = 500): Promise<void> {
    return new Promise((resolve) => {
      this.cameras.main.pan(x, y, duration, "Power2", false, (_cam, progress) => {
        if (progress === 1) {
          resolve();
        }
      });
    });
  }

  /**
   * 缩放镜头
   */
  zoomCamera(zoom: number, duration: number = 500): Promise<void> {
    return new Promise((resolve) => {
      this.cameras.main.zoomTo(zoom, duration, "Power2", false, (_cam, progress) => {
        if (progress === 1) {
          resolve();
        }
      });
    });
  }

  /**
   * 重置镜头
   */
  resetCamera(duration: number = 300): Promise<void> {
    const { width, height } = this.scale;
    return new Promise((resolve) => {
      this.cameras.main.pan(width / 2, height / 2, duration);
      this.cameras.main.zoomTo(1, duration, "Power2", false, (_cam, progress) => {
        if (progress === 1) {
          resolve();
        }
      });
    });
  }

  // ============ 消息显示 ============

  /**
   * 显示消息
   */
  showMessage(text: string): void {
    if (this.messageText) {
      this.messageText.setText(text);
      this.messageText.setVisible(true);

      // 3 秒后隐藏
      this.time.delayedCall(3000, () => {
        if (this.messageText) {
          this.messageText.setVisible(false);
        }
      });
    }
  }

  /**
   * 隐藏消息
   */
  hideMessage(): void {
    if (this.messageText) {
      this.messageText.setVisible(false);
    }
  }

  // ============ 事件注册 ============

  /**
   * 注册事件回调
   */
  on<K extends keyof BattleSceneEvents>(event: K, callback: BattleSceneEvents[K]): void {
    this.eventCallbacks[event] = callback;
  }

  /**
   * 移除事件回调
   */
  off<K extends keyof BattleSceneEvents>(event: K): void {
    delete this.eventCallbacks[event];
  }

  // ============ 胜负判定 ============

  /**
   * 检查战斗是否结束
   * Requirements: 3.7, 3.8
   */
  checkBattleEnd(): "player" | "enemy" | null {
    const alivePlayerUnits = this.getAlivePlayerUnits();
    const aliveEnemyUnits = this.getAliveEnemyUnits();

    if (aliveEnemyUnits.length === 0) {
      return "player"; // 玩家胜利
    }

    if (alivePlayerUnits.length === 0) {
      return "enemy"; // 敌方胜利
    }

    return null; // 战斗继续
  }

  // ============ 清理 ============

  /**
   * 销毁场景
   */
  destroy(): void {
    this.clearUnits();
    this.effectConfigs.clear();
    this.eventCallbacks = {};
  }
}
