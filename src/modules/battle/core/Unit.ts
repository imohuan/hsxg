/**
 * @file 战斗单位类
 * 管理战斗单位的属性、动画和伤害显示
 * Requirements: 1.3, 3.5, 3.6
 */
import Phaser from "phaser";
import type { UnitConfig, UnitStats, AnimationConfig } from "@/types";

/** 单位动画类型 */
export type UnitAnimationType = "idle" | "attack" | "hit" | "death" | "skill";

/** 单位战斗状态 */
export interface UnitBattleState {
  isAlive: boolean;
  isActionable: boolean;
  isSelected: boolean;
}

/**
 * 战斗单位类
 * 继承 Phaser.GameObjects.Container，包含精灵、名称、血条等子元素
 */
export class Unit extends Phaser.GameObjects.Container {
  /** 单位配置 */
  public readonly config: UnitConfig;

  /** 当前属性 */
  private _stats: UnitStats;

  /** 单位战斗状态 */
  private _battleState: UnitBattleState;

  /** 精灵对象 */
  public sprite: Phaser.GameObjects.Sprite | null = null;

  /** 名称文本 */
  private nameText: Phaser.GameObjects.Text | null = null;

  /** 生命值条背景 */
  private hpBarBg: Phaser.GameObjects.Graphics | null = null;

  /** 生命值条 */
  private hpBar: Phaser.GameObjects.Graphics | null = null;

  /** 魔法值条 */
  private mpBar: Phaser.GameObjects.Graphics | null = null;

  /** 选中光环 */
  private aura: Phaser.GameObjects.Graphics | null = null;

  /** 血条宽度 */
  private static readonly BAR_WIDTH = 50;

  /** 血条高度 */
  private static readonly BAR_HEIGHT = 6;

  constructor(scene: Phaser.Scene, config: UnitConfig) {
    // 根据位置计算实际坐标
    const { x, y } = Unit.calculatePosition(config.position, config.isPlayer, scene);
    super(scene, x, y);

    this.config = config;
    this._stats = { ...config.stats };
    this._battleState = {
      isAlive: true,
      isActionable: true,
      isSelected: false,
    };

    this.name = config.id;
    this.createVisuals();
    this.setupInteractive();

    scene.add.existing(this);
  }

  // ============ Getters ============

  /** 获取当前属性 */
  get stats(): Readonly<UnitStats> {
    return this._stats;
  }

  /** 获取单位战斗状态 */
  get battleState(): Readonly<UnitBattleState> {
    return this._battleState;
  }

  /** 是否为玩家单位 */
  get isPlayer(): boolean {
    return this.config.isPlayer;
  }

  /** 是否存活 */
  get isAlive(): boolean {
    return this._battleState.isAlive;
  }

  /** 是否可行动 */
  get isActionable(): boolean {
    return this._battleState.isActionable;
  }

  /** 当前生命值 */
  get hp(): number {
    return this._stats.hp;
  }

  /** 当前魔法值 */
  get mp(): number {
    return this._stats.mp;
  }

  /** 行动优先级 (速度 + 幸运) */
  get priority(): number {
    return this._stats.speed + this._stats.luck;
  }

  // ============ 位置计算 ============

  /**
   * 根据阵营位置计算实际坐标
   * 玩家在左侧，敌人在右侧
   */
  static calculatePosition(
    position: { row: number; col: number },
    isPlayer: boolean,
    scene: Phaser.Scene,
  ): { x: number; y: number } {
    const { width, height } = scene.scale;
    const centerX = width / 2;

    // 基础偏移
    const baseOffsetX = 150;
    const colSpacing = 80;
    const rowSpacing = 100;

    // 玩家在左侧，敌人在右侧
    const sideMultiplier = isPlayer ? -1 : 1;
    const x = centerX + sideMultiplier * (baseOffsetX + position.col * colSpacing);

    // Y 坐标从上到下排列
    const baseY = height / 2 - 100;
    const y = baseY + position.row * rowSpacing;

    return { x, y };
  }

  // ============ 视觉元素创建 ============

  /** 创建所有视觉元素 */
  private createVisuals(): void {
    this.createSprite();
    this.createNameText();
    this.createBars();
    this.createAura();
  }

