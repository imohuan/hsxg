/**
 * @file 纹理管理器服务
 * @description 统一管理Phaser场景中的纹理加载、创建、缓存等操作
 *
 * 主要功能：
 * - 预加载纹理（preload阶段）
 * - 创建纹理（create阶段）
 * - 异步动态加载纹理（运行时）
 * - 批量加载纹理
 * - 纹理加载错误处理（降级方案）
 * - 纹理缓存管理
 */

import Phaser from "phaser";
import { SpriteSheetLoader } from "../game/SpriteSheetLoader";
import type { CharacterConfig } from "../designer/types";
import {
  generateTextureKey,
  generateAnimationKey,
  normalizeUrl,
  calculateFrameCount,
} from "../utils/texture";

/**
 * 纹理配置接口
 * @description 定义纹理加载所需的配置信息
 */
export interface TextureConfig {
  /** 纹理资源URL */
  url: string;
  /** 精灵图行数 */
  rows: number;
  /** 精灵图列数 */
  cols: number;
  /** 实际帧数（可选，默认为 rows * cols） */
  frameCount?: number;
  /** 纹理唯一标识符（可选） */
  id?: string;
  /** 动画帧率（可选，默认值由系统决定） */
  fps?: number;
}

/**
 * 已加载纹理接口
 * @description 返回已加载纹理的信息
 */
export interface LoadedTexture {
  /** 纹理键名（用于在Phaser中引用纹理） */
  key: string;
  /** 动画键名（可选，如果创建了动画则包含） */
  animKey?: string;
}

/**
 * 纹理管理器类
 * @description 统一管理场景中的纹理加载和创建，提供预加载、动态加载、错误处理等功能
 */
export class TextureManager {
  /** Phaser场景实例 */
  private scene: Phaser.Scene;
  /** 已加载纹理的键名集合（用于跟踪已加载的纹理） */
  private loadedTextures: Set<string> = new Set();

  /**
   * 构造函数
   * @param scene Phaser场景实例
   */
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * 预加载单个纹理（用于 preload 阶段）
   * @param config 纹理配置
   * @param key 纹理键名
   * @returns SpriteSheetLoader实例
   * @description
   * - 在Phaser的preload阶段调用
   * - 创建SpriteSheetLoader并调用preload方法
   * - 自动创建动画配置（帧率12，无限循环）
   * - 返回loader实例，后续在create阶段调用create方法
   */
  preloadTexture(config: TextureConfig, key: string): SpriteSheetLoader {
    const loader = new SpriteSheetLoader({
      scene: this.scene,
      url: normalizeUrl(config.url), // 规范化URL（处理相对路径）
      key,
      rows: config.rows,
      cols: config.cols,
      frameCount: calculateFrameCount(
        config.frameCount,
        config.rows,
        config.cols
      ),
      animConfig: {
        name: generateAnimationKey(key), // 生成动画键名
        frameRate: config.fps ?? 12, // 从配置读取帧率，默认12
        repeat: -1, // 无限循环
      },
    });
    loader.preload();
    return loader;
  }

  /**
   * 批量预加载纹理（用于 preload 阶段）
   * @param configs 纹理配置列表（每个配置包含key字段）
   * @returns SpriteSheetLoader实例数组
   * @description 批量预加载多个纹理，返回所有loader实例
   */
  preloadTextures(
    configs: Array<TextureConfig & { key: string }>
  ): SpriteSheetLoader[] {
    return configs.map((config) => {
      const { key, ...textureConfig } = config;
      return this.preloadTexture(textureConfig, key);
    });
  }

  /**
   * 创建纹理（用于 create 阶段）
   * @param loader SpriteSheetLoader实例
   * @returns 已加载纹理信息，如果创建失败则返回null
   * @description
   * - 在Phaser的create阶段调用
   * - 从loader创建纹理和动画
   * - 记录已加载的纹理键名
   */
  createTexture(loader: SpriteSheetLoader): LoadedTexture | null {
    const result = loader.create();
    if (result) {
      this.loadedTextures.add(result.key);
    }
    return result;
  }

