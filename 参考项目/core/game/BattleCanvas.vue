<script setup lang="ts">
/**
 * @file 战斗画布组件
 * 游戏的主要 UI 和实现，基于 Phaser 渲染
 */
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import Phaser from "phaser";
import type { BattleJSONConfig, BattleUnitConfig } from "@/core/game/config";
import type { SkillDesign, CharacterConfig } from "@/core/designer/types";
import { SKILL_SANDBOX_UNITS } from "@/core/config/sandboxConfig";
import { DEFAULT_CHARACTER } from "@/core/config/defaults";
import { SpriteSheetLoader } from "@/core/game/SpriteSheetLoader";
import { UnitRenderer } from "@/core/game/UnitRenderer";
import { TextureManager } from "@/core/services/TextureManager";
import {
  extractBattleUnits,
  extractTextureConfigs,
} from "@/core/utils/battleHelpers";
import { getUnitStats } from "@/core/utils/unitData";
import { calculateSpeedOrder } from "@/core/utils/speedOrder";
import { calculateFrameCount, generateTextureKey } from "@/core/utils/texture";
import CanvasContainer from "@/components/common/CanvasContainer.vue";
import { useDesignerLibraryStore } from "@/stores/designerLibrary";
import {
  UNIT_CONTAINER,
  UNIT_AREAS,
  NAME_LABEL,
  SELECTION_AURA,
  INTERACTION,
} from "@/core/config/unitRenderConfig";

const props = defineProps<{
  config?: BattleJSONConfig | null;
  skill?: SkillDesign | null;
  width?: number;
  height?: number;
  disableControls?: boolean; // 禁用缩放和平移控制
}>();

const emit = defineEmits<{
  "unit-click": [unitId: string];
  ready: [];
}>();

const containerRef = ref<HTMLDivElement | null>(null);
const gameRef = ref<Phaser.Game | null>(null);
const sceneRef = ref<BattleCanvasScene | null>(null);
const canvasContainerRef = ref<InstanceType<typeof CanvasContainer> | null>(
  null
);
const resizeObserverRef = ref<ResizeObserver | null>(null);

// 导出方法供父组件调用（使用 CanvasContainer 的方法）
const resetView = () => {
  if (canvasContainerRef.value) {
    canvasContainerRef.value.resetView();
  }
};

const zoomIn = () => {
  if (canvasContainerRef.value) {
    canvasContainerRef.value.zoomIn();
  }
};

const zoomOut = () => {
  if (canvasContainerRef.value) {
    canvasContainerRef.value.zoomOut();
  }
};

const setZoom = (scale: number) => {
  if (sceneRef.value) {
    sceneRef.value.setZoom(scale);
  }
};

const panTo = (x: number, y: number) => {
  if (sceneRef.value) {
    sceneRef.value.panTo(x, y);
  }
};

const applyConfig = (config: BattleJSONConfig) => {
  if (sceneRef.value) {
    sceneRef.value.applyBattleConfig(config);
  }
};

const highlightUnit = (unitId: string | null) => {
  if (sceneRef.value) {
    sceneRef.value.highlightUnit(unitId);
  }
};

const executeSkillPreview = (skill: SkillDesign) => {
  if (sceneRef.value && props.skill) {
    sceneRef.value.previewSkill(skill);
  }
};

defineExpose({
  resetView,
  zoomIn,
  zoomOut,
  setZoom,
  panTo,
  applyConfig,
  highlightUnit,
  executeSkillPreview,
});

/**
 * 战斗画布场景
 * 支持相机控制和单位交互
 */
class BattleCanvasScene extends Phaser.Scene {
  private units: Phaser.GameObjects.Container[] = [];
  private playerUnits: Phaser.GameObjects.Container[] = [];
  private enemyUnits: Phaser.GameObjects.Container[] = [];
  private highlightedUnit: Phaser.GameObjects.Container | null = null;
  private unitMap: Map<string, Phaser.GameObjects.Container> = new Map();

