/**
 * @file 雪碧图帧切割属性测试
 * Property 7: 雪碧图帧切割正确性
 * Validates: Requirements 4.2
 *
 * *For any* 雪碧图配置（行数 rows，列数 cols），
 * 切割后生成的帧序列长度应等于 rows × cols（或指定的 frameCount）。
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

/**
 * 纯函数：计算帧序列
 * 从 useSpriteSheet 中提取的核心切割逻辑，用于属性测试
 */
export interface SpriteFrame {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpriteSheetConfig {
  imageWidth: number;
  imageHeight: number;
  rows: number;
  cols: number;
  frameCount?: number;
}

/**
 * 计算帧序列（纯函数版本，用于测试）
 */
export function calculateFrames(config: SpriteSheetConfig): SpriteFrame[] {
  const { imageWidth, imageHeight, rows, cols, frameCount } = config;

  // 边界检查
  if (rows <= 0 || cols <= 0 || imageWidth <= 0 || imageHeight <= 0) {
    return [];
  }

  const frameWidth = Math.floor(imageWidth / cols);
  const frameHeight = Math.floor(imageHeight / rows);

  if (frameWidth <= 0 || frameHeight <= 0) {
    return [];
  }

  const maxFrames = rows * cols;
  const totalFrames = frameCount !== undefined ? Math.min(frameCount, maxFrames) : maxFrames;

  const result: SpriteFrame[] = [];

  for (let i = 0; i < totalFrames; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;

    result.push({
      index: i,
      x: col * frameWidth,
      y: row * frameHeight,
      width: frameWidth,
      height: frameHeight,
    });
  }

  return result;
}

/**
 * 生成保证有效帧尺寸的雪碧图配置
 */
const arbitraryValidSpriteSheetConfig = (): fc.Arbitrary<SpriteSheetConfig> =>
  fc
    .record({
      rows: fc.integer({ min: 1, max: 32 }),
      cols: fc.integer({ min: 1, max: 32 }),
      frameCount: fc.option(fc.integer({ min: 1, max: 1024 }), { nil: undefined }),
    })
    .chain(({ rows, cols, frameCount }) =>
      fc.record({
        // 确保图片尺寸至少能容纳每帧 1 像素
        imageWidth: fc.integer({ min: cols, max: 4096 }),
        imageHeight: fc.integer({ min: rows, max: 4096 }),
        rows: fc.constant(rows),
        cols: fc.constant(cols),
        frameCount: fc.constant(frameCount),
      }),
    );

describe("雪碧图帧切割属性测试", () => {
  /**
   * Feature: turn-based-battle-game, Property 7: 雪碧图帧切割正确性
   * Validates: Requirements 4.2
   *
   * *For any* 雪碧图配置（行数 rows，列数 cols），
   * 切割后生成的帧序列长度应等于 rows × cols（或指定的 frameCount）。
   */
  it("Property 7: 雪碧图帧切割正确性 - 帧序列长度等于 rows × cols 或 frameCount", () => {
    fc.assert(
      fc.property(arbitraryValidSpriteSheetConfig(), (config) => {
        const frames = calculateFrames(config);
        const maxFrames = config.rows * config.cols;
        const expectedFrames = config.frameCount !== undefined ? Math.min(config.frameCount, maxFrames) : maxFrames;

        // 验证：帧序列长度应等于预期值
        expect(frames.length).toBe(expectedFrames);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * 补充测试：每帧的索引应从 0 开始连续递增
   */
  it("Property 7 补充: 帧索引应从 0 开始连续递增", () => {
    fc.assert(
      fc.property(arbitraryValidSpriteSheetConfig(), (config) => {
        const frames = calculateFrames(config);

        // 验证：每帧的索引应从 0 开始连续递增
        for (let i = 0; i < frames.length; i++) {
          expect(frames[i]!.index).toBe(i);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * 补充测试：所有帧的尺寸应相同
   */
  it("Property 7 补充: 所有帧的尺寸应相同", () => {
    fc.assert(
      fc.property(arbitraryValidSpriteSheetConfig(), (config) => {
        const frames = calculateFrames(config);

        if (frames.length === 0) return;

        const expectedWidth = Math.floor(config.imageWidth / config.cols);
        const expectedHeight = Math.floor(config.imageHeight / config.rows);

        // 验证：所有帧的宽高应相同
        for (const frame of frames) {
          expect(frame.width).toBe(expectedWidth);
          expect(frame.height).toBe(expectedHeight);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * 补充测试：帧的位置应在图片范围内
   */
  it("Property 7 补充: 帧的位置应在图片范围内", () => {
    fc.assert(
      fc.property(arbitraryValidSpriteSheetConfig(), (config) => {
        const frames = calculateFrames(config);

        // 验证：每帧的位置应在图片范围内
        for (const frame of frames) {
          expect(frame.x).toBeGreaterThanOrEqual(0);
          expect(frame.y).toBeGreaterThanOrEqual(0);
          expect(frame.x + frame.width).toBeLessThanOrEqual(config.imageWidth);
          expect(frame.y + frame.height).toBeLessThanOrEqual(config.imageHeight);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * 补充测试：帧的行列位置应正确
   */
  it("Property 7 补充: 帧的行列位置应正确", () => {
    fc.assert(
      fc.property(arbitraryValidSpriteSheetConfig(), (config) => {
        const frames = calculateFrames(config);
        const frameWidth = Math.floor(config.imageWidth / config.cols);
        const frameHeight = Math.floor(config.imageHeight / config.rows);

        // 验证：每帧的 x, y 位置应与其行列索引对应
        for (const frame of frames) {
          const expectedRow = Math.floor(frame.index / config.cols);
          const expectedCol = frame.index % config.cols;

          expect(frame.x).toBe(expectedCol * frameWidth);
          expect(frame.y).toBe(expectedRow * frameHeight);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * 补充测试：frameCount 限制应生效
   */
  it("Property 7 补充: frameCount 限制应生效", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 32 }), // rows
        fc.integer({ min: 1, max: 32 }), // cols
        fc.integer({ min: 1, max: 100 }), // frameCount
        (rows, cols, frameCount) => {
          const config: SpriteSheetConfig = {
            imageWidth: cols * 64, // 确保有效尺寸
            imageHeight: rows * 64,
            rows,
            cols,
            frameCount,
          };

          const frames = calculateFrames(config);
          const maxFrames = rows * cols;

          // 验证：帧数应为 frameCount 和 maxFrames 的较小值
          expect(frames.length).toBe(Math.min(frameCount, maxFrames));
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * 补充测试：无效配置应返回空数组
   */
  it("Property 7 补充: 无效配置应返回空数组", () => {
    // rows <= 0
    expect(calculateFrames({ imageWidth: 100, imageHeight: 100, rows: 0, cols: 4 })).toEqual([]);
    expect(calculateFrames({ imageWidth: 100, imageHeight: 100, rows: -1, cols: 4 })).toEqual([]);

    // cols <= 0
    expect(calculateFrames({ imageWidth: 100, imageHeight: 100, rows: 4, cols: 0 })).toEqual([]);
    expect(calculateFrames({ imageWidth: 100, imageHeight: 100, rows: 4, cols: -1 })).toEqual([]);

    // imageWidth <= 0
    expect(calculateFrames({ imageWidth: 0, imageHeight: 100, rows: 4, cols: 4 })).toEqual([]);
    expect(calculateFrames({ imageWidth: -1, imageHeight: 100, rows: 4, cols: 4 })).toEqual([]);

    // imageHeight <= 0
    expect(calculateFrames({ imageWidth: 100, imageHeight: 0, rows: 4, cols: 4 })).toEqual([]);
    expect(calculateFrames({ imageWidth: 100, imageHeight: -1, rows: 4, cols: 4 })).toEqual([]);
  });

  /**
   * 补充测试：帧不应重叠（使用小规模配置避免超时）
   */
  it("Property 7 补充: 帧不应重叠", () => {
    fc.assert(
      fc.property(
        fc.record({
          rows: fc.integer({ min: 1, max: 8 }),
          cols: fc.integer({ min: 1, max: 8 }),
        }),
        ({ rows, cols }) => {
          const config: SpriteSheetConfig = {
            imageWidth: cols * 64,
            imageHeight: rows * 64,
            rows,
            cols,
          };

          const frames = calculateFrames(config);

          // 验证：任意两帧不应重叠
          for (let i = 0; i < frames.length; i++) {
            for (let j = i + 1; j < frames.length; j++) {
              const a = frames[i]!;
              const b = frames[j]!;

              // 检查是否重叠（矩形碰撞检测）
              const noOverlap =
                a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;

              expect(noOverlap).toBe(true);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
