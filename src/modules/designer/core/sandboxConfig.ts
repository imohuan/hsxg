/**
 * @file 技能沙盒配置数据
 * @description 定义技能设计器中使用的测试单位数据
 */

/** 沙盒单位类型 */
export interface SkillSandboxUnit {
  id: string;
  side: "player" | "enemy";
  name: string;
  title: string;
  role: "warrior" | "mage" | "support" | "dummy";
  maxHp: number;
  hp: number;
  maxMp: number;
  mp: number;
  level: number;
}

/** 默认施法者ID */
export const DEFAULT_ACTOR_ID = "player-front-1";

/** 默认目标ID列表 */
export const DEFAULT_TARGET_IDS = ["enemy-front-1"];

/**
 * 技能编排沙盒单位数据
 * 包含玩家和敌人的测试单位，用于技能设计器的预览和测试
 */
export const SKILL_SANDBOX_UNITS: SkillSandboxUnit[] = [
  {
    id: "enemy-front-1",
    side: "enemy",
    name: "稻草人·甲",
    title: "前排拦截",
    role: "dummy",
    maxHp: 520,
    hp: 520,
    maxMp: 0,
    mp: 0,
    level: 12,
  },
  {
    id: "enemy-front-2",
    side: "enemy",
    name: "稻草人·乙",
    title: "前排磐石",
    role: "dummy",
    maxHp: 520,
    hp: 520,
    maxMp: 0,
    mp: 0,
    level: 12,
  },
  {
    id: "enemy-back-1",
    side: "enemy",
    name: "稻草人·丙",
    title: "后排靶子",
    role: "dummy",
    maxHp: 380,
    hp: 380,
    maxMp: 0,
    mp: 0,
    level: 12,
  },
  {
    id: "player-back-1",
    side: "player",
    name: "豪杰·弓手",
    title: "后排输出",
    role: "support",
    maxHp: 410,
    hp: 410,
    maxMp: 220,
    mp: 220,
    level: 15,
  },
  {
    id: "player-front-1",
    side: "player",
    name: "豪杰·剑士",
    title: "前排主角",
    role: "warrior",
    maxHp: 560,
    hp: 560,
    maxMp: 160,
    mp: 160,
    level: 15,
  },
  {
    id: "player-front-2",
    side: "player",
    name: "豪杰·医者",
    title: "前排辅助",
    role: "support",
    maxHp: 430,
    hp: 430,
    maxMp: 300,
    mp: 300,
    level: 15,
  },
];

/**
 * 根据 ID 获取沙盒单位
 */
export function getSandboxUnitById(
  id: string,
  units: SkillSandboxUnit[] = SKILL_SANDBOX_UNITS,
): SkillSandboxUnit | undefined {
  return units.find((unit) => unit.id === id);
}

/**
 * 计算单位的交错站位
 * @param units 单位列表
 * @param canvasWidth 画布宽度
 * @param canvasHeight 画布高度
 */
export function calculateStaggeredPositions(
  units: SkillSandboxUnit[],
  canvasWidth: number,
  canvasHeight: number,
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const isPlayer = units[0]?.side === "player";

  // 玩家在左侧，敌人在右侧
  const baseX = isPlayer ? canvasWidth * 0.25 : canvasWidth * 0.75;
  const spacing = 120;

  units.forEach((unit, index) => {
    // 交错排列：奇数行偏移
    const row = Math.floor(index / 2);
    const col = index % 2;
    const offsetX = col === 0 ? -40 : 40;
    const offsetY = (row - (units.length - 1) / 4) * spacing;

    positions.set(unit.id, {
      x: baseX + offsetX,
      y: canvasHeight / 2 + offsetY,
    });
  });

  return positions;
}
