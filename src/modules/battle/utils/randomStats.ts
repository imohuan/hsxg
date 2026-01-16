/**
 * @file 随机数值生成工具
 * 为战斗单位生成随机属性数值
 * Requirements: 8.6, 8.7
 */

/** 数值范围配置 */
export interface StatsRange {
  hp: { min: number; max: number };
  mp: { min: number; max: number };
  speed: { min: number; max: number };
  attack: { min: number; max: number };
  defense: { min: number; max: number };
  luck: { min: number; max: number };
}

/** 生成的战斗数值 */
export interface GeneratedStats {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  speed: number;
  attack: number;
  defense: number;
  luck: number;
}

/**
 * 默认数值范围
 * Requirements: 8.7
 */
export const DEFAULT_STATS_RANGE: StatsRange = {
  hp: { min: 80, max: 200 },
  mp: { min: 30, max: 100 },
  speed: { min: 10, max: 30 },
  attack: { min: 10, max: 50 },
  defense: { min: 5, max: 30 },
  luck: { min: 1, max: 20 },
};

/**
 * 在指定范围内生成随机整数（包含边界值）
 * @param min 最小值
 * @param max 最大值
 * @returns 随机整数
 */
export function randomInRange(min: number, max: number): number {
  // 确保 min <= max
  const actualMin = Math.min(min, max);
  const actualMax = Math.max(min, max);
  return Math.floor(Math.random() * (actualMax - actualMin + 1)) + actualMin;
}

/**
 * 生成随机战斗数值
 * Requirements: 8.6, 8.7
 * @param range 数值范围配置，默认使用 DEFAULT_STATS_RANGE
 * @returns 生成的战斗数值
 */
export function generateRandomStats(range: StatsRange = DEFAULT_STATS_RANGE): GeneratedStats {
  const hp = randomInRange(range.hp.min, range.hp.max);
  const mp = randomInRange(range.mp.min, range.mp.max);

  return {
    hp,
    maxHp: hp,
    mp,
    maxMp: mp,
    speed: randomInRange(range.speed.min, range.speed.max),
    attack: randomInRange(range.attack.min, range.attack.max),
    defense: randomInRange(range.defense.min, range.defense.max),
    luck: randomInRange(range.luck.min, range.luck.max),
  };
}
