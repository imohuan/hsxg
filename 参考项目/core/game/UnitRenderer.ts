/**
 * @file 人物渲染器
 * 单独控制人物渲染，包括精灵、血条、蓝条、速度显示等
 */
import Phaser from "phaser";
import type { BattleUnitConfig } from "./config";
import { generateTextureKey, generateAnimationKey } from "../utils/texture";
import {
  UNIT_CONTAINER,
  UNIT_AREAS,
  HEALTH_BARS,
  SPRITE,
} from "../config/unitRenderConfig";

export interface UnitRendererConfig {
  /** 单位配置 */
  unitConfig: BattleUnitConfig;
  /** 是否为玩家 */
  isPlayer: boolean;
  /** 渲染区域宽度 */
  width?: number;
  /** 渲染区域高度 */
  height?: number;
  /** 当前血量 */
  hp?: number;
  /** 最大血量 */
  maxHp?: number;
  /** 当前蓝量 */
  mp?: number;
  /** 最大蓝量 */
  maxMp?: number;
  /** 速度值 */
  speed?: number;
  /** 速度顺序（在血条左侧显示的数字） */
  speedOrder?: number;
  /** 是否显示调试框 */
  showDebugBox?: boolean;
}

/**
 * 人物渲染器类
 * 负责渲染人物的所有视觉元素
 */
export class UnitRenderer {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private config: UnitRendererConfig;

  // 渲染元素引用
  private sprite?: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  private hpBar?: Phaser.GameObjects.Graphics;
  private mpBar?: Phaser.GameObjects.Graphics;
  private speedOrderText?: Phaser.GameObjects.Text;

  // 尺寸配置
  private readonly width: number;
  private readonly height: number;
  private readonly nameAreaHeight: number; // 名称区域高度
  private readonly spriteAreaHeight: number; // 人物区域高度
  private readonly barAreaHeight: number; // 血条区域高度

  constructor(scene: Phaser.Scene, config: UnitRendererConfig) {
    this.scene = scene;
    this.config = config;
    this.width = config.width ?? UNIT_CONTAINER.width;
    this.height = config.height ?? UNIT_CONTAINER.height;
    this.nameAreaHeight = UNIT_AREAS.nameAreaHeight;
    this.barAreaHeight = UNIT_AREAS.barAreaHeight;
    this.spriteAreaHeight =
      this.height - this.nameAreaHeight - this.barAreaHeight; // 人物区域占剩余空间

    // 创建容器
    this.container = scene.add.container(0, 0);
    this.render();
  }

  /**
   * 获取容器对象
   */
  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  /**
   * 渲染所有元素
   */
  private render(): void {
    this.renderSprite();
    this.renderBars();
    // 不再渲染速度显示（黄色边框的数字）
    // this.renderSpeed();
  }

  /**
   * 计算适配容器的缩放比例
   * @param sprite sprite 对象
   * @param configScale 配置的缩放值
   * @returns 计算后的缩放值
   */
  private calculateFitScale(
    sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image,
    configScale: number
  ): number {
    // 获取容器尺寸
    const spriteAreaWidth = this.width;
    const spriteAreaHeight = this.spriteAreaHeight;

    // 获取 sprite 的原始纹理尺寸
    const texture = sprite.texture;
    let originalWidth: number;
    let originalHeight: number;

    // 如果是 SpriteSheet，获取单帧尺寸
    if (sprite instanceof Phaser.GameObjects.Sprite && sprite.frame) {
      // 使用当前帧的尺寸
      originalWidth = sprite.frame.width;
      originalHeight = sprite.frame.height;
    } else {
      // 普通图像，获取纹理源尺寸
      const source = texture.source[0];
      if (source) {
        originalWidth = source.width;
        originalHeight = source.height;
      } else {
        // 如果无法获取原始尺寸，直接返回配置的 scale
        return configScale;
      }
    }

    // 计算适配容器的 scale（取宽度和高度适配的较小值，保持比例）
    const scaleX = spriteAreaWidth / originalWidth;
    const scaleY = spriteAreaHeight / originalHeight;
    const fitScale = Math.min(scaleX, scaleY);

    // 乘以配置的 scale
    return fitScale * configScale;
  }

