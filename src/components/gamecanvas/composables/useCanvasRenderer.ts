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

const DEFAULT_CONFIG = {
  unitWidth: 80,
  unitHeight: 100,
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

  // 背景状态 - Requirements: 2.1 亮色主题
  const backgroundColor = ref("#e2e8f0"); // slate-200
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
  const selectionFrameUrls = ["/zhuan1.png", "/zhuan2.png", "/zhuan3.png", "/zhuan5.png", "/zhuan6.png"];
  let selectionFrameIndex = 0;
  let lastFrameTime = 0;
  const FRAME_INTERVAL = 100; // 帧间隔 100ms

  // 预加载选中效果帧动画
  selectionFrameUrls.forEach((url) => {
    const img = new Image();
    img.onload = () => {
      selectionFrames.push(img);
    };
    img.src = url;
  });

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
      y: y - 50, // 在单位上方显示
      alpha: 1,
      offsetY: 0,
      createdAt: Date.now(),
    };
    damageNumbers.value.push(damageNumber);

    // 动画：向上飘动并淡出
    const duration = 1000;
    const startTime = performance.now();

    function animate() {
      const elapsed = performance.now() - startTime;
      const progress = elapsed / duration;

      if (progress < 1) {
        damageNumber.offsetY = -30 * progress;
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

    // 单位容器区域划分（参考参考项目）
    const nameAreaHeight = 20; // 名称区域高度
    const barAreaHeight = 24; // 血条区域高度
    const spriteAreaHeight = unitHeight - nameAreaHeight - barAreaHeight; // 精灵区域高度

    ctx.save();

    // Requirements: 7.4 - 角色不可选择时降低透明度
    if (unit.selectable === false || unit.isDead) {
      ctx.globalAlpha = 0.5;
    }

    // 绘制高亮效果（当前行动角色）- 黄色椭圆光圈在精灵下方
    if (state.isActive) {
      const auraY = y + spriteAreaHeight / 2 - 5;
      ctx.beginPath();
      ctx.ellipse(x, auraY, unitWidth / 2 + 8, 10, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "#fbbf24"; // amber-400
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // 绘制选中效果（施法目标）- 帧动画箭头
    // 我方角色在右侧，光标显示在左侧；敌方角色在左侧，光标显示在右侧
    if (state.isSelected && selectionFrames.length > 0) {
      // 更新帧动画索引
      const now = performance.now();
      if (now - lastFrameTime > FRAME_INTERVAL) {
        selectionFrameIndex = (selectionFrameIndex + 1) % selectionFrames.length;
        lastFrameTime = now;
      }

      const frame = selectionFrames[selectionFrameIndex];
      if (frame) {
        const arrowSize = 14;
        const offsetX = unitWidth / 2 + 10; // 箭头距离单位中心的水平距离
        const arrowY = y; // 箭头垂直位置（单位中间偏上）

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

    if (!unit.sprite || !spriteCache.has(unit.sprite.url)) {
      // 绘制默认占位角色（圆角矩形 + 简单人形图标）
      const placeholderWidth = unitWidth * 0.7;
      const placeholderHeight = spriteAreaHeight * 0.8;
      const px = x - placeholderWidth / 2;
      const py = spriteY - placeholderHeight / 2;
      const radius = 8;

      // 背景圆角矩形
      ctx.beginPath();
      ctx.roundRect(px, py, placeholderWidth, placeholderHeight, radius);
      ctx.fillStyle = unit.isDead ? "#94a3b8" : unit.isPlayer ? "#3b82f6" : "#ef4444";
      ctx.fill();
      ctx.strokeStyle = unit.isDead ? "#64748b" : unit.isPlayer ? "#1d4ed8" : "#b91c1c";
      ctx.lineWidth = 2;
      ctx.stroke();

      // 绘制简单人形图标
      const iconSize = Math.min(placeholderWidth, placeholderHeight) * 0.5;
      const iconX = x;
      const iconY = spriteY - iconSize * 0.1;

      // 头部（圆形）
      ctx.beginPath();
      ctx.arc(iconX, iconY - iconSize * 0.35, iconSize * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      // 身体（三角形）
      ctx.beginPath();
      ctx.moveTo(iconX, iconY - iconSize * 0.1);
      ctx.lineTo(iconX - iconSize * 0.3, iconY + iconSize * 0.4);
      ctx.lineTo(iconX + iconSize * 0.3, iconY + iconSize * 0.4);
      ctx.closePath();
      ctx.fill();

      // 绘制名称（在精灵上方）
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(unit.name, x, y - unitHeight / 2 + nameAreaHeight / 2);
    } else {
      // 绘制精灵图
      const img = spriteCache.get(unit.sprite.url)!;
      const { rows, cols, scale = 1 } = unit.sprite;
      const frameWidth = img.width / cols;
      const frameHeight = img.height / rows;

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
        ctx.drawImage(img, 0, 0, frameWidth, frameHeight, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        ctx.restore();
      } else {
        ctx.drawImage(
          img,
          0,
          0,
          frameWidth,
          frameHeight,
          x - drawWidth / 2,
          spriteY - drawHeight / 2,
          drawWidth,
          drawHeight,
        );
      }

      // 绘制名称
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(unit.name, x, y - unitHeight / 2 + nameAreaHeight / 2);
    }

    ctx.restore();
  }

  /** 绘制单位信息栏（速度序号、血量、蓝量）- Requirements: 2.5 */
  function drawUnitInfo(unit: BattleUnit, state: UnitRuntimeState, speedOrder: number) {
    if (!ctx) return;

    const { x, y } = state.position;
    const { unitWidth, unitHeight } = fullConfig;

    // 血条区域配置（参考参考项目的交错设计）
    const barWidth = unitWidth * 0.85;
    const barHeight = 7;
    const barGap = 2;
    const barPadding = 1;
    const mpBarOffsetX = -8; // 蓝条 X 偏移（交错效果）

    // 血条区域起始位置（在单位底部）
    const barAreaY = y + unitHeight / 2 - 20;

    // 速度序号（在血条左侧）
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const orderX = x - barWidth / 2 - 12;
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
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(hpBarX - barWidth / 2, hpBarY - barHeight / 2, barWidth, barHeight);

    // 血条内部背景（黑色）
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(
      hpBarX - barWidth / 2 + barPadding,
      hpBarY - barHeight / 2 + barPadding,
      barWidth - barPadding * 2,
      barHeight - barPadding * 2,
    );

    // 血条填充
    const hpRatio = Math.max(0, Math.min(1, unit.hp / unit.maxHp));
    if (hpRatio > 0) {
      ctx.fillStyle = hpRatio > 0.3 ? "#ef4444" : "#dc2626";
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
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(mpBarX - barWidth / 2, mpBarY - barHeight / 2, barWidth, barHeight);

    // 蓝条内部背景
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(
      mpBarX - barWidth / 2 + barPadding,
      mpBarY - barHeight / 2 + barPadding,
      barWidth - barPadding * 2,
      barHeight - barPadding * 2,
    );

    // 蓝条填充
    const mpRatio = unit.maxMp > 0 ? Math.max(0, Math.min(1, unit.mp / unit.maxMp)) : 0;
    if (mpRatio > 0) {
      ctx.fillStyle = "#3b82f6";
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
          ctx!.fillStyle = "#ff4444";
          break;
        case "heal":
          ctx!.fillStyle = "#44ff44";
          break;
        case "critical":
          ctx!.fillStyle = "#ffaa00";
          break;
        case "miss":
          ctx!.fillStyle = "#aaaaaa";
          break;
      }

      ctx!.font = damage.type === "critical" ? "bold 24px sans-serif" : "bold 18px sans-serif";
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
