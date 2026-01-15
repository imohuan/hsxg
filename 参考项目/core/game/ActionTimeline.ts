/**
 * @file 技能时间轴
 */
import Phaser from "phaser";
import { ExpressionEvaluator } from "./ExpressionEvaluator";
import type { BattleContext, SkillDesign, SkillStep } from "./types";

export class ActionTimeline {
  private index = 0;

  private isRunning = false;

  private readonly scene: Phaser.Scene;

  private readonly events: SkillStep[];

  private readonly context: BattleContext;

  private readonly onComplete?: () => void;

  constructor(
    scene: Phaser.Scene,
    events: SkillStep[],
    context: BattleContext,
    onComplete?: () => void
  ) {
    this.scene = scene;
    this.events = events;
    this.context = context;
    this.onComplete = onComplete;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.index = 0;
    this.next();
  }

  private next(): void {
    if (!this.isRunning || this.index >= this.events.length) {
      this.complete();
      return;
    }

    const evt = this.events[this.index];
    this.index += 1;
    if (!evt) {
      this.complete();
      return;
    }

    const delay = Number(evt.params.delay) || 0;
    if (delay > 0) {
      this.scene.time.delayedCall(delay, () => this.process(evt));
    } else {
      this.process(evt);
    }
  }

  private complete(): void {
    this.isRunning = false;
    this.onComplete?.();
  }

  private resolveCoordinate(
    value: string | number | boolean | undefined,
    fallback: number,
    ctx: Record<string, number>
  ): number {
    if (typeof value === "number") return value;
    if (typeof value === "string")
      return ExpressionEvaluator.evaluate(value, ctx);
    return fallback;
  }

  private process(evt: SkillStep): void {
    const params = evt.params;
    const contextSnapshot = {
      sourceX: this.context.actor.x,
      sourceY: this.context.actor.y,
      targetX: this.context.targets[0]?.x ?? 0,
      targetY: this.context.targets[0]?.y ?? 0,
    };

    switch (evt.type) {
      case "move": {
        const tx = this.resolveCoordinate(
          params.targetX as any,
          contextSnapshot.targetX,
          contextSnapshot
        );
        const ty = this.resolveCoordinate(
          params.targetY as any,
          contextSnapshot.targetY,
          contextSnapshot
        );
        const duration =
          typeof params.duration === "number"
            ? params.duration
            : Number(params.duration) || 300;
        const moveTarget =
          params.actor && typeof params.actor === "object"
            ? (params.actor as Phaser.GameObjects.GameObject)
            : this.context.actor;
        this.scene.tweens.add({
          targets: moveTarget,
          x: tx,
          y: ty,
          duration,
          ease: (params.ease as string) || "Quad.easeOut",
          onComplete: () => this.next(),
        });
        break;
      }
      case "wait": {
        const waitDuration =
          typeof params.duration === "number"
            ? params.duration
            : Number(params.duration) || 200;
        this.scene.time.delayedCall(waitDuration, () => this.next());
        break;
      }
      case "effect": {
        const key = params.key as string | undefined;
        if (key) {
          const x = this.resolveCoordinate(
            params.x as any,
            contextSnapshot.targetX,
            contextSnapshot
          );
          const y = this.resolveCoordinate(
            params.y as any,
            contextSnapshot.targetY,
            contextSnapshot
          );
          const sprite = this.scene.add.sprite(x, y, key);
          const waitForCompletion = Boolean(params.wait);
          if (params.animKey) {
            sprite.play(params.animKey as string);
          }
          sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            sprite.destroy();
            if (waitForCompletion) this.next();
          });
          if (!waitForCompletion) this.next();
        } else {
          this.next();
        }
        break;
      }
      case "damage": {
        const value =
          typeof params.val === "number" ? params.val : Number(params.val) || 0;
        this.context.targets.forEach((target) => target.modifyHp(-value));
        this.next();
        break;
      }
      default:
        this.next();
    }
  }
}

export const createTimelineFromSkill = (
  scene: Phaser.Scene,
  skill: SkillDesign,
  context: BattleContext,
  onComplete?: () => void
): ActionTimeline =>
  new ActionTimeline(scene, skill.steps, context, onComplete);