  /**
   * 异步加载单个纹理（动态加载）
   * @param config 纹理配置
   * @param key 纹理键名
   * @returns Promise，解析为已加载纹理信息或null
   * @description
   * - 运行时动态加载纹理（不在preload阶段）
   * - 如果纹理已存在，直接返回
   * - 使用临时键名加载，加载成功后创建精灵图表并移除临时纹理
   * - 自动创建动画
   * - 加载失败时尝试使用默认纹理降级
   *
   * 加载流程：
   * 1. 检查纹理是否已存在
   * 2. 使用临时键名加载图片
   * 3. 加载完成后创建精灵图表
   * 4. 创建动画
   * 5. 移除临时纹理
   */
  async loadTexture(
    config: TextureConfig,
    key: string
  ): Promise<LoadedTexture | null> {
    // 如果纹理已存在，直接返回
    if (this.scene.textures.exists(key)) {
      return {
        key,
        animKey: this.scene.anims.exists(generateAnimationKey(key))
          ? generateAnimationKey(key)
          : undefined,
      };
    }

    return new Promise((resolve, reject) => {
      const tempKey = `${key}_tmp`; // 临时键名，避免冲突
      const normalizedUrl = normalizeUrl(config.url);

      // 监听加载完成事件
      this.scene.load.once(`filecomplete-image-${tempKey}`, () => {
        try {
          const texture = this.scene.textures.get(tempKey);
          // 检查是否为缺失纹理
          if (texture.key === "__MISSING") {
            reject(new Error(`Failed to load texture: ${config.url}`));
            return;
          }

          const source = texture.source[0];
          if (!source) {
            reject(new Error(`No source found for texture: ${config.url}`));
            return;
          }

          // 计算单帧尺寸
          const frameWidth = Math.floor(source.width / config.cols);
          const frameHeight = Math.floor(source.height / config.rows);
          const baseImage = texture.getSourceImage();

          // 创建精灵图表（如果还不存在）
          if (
            !this.scene.textures.exists(key) &&
            baseImage &&
            baseImage instanceof HTMLImageElement
          ) {
            this.scene.textures.addSpriteSheet(key, baseImage, {
              frameWidth,
              frameHeight,
            });
            // 设置纹理过滤模式为 NEAREST，保持像素艺术清晰（避免模糊）
            const createdTexture = this.scene.textures.get(key);
            if (createdTexture) {
              createdTexture.setFilter(Phaser.Textures.FilterMode.NEAREST);
            }
          }

          // 创建动画（如果还不存在）
          const animKey = generateAnimationKey(key);
          if (!this.scene.anims.exists(animKey)) {
            const frameCount = calculateFrameCount(
              config.frameCount,
              config.rows,
              config.cols
            );
            this.scene.anims.create({
              key: animKey,
              frames: this.scene.anims.generateFrameNumbers(key, {
                start: 0,
                end: Math.max(frameCount - 1, 0),
              }),
              frameRate: config.fps ?? 12, // 从配置读取帧率，默认12
              repeat: -1, // 无限循环
            });
          }

          // 移除临时纹理（清理）
          this.scene.textures.remove(tempKey);
          this.loadedTextures.add(key);
          resolve({ key, animKey });
        } catch (error) {
          reject(error);
        }
      });

      // 监听加载错误事件
      const errorHandler = (file: any) => {
        if (file.key === tempKey) {
          this.scene.load.off(`loaderror`, errorHandler);
          // 尝试使用默认纹理降级
          this.handleTextureLoadError(key, config).then(resolve).catch(reject);
        }
      };
      this.scene.load.once(`loaderror`, errorHandler);

      // 开始加载
      this.scene.load.image(tempKey, normalizedUrl);
      this.scene.load.start();
    });
  }

  /**
   * 批量异步加载纹理
   * @param configs 纹理配置列表（每个配置包含key字段）
   * @returns Promise，解析为纹理键名到加载结果的映射
   * @description
   * - 并发加载多个纹理，提高加载效率
   * - 自动过滤已存在的纹理，避免重复加载
   * - 对于已存在的纹理，直接添加到结果中
   * - 返回所有纹理的加载结果（包括已存在的）
   *
   * 优化策略：
   * - 只加载不存在的纹理
   * - 并发加载，不阻塞
   * - 加载失败时返回null，不抛出错误
   */
  async loadTextures(
    configs: Array<TextureConfig & { key: string }>
  ): Promise<Map<string, LoadedTexture | null>> {
    const results = new Map<string, LoadedTexture | null>();

    // 过滤出需要加载的纹理（已存在的跳过）
    const toLoad = configs.filter(
      (config) => !this.scene.textures.exists(config.key)
    );

    // 并发加载所有需要加载的纹理
    const promises = toLoad.map(async (config) => {
      const { key, ...textureConfig } = config;
      // 加载失败时返回null，不抛出错误
      const result = await this.loadTexture(textureConfig, key).catch(
        () => null
      );
      return { key, result };
    });

    // 等待所有加载完成
    const loaded = await Promise.all(promises);
    loaded.forEach(({ key, result }) => {
      results.set(key, result);
    });

    // 对于已存在的纹理，直接添加到结果中（不需要加载）
    configs.forEach((config) => {
      if (this.scene.textures.exists(config.key) && !results.has(config.key)) {
        results.set(config.key, {
          key: config.key,
          animKey: this.scene.anims.exists(generateAnimationKey(config.key))
            ? generateAnimationKey(config.key)
            : undefined,
        });
      }
    });

    return results;
  }

