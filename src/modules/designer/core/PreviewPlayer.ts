/**
 * @file 设计器预览播放器
 * @description 支持缩放和平移的精灵图预览播放器
 */
import { watch } from "vue";
import type { Ref } from "vue";

/** 雪碧图预览配置 */
export interface SpriteSheetPreviewConfig {
  url: string;
  rows: number;
  cols: number;
  frameCount?: number;
  scale?: number;
}

/**
 * 预览播放器类
 */
export class PreviewPlayer {
  private ctx: CanvasRenderingContext2D | null = null;
  private image = new Image();
  private imageLoaded = false;
  private imageError = false;
  private errorUrl = "";
  private errorFallback = new Image();
  private errorFallbackReady = false;
  private frame = 0;
  private lastTime = 0;
  private playing = false;
  private rafId: number | null = null;
  private config?: SpriteSheetPreviewConfig;
  private readonly canvasRef: Ref<HTMLCanvasElement | null>;
  private previewMode: "effect" | "image" = "effect";
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;
  private fps = 12;
  private onFrameChange?: (frame: number) => void;
  private onImageLoad?: () => void;
  private disableBackground = false;

  constructor(canvasRef: Ref<HTMLCanvasElement | null>) {
    this.canvasRef = canvasRef;
    this.errorFallback.onload = () => {
      this.errorFallbackReady = true;
    };
    this.errorFallback.src = "/preview-error.svg";
  }

  setOnFrameChange(callback: (frame: number) => void): void {
    this.onFrameChange = callback;
  }

  setOnImageLoad(callback: () => void): void {
    this.onImageLoad = callback;
  }

  setDisableBackground(disable: boolean): void {
    this.disableBackground = disable;
  }

  bindConfig(configRef: Ref<SpriteSheetPreviewConfig>): void {
    watch(
      configRef,
      (cfg) => {
        this.config = { ...cfg };
        this.frame = 0;
        this.loadImage(cfg.url);
      },
      { deep: true, immediate: true },
    );
  }

  togglePlay(): void {
    this.playing = !this.playing;
  }