  private cameraScale = 1;
  private cameraPanX = 0;
  private cameraPanY = 0;

  private backgroundGroup!: Phaser.GameObjects.Group;
  private unitsGroup!: Phaser.GameObjects.Group;

  // 纹理管理器
  private textureManager!: TextureManager;

  // 雪碧图加载器
  private heroLoader?: SpriteSheetLoader;
  private enemyLoader?: SpriteSheetLoader;

  private readonly emitUnitClick?: (unitId: string) => void;
  private readonly defaultCharacterConfig?: CharacterConfig;

  constructor(
    config?: Phaser.Types.Scenes.SettingsConfig & {
      emitUnitClick?: (id: string) => void;
      defaultCharacterConfig?: CharacterConfig;
    }
  ) {
    super(config || { key: "BattleCanvasScene" });
    this.emitUnitClick = config?.emitUnitClick;
    this.defaultCharacterConfig = config?.defaultCharacterConfig;
  }

  preload(): void {
    // 加载基础资源
    this.load.setBaseURL("https://labs.phaser.io");

    // 敌人纹理（使用 wizball）
    this.load.image("enemy_default", "assets/sprites/wizball.png");

    // 使用传入的默认人物配置，如果没有则使用默认值
    const basicCharacter = this.defaultCharacterConfig || DEFAULT_CHARACTER;

    // 加载默认 hero 纹理（用于回退）
    const heroUrl =
      basicCharacter.url.startsWith("http") ||
      basicCharacter.url.startsWith("/")
        ? basicCharacter.url
        : `/${basicCharacter.url}`;
    this.heroLoader = new SpriteSheetLoader({
      scene: this,
      url: heroUrl,
      key: "hero",
      rows: basicCharacter.rows,
      cols: basicCharacter.cols,
      frameCount: calculateFrameCount(
        basicCharacter.frameCount,
        basicCharacter.rows,
        basicCharacter.cols
      ),
      animConfig: {
        name: "hero_idle",
        frameRate: basicCharacter.fps ?? 12,
        repeat: -1,
      },
    });
    this.heroLoader.preload();

    // 为"基础"配置创建纹理 key
    const defaultCharKey = basicCharacter.id
      ? generateTextureKey({
          ...basicCharacter,
          name: (basicCharacter as any).name || "基础",
        })
      : "char_基础";
    if (!this.textures.exists(defaultCharKey)) {
      const defaultLoader = new SpriteSheetLoader({
        scene: this,
        url: heroUrl,
        key: defaultCharKey,
        rows: basicCharacter.rows,
        cols: basicCharacter.cols,
        frameCount: calculateFrameCount(
          basicCharacter.frameCount,
          basicCharacter.rows,
          basicCharacter.cols
        ),
        animConfig: {
          name: `${defaultCharKey}_idle`,
          frameRate: basicCharacter.fps ?? 12,
          repeat: -1,
        },
      });
      defaultLoader.preload();
    }

    // 攻击动画雪碧图
    const attackUrl = "/sprite_7x6.webp";
    this.enemyLoader = new SpriteSheetLoader({
      scene: this,
      url: attackUrl,
      key: "hero_attack",
      rows: 7,
      cols: 6,
      frameCount: 42,
      animConfig: { name: "hero_attack", frameRate: 18, repeat: 0 },
    });
    this.enemyLoader.preload();

    // UI 纹理
    this.load.image("ui_panel", "assets/ui/ninepatch/blue.png");
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 初始化纹理管理器
    this.textureManager = new TextureManager(this);

    // 设置相机像素对齐，确保清晰渲染
    this.cameras.main.roundPixels = true;

    // 禁用 Canvas 的图像平滑，确保像素艺术清晰
    const canvas = this.game.canvas;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      (ctx as any).imageSmoothingEnabled = false;
      (ctx as any).webkitImageSmoothingEnabled = false;
      (ctx as any).mozImageSmoothingEnabled = false;
      (ctx as any).msImageSmoothingEnabled = false;
    }