  /**
   * 渲染人物精灵
   * 支持从人物设计的 JSON 配置中读取精灵配置
   */
  private renderSprite(): void {
    const { isPlayer, unitConfig } = this.config;
    // 人物在中间区域，从名称区域下方开始
    // 容器中心是0，顶部是 -height/2 = -50
    // 名称区域从 -50 到 -50 + nameAreaHeight = -25
    // 人物区域从 -25 到 -25 + spriteAreaHeight = 25
    // 人物应该在人物区域中间，Y = -25 + spriteAreaHeight/2 = 0
    const spriteY =
      -this.height / 2 + this.nameAreaHeight + this.spriteAreaHeight / 2; // 人物在容器中间区域

    // 绘制 debug 框（显示人物精灵区域，而非整个容器）
    if (this.config.showDebugBox) {
      const debugBox = this.scene.add.graphics();
      debugBox.lineStyle(2, 0x00ff00, 1); // 绿色边框，2像素宽
      // 人物区域的宽度和高度
      const spriteAreaWidth = this.width; // 80
      const spriteAreaHeight = this.spriteAreaHeight; // 50
      // 人物区域顶部相对于容器中心(0,0)的Y位置
      const spriteAreaTop = -this.height / 2 + this.nameAreaHeight; // -50 + 25 = -25
      // 绘制人物区域的 debug 框（相对于容器中心）
      // 从人物区域顶部开始，宽度占满容器宽度，高度为人物区域高度
      debugBox.strokeRect(
        -spriteAreaWidth / 2, // x: -40
        spriteAreaTop, // y: -25（人物区域顶部相对于容器中心）
        spriteAreaWidth, // width: 80
        spriteAreaHeight // height: 50
      );
      this.container.add(debugBox);
    }

    // 优先使用配置中的 sprite 配置
    if (unitConfig.sprite) {
      const spriteConfig = unitConfig.sprite;
      // 使用统一的纹理 key 生成函数
      const textureKey = generateTextureKey(spriteConfig);

      // 检查纹理是否存在
      if (this.scene.textures.exists(textureKey)) {
        // 纹理已存在，创建精灵
        this.sprite = this.scene.add.sprite(0, spriteY, textureKey, 0);

        // 生成动画 key
        const animKey = generateAnimationKey(textureKey);
        if (this.scene.anims.exists(animKey)) {
          (this.sprite as Phaser.GameObjects.Sprite).play(animKey);
        }

        // 玩家角色默认朝向左侧，不需要翻转；敌人需要翻转面向右侧
        if (!isPlayer) {
          this.sprite.setFlipX(true);
        }
        // 计算适配容器的缩放值，然后乘以配置的 scale
        const configScale = spriteConfig.scale ?? SPRITE.defaultScale;
        const finalScale = this.calculateFitScale(this.sprite, configScale);
        this.sprite.setScale(finalScale);
        this.sprite.setPosition(
          Math.round(this.sprite.x),
          Math.round(this.sprite.y)
        );
        this.container.add(this.sprite);
        return;
      }
    }

    // 回退到默认行为
    if (isPlayer && this.scene.textures.exists("hero")) {
      // 玩家使用雪碧图
      this.sprite = this.scene.add.sprite(0, spriteY, "hero", 0);
      if (this.scene.anims.exists("hero_idle")) {
        (this.sprite as Phaser.GameObjects.Sprite).play("hero_idle");
      }
      // 玩家角色默认朝向左侧，不需要翻转
      // 计算适配容器的缩放值，然后乘以配置的 scale
      const playerConfigScale = unitConfig.sprite?.scale ?? SPRITE.defaultScale;
      const playerFinalScale = this.calculateFitScale(
        this.sprite,
        playerConfigScale
      );
      this.sprite.setScale(playerFinalScale);
      this.sprite.setPosition(
        Math.round(this.sprite.x),
        Math.round(this.sprite.y)
      );
    } else {
      // 敌人使用默认图像，需要翻转面向右侧（与左侧玩家面对面）
      this.sprite = this.scene.add.image(0, spriteY, "enemy_default");
      // 计算适配容器的缩放值，然后乘以配置的 scale
      const enemyConfigScale = unitConfig.sprite?.scale ?? SPRITE.defaultScale;
      const enemyFinalScale = this.calculateFitScale(
        this.sprite,
        enemyConfigScale
      );
      this.sprite.setScale(enemyFinalScale);
      this.sprite.setTint(0xdddddd);
      this.sprite.setFlipX(true); // 敌人需要翻转面向右
      this.sprite.setPosition(
        Math.round(this.sprite.x),
        Math.round(this.sprite.y)
      );
    }

    this.container.add(this.sprite);
  }