  setPlaying(playing: boolean): void {
    this.playing = playing;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  getCurrentFrame(): number {
    return this.frame;
  }

  setFrame(frame: number): void {
    const total = this.getTotalFrames();
    this.frame = Math.max(0, Math.min(frame, total - 1));
  }

  getTotalFrames(): number {
    if (!this.config) return 0;
    return this.config.frameCount ?? this.config.rows * this.config.cols;
  }

  getFPS(): number {
    return this.fps;
  }

  setFPS(fps: number): void {
    this.fps = Math.max(1, Math.min(fps, 120));
  }

  getScale(): number {
    return this.scale;
  }

  setScale(scale: number, centerX?: number, centerY?: number): void {
    const oldScale = this.scale;
    this.scale = Math.max(0.1, Math.min(scale, 10));
    if (centerX !== undefined && centerY !== undefined) {
      const scaleDiff = this.scale - oldScale;
      this.offsetX -= centerX * scaleDiff;
      this.offsetY -= centerY * scaleDiff;
    }
  }

  setOffset(x: number, y: number): void {
    this.offsetX = x;
    this.offsetY = y;
  }

  setPreviewMode(mode: "effect" | "image"): void {
    if (this.previewMode === mode) return;
    this.previewMode = mode;
    this.resetView();
  }

  resetView(): void {
    this.scale = 1;
    const canvas = this.canvasRef.value;
    if (!canvas || !this.config || !this.image || this.image.naturalWidth === 0) {
      this.offsetX = 0;
      this.offsetY = 0;
      return;
    }
    const { width, height } = this.getDisplaySize();
    this.offsetX = canvas.width / 2 - width / 2;
    this.offsetY = canvas.height / 2 - height / 2;
  }

  refresh(): void {
    if (!this.config || !this.config.url) return;
    this.frame = 0;
    this.loadImage(this.config.url);
  }

  start(): void {
    if (this.rafId) return;
    const loop = (time: number) => {
      this.update(time);
      this.draw();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  getDisplaySize(): { width: number; height: number } {
    if (!this.config || !this.image || !this.imageLoaded) {
      return { width: 0, height: 0 };
    }
    if (this.previewMode === "image") {
      return { width: this.image.naturalWidth, height: this.image.naturalHeight };
    }
    const cols = this.config.cols || 1;
    const rows = this.config.rows || 1;
    return {
      width: this.image.naturalWidth / cols,
      height: this.image.naturalHeight / rows,
    };
  }

  private ensureContext(): void {
    if (!this.ctx && this.canvasRef.value) {
      this.ctx = this.canvasRef.value.getContext("2d");
    }
  }

  private loadImage(url: string): void {
    this.imageLoaded = false;
    this.imageError = false;
    this.errorUrl = "";

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      if (this.image !== image) return;
      this.imageLoaded = true;
      this.imageError = false;
      this.resetView();
      this.onImageLoad?.();
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

  private update(time: number): void {
    if (!this.playing || !this.config || this.previewMode === "image") return;
    const interval = 1000 / this.fps;
    if (time - this.lastTime > interval) {
      const oldFrame = this.frame;
      this.frame += 1;
      const total = this.getTotalFrames();
      if (this.frame >= total) this.frame = 0;
      this.lastTime = time;
      if (oldFrame !== this.frame && this.onFrameChange) {
        this.onFrameChange(this.frame);
      }
    }
  }

  private draw(): void {
    this.ensureContext();
    if (!this.ctx || !this.canvasRef.value || !this.config) return;

    const ctx = this.ctx;
    const canvas = this.canvasRef.value;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!this.disableBackground) {
      this.drawTransparentBackground(ctx, canvas.width, canvas.height);
    }

    if (!this.imageLoaded || this.image.naturalWidth === 0) {
      if (this.imageError) {
        this.drawErrorPlaceholder(ctx, canvas.width, canvas.height);
      }
      return;
    }

    const cols = this.config.cols || 1;
    const rows = this.config.rows || 1;
    const frameWidth = this.image.naturalWidth / cols;
    const frameHeight = this.image.naturalHeight / rows;
    const col = this.frame % cols;
    const row = Math.floor(this.frame / cols);

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
        this.image.naturalHeight,
      );
    } else {
      // 动画模式：绘制当前帧
      ctx.drawImage(
        this.image,
        col * frameWidth,
        row * frameHeight,
        frameWidth,
        frameHeight,
        0,
        0,
        frameWidth,
        frameHeight,
      );
    }
    ctx.restore();
  }

  private drawTransparentBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const cellSize = 24;
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "rgba(148, 163, 184, 0.15)";
    for (let y = 0; y < height; y += cellSize) {
      for (let x = (Math.floor(y / cellSize) % 2) * cellSize; x < width; x += cellSize * 2) {
        ctx.fillRect(x, y, cellSize, cellSize);
      }
    }
  }

  private drawErrorPlaceholder(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (this.errorFallbackReady) {
      const padding = 24;
      const maxWidth = Math.max(60, width - padding * 2);
      const maxHeight = Math.max(60, height - padding * 2);
      const scale = Math.min(
        maxWidth / this.errorFallback.naturalWidth,
        maxHeight / this.errorFallback.naturalHeight,
        1,
      );
      const drawWidth = this.errorFallback.naturalWidth * scale;
      const drawHeight = this.errorFallback.naturalHeight * scale;
      const x = (width - drawWidth) / 2;
      const y = (height - drawHeight) / 2 - 20;
      ctx.drawImage(this.errorFallback, x, y, drawWidth, drawHeight);
    }

    ctx.font = "bold 18px 'Segoe UI', 'PingFang SC', sans-serif";
    ctx.fillStyle = "rgba(248, 113, 113, 0.95)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (this.errorUrl) {
      ctx.font = "14px 'Segoe UI', 'PingFang SC', sans-serif";
      ctx.fillStyle = "rgba(248, 250, 252, 0.85)";
      ctx.fillText(`URL: ${this.errorUrl.slice(0, 50)}...`, width / 2, height - 30);
    }
  }
}