    // 设置输入系统，确保所有层级的事件都能触发
    this.input.setTopOnly(false);

    // 创建分组
    this.backgroundGroup = this.add.group();
    this.unitsGroup = this.add.group();

    // 绘制背景（参考 game.html 的渐变背景，确保像素对齐）
    const bgGraphics = this.add.graphics();
    // 天空渐变
    bgGraphics.fillGradientStyle(0x1a2a6c, 0x1a2a6c, 0xb21f1f, 0xb21f1f, 1);
    bgGraphics.fillRect(0, 0, Math.round(width), Math.round(height * 0.5));
    // 地面渐变
    bgGraphics.fillGradientStyle(0x2b3a42, 0x2b3a42, 0x1a1a1a, 0x1a1a1a, 1);
    const groundY = Math.round(height * 0.5);
    bgGraphics.fillRect(
      0,
      groundY,
      Math.round(width),
      Math.round(height * 0.5)
    );

    // 地板网格线（确保像素对齐）
    bgGraphics.lineStyle(2, 0x444444, 0.3);
    for (let i = 0; i < width; i += 50) {
      bgGraphics.beginPath();
      bgGraphics.moveTo(Math.round(i), Math.round(groundY));
      bgGraphics.lineTo(Math.round(i - 200), Math.round(height));
      bgGraphics.strokePath();
    }

    this.backgroundGroup.add(bgGraphics);

    // 创建雪碧图动画
    if (this.heroLoader) {
      this.heroLoader.create();
    }
    if (this.enemyLoader) {
      this.enemyLoader.create();
    }

    // 确保所有纹理使用 NEAREST 过滤模式，保持像素艺术清晰
    if (this.textures.exists("enemy_default")) {
      this.textures
        .get("enemy_default")
        .setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    // 设置相机初始状态
    this.resetCamera();

    // 监听输入事件
    this.setupInputHandlers();

    // 应用默认沙盒配置
    this.applySandboxConfig();
  }