  /**
   * 渲染血条和蓝条（交错显示，白色描边）
   * 血条在上（更靠近人物），蓝条在下（更远离人物）
   * 血条都是红色，蓝条x位置在血条x-10
   * 血条应该在容器底部区域
   */
  private renderBars(): void {
    const {
      hp = 100,
      maxHp = 100,
      mp = 0,
      maxMp = 0,
      speedOrder,
    } = this.config;
    const barWidth = this.width * HEALTH_BARS.barWidthRatio;
    const barHeight = HEALTH_BARS.barHeight;
    const barSpacing = HEALTH_BARS.barSpacing;
    // 血条区域在容器底部
    const barAreaBottom = this.height / 2; // 容器底部
    const barAreaCenterY = barAreaBottom - this.barAreaHeight / 2; // 血条区域中心Y位置
    const hpBarX = 0; // 血条中心x位置
    const mpBarX = hpBarX + HEALTH_BARS.mpBarOffsetX; // 蓝条x位置偏移

    // 血条在血条区域的中间偏上位置
    const hpBarBgY = Math.round(barAreaCenterY - barSpacing);

    // 速度顺序数字（在血条左侧显示）
    if (speedOrder !== undefined) {
      this.speedOrderText = this.scene.add
        .text(
          Math.round(hpBarX - barWidth / 2 + HEALTH_BARS.speedOrderOffsetX),
          Math.round(hpBarBgY),
          speedOrder.toString(),
          {
            fontSize: HEALTH_BARS.speedOrderFontSize,
            color: HEALTH_BARS.speedOrderTextColor,
            fontStyle: "bold",
            stroke: HEALTH_BARS.speedOrderStrokeColor,
            strokeThickness: HEALTH_BARS.speedOrderStrokeThickness,
          }
        )
        .setOrigin(0.5);
      if (this.speedOrderText.texture) {
        this.speedOrderText.texture.setFilter(
          Phaser.Textures.FilterMode.NEAREST
        );
      }
      this.container.add(this.speedOrderText);
    }

    // 血条在上方（更靠近人物）
    const hpBarResult = this.renderSingleBar(
      hpBarX,
      hpBarBgY,
      barWidth,
      barHeight,
      hp,
      maxHp,
      HEALTH_BARS.hpBarColor
    );
    this.hpBar = hpBarResult.fill;

    // 蓝条在下方（所有单位都显示，交错显示在血条下方）
    // 即使 maxMp 为 0 也显示蓝条（显示为空）
    const mpBarBgY = Math.round(hpBarBgY + barHeight + barSpacing);
    const mpBarResult = this.renderSingleBar(
      mpBarX,
      mpBarBgY,
      barWidth,
      barHeight,
      mp,
      maxMp || 1,
      HEALTH_BARS.mpBarColor
    );
    this.mpBar = mpBarResult.fill;
  }

  /**
   * 更新血量
   */
  updateHp(hp: number, maxHp: number): void {
    this.config.hp = hp;
    this.config.maxHp = maxHp;
    this.updateBars();
  }

  /**
   * 更新蓝量
   */
  updateMp(mp: number, maxMp: number): void {
    this.config.mp = mp;
    this.config.maxMp = maxMp;
    this.updateBars();
  }

  /**
   * 更新速度顺序
   */
  updateSpeedOrder(order: number): void {
    this.config.speedOrder = order;
    if (this.speedOrderText) {
      this.speedOrderText.setText(order.toString());
    }
  }