  /**
   * 处理纹理加载错误（尝试使用默认纹理）
   * @param key 纹理键名
   * @param config 纹理配置
   * @returns Promise，解析为降级纹理信息或null
   * @description
   * - 当纹理加载失败时，尝试使用默认的"hero"纹理作为降级方案
   * - 如果"hero"纹理存在，复制它并按照配置创建精灵图表和动画
   * - 这是一种优雅降级策略，确保游戏可以继续运行
   *
   * 降级流程：
   * 1. 检查"hero"纹理是否存在
   * 2. 如果存在，复制并创建新的精灵图表
   * 3. 按照配置创建动画
   * 4. 返回降级纹理信息
   */
  private async handleTextureLoadError(
    key: string,
    config: TextureConfig
  ): Promise<LoadedTexture | null> {
    console.warn(`Failed to load texture: ${config.url}, trying fallback`);

    // 如果默认 hero 纹理存在，复制它作为降级方案
    if (this.scene.textures.exists("hero")) {
      const heroTexture = this.scene.textures.get("hero");
      if (heroTexture && !this.scene.textures.exists(key)) {
        const source = heroTexture.source[0];
        if (source) {
          const baseImage = heroTexture.getSourceImage();
          if (baseImage && baseImage instanceof HTMLImageElement) {
            // 使用hero纹理创建新的精灵图表
            this.scene.textures.addSpriteSheet(key, baseImage, {
              frameWidth: Math.floor(source.width / config.cols),
              frameHeight: Math.floor(source.height / config.rows),
            });
            const createdTexture = this.scene.textures.get(key);
            if (createdTexture) {
              createdTexture.setFilter(Phaser.Textures.FilterMode.NEAREST);
            }

            // 创建动画
            const animKey = generateAnimationKey(key);
            if (!this.scene.anims.exists(animKey)) {
              const frameCount = calculateFrameCount(
                config.frameCount,
                config.rows,
                config.cols
              );
              this.scene.anims.create({
                key: animKey,
                frames: this.scene.anims.generateFrameNumbers(key, {
                  start: 0,
                  end: Math.max(frameCount - 1, 0),
                }),
                frameRate: config.fps ?? 12, // 从配置读取帧率，默认12
                repeat: -1,
              });
            }

            this.loadedTextures.add(key);
            return { key, animKey };
          }
        }
      }
    }

    // 如果无法降级，返回null
    return null;
  }

  /**
   * 检查纹理是否已加载
   * @param key 纹理键名
   * @returns 是否已加载
   * @description 检查Phaser纹理缓存中是否存在指定的纹理
   */
  isTextureLoaded(key: string): boolean {
    return this.scene.textures.exists(key);
  }

  /**
   * 从角色配置加载纹理
   * @param spriteConfig 角色配置
   * @returns Promise，解析为已加载纹理信息或null
   * @description
   * - 便捷方法，从CharacterConfig直接加载纹理
   * - 自动生成纹理键名
   * - 自动提取配置中的纹理信息
   */
  async loadFromCharacterConfig(
    spriteConfig: CharacterConfig
  ): Promise<LoadedTexture | null> {
    const key = generateTextureKey(spriteConfig);
    return this.loadTexture(
      {
        url: spriteConfig.url,
        rows: spriteConfig.rows,
        cols: spriteConfig.cols,
        frameCount: spriteConfig.frameCount,
        id: spriteConfig.id,
        fps: spriteConfig.fps, // 传递帧率配置
      },
      key
    );
  }
}