  private setupInputHandlers(): void {
    // 左键点击选择单位（不处理缩放和平移，由 CanvasContainer 处理）
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        // 检查是否点击了单位（使用 Phaser 的 hitTest）
        const hitObjects = this.input.hitTestPointer(pointer);
        const hitUnit = hitObjects.find((obj: any) => {
          // 检查是否是单位容器
          return this.units.includes(obj as Phaser.GameObjects.Container);
        }) as Phaser.GameObjects.Container | undefined;

        if (hitUnit) {
          // 如果点击了单位，触发单位点击事件
          // 单位的点击事件已经在 createUnit 中设置了
        }
      }
    });
  }

  private updateCameraTransform(): void {
    const camera = this.cameras.main;
    camera.setZoom(this.cameraScale);
    // 相机平移：从左上角 (0, 0) 开始，直接设置滚动位置
    camera.setScroll(this.cameraPanX, this.cameraPanY);
  }

  resetCamera(): void {
    // 相机重置由 CanvasContainer 处理，这里只重置 Phaser 相机到默认状态
    this.cameraScale = 1;
    this.cameraPanX = 0;
    this.cameraPanY = 0;
    // updateCameraTransform 会设置相机位置和缩放
    this.updateCameraTransform();
  }

  zoomCamera(factor: number): void {
    // 缩放由 CanvasContainer 处理
    if (this.cameraScale) {
      this.setZoom(this.cameraScale * factor);
    }
  }

  setZoom(scale: number): void {
    this.cameraScale = Phaser.Math.Clamp(scale, 0.5, 2.5);
    this.updateCameraTransform();
  }

  panTo(x: number, y: number): void {
    // 平移由 CanvasContainer 处理
    this.cameraPanX = x;
    this.cameraPanY = y;
    this.updateCameraTransform();
  }

  /**
   * 应用沙盒默认配置（从 SKILL_SANDBOX_UNITS）
   */
  private async applySandboxConfig(): Promise<void> {
    const canvasWidth = this.cameras.main.width;
    const canvasHeight = this.cameras.main.height;

    const { generateBattleConfigFromSandbox } = await import(
      "@/core/utils/battleConfig"
    );
    const config = generateBattleConfigFromSandbox(
      SKILL_SANDBOX_UNITS,
      canvasWidth,
      canvasHeight
    );
    await this.applyBattleConfig(config);
  }

  /**
   * 应用战斗配置
   */
  async applyBattleConfig(config: BattleJSONConfig): Promise<void> {
    // 清除现有单位
    this.clearUnits();

    // 提取并验证单位配置
    const { players, enemies, allUnits } = extractBattleUnits(config);

    // 预先加载所有单位需要的纹理
    await this.preloadUnitTextures(allUnits);

    // 计算速度顺序
    const speedOrderMap = calculateSpeedOrder(allUnits, SKILL_SANDBOX_UNITS);

    // 创建玩家单位
    for (const playerConfig of players) {
      await this.createUnit(
        playerConfig,
        true,
        speedOrderMap.get(playerConfig.id ?? "")
      );
    }

    // 创建敌人单位
    for (const enemyConfig of enemies) {
      await this.createUnit(
        enemyConfig,
        false,
        speedOrderMap.get(enemyConfig.id ?? "")
      );
    }
  }

  /**
   * 预先加载所有单位需要的纹理
   */
  private async preloadUnitTextures(units: BattleUnitConfig[]): Promise<void> {
    // 提取所有纹理配置
    const textureConfigs = extractTextureConfigs(units);

    // 如果没有需要加载的纹理，直接返回
    if (textureConfigs.length === 0) return;

    // 使用纹理管理器批量加载纹理
    await this.textureManager.loadTextures(textureConfigs);
  }

  private clearUnits(): void {
    this.units.forEach((unit) => unit.destroy());
    this.units = [];
    this.playerUnits = [];
    this.enemyUnits = [];
    this.unitMap.clear();
    this.highlightedUnit = null;
  }

  private async createUnit(
    config: BattleUnitConfig,
    isPlayer: boolean,
    speedOrder?: number
  ): Promise<void> {
    const { x, y } = config.position;

    // 从沙盒单位获取统计数据
    const stats = getUnitStats(config.id, SKILL_SANDBOX_UNITS);

    // 使用 UnitRenderer 创建人物渲染
    const unitRenderer = new UnitRenderer(this, {
      unitConfig: config,
      isPlayer,
      width: UNIT_CONTAINER.width,
      height: UNIT_CONTAINER.height,
      hp: stats.hp,
      maxHp: stats.maxHp,
      mp: stats.mp,
      maxMp: stats.maxMp || 0, // 即使为0也显示蓝条（显示为空）
      speed: stats.speed,
      speedOrder,
    });

    const unitContainer = unitRenderer.getContainer();
    unitContainer.setPosition(Math.round(x), Math.round(y));

    this.units.push(unitContainer);

    if (isPlayer) {
      this.playerUnits.push(unitContainer);
    } else {
      this.enemyUnits.push(unitContainer);
    }

    if (config.id) {
      this.unitMap.set(config.id, unitContainer);
    }

    // 创建名字标签（确保像素对齐）
    // 名称应该位于容器顶部区域
    // 容器中心在0，顶部是 -height/2
    // 名称区域高度，名称应该在名称区域中间
    const nameY = Math.round(
      -UNIT_CONTAINER.height / 2 + UNIT_AREAS.nameAreaHeight / 2
    ); // 容器顶部 + 名称区域中心
    const nameBg = this.add.rectangle(
      0,
      nameY,
      NAME_LABEL.bgWidth,
      NAME_LABEL.bgHeight,
      0x000000,
      NAME_LABEL.bgAlpha
    );
    const nameText = this.add
      .text(0, nameY, config.name, {
        fontSize: NAME_LABEL.fontSize,
        color: NAME_LABEL.textColor,
        fontStyle: NAME_LABEL.fontStyle,
      })
      .setOrigin(0.5)
      .setPosition(Math.round(0), Math.round(nameY));

    // 设置文字纹理过滤模式
    if (nameText.texture) {
      nameText.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    unitContainer.add([nameBg, nameText]);

    // 创建选中光圈（初始隐藏）
    const aura = this.add.graphics();
    aura.lineStyle(
      SELECTION_AURA.lineWidth,
      SELECTION_AURA.color,
      SELECTION_AURA.alpha
    );
    aura.strokeEllipse(
      SELECTION_AURA.centerX,
      SELECTION_AURA.centerY,
      SELECTION_AURA.width,
      SELECTION_AURA.height
    );
    aura.setVisible(false);
    unitContainer.add(aura);
    (unitContainer as any).aura = aura;
    (unitContainer as any).unitRenderer = unitRenderer; // 保存渲染器引用以便后续更新

    // 设置交互区域
    unitContainer.setSize(INTERACTION.hitAreaWidth, INTERACTION.hitAreaHeight);
    unitContainer.setInteractive(
      new Phaser.Geom.Rectangle(
        INTERACTION.hitAreaOffsetX,
        INTERACTION.hitAreaOffsetY,
        INTERACTION.hitAreaWidth,
        INTERACTION.hitAreaHeight
      ),
      Phaser.Geom.Rectangle.Contains
    );

    // 点击事件
    unitContainer.on("pointerdown", () => {
      if (config.id && this.emitUnitClick) {
        this.emitUnitClick(config.id);
      }
    });

    this.unitsGroup.add(unitContainer);
  }

  highlightUnit(unitId: string | null): void {
    // 清除之前的高亮
    if (this.highlightedUnit && (this.highlightedUnit as any).aura) {
      (this.highlightedUnit as any).aura.setVisible(false);
    }

    this.highlightedUnit = null;

    // 设置新的高亮
    if (unitId) {
      const unit = this.unitMap.get(unitId);
      if (unit && (unit as any).aura) {
        (unit as any).aura.setVisible(true);
        this.highlightedUnit = unit;
      }
    }
  }

  previewSkill(skill: SkillDesign): void {
    // 技能预览功能（可以后续扩展）
    console.log("Preview skill:", skill);
  }
}

