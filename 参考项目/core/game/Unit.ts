/**
 * @file 战斗单位
 */
import Phaser from "phaser";

export class Unit extends Phaser.GameObjects.Container {
  public hp = 100;

  public maxHp = 100;

  public mp = 50;

  public sprite: Phaser.GameObjects.Sprite;

  private aura: Phaser.GameObjects.Graphics;

  private readonly isPlayerUnitFlag: boolean;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    isPlayer: boolean,
    unitName: string,
    animKey?: string
  ) {
    super(scene, x, y);
    this.isPlayerUnitFlag = isPlayer;
    this.sprite = scene.add.sprite(0, 0, texture);
    this.add(this.sprite);

    if (animKey) {
      this.sprite.play(animKey);
    }
    if (isPlayer) {
      this.sprite.setFlipX(true);
    }

    const nameText = scene.add
      .text(0, -60, unitName, {
        fontSize: "14px",
        color: "#fff",
        backgroundColor: "#000",
      })
      .setOrigin(0.5);
    this.add(nameText);

    this.aura = scene.add.graphics();
    this.aura.lineStyle(2, 0xffff00);
    this.aura.strokeCircle(0, 20, 30);
    this.aura.setVisible(false);
    this.add(this.aura);

    this.setSize(60, 80);
    this.setInteractive(
      new Phaser.Geom.Rectangle(-30, -40, 60, 80),
      Phaser.Geom.Rectangle.Contains
    );
    scene.add.existing(this);
    this.name = unitName;
  }

  get isPlayerUnit(): boolean {
    return this.isPlayerUnitFlag;
  }

  setSelected(value: boolean): void {
    this.aura.setVisible(value);
  }

  modifyHp(value: number): void {
    this.hp += value;
    const color = value < 0 ? "#ff0000" : "#00ff00";
    const text = this.scene.add
      .text(this.x, this.y - 80, value.toString(), {
        fontSize: "24px",
        color,
        stroke: "#000",
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.scene.tweens.add({
      targets: text,
      y: text.y - 50,
      alpha: 0,
      duration: 800,
      onComplete: () => text.destroy(),
    });
    if (this.hp <= 0) {
      this.setAlpha(0.5);
    }
  }
}
