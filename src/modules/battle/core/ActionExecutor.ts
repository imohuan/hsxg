/**
 * @file 行动执行器
 * 实现攻击、技能、物品、防御、逃跑、召唤行动
 * Requirements: 3.3-3.9
 */
import type { BattleAction, ActionType, UnitConfig } from "@/types";
import type { BattleScene } from "./BattleScene";
import type { Unit } from "./Unit";

/** 行动执行结果 */
export interface ActionResult {
  success: boolean;
  type: ActionType;
  actorId: string;
  targetIds: string[];
  damage?: number;
  heal?: number;
  escaped?: boolean;
  summonedUnitId?: string;
  message?: string;
}

/** 技能配置（简化版） */
export interface SkillConfig {
  id: string;
  name: string;
  mpCost: number;
  baseDamage: number;
  targetType: "single" | "all" | "self" | "random";
  effectId?: string;
}

/** 物品配置 */
export interface ItemConfig {
  id: string;
  name: string;
  type: "heal" | "damage" | "buff";
  value: number;
  targetType: "single" | "self";
}

/** 执行器配置 */
export interface ActionExecutorConfig {
  scene: BattleScene;
  skills: Map<string, SkillConfig>;
  items: Map<string, ItemConfig>;
  summonableUnits: Map<string, UnitConfig>;
  onActionStart?: (action: BattleAction) => void;
  onActionEnd?: (result: ActionResult) => void;
}

/**
 * 行动执行器类
 * 负责执行各种战斗行动
 */
export class ActionExecutor {
  private scene: BattleScene;
  private skills: Map<string, SkillConfig>;
  private items: Map<string, ItemConfig>;
  private summonableUnits: Map<string, UnitConfig>;
  private onActionStart?: (action: BattleAction) => void;
  private onActionEnd?: (result: ActionResult) => void;

  constructor(config: ActionExecutorConfig) {
    this.scene = config.scene;
    this.skills = config.skills;
    this.items = config.items;
    this.summonableUnits = config.summonableUnits;
    this.onActionStart = config.onActionStart;
    this.onActionEnd = config.onActionEnd;
  }

  /**
   * 执行行动
   * Requirements: 3.3-3.9
   */
  async execute(action: BattleAction): Promise<ActionResult> {
    // 触发开始回调
    this.onActionStart?.(action);

    // 获取执行者
    const actor = this.scene.getUnit(action.actorId);
    if (!actor || !actor.isAlive) {
      return this.createResult(action, false, "执行者已死亡或不存在");
    }

    let result: ActionResult;

    switch (action.type) {
      case "attack":
        result = await this.executeAttack(actor, action);
        break;
      case "skill":
        result = await this.executeSkill(actor, action);
        break;
      case "item":
        result = await this.executeItem(actor, action);
        break;
      case "defend":
        result = await this.executeDefend(actor, action);
        break;
      case "escape":
        result = await this.executeEscape(actor, action);
        break;
      case "summon":
        result = await this.executeSummon(actor, action);
        break;
      default:
        result = this.createResult(action, false, "未知行动类型");
    }

    // 触发结束回调
    this.onActionEnd?.(result);

    return result;
  }


  /**
   * 执行攻击行动
   * Requirements: 3.3, 3.4, 3.5
   */
  private async executeAttack(actor: Unit, action: BattleAction): Promise<ActionResult> {
    const targetId = action.targetIds[0];
    if (!targetId) {
      return this.createResult(action, false, "没有攻击目标");
    }

    const target = this.scene.getUnit(targetId);
    if (!target || !target.isAlive) {
      return this.createResult(action, false, "目标已死亡或不存在");
    }

    // 播放攻击动画 (Requirements: 3.3)
    await actor.playAnimationOnce("attack");

    // 计算伤害
    const damage = this.calculateDamage(actor.stats.attack, target.stats.defense);

    // 播放受击特效 (Requirements: 3.4)
    await target.playAnimationOnce("hit");

    // 应用伤害 (Requirements: 3.5)
    target.modifyHp(-damage);

    // 返回待机动画
    actor.playAnimation("idle");

    return this.createResult(action, true, `${actor.config.name} 攻击 ${target.config.name}，造成 ${damage} 点伤害`, {
      damage,
    });
  }