onMounted(async () => {
  if (!containerRef.value) return;

  await nextTick();

  // 确保容器有有效尺寸，避免 framebuffer 创建失败
  let width = props.width ?? containerRef.value?.clientWidth ?? 800;
  let height = props.height ?? containerRef.value?.clientHeight ?? 600;

  // 如果没有明确指定 height，且容器高度为 0 或很小，根据宽度计算 16:9 的高度
  if (!props.height && (height <= 0 || height < width * 0.5)) {
    height = Math.round(width * (9 / 16));
  }

  // 确保最小尺寸为 1x1，避免 WebGL framebuffer 错误
  if (width <= 0) width = 800;
  if (height <= 0) height = Math.round(width * (9 / 16));

  // 从 Pinia store 读取"基础"人物配置
  const designerLibraryStore = useDesignerLibraryStore();
  const basicCharacter =
    designerLibraryStore.characters.find((char) => char.name === "基础") ||
    DEFAULT_CHARACTER;

  // 创建场景类
  class BattleScene extends BattleCanvasScene {
    constructor() {
      super({
        key: "BattleCanvasScene",
        emitUnitClick: (id: string) => {
          emit("unit-click", id);
        },
        defaultCharacterConfig: {
          name: basicCharacter.name,
          url: basicCharacter.url,
          rows: basicCharacter.rows,
          cols: basicCharacter.cols,
          frameCount: basicCharacter.frameCount,
          id: basicCharacter.id,
          fps: basicCharacter.fps,
        },
      });
    }
  }

  // 使用 AUTO 类型，如果 WebGL 失败会自动回退到 Canvas
  // 这样可以避免 framebuffer 错误导致整个游戏无法启动
  const game = new Phaser.Game({
    type: Phaser.AUTO, // 改为 AUTO，自动选择渲染器
    parent: containerRef.value,
    width,
    height,
    backgroundColor: "#000000",
    scene: [BattleScene],
    scale: {
      mode: Phaser.Scale.NONE,
      autoCenter: Phaser.Scale.NO_CENTER, // 从左上角开始，不居中
    },
    // 像素完美渲染设置
    pixelArt: true, // 禁用纹理过滤，保持像素艺术清晰
    antialias: false, // 禁用抗锯齿
    roundPixels: true, // 像素对齐
    // Canvas 渲染优化
    render: {
      antialias: false, // 禁用渲染抗锯齿
      pixelArt: true, // 像素艺术模式
      roundPixels: true, // 像素对齐
    },
  });

  gameRef.value = game;

  // 等待场景创建完成
  game.scene.start("BattleCanvasScene");
  const scene = game.scene.getScene("BattleCanvasScene") as BattleCanvasScene;
  if (scene) {
    // 等待场景真正创建完成
    scene.events.once("create", () => {
      sceneRef.value = scene;
      emit("ready");
    });
  }

  // 监听容器尺寸变化，保持 16:9 比例
  const resizeObserver = new ResizeObserver(() => {
    if (!containerRef.value || !gameRef.value) return;

    const containerWidth = containerRef.value.clientWidth;
    if (containerWidth > 0) {
      const containerHeight = Math.round(containerWidth * (9 / 16));
      // 更新 Phaser 游戏尺寸
      gameRef.value.scale.resize(containerWidth, containerHeight);
    }
  });

  resizeObserverRef.value = resizeObserver;

  if (containerRef.value) {
    resizeObserver.observe(containerRef.value);
  }
});