  /** 创建精灵 */
  private createSprite(): void {
    const { spriteConfig } = this.config;
    const textureKey = `unit_${this.config.id}`;

    // 检查纹理是否已加载
    if (this.scene.textures.exists(textureKey)) {
      this.sprite = this.scene.add.sprite(0, 0, textureKey);
      this.add(this.sprite);

      // 玩家单位翻转朝向右侧
      if (this.isPlayer) {
        this.sprite.setFlipX(true);
      }

      // 设置缩放
      if (spriteConfig.scale) {
        this.sprite.setScale(spriteConfig.scale);
      }

      // 播放待机动画
      this.playAnimation("idle");
    } else {
      // 使用占位图形
      this.createPlaceholder();
      console.warn(`[Unit] 纹理未加载: ${textureKey}，使用占位图`);
    }
  }

  /** 创建占位图形 */
  private createPlaceholder(): void {
    const graphics = this.scene.add.graphics();
    const color = this.isPlayer ? 0x4488ff : 0xff4444;
    graphics.fillStyle(color, 0.8);
    graphics.fillRoundedRect(-25, -40, 50, 80, 8);
    graphics.lineStyle(2, 0xffffff, 0.5);
    graphics.strokeRoundedRect(-25, -40, 50, 80, 8);
    this.add(graphics);
  }

  /** 创建名称文本 */
  private createNameText(): void {
    this.nameText = this.scene.add.text(0, -70, this.config.name, {
      fontSize: "14px",
      color: "#ffffff",
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      padding: { x: 4, y: 2 },
    });
    this.nameText.setOrigin(0.5);
    this.add(this.nameText);
  }

  /** 创建血条和蓝条 */
  private createBars(): void {
    const barY = -55;

    // 背景
    this.hpBarBg = this.scene.add.graphics();
    this.hpBarBg.fillStyle(0x333333, 0.8);
    this.hpBarBg.fillRoundedRect(-Unit.BAR_WIDTH / 2, barY, Unit.BAR_WIDTH, Unit.BAR_HEIGHT * 2 + 2, 2);
    this.add(this.hpBarBg);

    // HP 条
    this.hpBar = this.scene.add.graphics();
    this.add(this.hpBar);

    // MP 条
    this.mpBar = this.scene.add.graphics();
    this.add(this.mpBar);

    this.updateBars();
  }

  /** 更新血条和蓝条显示 */
  private updateBars(): void {
    const barY = -55;
    const hpRatio = Math.max(0, this._stats.hp / this._stats.maxHp);
    const mpRatio = Math.max(0, this._stats.mp / this._stats.maxMp);

    // HP 条 (绿色/黄色/红色)
    if (this.hpBar) {
      this.hpBar.clear();
      const hpColor = hpRatio > 0.5 ? 0x44ff44 : hpRatio > 0.25 ? 0xffff44 : 0xff4444;
      this.hpBar.fillStyle(hpColor, 1);
      this.hpBar.fillRoundedRect(
        -Unit.BAR_WIDTH / 2 + 1,
        barY + 1,
        (Unit.BAR_WIDTH - 2) * hpRatio,
        Unit.BAR_HEIGHT - 1,
        1,
      );
    }

    // MP 条 (蓝色)
    if (this.mpBar) {
      this.mpBar.clear();
      this.mpBar.fillStyle(0x4488ff, 1);
      this.mpBar.fillRoundedRect(
        -Unit.BAR_WIDTH / 2 + 1,
        barY + Unit.BAR_HEIGHT + 2,
        (Unit.BAR_WIDTH - 2) * mpRatio,
        Unit.BAR_HEIGHT - 1,
        1,
      );
    }
  }

  /** 创建选中光环 */
  private createAura(): void {
    this.aura = this.scene.add.graphics();
    this.aura.lineStyle(3, 0xffff00, 0.8);
    this.aura.strokeCircle(0, 10, 40);
    this.aura.setVisible(false);
    this.add(this.aura);
  }

  /** 设置交互区域 */
  private setupInteractive(): void {
    this.setSize(60, 100);
    this.setInteractive(new Phaser.Geom.Rectangle(-30, -50, 60, 100), Phaser.Geom.Rectangle.Contains);
  }

  // ============ 属性修改 ============

