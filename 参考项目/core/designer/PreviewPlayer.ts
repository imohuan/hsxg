/**
 * @file 设计器预览播放器
 * @description 支持缩放和平移的精灵图预览播放器
 *
 * 功能特性：
 * - 支持精灵图动画播放（逐帧播放）
 * - 支持图片预览模式（显示完整图片）
 * - 支持鼠标缩放和平移操作
 * - 支持FPS控制
 * - 支持帧变化回调
 * - 自动处理图片加载错误，显示错误占位符
 */

import { watch } from "vue";
import type { Ref } from "vue";
import type { SpriteSheetPreviewConfig } from "./types";

/**
 * 预览播放器类
 * @description 管理Canvas上的精灵图预览和播放
 */
export class PreviewPlayer {
  /** Canvas 2D渲染上下文 */
  private ctx: CanvasRenderingContext2D | null = null;
  /** 当前加载的图片对象 */
  private image = new Image();
  /** 图片是否已加载完成 */
  private imageLoaded = false;
  /** 图片是否加载失败 */
  private imageError = false;
  /** 加载失败的图片URL */
  private errorUrl = "";
  /** 错误占位符图片 */
  private errorFallback = new Image();
  /** 错误占位符是否已加载 */
  private errorFallbackReady = false;
  /** 当前播放的帧索引 */
  private frame = 0;
  /** 上一帧的时间戳（用于FPS控制） */
  private lastTime = 0;
  /** 是否正在播放 */
  private playing = false;
  /** 动画帧请求ID */
  private rafId: number | null = null;
  /** 当前配置 */
  private config?: SpriteSheetPreviewConfig;
  /** Canvas元素的Vue引用 */
  private readonly canvasRef: Ref<HTMLCanvasElement | null>;
  /** 预览模式：effect=逐帧动画，image=完整图片 */
  private previewMode: "effect" | "image" = "effect";

  /** 缩放比例（1.0 = 100%） */
  private scale = 1;
  /** X轴偏移量（像素） */
  private offsetX = 0;
  /** Y轴偏移量（像素） */
  private offsetY = 0;
  /** 是否正在拖拽 */
  private isDragging = false;
  /** 拖拽开始时的X坐标 */
  private dragStartX = 0;
  /** 拖拽开始时的Y坐标 */
  private dragStartY = 0;

  /** 播放帧率（FPS） */
  private fps = 10;

  /** 帧变化回调函数 */
  private onFrameChange?: (frame: number) => void;

  /** 图片加载完成回调函数 */
  private onImageLoad?: () => void;

  /** 是否禁用背景绘制（透明网格背景） */
  private disableBackground = false;

  /**
   * 构造函数
   * @param canvasRef Canvas元素的Vue引用
   */
  constructor(canvasRef: Ref<HTMLCanvasElement | null>) {
    this.canvasRef = canvasRef;
    // 预加载错误占位符图片
    this.errorFallback.onload = () => {
      this.errorFallbackReady = true;
    };
    this.errorFallback.src = `${
      import.meta.env.BASE_URL || "/"
    }preview-error.svg`;
  }

  /**
   * 设置帧变化回调
   * @param callback 当帧数变化时调用的回调函数
   */
  setOnFrameChange(callback: (frame: number) => void): void {
    this.onFrameChange = callback;
  }

  /**
   * 设置图片加载完成回调
   * @param callback 当图片加载完成时调用的回调函数
   */
  setOnImageLoad(callback: () => void): void {
    this.onImageLoad = callback;
  }

  /**
   * 设置是否禁用背景绘制
   * @param disable 是否禁用透明网格背景
   */
  setDisableBackground(disable: boolean): void {
    this.disableBackground = disable;
  }

  /**
   * 绑定配置（响应式）
   * @param configRef 配置的Vue引用
   * @description 监听配置变化，自动重新加载图片
   */
  bindConfig(configRef: Ref<SpriteSheetPreviewConfig>): void {
    watch(
      configRef,
      (cfg) => {
        this.config = { ...cfg };
        this.frame = 0;
        this.loadImage(cfg.url);
      },
      { deep: true, immediate: true }
    );
  }

  /**
   * 切换播放/暂停状态
   */
  togglePlay(): void {
    this.playing = !this.playing;
  }

  /**
   * 设置播放状态
   * @param playing 是否播放
   */
  setPlaying(playing: boolean): void {
    this.playing = playing;
  }

  /**
   * 获取当前播放状态
   * @returns 是否正在播放
   */
  isPlaying(): boolean {
    return this.playing;
  }

  /**
   * 获取当前帧索引
   * @returns 当前帧索引（从0开始）
   */
  getCurrentFrame(): number {
    return this.frame;
  }