// 监听配置变化
watch(
  () => props.config,
  (newConfig) => {
    if (newConfig && sceneRef.value) {
      sceneRef.value.applyBattleConfig(newConfig);
    }
  },
  { deep: true }
);

// 监听技能变化（用于高亮目标）
watch(
  () => props.skill?.context.casterId,
  (casterId) => {
    if (sceneRef.value && casterId) {
      // 高亮施法者
      sceneRef.value.highlightUnit(casterId);
    }
  },
  { deep: true }
);

// 监听目标变化
watch(
  () => props.skill?.context.selectedTargetIds,
  (targetIds) => {
    if (sceneRef.value && targetIds && targetIds.length > 0) {
      // 高亮第一个目标（或可以扩展为高亮所有目标）
      sceneRef.value.highlightUnit(targetIds[0] ?? null);
    }
  },
  { deep: true }
);

onBeforeUnmount(() => {
  if (resizeObserverRef.value) {
    resizeObserverRef.value.disconnect();
    resizeObserverRef.value = null;
  }
  if (gameRef.value) {
    gameRef.value.destroy(true);
    gameRef.value = null;
  }
  sceneRef.value = null;
});
</script>

<template>
  <CanvasContainer
    ref="canvasContainerRef"
    :disable-controls="props.disableControls"
    class="rounded-lg border border-white/10"
  >
    <div ref="containerRef" class="relative h-full w-full bg-black" />

    <template #toolbar>
      <slot name="toolbar">
        <button
          class="rounded px-3 py-1 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
          type="button"
          @click="resetView"
        >
          <i class="fa fa-crosshairs mr-1" />
          重置视图
        </button>
        <button
          class="rounded px-3 py-1 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
          type="button"
          @click="zoomIn"
        >
          <i class="fa fa-search-plus mr-1" />
          放大
        </button>
        <button
          class="rounded px-3 py-1 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
          type="button"
          @click="zoomOut"
        >
          <i class="fa fa-search-minus mr-1" />
          缩小
        </button>
      </slot>
    </template>

    <template #overlay>
      <slot name="overlay" />
    </template>
  </CanvasContainer>
</template>
