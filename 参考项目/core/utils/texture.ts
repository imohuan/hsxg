/**
 * @file 纹理工具函数
 * @description 统一管理纹理 key 生成、URL 规范化、帧数计算等工具函数
 */

import type { CharacterConfig } from "../designer/types";

/**
 * 生成角色纹理的唯一标识键
 *
 * @param spriteConfig - 角色精灵图配置
 * @returns 纹理的唯一标识键，格式为 "char_{id}" 或 "char_{url的规范化版本}"
 *
 * @description
 * 此函数为每个角色的精灵图生成唯一的纹理键，用于在 Phaser 中标识纹理资源。
 * 优先级：如果配置中有 id，使用 id；否则使用 URL 的规范化版本。
 *
 * 示例：
 * - 有 id: "char_player_001"
 * - 无 id: "char_https_example_com_sprite_png"
 */
export function generateTextureKey(spriteConfig: CharacterConfig): string {
  // 优先使用配置中的 id
  if (spriteConfig.id) {
    return `char_${spriteConfig.id}`;
  }

  // 如果没有 id，使用 URL 生成键（移除特殊字符）
  // 将 URL 中的非字母数字字符替换为下划线
  const normalizedUrl = spriteConfig.url.replace(/[^a-zA-Z0-9]/g, "_");
  return `char_${normalizedUrl}`;
}

/**
 * 生成动画的唯一标识键
 *
 * @param textureKey - 纹理键（由 generateTextureKey 生成）
 * @param animName - 动画名称，默认为 "idle"（待机动画）
 * @returns 动画的唯一标识键，格式为 "{textureKey}_{animName}"
 *
 * @description
 * 此函数为动画生成唯一标识键，用于在 Phaser 中标识动画资源。
 * 一个纹理可以有多个动画（如 idle、walk、attack 等）。
 *
 * 示例：
 * - textureKey: "char_player_001", animName: "idle" -> "char_player_001_idle"
 * - textureKey: "char_player_001", animName: "attack" -> "char_player_001_attack"
 */
export function generateAnimationKey(
  textureKey: string,
  animName: string = "idle"
): string {
  return `${textureKey}_${animName}`;
}

/**
 * 规范化图片 URL（处理相对路径）
 *
 * @param url - 图片 URL（可能是相对路径或绝对路径）
 * @returns 规范化后的 URL（确保以 "/" 或 "http" 开头）
 *
 * @description
 * 此函数确保 URL 格式正确，处理相对路径的情况：
 * - 如果已经是绝对路径（以 "http" 或 "/" 开头），直接返回
 * - 如果是相对路径，在前面添加 "/" 使其成为根路径
 *
 * 示例：
 * - "sprite.png" -> "/sprite.png"
 * - "/sprite.png" -> "/sprite.png"（不变）
 * - "https://example.com/sprite.png" -> "https://example.com/sprite.png"（不变）
 */
export function normalizeUrl(url: string): string {
  // 如果已经是绝对路径（HTTP/HTTPS 或根路径），直接返回
  if (url.startsWith("http") || url.startsWith("/")) {
    return url;
  }

  // 相对路径转换为根路径
  return `/${url}`;
}

/**
 * 计算精灵图的实际帧数
 *
 * @param frameCount - 指定的帧数（可能为 undefined）
 * @param rows - 精灵图的行数
 * @param cols - 精灵图的列数
 * @returns 实际帧数（如果未指定，则为 rows * cols）
 *
 * @description
 * 此函数计算精灵图的总帧数：
 * - 如果配置中指定了 frameCount，使用指定值
 * - 如果未指定，使用 rows * cols 计算（假设所有格子都有帧）
 *
 * 用途：在加载精灵图时，需要知道总帧数来正确分割纹理。
 */
export function calculateFrameCount(
  frameCount: number | undefined,
  rows: number,
  cols: number
): number {
  // 如果指定了帧数，使用指定值；否则使用行数 * 列数
  return frameCount ?? rows * cols;
}
