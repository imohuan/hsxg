/**
 * Canvas 渲染器
 * 负责战斗画布的绑定和渲染
 * Requirements: 2.1-2.6, 4.1-4.6, 14.1-14.5
 */

import { ref, readonly, onUnmounted } from "vue";
import type {
  BattleSceneConfig,
  BattleUnit,
  UnitRuntimeState,
  DamageNumber,
  DamageType,
  CameraState,
  FloatingTextOptions,
} from "@/types";
import {
  UNIT_SIZE,
  UNIT_AREA,
  STATUS_BAR,
  STATUS_BAR_COLORS,
  ACTIVE_HIGHLIGHT,
  SELECTION_EFFECT,
  DEFAULT_SPRITE,
  TEXT,
  DAMAGE_NUMBER,
  DAMAGE_COLORS,
  BACKGROUND,
  OPACITY,
} from "../config";

/** 渲染器配置 */
export interface CanvasRendererConfig {
  /** 画布宽度 */
  width: number;
  /** 画布高度 */
  height: number;
  /** 单位宽度 */
  unitWidth?: number;
  /** 单位高度 */
  unitHeight?: number;
}

// 使用统一配置
const DEFAULT_CONFIG = {
  unitWidth: UNIT_SIZE.width,
  unitHeight: UNIT_SIZE.height,
};

/** Hook 返回类型 */
export interface UseCanvasRendererReturn {
  canvasRef: ReturnType<typeof readonly<ReturnType<typeof ref<HTMLCanvasElement | null>>>>;
  backgroundColor: ReturnType<typeof readonly<ReturnType<typeof ref<string>>>>;
  bindCanvas: (canvas: HTMLCanvasElement) => void;
  resize: (width: number, height: number) => void;
  setBackgroundColor: (color: string) => void;
  setBackground: (imageUrl: string) => Promise<void>;
  fadeBackground: (targetColor: string, duration: number) => Promise<void>;
  flashScreen: (color: string, duration: number) => Promise<void>;
  preloadSprite: (url: string) => Promise<HTMLImageElement>;
  showDamageNumber: (unitId: string, x: number, y: number, value: number, type?: DamageType) => void;
  showFloatingText: (x: number, y: number, text: string, options?: FloatingTextOptions) => void;
  clear: () => void;
  render: (
    sceneConfig: BattleSceneConfig,
    unitStates: Map<string, UnitRuntimeState>,
    cameraState: CameraState,
    drawEffectsFn?: (ctx: CanvasRenderingContext2D) => void,
  ) => void;
  dispose: () => void;
}

