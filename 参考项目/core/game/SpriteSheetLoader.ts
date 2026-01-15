/**
 * @file 动态精灵图加载器
 */
import Phaser from "phaser";

interface SpriteSheetOptions {
  scene: Phaser.Scene;
  url: string;
  key: string;
  rows: number;
  cols: number;
  frameCount: number;
  animConfig?: { name: string; frameRate?: number; repeat?: number };
}

export class SpriteSheetLoader {
  private readonly scene: Phaser.Scene;

  private readonly url: string;

  private readonly key: string;

  private readonly rows: number;

  private readonly cols: number;

  private readonly frameCount: number;

  private readonly animConfig?: {
    name: string;
    frameRate?: number;
    repeat?: number;
  };

  private readonly tempKey: string;

  constructor(options: SpriteSheetOptions) {
    this.scene = options.scene;
    this.url = options.url;
    this.key = options.key;
    this.rows = options.rows;
    this.cols = options.cols;
    this.frameCount = options.frameCount;
    this.animConfig = options.animConfig;
    this.tempKey = `${this.key}_tmp`;
  }

  preload(): void {
    this.scene.load.image(this.tempKey, this.url);
  }

  create(): { key: string; anim?: string } | null {
    const texture = this.scene.textures.get(this.tempKey);
    if (texture.key === "__MISSING") return null;

    const source = texture.source[0];
    if (!source) return null;

    const frameWidth = Math.floor(source.width / this.cols);
    const frameHeight = Math.floor(source.height / this.rows);
    const baseImage = texture.getSourceImage();

    if (
      !this.scene.textures.exists(this.key) &&
      baseImage &&
      baseImage instanceof HTMLImageElement
    ) {
      this.scene.textures.addSpriteSheet(this.key, baseImage, {
        frameWidth,
        frameHeight,
      });
      // 设置纹理过滤模式为 NEAREST，保持像素艺术清晰
      const texture = this.scene.textures.get(this.key);
      if (texture) {
        texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }

    if (this.animConfig && !this.scene.anims.exists(this.animConfig.name)) {
      this.scene.anims.create({
        key: this.animConfig.name,
        frames: this.scene.anims.generateFrameNumbers(this.key, {
          start: 0,
          end: Math.max(this.frameCount - 1, 0),
        }),
        frameRate: this.animConfig.frameRate ?? 10,
        repeat: this.animConfig.repeat ?? -1,
      });
    }

    this.scene.textures.remove(this.tempKey);
    return { key: this.key, anim: this.animConfig?.name };
  }
}