  /**
   * 修改生命值
   * @param value 变化值（负数为伤害，正数为治疗）
   * Requirements: 3.5, 3.6
   */
  modifyHp(value: number): void {
    const oldHp = this._stats.hp;
    this._stats.hp = Math.max(0, Math.min(this._stats.maxHp, this._stats.hp + value));

    // 显示伤害/治疗数字
    this.showDamageNumber(value);

    // 更新血条
    this.updateBars();

    // 检查死亡状态 (Requirements: 3.6)
    if (this._stats.hp <= 0 && oldHp > 0) {
      this.onDeath();
    }
  }

  /**
   * 修改魔法值
   * @param value 变化值
   */
  modifyMp(value: number): void {
    this._stats.mp = Math.max(0, Math.min(this._stats.maxMp, this._stats.mp + value));
    this.updateBars();
  }

  /**
   * 显示伤害/治疗数字
   * Requirements: 3.5
   */
  showDamageNumber(value: number): void {
    const color = value < 0 ? "#ff4444" : "#44ff44";
    const displayValue = value < 0 ? value.toString() : `+${value}`;

    const text = this.scene.add.text(this.x, this.y - 80, displayValue, {
      fontSize: "28px",
      color,
      stroke: "#000000",
      strokeThickness: 4,
      fontStyle: "bold",
    });
    text.setOrigin(0.5);
    text.setDepth(1000);

    // 数字上浮动画
    this.scene.tweens.add({
      targets: text,
      y: text.y - 60,
      alpha: 0,
      duration: 1000,
      ease: "Power2",
      onComplete: () => text.destroy(),
    });
  }

  // ============ 状态管理 ============

  /**
   * 处理死亡
   * Requirements: 3.6
   */
  private onDeath(): void {
    this._battleState.isAlive = false;
    this._battleState.isActionable = false;

    // 播放死亡动画
    this.playAnimation("death");

    // 淡出效果
    this.scene.tweens.add({
      targets: this,
      alpha: 0.3,
      duration: 500,
      ease: "Power2",
    });
  }

  /**
   * 设置选中状态
   */
  setSelected(selected: boolean): void {
    this._battleState.isSelected = selected;
    if (this.aura) {
      this.aura.setVisible(selected);
    }
  }

  /**
   * 设置可行动状态
   */
  setActionable(actionable: boolean): void {
    this._battleState.isActionable = actionable;
  }

  // ============ 动画播放 ============

  /**
   * 播放动画
   * Requirements: 1.4
   */
  playAnimation(type: UnitAnimationType): void {
    if (!this.sprite) return;

    const animConfig = this.config.animations[type];
    if (!animConfig) {
      // 没有配置该动画，尝试播放待机
      if (type !== "idle") {
        this.playAnimation("idle");
      }
      return;
    }

    const animKey = `${this.config.id}_${type}`;

    // 检查动画是否已创建
    if (!this.scene.anims.exists(animKey)) {
      this.createAnimation(animKey, animConfig);
    }

    this.sprite.play(animKey);
  }

  /**
   * 创建动画
   */
  private createAnimation(key: string, config: AnimationConfig): void {
    const textureKey = `unit_${this.config.id}`;

    this.scene.anims.create({
      key,
      frames: config.frames.map((frame) => ({
        key: textureKey,
        frame,
      })),
      frameRate: config.fps,
      repeat: config.repeat,
    });
  }

  /**
   * 播放一次性动画并返回 Promise
   */
  playAnimationOnce(type: UnitAnimationType): Promise<void> {
    return new Promise((resolve) => {
      if (!this.sprite) {
        resolve();
        return;
      }

      this.playAnimation(type);

      // 监听动画完成
      this.sprite.once("animationcomplete", () => {
        resolve();
      });

      // 如果没有动画配置，立即返回
      const animConfig = this.config.animations[type];
      if (!animConfig) {
        resolve();
      }
    });
  }

  // ============ 清理 ============

  /**
   * 销毁单位
   */
  destroy(fromScene?: boolean): void {
    this.sprite = null;
    this.nameText = null;
    this.hpBar = null;
    this.mpBar = null;
    this.hpBarBg = null;
    this.aura = null;
    super.destroy(fromScene);
  }
}