export function useCanvasRenderer(config: CanvasRendererConfig): UseCanvasRendererReturn {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  // 当前尺寸（可变）
  let currentWidth = fullConfig.width;
  let currentHeight = fullConfig.height;

  // Canvas 引用
  const canvasRef = ref<HTMLCanvasElement | null>(null);
  let ctx: CanvasRenderingContext2D | null = null;

  // 背景状态
  const backgroundColor = ref(BACKGROUND.defaultColor);
  const backgroundImage = ref<HTMLImageElement | null>(null);

  // 伤害数字
  const damageNumbers = ref<DamageNumber[]>([]);
  let damageIdCounter = 0;

  // 浮动文字
  interface FloatingText {
    id: string;
    text: string;
    x: number;
    y: number;
    alpha: number;
    offsetY: number;
    fontSize: number;
    color: string;
    floatUp: boolean;
  }
  const floatingTexts = ref<FloatingText[]>([]);
  let floatingTextIdCounter = 0;

  // 闪屏状态
  const flashColor = ref<string | null>(null);
  const flashAlpha = ref(0);

  // 精灵图缓存
  const spriteCache = new Map<string, HTMLImageElement>();

  // 选中效果帧动画图片
  const selectionFrames: HTMLImageElement[] = [];
  const selectionFrameUrls = SELECTION_EFFECT.frameUrls;
  let selectionFrameIndex = 0;
  let lastFrameTime = 0;
  const FRAME_INTERVAL = SELECTION_EFFECT.frameInterval;

  // 预加载选中效果帧动画
  selectionFrameUrls.forEach((url) => {
    const img = new Image();
    img.onload = () => {
      selectionFrames.push(img);
    };
    img.src = url;
  });

  // 默认角色雪碧图动画
  let defaultSpriteImage: HTMLImageElement | null = null;
  let defaultSpriteFrameIndex = 0;
  let lastDefaultSpriteFrameTime = 0;
  const DEFAULT_SPRITE_FRAME_INTERVAL = DEFAULT_SPRITE.frameInterval;

  // 预加载默认雪碧图
  const defaultSpriteImg = new Image();
  defaultSpriteImg.onload = () => {
    defaultSpriteImage = defaultSpriteImg;
  };
  defaultSpriteImg.src = DEFAULT_SPRITE.url;

  // 动画帧 ID
  let animationFrameId: number | null = null;

  /** 绑定 Canvas */
  function bindCanvas(canvas: HTMLCanvasElement) {
    canvasRef.value = canvas;
    ctx = canvas.getContext("2d");
    canvas.width = currentWidth;
    canvas.height = currentHeight;
  }

  /** 调整尺寸 */
  function resize(width: number, height: number) {
    currentWidth = width;
    currentHeight = height;
    if (canvasRef.value) {
      canvasRef.value.width = width;
      canvasRef.value.height = height;
    }
  }

  /** 设置背景颜色 */
  function setBackgroundColor(color: string) {
    backgroundColor.value = color;
  }

  /** 设置背景图片 */
  async function setBackground(imageUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        backgroundImage.value = img;
        resolve();
      };
      img.onerror = reject;
      img.src = imageUrl;
    });
  }

  /** 背景渐变 */
  async function fadeBackground(targetColor: string, duration: number): Promise<void> {
    // 简化实现：直接切换颜色
    backgroundColor.value = targetColor;
    return new Promise((resolve) => setTimeout(resolve, duration));
  }

  /** 屏幕闪烁 */
  async function flashScreen(color: string, duration: number): Promise<void> {
    flashColor.value = color;
    flashAlpha.value = 1;

    const startTime = performance.now();

    return new Promise((resolve) => {
      function animate() {
        const elapsed = performance.now() - startTime;
        const progress = elapsed / duration;

        if (progress < 1) {
          flashAlpha.value = 1 - progress;
          requestAnimationFrame(animate);
        } else {
          flashColor.value = null;
          flashAlpha.value = 0;
          resolve();
        }
      }
      requestAnimationFrame(animate);
    });
  }

  /** 预加载精灵图 */
  async function preloadSprite(url: string): Promise<HTMLImageElement> {
    if (spriteCache.has(url)) {
      return spriteCache.get(url)!;
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        spriteCache.set(url, img);
        resolve(img);
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  /**
   * 显示伤害数字
   * Requirements: 14.1, 14.2, 14.3
   */
  function showDamageNumber(unitId: string, x: number, y: number, value: number, type: DamageType = "damage") {
    const id = `damage_${++damageIdCounter}`;
    const damageNumber: DamageNumber = {
      id,
      unitId,
      value,
      type,
      x,
      y: y + DAMAGE_NUMBER.offsetY,
      alpha: 1,
      offsetY: 0,
      createdAt: Date.now(),
    };
    damageNumbers.value.push(damageNumber);

    // 动画：向上飘动并淡出
    const duration = DAMAGE_NUMBER.duration;
    const startTime = performance.now();

    function animate() {
      const elapsed = performance.now() - startTime;
      const progress = elapsed / duration;

      if (progress < 1) {
        damageNumber.offsetY = -DAMAGE_NUMBER.floatDistance * progress;
        damageNumber.alpha = 1 - progress;
        requestAnimationFrame(animate);
      } else {
        // 移除
        const index = damageNumbers.value.findIndex((d) => d.id === id);
        if (index !== -1) {
          damageNumbers.value.splice(index, 1);
        }
      }
    }
    requestAnimationFrame(animate);
  }

  /**
   * 显示浮动文字
   */
  function showFloatingText(x: number, y: number, text: string, options: FloatingTextOptions = {}) {
    const { fontSize = 16, color = "#ffffff", duration = 1000, floatUp = true } = options;

    const id = `floating_${++floatingTextIdCounter}`;
    const floatingText: FloatingText = {
      id,
      text,
      x,
      y,
      alpha: 1,
      offsetY: 0,
      fontSize,
      color,
      floatUp,
    };
    floatingTexts.value.push(floatingText);

    // 动画：向上飘动并淡出
    const startTime = performance.now();

    function animate() {
      const elapsed = performance.now() - startTime;
      const progress = elapsed / duration;

      if (progress < 1) {
        floatingText.offsetY = floatUp ? -40 * progress : 0;
        floatingText.alpha = 1 - progress;
        requestAnimationFrame(animate);
      } else {
        // 移除
        const index = floatingTexts.value.findIndex((t) => t.id === id);
        if (index !== -1) {
          floatingTexts.value.splice(index, 1);
        }
      }
    }
    requestAnimationFrame(animate);
  }

  /** 绘制背景 */
  function drawBackground() {
    if (!ctx) return;

    // 填充背景色
    ctx.fillStyle = backgroundColor.value;
    ctx.fillRect(0, 0, currentWidth, currentHeight);

    // 绘制背景图
    if (backgroundImage.value) {
      ctx.drawImage(backgroundImage.value, 0, 0, currentWidth, currentHeight);
    }
  }

  /** 绘制单位 */
  function drawUnit(unit: BattleUnit, state: UnitRuntimeState) {
    if (!ctx) return;

    const { x, y } = state.position;
    const { unitWidth, unitHeight } = fullConfig;

    // 单位容器区域划分
    const nameAreaHeight = UNIT_AREA.nameHeight;
    const barAreaHeight = UNIT_AREA.barHeight;
    const spriteAreaHeight = unitHeight - nameAreaHeight - barAreaHeight;

    ctx.save();

    // 角色不可选择时降低透明度
    if (unit.selectable === false || unit.isDead) {
      ctx.globalAlpha = OPACITY.disabled;
    }

    // 绘制高亮效果（当前行动角色）- 黄色椭圆光圈在精灵下方
    if (state.isActive) {
      const auraY = y + spriteAreaHeight / 2 + ACTIVE_HIGHLIGHT.offsetY;
      ctx.beginPath();
      ctx.ellipse(
        x,
        auraY,
        unitWidth / 2 + ACTIVE_HIGHLIGHT.ellipseWidthExtend,
        ACTIVE_HIGHLIGHT.ellipseHeight,
        0,
        0,
        Math.PI * 2,
      );
      ctx.strokeStyle = ACTIVE_HIGHLIGHT.strokeColor;
      ctx.lineWidth = ACTIVE_HIGHLIGHT.lineWidth;
      ctx.stroke();
    }

    // 绘制选中效果（施法目标）- 帧动画箭头
    if (state.isSelected && selectionFrames.length > 0) {
      // 更新帧动画索引
      const now = performance.now();
      if (now - lastFrameTime > FRAME_INTERVAL) {
        selectionFrameIndex = (selectionFrameIndex + 1) % selectionFrames.length;
        lastFrameTime = now;
      }

      const frame = selectionFrames[selectionFrameIndex];
      if (frame) {
        const arrowSize = SELECTION_EFFECT.arrowSize;
        const offsetX = unitWidth / 2 + SELECTION_EFFECT.offsetX;
        const arrowY = y + SELECTION_EFFECT.offsetY;

        ctx.save();
        if (unit.isPlayer) {
          // 我方角色在右侧，光标显示在左侧（指向右）
          ctx.translate(x - offsetX, arrowY);
          ctx.drawImage(frame, -arrowSize / 2, -arrowSize / 2, arrowSize, arrowSize);
        } else {
          // 敌方角色在左侧，光标显示在右侧（水平翻转，指向左）
          ctx.translate(x + offsetX, arrowY);
          ctx.scale(-1, 1);
          ctx.drawImage(frame, -arrowSize / 2, -arrowSize / 2, arrowSize, arrowSize);
        }
        ctx.restore();
      }
    }

    // 绘制单位精灵区域
    const spriteY = y - unitHeight / 2 + nameAreaHeight + spriteAreaHeight / 2;

    // 确定要使用的精灵图
    let spriteToUse: { url: string; rows: number; cols: number; scale?: number } | null = null;
    let imgToUse: HTMLImageElement | null = null;

    if (unit.sprite && spriteCache.has(unit.sprite.url)) {
      // 使用单位自定义精灵图
      spriteToUse = unit.sprite;
      imgToUse = spriteCache.get(unit.sprite.url)!;
    } else if (defaultSpriteImage) {
      // 使用默认精灵图
      spriteToUse = {
        url: DEFAULT_SPRITE.url,
        rows: DEFAULT_SPRITE.rows,
        cols: DEFAULT_SPRITE.cols,
        scale: DEFAULT_SPRITE.scale,
      };
      imgToUse = defaultSpriteImage;
    }

    if (spriteToUse && imgToUse) {
      // 更新默认精灵图帧动画索引
      const now = performance.now();
      if (now - lastDefaultSpriteFrameTime > DEFAULT_SPRITE_FRAME_INTERVAL) {
        defaultSpriteFrameIndex = (defaultSpriteFrameIndex + 1) % DEFAULT_SPRITE.totalFrames;
        lastDefaultSpriteFrameTime = now;
      }

      const { rows, cols, scale = 1 } = spriteToUse;
      const frameWidth = imgToUse.width / cols;
      const frameHeight = imgToUse.height / rows;

      // 计算当前帧的位置（使用默认精灵图时使用动画帧索引）
      const isDefaultSprite = spriteToUse.url === DEFAULT_SPRITE.url;
      const frameIndex = isDefaultSprite ? defaultSpriteFrameIndex : 0;
      const frameCol = frameIndex % cols;
      const frameRow = Math.floor(frameIndex / cols);
      const sourceX = frameCol * frameWidth;
      const sourceY = frameRow * frameHeight;

      // 计算适配容器的缩放
      const fitScaleX = (unitWidth * 0.9) / frameWidth;
      const fitScaleY = (spriteAreaHeight * 0.9) / frameHeight;
      const fitScale = Math.min(fitScaleX, fitScaleY) * scale;

      const drawWidth = frameWidth * fitScale;
      const drawHeight = frameHeight * fitScale;

      // 敌方角色需要水平翻转
      if (!unit.isPlayer) {
        ctx.save();
        ctx.translate(x, spriteY);
        ctx.scale(-1, 1);
        ctx.drawImage(
          imgToUse,
          sourceX,
          sourceY,
          frameWidth,
          frameHeight,
          -drawWidth / 2,
          -drawHeight / 2,
          drawWidth,
          drawHeight,
        );
        ctx.restore();
      } else {
        ctx.drawImage(
          imgToUse,
          sourceX,
          sourceY,
          frameWidth,
          frameHeight,
          x - drawWidth / 2,
          spriteY - drawHeight / 2,
          drawWidth,
          drawHeight,
        );
      }
    }

    // 绘制名称
    ctx.fillStyle = TEXT.nameColor;
    ctx.font = TEXT.nameFont;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(unit.name, x, y - unitHeight / 2 + nameAreaHeight / 2);

    ctx.restore();
  }

  /** 绘制单位信息栏（速度序号、血量、蓝量） */
  function drawUnitInfo(unit: BattleUnit, state: UnitRuntimeState, speedOrder: number) {
    if (!ctx) return;

    const { x, y } = state.position;
    const { unitWidth, unitHeight } = fullConfig;

    // 血条区域配置
    const barWidth = unitWidth * STATUS_BAR.widthRatio;
    const barHeight = STATUS_BAR.height;
    const barGap = STATUS_BAR.gap;
    const barPadding = STATUS_BAR.padding;
    const mpBarOffsetX = STATUS_BAR.mpOffsetX;

    // 血条区域起始位置（在单位底部）
    const barAreaY = y + unitHeight / 2 - STATUS_BAR.bottomOffset;

    // 速度序号（在血条左侧）
    ctx.save();
    ctx.fillStyle = TEXT.speedOrderColor;
    ctx.strokeStyle = TEXT.speedOrderStrokeColor;
    ctx.lineWidth = TEXT.speedOrderStrokeWidth;
    ctx.font = TEXT.speedOrderFont;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const orderX = x - barWidth / 2 - TEXT.speedOrderOffsetX;
    const orderY = barAreaY;

    // 先绘制描边
    ctx.strokeText(`${speedOrder}`, orderX, orderY);
    // 再绘制填充
    ctx.fillText(`${speedOrder}`, orderX, orderY);
    ctx.restore();

    // 血量条（上方）
    const hpBarX = x;
    const hpBarY = barAreaY - barGap;

    // 血条背景（白色边框效果）
    ctx.fillStyle = STATUS_BAR_COLORS.hpBackground;
    ctx.fillRect(hpBarX - barWidth / 2, hpBarY - barHeight / 2, barWidth, barHeight);

    // 血条内部背景（黑色）
    ctx.fillStyle = STATUS_BAR_COLORS.hpInnerBackground;
    ctx.fillRect(
      hpBarX - barWidth / 2 + barPadding,
      hpBarY - barHeight / 2 + barPadding,
      barWidth - barPadding * 2,
      barHeight - barPadding * 2,
    );

    // 血条填充
    const hpRatio = Math.max(0, Math.min(1, unit.hp / unit.maxHp));
    if (hpRatio > 0) {
      ctx.fillStyle = hpRatio > 0.3 ? STATUS_BAR_COLORS.hpFill : STATUS_BAR_COLORS.hpFillLow;
      ctx.fillRect(
        hpBarX - barWidth / 2 + barPadding,
        hpBarY - barHeight / 2 + barPadding,
        (barWidth - barPadding * 2) * hpRatio,
        barHeight - barPadding * 2,
      );
    }

    // 蓝量条（下方，X 偏移实现交错效果）
    const mpBarX = x + mpBarOffsetX;
    const mpBarY = barAreaY + barHeight + barGap;

    // 蓝条背景
    ctx.fillStyle = STATUS_BAR_COLORS.mpBackground;
    ctx.fillRect(mpBarX - barWidth / 2, mpBarY - barHeight / 2, barWidth, barHeight);

    // 蓝条内部背景
    ctx.fillStyle = STATUS_BAR_COLORS.mpInnerBackground;
    ctx.fillRect(
      mpBarX - barWidth / 2 + barPadding,
      mpBarY - barHeight / 2 + barPadding,
      barWidth - barPadding * 2,
      barHeight - barPadding * 2,
    );

    // 蓝条填充
    const mpRatio = unit.maxMp > 0 ? Math.max(0, Math.min(1, unit.mp / unit.maxMp)) : 0;
    if (mpRatio > 0) {
      ctx.fillStyle = STATUS_BAR_COLORS.mpFill;
      ctx.fillRect(
        mpBarX - barWidth / 2 + barPadding,
        mpBarY - barHeight / 2 + barPadding,
        (barWidth - barPadding * 2) * mpRatio,
        barHeight - barPadding * 2,
      );
    }
  }

  /** 绘制伤害数字 */
  function drawDamageNumbers() {
    if (!ctx) return;

    damageNumbers.value.forEach((damage) => {
      ctx!.save();
      ctx!.globalAlpha = damage.alpha;

      // 根据类型设置颜色
      switch (damage.type) {
        case "damage":
          ctx!.fillStyle = DAMAGE_COLORS.damage;
          break;
        case "heal":
          ctx!.fillStyle = DAMAGE_COLORS.heal;
          break;
        case "critical":
          ctx!.fillStyle = DAMAGE_COLORS.critical;
          break;
        case "miss":
          ctx!.fillStyle = DAMAGE_COLORS.miss;
          break;
      }

      ctx!.font = damage.type === "critical" ? DAMAGE_NUMBER.criticalFont : DAMAGE_NUMBER.normalFont;
      ctx!.textAlign = "center";

      const text = damage.type === "miss" ? "MISS" : `${damage.value > 0 ? "-" : "+"}${Math.abs(damage.value)}`;
      ctx!.fillText(text, damage.x, damage.y + damage.offsetY);

      ctx!.restore();
    });
  }

  /** 绘制浮动文字 */
  function drawFloatingTexts() {
    if (!ctx) return;

    floatingTexts.value.forEach((ft) => {
      ctx!.save();
      ctx!.globalAlpha = ft.alpha;
      ctx!.fillStyle = ft.color;
      ctx!.font = `bold ${ft.fontSize}px sans-serif`;
      ctx!.textAlign = "center";
      ctx!.fillText(ft.text, ft.x, ft.y + ft.offsetY);
      ctx!.restore();
    });
  }

  /** 绘制闪屏效果 */
  function drawFlashScreen() {
    if (!ctx || !flashColor.value || flashAlpha.value <= 0) return;

    ctx.save();
    ctx.globalAlpha = flashAlpha.value;
    ctx.fillStyle = flashColor.value;
    ctx.fillRect(0, 0, fullConfig.width, fullConfig.height);
    ctx.restore();
  }

  /** 清空画布 */
  function clear() {
    if (!ctx) return;
    ctx.clearRect(0, 0, currentWidth, currentHeight);
  }

  /** 完整渲染一帧 */
  function render(
    sceneConfig: BattleSceneConfig,
    unitStates: Map<string, UnitRuntimeState>,
    cameraState: CameraState,
    drawEffectsFn?: (ctx: CanvasRenderingContext2D) => void,
  ) {
    if (!ctx) return;

    clear();

    ctx.save();

    // 应用相机变换（先平移后缩放，支持以鼠标位置为中心缩放）
    ctx.translate(cameraState.offsetX, cameraState.offsetY);
    ctx.scale(cameraState.scale, cameraState.scale);

    // 绘制背景
    drawBackground();

    // 计算速度排序
    const allUnits = [...sceneConfig.enemyUnits, ...sceneConfig.playerUnits];
    const sortedBySpeed = [...allUnits].sort((a, b) => b.speed - a.speed);
    const speedOrderMap = new Map<string, number>();
    sortedBySpeed.forEach((unit, index) => {
      speedOrderMap.set(unit.id, index + 1);
    });

    // 绘制所有单位
    allUnits.forEach((unit) => {
      const state = unitStates.get(unit.id);
      if (state) {
        drawUnit(unit, state);
        drawUnitInfo(unit, state, speedOrderMap.get(unit.id) || 0);
      }
    });

    // 绘制特效
    if (drawEffectsFn) {
      drawEffectsFn(ctx);
    }

    // 绘制伤害数字
    drawDamageNumbers();

    // 绘制浮动文字
    drawFloatingTexts();

    ctx.restore();

    // 绘制闪屏（不受相机变换影响）
    drawFlashScreen();
  }

  /** 销毁 */
  function dispose() {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
    }
    spriteCache.clear();
    damageNumbers.value = [];
    floatingTexts.value = [];
  }

  onUnmounted(dispose);

  return {
    canvasRef: readonly(canvasRef),
    backgroundColor: readonly(backgroundColor),
    bindCanvas,
    resize,
    setBackgroundColor,
    setBackground,
    fadeBackground,
    flashScreen,
    preloadSprite,
    showDamageNumber,
    showFloatingText,
    clear,
    render,
    dispose,
  };
}