  /**
   * 设置当前帧
   * @param frame 目标帧索引
   * @description 自动限制在有效范围内 [0, totalFrames-1]
   */
  setFrame(frame: number): void {
    const total = this.getTotalFrames();
    this.frame = Math.max(0, Math.min(frame, total - 1));
  }

  /**
   * 获取总帧数
   * @returns 总帧数
   * @description 如果配置中指定了frameCount则使用，否则计算为 rows * cols
   */
  getTotalFrames(): number {
    if (!this.config) return 0;
    // 使用统一的帧数计算逻辑
    return this.config.frameCount ?? this.config.rows * this.config.cols;
  }

  /**
   * 获取当前FPS
   * @returns 当前帧率
   */
  getFPS(): number {
    return this.fps;
  }

  /**
   * 设置FPS
   * @param fps 目标帧率（限制在1-120之间）
   */
  setFPS(fps: number): void {
    this.fps = Math.max(1, Math.min(fps, 120));
  }

  /**
   * 获取当前缩放比例
   * @returns 当前缩放比例（1.0 = 100%）
   */
  getScale(): number {
    return this.scale;
  }

  /**
   * 设置缩放比例
   * @param scale 目标缩放比例（限制在0.1-10之间）
   * @param centerX 缩放中心点X坐标（可选，用于以特定点为中心缩放）
   * @param centerY 缩放中心点Y坐标（可选，用于以特定点为中心缩放）
   * @description 如果提供了中心点，会调整偏移量使缩放以该点为中心
   */
  setScale(scale: number, centerX?: number, centerY?: number): void {
    const oldScale = this.scale;
    this.scale = Math.max(0.1, Math.min(scale, 10));

    // 如果提供了中心点,调整偏移量使缩放以该点为中心
    if (centerX !== undefined && centerY !== undefined) {
      const scaleDiff = this.scale - oldScale;
      this.offsetX -= centerX * scaleDiff;
      this.offsetY -= centerY * scaleDiff;
    }
  }

  /**
   * 鼠标滚轮缩放
   * @param delta 缩放增量（通常来自滚轮事件，正值放大，负值缩小）
   * @param mouseX 鼠标在屏幕上的X坐标
   * @param mouseY 鼠标在屏幕上的Y坐标
   * @description 以鼠标位置为中心进行缩放，保持鼠标指向的内容位置不变
   */
  zoom(delta: number, mouseX: number, mouseY: number): void {
    const canvas = this.canvasRef.value;
    if (!canvas) return;

    // 计算鼠标在画布坐标系中的位置
    const rect = canvas.getBoundingClientRect();
    const canvasX = mouseX - rect.left;
    const canvasY = mouseY - rect.top;

    // 转换为世界坐标（图片坐标系）
    const worldX = (canvasX - this.offsetX) / this.scale;
    const worldY = (canvasY - this.offsetY) / this.scale;

    // 更新缩放
    const newScale = this.scale * (1 + delta);
    this.scale = Math.max(0.1, Math.min(newScale, 10));

    // 调整偏移量,使缩放以鼠标位置为中心
    this.offsetX = canvasX - worldX * this.scale;
    this.offsetY = canvasY - worldY * this.scale;
  }

  /**
   * 开始拖拽
   * @param x 鼠标X坐标（屏幕坐标）
   * @param y 鼠标Y坐标（屏幕坐标）
   * @description 记录拖拽开始时的位置，用于计算拖拽偏移
   */
  startDrag(x: number, y: number): void {
    this.isDragging = true;
    this.dragStartX = x - this.offsetX;
    this.dragStartY = y - this.offsetY;
  }

  /**
   * 拖拽中
   * @param x 鼠标X坐标（屏幕坐标）
   * @param y 鼠标Y坐标（屏幕坐标）
   * @description 根据鼠标移动更新偏移量，实现平移效果
   */
  drag(x: number, y: number): void {
    if (!this.isDragging) return;
    this.offsetX = x - this.dragStartX;
    this.offsetY = y - this.dragStartY;
  }

  /**
   * 结束拖拽
   */
  endDrag(): void {
    this.isDragging = false;
  }

  /**
   * 重置视图
   * @description 重置缩放为1.0，并将图片居中显示
   */
  resetView(): void {
    this.scale = 1;
    const canvas = this.canvasRef.value;
    if (
      !canvas ||
      !this.config ||
      !this.image ||
      this.image.naturalWidth === 0 ||
      this.image.naturalHeight === 0
    ) {
      this.offsetX = 0;
      this.offsetY = 0;
      return;
    }

    const { width, height } = this.getDisplaySize();
    this.offsetX = canvas.width / 2 - width / 2;
    this.offsetY = canvas.height / 2 - height / 2;
  }

  /**
   * 设置偏移量
   * @param x X轴偏移量
   * @param y Y轴偏移量
   * @description 直接设置偏移量，用于外部控制
   */
  setOffset(x: number, y: number): void {
    this.offsetX = x;
    this.offsetY = y;
  }