  /**
   * 执行技能行动
   * Requirements: 3.3, 3.4, 3.5
   */
  private async executeSkill(actor: Unit, action: BattleAction): Promise<ActionResult> {
    const skillId = action.skillId;
    if (!skillId) {
      return this.createResult(action, false, "未指定技能");
    }

    const skill = this.skills.get(skillId);
    if (!skill) {
      return this.createResult(action, false, "技能不存在");
    }

    // 检查 MP
    if (actor.mp < skill.mpCost) {
      return this.createResult(action, false, "MP 不足");
    }

    // 消耗 MP
    actor.modifyMp(-skill.mpCost);

    // 播放技能动画
    await actor.playAnimationOnce("skill");

    // 获取目标
    const targets = this.getSkillTargets(actor, action, skill);
    if (targets.length === 0) {
      return this.createResult(action, false, "没有有效目标");
    }

    let totalDamage = 0;

    // 对每个目标执行效果
    for (const target of targets) {
      // 播放特效
      if (skill.effectId) {
        await this.scene.playEffectOnUnit(skill.effectId, target.config.id);
      }

      // 计算并应用伤害
      const damage = this.calculateSkillDamage(actor.stats.attack, target.stats.defense, skill.baseDamage);
      target.modifyHp(-damage);
      totalDamage += damage;

      // 播放受击动画
      await target.playAnimationOnce("hit");
    }

    // 返回待机动画
    actor.playAnimation("idle");

    return this.createResult(
      action,
      true,
      `${actor.config.name} 使用 ${skill.name}，造成 ${totalDamage} 点伤害`,
      { damage: totalDamage },
    );
  }

  /**
   * 执行物品行动
   */
  private async executeItem(actor: Unit, action: BattleAction): Promise<ActionResult> {
    const itemId = action.itemId;
    if (!itemId) {
      return this.createResult(action, false, "未指定物品");
    }

    const item = this.items.get(itemId);
    if (!item) {
      return this.createResult(action, false, "物品不存在");
    }

    // 获取目标
    const targetId = item.targetType === "self" ? actor.config.id : action.targetIds[0];
    if (!targetId) {
      return this.createResult(action, false, "没有使用目标");
    }

    const target = this.scene.getUnit(targetId);
    if (!target) {
      return this.createResult(action, false, "目标不存在");
    }

    // 根据物品类型执行效果
    switch (item.type) {
      case "heal":
        target.modifyHp(item.value);
        return this.createResult(action, true, `${actor.config.name} 使用 ${item.name}，恢复 ${item.value} 点生命`, {
          heal: item.value,
        });

      case "damage":
        target.modifyHp(-item.value);
        return this.createResult(action, true, `${actor.config.name} 使用 ${item.name}，造成 ${item.value} 点伤害`, {
          damage: item.value,
        });

      default:
        return this.createResult(action, true, `${actor.config.name} 使用 ${item.name}`);
    }
  }


  /**
   * 执行防御行动
   */
  private async executeDefend(actor: Unit, action: BattleAction): Promise<ActionResult> {
    // 防御状态可以在 Unit 类中添加 buff 系统来实现
    // 这里简单返回成功
    this.scene.showMessage(`${actor.config.name} 进入防御姿态`);

    return this.createResult(action, true, `${actor.config.name} 进入防御姿态`);
  }

  /**
   * 执行逃跑行动
   * Requirements: 2.8
   */
  private async executeEscape(actor: Unit, action: BattleAction): Promise<ActionResult> {
    // 计算逃跑成功率（基于速度和幸运）
    const escapeChance = Math.min(0.9, 0.3 + (actor.stats.speed + actor.stats.luck) / 200);
    const escaped = Math.random() < escapeChance;

    if (escaped) {
      this.scene.showMessage(`${actor.config.name} 成功逃跑！`);
      return this.createResult(action, true, `${actor.config.name} 成功逃跑`, { escaped: true });
    } else {
      this.scene.showMessage(`${actor.config.name} 逃跑失败！`);
      return this.createResult(action, false, `${actor.config.name} 逃跑失败`, { escaped: false });
    }
  }