  /**
   * 更新血条和蓝条
   */
  private updateBars(): void {
    const { hp = 100, maxHp = 100, mp = 0, maxMp = 0 } = this.config;
    const barWidth = this.width * HEALTH_BARS.barWidthRatio;
    const barHeight = HEALTH_BARS.barHeight;
    const barSpacing = HEALTH_BARS.barSpacing;
    // 血条区域在容器底部
    const barAreaBottom = this.height / 2; // 容器底部
    const barAreaCenterY = barAreaBottom - this.barAreaHeight / 2; // 血条区域中心Y位置
    const hpBarBgY = Math.round(barAreaCenterY - barSpacing); // 血条在血条区域中间偏上
    const hpBarX = 0;
    const mpBarX = hpBarX + HEALTH_BARS.mpBarOffsetX;

    // 更新血条
    if (this.hpBar) {
      this.updateSingleBar(
        this.hpBar,
        hpBarX,
        hpBarBgY,
        barWidth,
        barHeight,
        hp,
        maxHp,
        HEALTH_BARS.hpBarColor
      );
    }

    // 更新蓝条
    if (this.mpBar) {
      const mpBarBgY = Math.round(hpBarBgY + barHeight + barSpacing);
      this.updateSingleBar(
        this.mpBar,
        mpBarX,
        mpBarBgY,
        barWidth,
        barHeight,
        mp,
        maxMp || 1,
        HEALTH_BARS.mpBarColor
      );
    }
  }

  /**
   * 渲染单个条（血条或蓝条）的私有方法
   */
  private renderSingleBar(
    x: number,
    y: number,
    width: number,
    height: number,
    current: number,
    max: number,
    fillColor: number
  ): { bg: Phaser.GameObjects.Graphics; fill: Phaser.GameObjects.Graphics } {
    const left = Math.round(x - width / 2);
    const top = Math.round(y - height / 2);
    const widthRounded = Math.round(width);
    const heightRounded = Math.round(height);
    const padding = HEALTH_BARS.barPadding;

    // 背景矩形（白色边框）
    const bg = this.scene.add.graphics();
    bg.fillStyle(HEALTH_BARS.barBgColor);
    bg.fillRect(left, top, widthRounded, heightRounded);
    this.container.add(bg);

    // 计算填充宽度
    const effectiveMax = max || 1;
    const ratio = Math.max(0, Math.min(1, current / effectiveMax));
    const fillWidth = Math.max(
      0,
      Math.round((widthRounded - padding * 2) * ratio)
    );

    // 填充矩形
    const fill = this.scene.add.graphics();
    const fillColorToUse =
      fillWidth > 0 ? fillColor : HEALTH_BARS.emptyBarColor;
    fill.fillStyle(fillColorToUse);
    const actualFillWidth =
      fillWidth > 0 ? fillWidth : widthRounded - padding * 2;
    fill.fillRect(
      left + padding,
      top + padding,
      actualFillWidth,
      heightRounded - padding * 2
    );
    this.container.add(fill);

    return { bg, fill };
  }

  /**
   * 更新单个条的私有方法
   */
  private updateSingleBar(
    fill: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    current: number,
    max: number,
    fillColor: number
  ): void {
    fill.clear();

    const left = Math.round(x - width / 2);
    const top = Math.round(y - height / 2);
    const widthRounded = Math.round(width);
    const heightRounded = Math.round(height);
    const padding = HEALTH_BARS.barPadding;

    // 计算填充宽度
    const effectiveMax = max || 1;
    const ratio = Math.max(0, Math.min(1, current / effectiveMax));
    const fillWidth = Math.max(
      0,
      Math.round((widthRounded - padding * 2) * ratio)
    );

    // 更新填充
    const fillColorToUse =
      fillWidth > 0 ? fillColor : HEALTH_BARS.emptyBarColor;
    fill.fillStyle(fillColorToUse);
    const actualFillWidth =
      fillWidth > 0 ? fillWidth : widthRounded - padding * 2;
    fill.fillRect(
      left + padding,
      top + padding,
      actualFillWidth,
      heightRounded - padding * 2
    );
  }

  /**
   * 设置容器位置
   */
  setPosition(x: number, y: number): void {
    this.container.setPosition(Math.round(x), Math.round(y));
  }

  /**
   * 销毁渲染器
   */
  destroy(): void {
    this.container.destroy(true);
  }
}