  /**
   * 设置预览模式
   * @param mode 预览模式（effect=逐帧动画，image=完整图片）
   * @description 切换预览模式后会自动重置视图
   */
  setPreviewMode(mode: "effect" | "image"): void {
    if (this.previewMode === mode) return;
    this.previewMode = mode;
    this.resetView();
  }

  /**
   * 刷新预览
   * @description 重新加载当前配置的图片
   */
  refresh(): void {
    if (!this.config || !this.config.url) return;
    this.frame = 0;
    this.loadImage(this.config.url);
  }

  /**
   * 启动渲染循环
   * @description 开始requestAnimationFrame循环，持续更新和绘制
   */
  start(): void {
    if (this.rafId) return;
    const loop = (time: number) => {
      this.update(time);
      this.draw();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  /**
   * 停止渲染循环
   * @description 取消requestAnimationFrame，停止更新和绘制
   */
  stop(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * 确保Canvas上下文已初始化
   * @description 延迟初始化Canvas 2D上下文，避免在Canvas未挂载时获取
   */
  private ensureContext(): void {
    if (!this.ctx && this.canvasRef.value) {
      this.ctx = this.canvasRef.value.getContext("2d");
    }
  }

  /**
   * 加载图片
   * @param url 图片URL
   * @description 异步加载图片，处理加载成功和失败的情况
   */
  private loadImage(url: string): void {
    this.imageLoaded = false;
    this.imageError = false;
    this.errorUrl = "";

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      // 避免旧的 onload 回调覆盖最新图像（防止并发加载时的问题）
      if (this.image !== image) return;
      this.imageLoaded = true;
      this.imageError = false;
      this.resetView();
      // 触发图片加载完成回调
      if (this.onImageLoad) {
        this.onImageLoad();
      }
    };
    image.onerror = () => {
      if (this.image !== image) return;
      this.imageLoaded = false;
      this.imageError = true;
      this.errorUrl = url;
    };
    image.src = url;
    this.image = image;
  }

  /**
   * 更新逻辑
   * @param time 当前时间戳
   * @description 根据FPS控制帧更新，仅在播放状态且为effect模式时更新
   */
  private update(time: number): void {
    if (!this.playing || !this.config || this.previewMode === "image") return;
    const interval = 1000 / this.fps;
    if (time - this.lastTime > interval) {
      const oldFrame = this.frame;
      this.frame += 1;
      const total = this.getTotalFrames();
      if (this.frame >= total) this.frame = 0; // 循环播放
      this.lastTime = time;

      // 如果帧数发生变化，通知外部
      if (oldFrame !== this.frame && this.onFrameChange) {
        this.onFrameChange(this.frame);
      }
    }
  }

  /**
   * 绘制方法
   * @description 每帧调用的绘制方法，负责绘制背景、图片或错误占位符
   *
   * 绘制流程：
   * 1. 确保Canvas上下文已初始化
   * 2. 重置变换矩阵并清空画布
   * 3. 绘制透明网格背景（如果未禁用）
   * 4. 如果图片未加载或加载失败，绘制错误占位符
   * 5. 如果图片已加载，根据预览模式绘制图片或单帧
   * 6. 应用缩放和平移变换
   */
  private draw(): void {
    this.ensureContext();
    if (!this.ctx || !this.canvasRef.value || !this.config) return;

    const ctx = this.ctx;
    const canvas = this.canvasRef.value;

    // 重置变换矩阵（单位矩阵）
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // 绘制透明网格背景（如果未禁用）
    if (!this.disableBackground) {
      this.drawTransparentBackground(ctx, canvas.width, canvas.height);
    }

    // 如果图片未加载或加载失败，显示错误占位符
    if (
      !this.imageLoaded ||
      this.image.naturalWidth === 0 ||
      this.image.naturalHeight === 0
    ) {
      if (this.imageError) {
        this.drawErrorPlaceholder(ctx, canvas.width, canvas.height);
      }
      return;
    }

    // 计算当前帧在精灵图中的位置
    const cols = this.config.cols || 1;
    const rows = this.config.rows || 1;
    const frameWidth = this.image.naturalWidth / cols;
    const frameHeight = this.image.naturalHeight / rows;
    const col = this.frame % cols; // 当前帧所在的列
    const row = Math.floor(this.frame / cols); // 当前帧所在的行

    // 应用缩放和平移变换
    ctx.save();
    ctx.setTransform(this.scale, 0, 0, this.scale, this.offsetX, this.offsetY);

    // 根据预览模式绘制
    if (this.previewMode === "image") {
      // 图片模式：绘制完整图片
      ctx.drawImage(
        this.image,
        0,
        0,
        this.image.naturalWidth,
        this.image.naturalHeight,
        0,
        0,
        this.image.naturalWidth,
        this.image.naturalHeight
      );
    } else {
      // 动画模式：绘制当前帧
      ctx.drawImage(
        this.image,
        col * frameWidth, // 源图片中的X坐标
        row * frameHeight, // 源图片中的Y坐标
        frameWidth, // 源图片中的宽度
        frameHeight, // 源图片中的高度
        0, // 目标X坐标
        0, // 目标Y坐标
        frameWidth, // 目标宽度
        frameHeight // 目标高度
      );
    }

    ctx.restore();
  }

  /**
   * 获取显示尺寸
   * @returns 显示区域的宽度和高度
   * @description
   * - effect模式：返回单帧的尺寸（图片宽度/列数，图片高度/行数）
   * - image模式：返回完整图片的尺寸
   */
  getDisplaySize(): { width: number; height: number } {
    if (!this.config || !this.image || !this.imageLoaded) {
      return { width: 0, height: 0 };
    }
    if (this.previewMode === "image") {
      return {
        width: this.image.naturalWidth,
        height: this.image.naturalHeight,
      };
    }
    const cols = this.config.cols || 1;
    const rows = this.config.rows || 1;
    return {
      width: this.image.naturalWidth / cols,
      height: this.image.naturalHeight / rows,
    };
  }

  /**
   * 绘制透明背景（网格图案）
   * @param ctx Canvas 2D上下文
   * @param width 画布宽度
   * @param height 画布高度
   * @description 绘制半透明网格背景，用于显示透明区域
   */
  private drawTransparentBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const cellSize = 24;
    // 绘制深色背景
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.fillRect(0, 0, width, height);
    // 绘制网格图案（交错排列）
    ctx.fillStyle = "rgba(148, 163, 184, 0.15)";
    for (let y = 0; y < height; y += cellSize) {
      for (
        let x = (Math.floor(y / cellSize) % 2) * cellSize;
        x < width;
        x += cellSize * 2
      ) {
        ctx.fillRect(x, y, cellSize, cellSize);
      }
    }
  }

  /**
   * 绘制错误占位符
   * @param ctx Canvas 2D上下文
   * @param width 画布宽度
   * @param height 画布高度
   * @description 当图片加载失败时显示错误提示和占位符图标
   */
  private drawErrorPlaceholder(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    // 绘制错误图标（如果已加载）
    if (this.errorFallbackReady) {
      const padding = 24;
      const maxWidth = Math.max(60, width - padding * 2);
      const maxHeight = Math.max(60, height - padding * 2);
      const scale = Math.min(
        maxWidth / this.errorFallback.naturalWidth,
        maxHeight / this.errorFallback.naturalHeight,
        1
      );
      const drawWidth = this.errorFallback.naturalWidth * scale;
      const drawHeight = this.errorFallback.naturalHeight * scale;
      const x = (width - drawWidth) / 2;
      const y = (height - drawHeight) / 2 - 20;
      ctx.drawImage(this.errorFallback, x, y, drawWidth, drawHeight);
    }

    // 绘制错误文本
    ctx.font = "bold 18px 'Segoe UI', 'PingFang SC', sans-serif";
    ctx.fillStyle = "rgba(248, 113, 113, 0.95)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("资源加载失败", width / 2, height - 56);

    // 绘制失败的URL（自动换行）
    if (this.errorUrl) {
      ctx.font = "14px 'Segoe UI', 'PingFang SC', sans-serif";
      ctx.fillStyle = "rgba(248, 250, 252, 0.85)";
      this.drawWrappedText(
        ctx,
        `URL: ${this.errorUrl}`,
        width / 2,
        height - 30,
        width - 80,
        18
      );
    }
  }

  /**
   * 绘制自动换行文本
   * @param ctx Canvas 2D上下文
   * @param text 要绘制的文本
   * @param centerX 文本中心X坐标
   * @param startY 起始Y坐标
   * @param maxWidth 最大行宽
   * @param lineHeight 行高
   * @description 根据最大宽度自动换行，并居中绘制多行文本
   */
  private drawWrappedText(
    ctx: CanvasRenderingContext2D,
    text: string,
    centerX: number,
    startY: number,
    maxWidth: number,
    lineHeight: number
  ): void {
    if (!text) return;
    const lines: string[] = [];
    let current = "";
    // 逐字符检查，超过最大宽度时换行
    for (const char of text) {
      const testLine = current + char;
      if (ctx.measureText(testLine).width > maxWidth && current) {
        lines.push(current);
        current = char;
      } else {
        current = testLine;
      }
    }
    if (current) lines.push(current);

    // 绘制每一行（居中）
    lines.forEach((line, index) => {
      ctx.fillText(line, centerX, startY + index * lineHeight);
    });
  }
}