  /**
   * 执行召唤行动
   * Requirements: 2.9
   */
  private async executeSummon(actor: Unit, action: BattleAction): Promise<ActionResult> {
    // 检查召唤数量限制
    const playerUnits = this.scene.getPlayerUnits();
    if (playerUnits.length >= 6) {
      return this.createResult(action, false, "队伍已满，无法召唤");
    }

    // 获取要召唤的单位配置
    const summonId = action.skillId; // 复用 skillId 字段存储召唤单位 ID
    if (!summonId) {
      return this.createResult(action, false, "未指定召唤目标");
    }

    const summonConfig = this.summonableUnits.get(summonId);
    if (!summonConfig) {
      return this.createResult(action, false, "召唤目标不存在");
    }

    // 创建新单位
    const newUnit = await this.scene.loadUnit({
      ...summonConfig,
      id: `${summonConfig.id}_${Date.now()}`,
      position: this.findEmptyPosition(true),
    });

    this.scene.showMessage(`${actor.config.name} 召唤了 ${newUnit.config.name}！`);

    return this.createResult(action, true, `${actor.config.name} 召唤了 ${newUnit.config.name}`, {
      summonedUnitId: newUnit.config.id,
    });
  }

  // ============ 辅助方法 ============

  /**
   * 计算普通攻击伤害
   */
  private calculateDamage(attack: number, defense: number): number {
    const baseDamage = Math.max(1, attack - defense / 2);
    // 添加 10% 随机波动
    const variance = baseDamage * 0.1;
    return Math.round(baseDamage + (Math.random() * 2 - 1) * variance);
  }

  /**
   * 计算技能伤害
   */
  private calculateSkillDamage(attack: number, defense: number, skillBase: number): number {
    const baseDamage = Math.max(1, skillBase + attack * 0.5 - defense / 2);
    const variance = baseDamage * 0.1;
    return Math.round(baseDamage + (Math.random() * 2 - 1) * variance);
  }

  /**
   * 获取技能目标
   */
  private getSkillTargets(actor: Unit, action: BattleAction, skill: SkillConfig): Unit[] {
    const targets: Unit[] = [];

    switch (skill.targetType) {
      case "single": {
        const targetId = action.targetIds[0];
        if (targetId) {
          const target = this.scene.getUnit(targetId);
          if (target && target.isAlive) {
            targets.push(target);
          }
        }
        break;
      }

      case "all": {
        // 获取所有敌方存活单位
        const enemies = actor.isPlayer
          ? this.scene.getAliveEnemyUnits()
          : this.scene.getAlivePlayerUnits();
        targets.push(...enemies);
        break;
      }

      case "self":
        targets.push(actor);
        break;

      case "random": {
        // 随机选择一个敌方单位
        const enemies = actor.isPlayer
          ? this.scene.getAliveEnemyUnits()
          : this.scene.getAlivePlayerUnits();
        if (enemies.length > 0) {
          const randomIndex = Math.floor(Math.random() * enemies.length);
          const randomTarget = enemies[randomIndex];
          if (randomTarget) {
            targets.push(randomTarget);
          }
        }
        break;
      }
    }

    return targets;
  }

  /**
   * 查找空位置
   */
  private findEmptyPosition(isPlayer: boolean): { row: number; col: number } {
    const units = isPlayer ? this.scene.getPlayerUnits() : this.scene.getEnemyUnits();
    const occupiedPositions = new Set(units.map((u) => `${u.config.position.row},${u.config.position.col}`));

    // 查找第一个空位
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 2; col++) {
        const key = `${row},${col}`;
        if (!occupiedPositions.has(key)) {
          return { row, col };
        }
      }
    }

    // 默认返回最后一个位置
    return { row: 2, col: 1 };
  }

  /**
   * 创建行动结果
   */
  private createResult(
    action: BattleAction,
    success: boolean,
    message: string,
    extra?: Partial<ActionResult>,
  ): ActionResult {
    return {
      success,
      type: action.type,
      actorId: action.actorId,
      targetIds: action.targetIds,
      message,
      ...extra,
    };
  }

  // ============ 配置更新 ============

  /**
   * 更新技能配置
   */
  setSkills(skills: Map<string, SkillConfig>): void {
    this.skills = skills;
  }

  /**
   * 更新物品配置
   */
  setItems(items: Map<string, ItemConfig>): void {
    this.items = items;
  }

  /**
   * 更新可召唤单位配置
   */
  setSummonableUnits(units: Map<string, UnitConfig>): void {
    this.summonableUnits = units;
  }
}
