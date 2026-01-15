/**
 * @file 战斗配置处理工具函数
 * @description 统一管理战斗配置的处理逻辑（过滤、分组、排序、纹理提取等）
 */

import type { BattleJSONConfig, BattleUnitConfig } from "../game/config";
import { sortUnitsByYPosition } from "./speedOrder";
import { generateTextureKey, calculateFrameCount } from "./texture";

/**
 * 纹理配置接口
 * 用于描述需要加载的纹理资源信息
 */
export interface TextureConfig {
  /** 纹理的唯一标识键 */
  key: string;
  /** 纹理图片的URL地址 */
  url: string;
  /** 精灵图的行数 */
  rows: number;
  /** 精灵图的列数 */
  cols: number;
  /** 实际帧数（如果未指定，则为 rows * cols） */
  frameCount: number;
  /** 可选的单位ID */
  id?: string;
  /** 动画帧率（可选，默认值由系统决定） */
  fps?: number;
}

/**
 * 提取并验证战斗单位配置
 *
 * @param config - 战斗JSON配置对象
 * @returns 包含玩家、敌人和所有单位的对象
 *
 * @description
 * 此函数从战斗配置中提取单位信息，并进行以下处理：
 * 1. 过滤掉 undefined 值，确保类型安全
 * 2. 按 Y 坐标排序单位（底部单位最后渲染，显示在最上层）
 * 3. 返回分组后的单位数组
 */
export function extractBattleUnits(config: BattleJSONConfig): {
  players: BattleUnitConfig[];
  enemies: BattleUnitConfig[];
  allUnits: BattleUnitConfig[];
} {
  // 过滤并验证玩家单位配置
  const players = (config.players ?? []).filter(
    (e): e is BattleUnitConfig => e !== undefined
  );

  // 过滤并验证敌人单位配置
  const enemies = (config.enemies ?? []).filter(
    (e): e is BattleUnitConfig => e !== undefined
  );

  // 按 Y 坐标排序单位
  // 底部单位（y 值大）最后创建，这样会渲染在最上层，符合视觉逻辑
  const sortedPlayers = sortUnitsByYPosition(players);
  const sortedEnemies = sortUnitsByYPosition(enemies);

  return {
    players: sortedPlayers,
    enemies: sortedEnemies,
    allUnits: [...sortedPlayers, ...sortedEnemies],
  };
}

/**
 * 从单位配置中提取所有唯一的纹理配置
 *
 * @param units - 战斗单位配置数组
 * @returns 纹理配置数组（已去重）
 *
 * @description
 * 此函数遍历所有单位，提取它们使用的纹理配置：
 * 1. 为每个单位的精灵图生成唯一的纹理键
 * 2. 使用 Set 去重，避免重复加载相同纹理
 * 3. 计算实际帧数（如果未指定，使用 rows * cols）
 *
 * 用途：在战斗场景初始化时，可以预先加载所有需要的纹理资源
 */
export function extractTextureConfigs(
  units: BattleUnitConfig[]
): TextureConfig[] {
  const textureConfigs: TextureConfig[] = [];
  // 使用 Set 记录已收集的纹理键，避免重复
  const textureKeys = new Set<string>();

  for (const unit of units) {
    // 跳过没有精灵图配置的单位
    if (!unit.sprite) continue;

    const spriteConfig = unit.sprite;
    // 生成纹理的唯一标识键
    const textureKey = generateTextureKey(spriteConfig);

    // 如果该纹理已经收集过，跳过（去重）
    if (textureKeys.has(textureKey)) continue;
    textureKeys.add(textureKey);

    // 添加到纹理配置列表
    textureConfigs.push({
      key: textureKey,
      url: spriteConfig.url,
      rows: spriteConfig.rows,
      cols: spriteConfig.cols,
      // 计算实际帧数：如果未指定 frameCount，则使用 rows * cols
      frameCount: calculateFrameCount(
        spriteConfig.frameCount,
        spriteConfig.rows,
        spriteConfig.cols
      ),
      id: spriteConfig.id,
      fps: spriteConfig.fps, // 提取帧率配置
    });
  }

  return textureConfigs;
}
