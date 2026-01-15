/**
 * @file 战斗场景
 */
import Phaser from "phaser";
import { createTimelineFromSkill } from "./ActionTimeline";
import { SpriteSheetLoader } from "./SpriteSheetLoader";
import { Unit } from "./Unit";
import type { CharacterSpriteConfig } from "./types";
import type { SkillDesign } from "../designer/types";
import type { BattleJSONConfig, BattleUnitConfig } from "./config";
import { getBattleBridge } from "./battleBridge";
import { calculateFrameCount } from "../utils/texture";

export class BattleScene extends Phaser.Scene {
  private units: Unit[] = [];

  private playerUnits: Unit[] = [];

  private enemyUnits: Unit[] = [];

  private selectedUnit: Unit | null = null;

  private messageText?: Phaser.GameObjects.Text;

  private heroLoader!: SpriteSheetLoader;

  private enemyLoader!: SpriteSheetLoader;

  constructor() {
    super({ key: "BattleScene" });
  }

  preload(): void {
    this.load.setBaseURL("https://labs.phaser.io");
    this.load.image("bg", "assets/skies/space3.png");
    this.load.image("ui_panel", "assets/ui/ninepatch/blue.png");

    this.heroLoader = new SpriteSheetLoader({
      scene: this,
      url: "assets/sprites/mummy37x45.png",
      key: "hero",
      rows: 1,
      cols: 18,
      frameCount: 18,
      animConfig: { name: "hero_idle", frameRate: 10, repeat: -1 },
    });
    this.heroLoader.preload();

    this.enemyLoader = new SpriteSheetLoader({
      scene: this,
      url: "assets/sprites/wizball.png",
      key: "enemy",
      rows: 1,
      cols: 1,
      frameCount: 1,
      animConfig: { name: "enemy_idle", frameRate: 1, repeat: -1 },
    });
    this.enemyLoader.preload();

    this.load.spritesheet("explosion", "assets/sprites/explosion.png", {
      frameWidth: 64,
      frameHeight: 64,
    });
  }

  create(): void {
    this.add.image(400, 300, "bg").setScale(2);
    this.heroLoader.create();
    this.enemyLoader.create();

    const playerPositions = [
      { x: 600, y: 200 },
      { x: 650, y: 300 },
      { x: 600, y: 400 },
    ];
    const enemyPositions = [
      { x: 200, y: 200 },
      { x: 150, y: 300 },
      { x: 200, y: 400 },
    ];

    playerPositions.forEach((pos, index) => {
      this.spawnUnit(
        pos.x,
        pos.y,
        "hero",
        true,
        `英雄${index + 1}`,
        "hero_idle"
      );
    });
    enemyPositions.forEach((pos, index) => {
      this.spawnUnit(
        pos.x,
        pos.y,
        "enemy",
        false,
        `魔物${index + 1}`,
        "enemy_idle"
      );
    });

    this.messageText = this.add
      .text(400, 50, "战斗开始 - 请在设计工坊编排技能", {
        fontSize: "20px",
        color: "#fff",
        backgroundColor: "#000",
      })
      .setOrigin(0.5);

    const bridge = getBattleBridge();
    bridge?.onSceneReady?.(this);
  }

  async applyConfig(config: BattleJSONConfig): Promise<void> {
    await this.resetBattlefield();
    for (const player of config.players ?? []) {
      await this.spawnConfiguredUnit(player, true);
    }
    for (const enemy of config.enemies ?? []) {
      await this.spawnConfiguredUnit(enemy, false);
    }
    this.updateMessage("自定义战斗配置已应用，可以在左侧选择角色施放技能");
  }

  getSelectedUnitName(): string | null {
    return this.selectedUnit?.name ?? null;
  }

  executeDesignedSkill(skill: SkillDesign): void {
    if (!this.selectedUnit || !this.selectedUnit.isPlayerUnit) {
      this.updateMessage("请先点击选择一个我方英雄单位！");
      return;
    }
    const target =
      this.enemyUnits.find((unit) => unit.hp > 0) ?? this.enemyUnits[0];
    if (!target) {
      this.updateMessage("没有可用的敌人目标");
      return;
    }
    this.updateMessage(`${this.selectedUnit.name} 正在释放 [${skill.name}]`);

    const timeline = createTimelineFromSkill(
      this,
      skill,
      {
        actor: this.selectedUnit,
        targets: [target],
      },
      () => this.updateMessage("技能释放完毕")
    );
    timeline.start();
  }

  loadDynamicCharacter(
    config: CharacterSpriteConfig & { name?: string; id?: string }
  ): void {
    const textureKey = config.id ?? `char_${Date.now()}`;
    this.loadCharacterSprite(config, textureKey).then((sheet) => {
      this.spawnUnit(
        400,
        300,
        sheet.key,
        true,
        config.name ?? "新角色",
        sheet.anim
      );
      this.updateMessage(`新角色 [${config.name ?? "新角色"}] 已加载`);
    });
  }

  private spawnUnit(
    x: number,
    y: number,
    texture: string,
    isPlayer: boolean,
    name: string,
    animKey?: string
  ): void {
    const unit = new Unit(this, x, y, texture, isPlayer, name, animKey);
    this.units.push(unit);
    if (isPlayer) this.playerUnits.push(unit);
    else this.enemyUnits.push(unit);
    unit.on("pointerdown", () => this.handleUnitClick(unit));
  }

  private handleUnitClick(unit: Unit): void {
    this.units.forEach((u) => u.setSelected(false));
    unit.setSelected(true);
    this.selectedUnit = unit;
    this.updateMessage(`已选择: ${unit.name}`);
  }

  private updateMessage(text: string): void {
    if (this.messageText) {
      this.messageText.setText(text);
    }
  }

  private async resetBattlefield(): Promise<void> {
    this.units.forEach((unit) => unit.destroy());
    this.units = [];
    this.playerUnits = [];
    this.enemyUnits = [];
    this.selectedUnit = null;
  }

  private async spawnConfiguredUnit(
    config: BattleUnitConfig,
    isPlayer: boolean
  ): Promise<void> {
    const textureKey =
      config.id ??
      `${isPlayer ? "player" : "enemy"}_${Date.now()}_${Math.floor(
        Math.random() * 1000
      )}`;
    const sheet = await this.loadCharacterSprite(config.sprite, textureKey);
    this.spawnUnit(
      config.position.x,
      config.position.y,
      sheet.key,
      isPlayer,
      config.name,
      sheet.anim
    );
  }

  private loadCharacterSprite(
    sprite: CharacterSpriteConfig,
    key: string
  ): Promise<{ key: string; anim?: string }> {
    const frameRate = sprite.fps ?? 12;
    return new Promise((resolve) => {
      const loader = new Phaser.Loader.LoaderPlugin(this);
      loader.image(`${key}_tmp`, sprite.url);
      loader.once(Phaser.Loader.Events.COMPLETE, () => {
        const sheetLoader = new SpriteSheetLoader({
          scene: this,
          url: sprite.url,
          key,
          rows: sprite.rows,
          cols: sprite.cols,
          frameCount: calculateFrameCount(undefined, sprite.rows, sprite.cols),
          animConfig: {
            name: `${key}_anim`,
            frameRate,
            repeat: -1,
          },
        });
        const result = sheetLoader.create() ?? { key, anim: `${key}_anim` };
        resolve(result);
      });
      loader.start();
    });
  }
}
